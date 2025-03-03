import {TerraformStack} from 'cdktf';
import {GoogleProvider} from '@cdktf/provider-google/lib/provider';
import {ProjectService} from '@cdktf/provider-google/lib/project-service';
import {Construct} from 'constructs';
import {DeploymentEnvironment} from '../config/environments';
import {
  BaseGCPStackProps,
  getBackendBucketName,
  SecureBucket,
} from '../constructs';

/**
 * The props to initialize the state backend stack
 */
export interface TerraformStateBucketStackProps extends Omit<
  BaseGCPStackProps, 'stateBucket'
> {}

/**
 * The stack that instantiates our terraform backend bucket
 */
export class TerraformStateBucketStack extends TerraformStack {
  public readonly stateBucket: SecureBucket;
  /**
   * The terraform state bucket stack. It needs to be the first stack
   * initialized otherwise nothing else will work.
   * @param {Construct} scope
   * @param {DeploymentEnvironment} env
   * @param {TerraformStateBucketStackProps} props
   */
  constructor(
      scope: Construct,
      env: DeploymentEnvironment,
      props: TerraformStateBucketStackProps,
  ) {
    const id = `terraform-state-${env.name}-${props.region}`;
    super(scope, id);
    new GoogleProvider(this, 'google', {
      project: props.projectId,
      region: props.region,
      zone: props.zone,
    });
    // The GCP IAM, KMS, and Storage APIs needs to be enabled before creating
    // the terraform state bucket
    const iamApi = new ProjectService(this, 'iam-api', {
      project: props.projectId,
      service: 'iam.googleapis.com',
    });
    const kmsApi = new ProjectService(this, 'kms-api', {
      project: props.projectId,
      service: 'cloudkms.googleapis.com',
    });
    const storageApi = new ProjectService(this, 'storage-api', {
      project: props.projectId,
      service: 'storage.googleapis.com',
    });
    const backendBucketName = getBackendBucketName(props.projectId);
    this.stateBucket = new SecureBucket(this, 'terraform-state-bucket', {
      name: backendBucketName,
      location: props.location,
      projectId: props.projectId,
      projectNumber: props.projectNumber,
      versioning: {enabled: true},
      dependsOn: [iamApi, kmsApi, storageApi],
    });
  }
}
