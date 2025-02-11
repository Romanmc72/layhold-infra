import {
  ArtifactRegistryRepository,
} from '@cdktf/provider-google/lib/artifact-registry-repository';
import {
  ArtifactRegistryRepositoryIamMember,
} from '@cdktf/provider-google/lib/artifact-registry-repository-iam-member';
import {Construct} from 'constructs';

import {DeploymentEnvironment} from '../config';
import {
  BaseGCPStack,
  BaseGCPStackProps,
} from '../constructs';

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
 * The properties required to create the container registry stack.
 */
export interface ContainerRegistryStackProps extends BaseGCPStackProps {
  /**
   * The iam principal set that github actions will assume.
   * @example `principalSet://iam.googleapis.com/${workloadIdentityPoolName}/attribute.repository/${IMAGE_REPO}`
   */
  githubActionsPrincipalSet: string;
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
   * @param {ContainerRegistryStackProps} props - The properties
   * specifically for this stack.
   */
  constructor(
      scope: Construct,
      env: DeploymentEnvironment,
      props: ContainerRegistryStackProps,
  ) {
    super(scope, 'container-registry', env.name, props);
    Object.entries(REGISTRIES).forEach(([registryName, description]) =>
      this.registryFactory(
          registryName,
          description,
          props.githubActionsPrincipalSet,
      ),
    );
  }

  /**
   * Creates an Artifact Registry Repo using streamlined inputs and assigns it
   * to the internal registry mapping
   * @param {string} name - The name of the registry
   * @param {RegistrySettings} settings - The registry settings object
   * @param {string} grantPrincipal - The princpal that will write to
   * the registry
   * @return {void}
   */
  private registryFactory(
      name: string,
      settings: RegistrySettings,
      grantPrincipal: string,
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
      member: grantPrincipal,
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
