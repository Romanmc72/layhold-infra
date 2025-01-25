import {BaseGCPStackProps} from '../constructs';

/**
 * The set of properties that make up a specific environment.
 */
export interface DeploymentEnvironment extends Omit<
  BaseGCPStackProps, 'stateBucket'> {
  /**
   * Whether or not this environment is production.
   */
  isProd: boolean;
  /**
   * The unique, human readable name for this environment.
   */
  name: string;
  /**
   * The gcp project name for this environment (may differ from the projectId).
   */
  projectName: string;
}

/**
 * The array of environment names
 */
export const ENV_NAMES: {[name: string]: string} = {
  DEV: 'dev',
  PROD: 'prod',
} as const;

/**
 * The development environment for testing purposes.
 */
export const DEV_ENVIRONMENT: DeploymentEnvironment = {
  isProd: false,
  location: 'US',
  name: ENV_NAMES.DEV,
  projectId: process.env.LAYHOLD_DEV_PROJECT_ID!,
  projectName: process.env.LAYHOLD_DEV_PROJECT_NAME!,
  projectNumber: parseInt(process.env.LAYHOLD_DEV_PROJECT_NUMBER!),
  region: process.env.LAYHOLD_DEV_PROJECT_REGION!,
  zone: process.env.LAYHOLD_DEV_PROJECT_ZONE!,
};

/**
 * The production environment for production purposes.
 */
export const PROD_ENVIRONMENT: DeploymentEnvironment = {
  isProd: true,
  location: 'US',
  name: ENV_NAMES.PROD,
  projectId: 'layhold-app',
  projectName: 'layhold-app',
  projectNumber: 625223699075,
  region: 'us-central1',
  zone: 'us-central1-a',
};

export const ENVIRONMENTS: DeploymentEnvironment[] = [
  DEV_ENVIRONMENT,
  PROD_ENVIRONMENT,
];
