import {
  ArtifactRegistryRepository,
} from '@cdktf/provider-google/lib/artifact-registry-repository';
import {
  ArtifactRegistryRepositoryIamMember,
} from '@cdktf/provider-google/lib/artifact-registry-repository-iam-member';
import {ServiceAccount} from '@cdktf/provider-google/lib/service-account';
import {
  ServiceAccountIamBinding,
} from '@cdktf/provider-google/lib/service-account-iam-binding';
import {Construct} from 'constructs';

import {
  BaseGCPStack,
  BaseGCPStackProps,
} from '../constructs';
import {APP_NAME} from '../constants';
import {DeploymentEnvironment} from '../config';

/**
 * The list of available formats, the Terraform and GCP Providers do not give
 * a properly formatted Enum of valid values to choose from, and you get a
 * 400 error every time you try to create the object without one of these
 * formats exactly as specified.
 */
export enum RegistryFormat {
  DOCKER = 'DOCKER',
  MAVEN = 'MAVEN',
  NPM = 'NPM',
  PYTHON = 'PYTHON',
  APT = 'APT',
  YUM = 'YUM',
  KUBEFLOW = 'KFP',
  GO = 'GO',
}

/**
 * The settings for a given registry to be created
 */
interface RegistrySettings {
  /**
   * A text description for the registry that will appear in GCP
   */
  description: string;
  /**
   * The format for the registry
   *
   * @default RegistryFormat.DOCKER
   */
  format?: RegistryFormat;
}

/** The names of registries that exist in the project. */
export enum RegistryName {
  RAILS_APP = 'rails-app',
}

/**
 * The list of registry names that should exist.
 * If adding new registries do so here.
 */
export const REGISTRIES: {[name in RegistryName]: RegistrySettings} = {
  [RegistryName.RAILS_APP]: {description: 'The rails application for layhold.'},
};

/**
 * The mapping of registry names to registries
 */
export interface RegistryMapping {
  [name: string]: ArtifactRegistryRepository;
}

/**
 * This stack contains resources related specifically to the Firestore
 * database in GCP that we will use as the backend for our application.
 */
export class ContainerRegistryStack extends BaseGCPStack {
  /**
   * The Artifact Container registries to use for container storage
   */
  private registries: RegistryMapping = {};

  /**
   * The constructor that initializes this stack.
   * @param {Construct} scope - The App within which this stack lives.
   * @param {DeploymentEnvironment} env - The environment the stack will
   * deploy to.
   * @param {BaseGCPStackProps} props - The properties specifically for this
   * database stack.
   */
  constructor(
      scope: Construct,
      env: DeploymentEnvironment,
      props: BaseGCPStackProps,
  ) {
    super(scope, 'container-registry', env.name, props);
    const imagePushServiceAccount = new ServiceAccount(
        this,
        `${APP_NAME}-push-image-service-account`,
        {
          accountId: 'image-push',
          description: 'Allows users to impersonate it and ' +
          'push images to the Artifact Registry',
        },
    );
    new ServiceAccountIamBinding(this, 'allow-r0m4n-assume', {
      members: ['domain:r0m4n.com'],
      role: 'roles/iam.serviceAccountTokenCreator',
      serviceAccountId: imagePushServiceAccount.name,
    });
    Object.entries(REGISTRIES).forEach(([registryName, description]) =>
      this.registryFactory(
          registryName,
          description,
          imagePushServiceAccount,
      ),
    );
  }

  /**
   * Creates an Artifact Registry Repo using streamlined inputs and assigns it
   * to the internal registry mapping
   * @param {string} name - The name of the registry
   * @param {RegistrySettings} settings - The registry settings object
   * @param {ServiceAccount} pushServiceAccount -The service account that can
   * write to the registry
   * @return {void}
   */
  private registryFactory(
      name: string,
      settings: RegistrySettings,
      pushServiceAccount: ServiceAccount,
  ): void {
    const registry = new ArtifactRegistryRepository(
        this,
        `${name}-registry`,
        {
          description: settings.description,
          format: settings.format ?? RegistryFormat.DOCKER,
          location: this.provider.region,
          project: this.provider.project,
          repositoryId: name,
        },
    );
    this.registries[name] = registry;
    new ArtifactRegistryRepositoryIamMember(this, `push-permissions-${name}`, {
      project: this.provider.project,
      location: registry.location,
      repository: registry.name,
      role: 'roles/artifactregistry.writer',
      member: `serviceAccount:${pushServiceAccount.email}`,
    });
  }

  /**
   * Method for fetching a given registry by name
   * @param {RegistryName} name - The name of the registry to get
   * @return {string}- The registry path
   */
  public getRegistryPath(name: RegistryName): string {
    const registry = this.registries[name];
    if (registry) {
      return `${registry.location}-docker.pkg.dev/` +
        `${this.provider.project}/${registry.name}`;
    }
    throw new Error(
        `No registry found by the name of ${name} in this stack ${this}`,
    );
  }
}
