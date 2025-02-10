import {ProjectIamMember} from '@cdktf/provider-google/lib/project-iam-member';
import {Construct} from 'constructs';

import {DeploymentEnvironment} from '../config';
import {
  BaseGCPStack,
  BaseGCPStackProps,
} from '../constructs';

/**
 * The properties required to create the Iam Binding Stack.
 */
export interface IamBindingStackProps extends BaseGCPStackProps {
  /**
   * The name of the workload identity pool that will
   * be responsible for managing all GCP resources.
   * @example `projects/${project_number}/locations/global` +
   *  `/workloadIdentityPools/${workload_identity_pool_id}`
   */
  workloadIdentityPoolName: string;
  /**
   * The github repository that is allowed to modify our GCP projects.
   */
  githubDeploymentRepo: string;
}

/**
 * This stack contains Iam roles and bindings that apply at a GCP account level.
 */
export class IamBindingStack extends BaseGCPStack {
  /**
   * The constructor that initializes this stack.
   * @param {Construct} scope - The App within which this stack lives.
   * @param {DeploymentEnvironment} env - The environment the stack will
   * deploy to.
   * @param {IamBindingStackProps} props - The properties
   * specifically for this stack.
   */
  constructor(
      scope: Construct,
      env: DeploymentEnvironment,
      props: IamBindingStackProps,
  ) {
    super(scope, 'iam-bindings', env.name, props);

    /**
     * This grants a particular github repo the rights to deploy this
     * infrastructure to our GCP projects.
     */
    new ProjectIamMember(this, `infra-permissions`, {
      project: this.provider.project!,
      role: 'roles/writer',
      member: `principalSet://iam.googleapis.com/${props.workloadIdentityPoolName}/attribute.repository/${props.githubDeploymentRepo}`,
    });

    /**
     * Allows the github repo to see and make changes to what API's are enabled.
     */
    new ProjectIamMember(this, `infra-permissions`, {
      project: this.provider.project!,
      role: 'roles/servicemanagement.serviceConsumer',
      member: `principalSet://iam.googleapis.com/${props.workloadIdentityPoolName}/attribute.repository/${props.githubDeploymentRepo}`,
    });
  }
}
