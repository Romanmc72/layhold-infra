import {App} from 'cdktf';
import {DeploymentEnvironment} from './environments';
import {
  CloudRunStack,
  ContainerRegistryStack,
  IamBindingStack,
  RegistryName,
  ServicesStack,
  TerraformStateBucketStack,
  WorkloadIdentityPoolStack,
} from '../stacks';
import {IMAGE_REPO} from '../constants';
import {BaseGCPStackProps} from '../constructs';

/**
 * Create a single environment.
 * @param {App} app The overall app this environment will exist in.
 * @param {DeploymentEnvironment} environment The settings specific to
 * this environment.
 */
export function deployEnvironment(
    app: App,
    environment: DeploymentEnvironment,
): void {
  const stateBucketStack = new TerraformStateBucketStack(
      app,
      environment,
      environment,
  );
  const serviceStack = new ServicesStack(app, environment, {
    ...environment,
    stateBucket: stateBucketStack.stateBucket,
  });
  const baseStackProps: BaseGCPStackProps = {
    ...environment,
    stateBucket: stateBucketStack.stateBucket,
    dependsOn: [serviceStack],
  };
  const workloadIdPoolStack = new WorkloadIdentityPoolStack(
      app,
      environment,
      baseStackProps,
  );
  new IamBindingStack(
      app,
      environment, {
        ...baseStackProps,
        githubDeploymentRepo: IMAGE_REPO,
        workloadIdentityPoolName:
          workloadIdPoolStack.ghWorkloadIdentityPoolName,
      },
  );
  const registry = new ContainerRegistryStack(
      app,
      environment,
      {
        ...baseStackProps,
        workloadIdentityPoolName:
          workloadIdPoolStack.ghWorkloadIdentityPoolName,
      },
  );
  new CloudRunStack(app, environment, {
    ...baseStackProps,
    registryPath: registry.getRegistryPath(RegistryName.RAILS_APP),
    dependsOn: [serviceStack, registry],
  });
}
