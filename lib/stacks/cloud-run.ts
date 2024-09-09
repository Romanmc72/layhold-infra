import {join} from 'path';
import {
  CloudRunDomainMapping,
} from '@cdktf/provider-google/lib/cloud-run-domain-mapping';
import {
  CloudRunServiceIamMember,
} from '@cdktf/provider-google/lib/cloud-run-service-iam-member';
import {
  ProjectIamBinding,
} from '@cdktf/provider-google/lib/project-iam-binding';
import {ServiceAccount} from '@cdktf/provider-google/lib/service-account';
import {ProjectIamMember} from '@cdktf/provider-google/lib/project-iam-member';
import {TerraformVariable} from 'cdktf';
import {Construct} from 'constructs';
import {
  BaseGCPStack,
  BaseGCPStackProps,
  CloudRunServiceWrapper,
  Memory,
} from '../constructs';
import {IMAGE_NAME} from '../constants';
import {DeploymentEnvironment} from '../config/environments';
import { RegistryName } from './container-registry';

export interface CloudRunStackProps extends BaseGCPStackProps {
  /**
   * The artifact registry path where the container image resides
   */
  registryPath: string;
  /**
   * The identifier of the VPC access connector if using a private VPC subnet
   * and connector.
   */
  vpcAccessConnectorId?: string;
}

/**
 * This stack hold our cloud run resource definitions
 */
export class CloudRunStack extends BaseGCPStack {
  /**
   * The service account that will be running the web server application
   */
  public readonly serviceAccount: ServiceAccount;

  /**
   * Initializes the stack
   * @param {Construct} scope - The app this stack lives in.
   * @param {DeploymentEnvironment} env - The deployment environment the stack
   * will deploy to.
   * @param {CloudRunStackProps} props - The props to initialize the stack.
   */
  constructor(
      scope: Construct,
      env: DeploymentEnvironment,
      props: CloudRunStackProps,
  ) {
    super(scope, `cloud-run`, env.name, props);
    this.serviceAccount = new ServiceAccount(this, 'service-account', {
      accountId: 'cloud-run-server',
      description: 'Responsible for executing the Cloud Run Server',
      project: props.projectId,
    });
    const serviceAdmin = new ProjectIamBinding(
        this,
        'service-account-iam-admin',
        {
          role: 'roles/run.admin',
          members: [`serviceAccount:${this.serviceAccount.email}`],
          project: this.provider.project!,
        },
    );
    const imageTag = new TerraformVariable(this, 'image-tag', {
      default: 'latest',
      description: 'While building and pushing the Docker image, the tag ' +
        'should be specified here so Cloud Run can deploy the correct image ' +
        'version.',
      type: 'string',
    });
    const cloudRunService = new CloudRunServiceWrapper(this, 'server', {
      name: RegistryName.RAILS_APP,
      region: this.provider.region!,
      project: this.provider.project!,
      registryPath: props.registryPath,
      env: {
        GO_LOG: env.isProd ? 'info' : 'debug',
        PROJECT_ID: env.projectId,
      },
      imageName: IMAGE_NAME,
      imageTag: imageTag.value,
      maxScale: 1,
      memory: Memory.gigabytes(1),
      serviceAccount: this.serviceAccount,
      ports: [8088],
      dependsOn: [serviceAdmin],
      vpcAccessConnectorId: props.vpcAccessConnectorId,
    });
    new CloudRunServiceIamMember(this, 'allow-requests', {
      role: 'roles/run.invoker',
      member: 'domain:r0m4n.com',
      // Using the fully qualified service link because the location argument
      // otherwise gets set to the "zone" not the "region" and is registered
      // incorrectly thus making the request for the service an invalid 404.
      // @see https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service_iam
      // projects/{{project}}/locations/{{location}}/services/{{service}}
      service: join(
          'projects',
          this.provider.project!,
          'locations',
          this.provider.region!,
          'services',
          cloudRunService.name,
      ),
    });
    new ProjectIamMember(this, 'access-firestore', {
      role: 'roles/datastore.user',
      member: `serviceAccount:${this.serviceAccount.email}`,
      project: env.projectId,
    });
    // After this is created, you will need to go to the DNS hosting provider
    // and register a record for the new domain/subdomain.
    new CloudRunDomainMapping(this, 'domain-map', {
      name: `${env.isProd ? '' : env.name + '.'}layhold.xyz`,
      location: env.region,
      metadata: {
        namespace: this.provider.project!,
      },
      spec: {
        routeName: cloudRunService.name,
      },
    });
  }
}
