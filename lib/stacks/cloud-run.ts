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
import {Construct} from 'constructs';
import {
  BaseGCPStack,
  BaseGCPStackProps,
  CloudRunServiceWrapper,
  Memory,
  SecretWithVersion,
} from '../constructs';
import {APP_NAME, IMAGE_NAME} from '../constants';
import {DeploymentEnvironment, ENV_NAMES} from '../config/environments';
import {RegistryName} from './container-registry';

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
  /**
   * The tag that is tied to the image to deploy from the artifact registry.
   *
   * @default 'latest'
   */
  imageTag?: string;
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
      accountId: `${APP_NAME}-cloud-run-server`,
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
    const {imageTag = 'latest'} = props;
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
      imageTag: imageTag,
      minScale: 1,
      maxScale: 1,
      memory: Memory.gigabytes(1),
      secrets: [
        new SecretWithVersion(this, 'database-url', {
          secretId: 'NEON_DATABASE_URL',
          replication: {automatic: true},
        }),
        new SecretWithVersion(this, 'main-encryption-key', {
          secretId: 'RAILS_MAIN_ENCRYPTION_KEY',
          replication: {automatic: true},
        }),
        new SecretWithVersion(this, 'encrypted-secrets', {
          secretId: 'RAILS_ENCRYPTED_SECRETS',
          replication: {automatic: true},
        }),
        new SecretWithVersion(this, 'email-api-key', {
          secretId: 'LAYHOLD_EMAIL_SECRET',
          replication: {automatic: true},
        }),
      ],
      serviceAccount: this.serviceAccount,
      ports: [3000],
      dependsOn: [serviceAdmin],
      vpcAccessConnectorId: props.vpcAccessConnectorId,
    });
    new CloudRunServiceIamMember(this, 'allow-requests', {
      role: 'roles/run.invoker',
      member: 'domain:r0m4n.com',
      service: cloudRunService.serviceName,
    });
    new ProjectIamMember(this, 'access-firestore', {
      role: 'roles/datastore.user',
      // TODO: create an IAM Service Account wrapper that just returns this
      // string so we don't have to keep recreating it to grant stuff
      member: `serviceAccount:${this.serviceAccount.email}`,
      project: env.projectId,
    });
    // Skipping DNS setup for personal development environment
    if (env.name !== ENV_NAMES.DEV) {
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
}
