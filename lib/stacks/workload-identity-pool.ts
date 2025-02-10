/* eslint max-len: 0 */
import {
  IamWorkloadIdentityPool,
} from '@cdktf/provider-google/lib/iam-workload-identity-pool';
import {
  IamWorkloadIdentityPoolProvider,
} from '@cdktf/provider-google/lib/iam-workload-identity-pool-provider';
import {Construct} from 'constructs';

import {DeploymentEnvironment} from '../config';
import {IMAGE_REPO} from '../constants';
import {BaseGCPStack, BaseGCPStackProps} from '../constructs';

/**
 * The properties required to initialize the workload identity pool stack.
 */
export interface WorkloadIdentityPoolStackProps extends BaseGCPStackProps {}

/**
 * The stack that create the federated workload identity constructs in GCP so
 * that github actions can automatically connect and run GCP related tasks
 * using short lived access tokens.
 *
 * @example Inside of a .github/workflows/whatever.yaml, you will
 * need to leverage the
 * `IamWorkloadIdentityPoolProvider.workloadIdentityPoolProviderId`
 * attributes from here inside of the auth step that looks like this
 *
 * ```yaml
 * - name: Log into GCP
 *     uses: 'google-github-actions/auth@v2'
 *     with:
 *       project_id: $PROJECT_NUMBER
 *       workload_identity_provider: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${IamWorkloadIdentityPool.workloadIdentityPoolId}/providers/${IamWorkloadIdentityPoolProvider.workloadIdentityPoolProviderId}
 * ```
 */
export class WorkloadIdentityPoolStack extends BaseGCPStack {
  /** The name of the github workload pool. */
  public readonly ghWorkloadIdentityPoolName: string;

  /**
   * Create the stack to manage workload identities.
   * @param {Construct} scope The app that the stack lives in.
   * @param {DeploymentEnvironment} env The environment the stack will
   * deploy to.
   * @param {WorkloadIdentityPoolStackProps} props The properties
   * required to initialize the stack.
   */
  constructor(
      scope: Construct,
      env: DeploymentEnvironment,
      props: WorkloadIdentityPoolStackProps,
  ) {
    super(scope, 'workload-identity', env.name, props);
    const ghPool = new IamWorkloadIdentityPool(this, 'gh-identity-pool', {
      workloadIdentityPoolId: 'github-actions',
      description: 'Allows GitHub Actions to request access tokens.',
      displayName: 'GitHub Actions',
    });
    new IamWorkloadIdentityPoolProvider(
        this,
        'gh-identity-pool-provider-rails',
        {
          workloadIdentityPoolId: ghPool.workloadIdentityPoolId,
          workloadIdentityPoolProviderId: 'github-actions-provider-rails',
          displayName: 'GitHub Actions Provider - Rails',
          description: 'Allows Github Actions to request access ' +
            'tokens for the Rails app.',
          attributeCondition:
            `attribute.repository_owner_id == "115838707" &&
            attribute.repository == "${IMAGE_REPO}" &&
            attribute.ref_type == "branch"`,
          attributeMapping: {
            'google.subject': 'assertion.sub',
            'attribute.actor': 'assertion.actor',
            'attribute.aud': 'assertion.aud',
            'attribute.repository': 'assertion.repository',
            'attribute.repository_owner_id': 'assertion.repository_owner_id',
            'attribute.ref_type': 'assertion.ref_type',
          },
          oidc: {issuerUri: 'https://token.actions.githubusercontent.com'},
        },
    );
    this.ghWorkloadIdentityPoolName = ghPool.name;
  }
}
