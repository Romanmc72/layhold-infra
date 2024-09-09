import {App} from 'cdktf';
import {DeploymentEnvironment} from './environments';
import {
  CloudRunStack,
  ContainerRegistryStack,
  RegistryName,
  ServicesStack,
  TerraformStateBucketStack,
} from '../stacks';
import {BaseGCPStackProps} from '../constructs';

export interface ApplicationStacks {
  cloudRunStack: CloudRunStack;
  containerRegistryStack: ContainerRegistryStack;
  serviceStack: ServicesStack;
  terraformStateBucketStack: TerraformStateBucketStack;
}

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
  const registry = new ContainerRegistryStack(
      app,
      environment,
      baseStackProps,
  );
  new CloudRunStack(app, environment, {
    ...baseStackProps,
    registryPath: registry.getRegistryPath(RegistryName.RAILS_APP),
    dependsOn: [serviceStack, registry],
  });
}
