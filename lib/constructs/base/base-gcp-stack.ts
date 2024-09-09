import {GoogleProvider} from '@cdktf/provider-google/lib/provider';
import {TerraformStack} from 'cdktf';
import {Construct} from 'constructs';
import {IBaseGCPStack} from './base-stack-interface';
import {SecureGcsBackend} from '../backend';
import {SecureBucket} from '../secure-bucket';

/**
 * These are the basic necessities of all stacks that use GCP resources
 */
export interface BaseGCPStackProps {
  /**
   * Any stacks that must be deployed first, but have no explicit
   * ties in terms of exported outputs between stacks.
   */
  dependsOn?: TerraformStack[];
  /**
   * The GCP Project ID that this stack will be deployed to
   */
  projectId: string;
  /**
   * The unique GCP Project Number.
   */
  projectNumber: number;
  /**
   * The default location for things (when one is required)
   * @example 'US'
   */
  location: string;
  /**
   * The terraform state management bucket
   */
  stateBucket: SecureBucket;
  /**
   * The default GCP region to create in
   * @example 'us-central1'
   */
  region: string;
  /**
   * The default GCP zone to deploy to
   * @example 'us-central1-a'
   */
  zone: string;
}

/**
 * This is the baseline for a initializing a stack. Most if not all stacks will
 * extend this class.
 */
export class BaseGCPStack extends TerraformStack implements IBaseGCPStack {
  public readonly provider: GoogleProvider;

  public readonly location: string;

  /**
   * This is the constructor for the base GCP stack
   * @param {Construct} scope - The app within which this stack will be created
   * @param {string} stackName - The name for this stack
   * @param {string} envName - The name for the environment
   * @param {BaseGCPStackProps} props - The properties required to initialize
   * any GCP Stack
   */
  constructor(
      scope: Construct,
      stackName: string,
      envName: string,
      props: BaseGCPStackProps,
  ) {
    const id = `${stackName}-${envName}-${props.region}`;
    super(scope, id);
    (props.dependsOn ?? []).forEach((stack) => this.addDependency(stack));
    this.provider = new GoogleProvider(this, `${props.projectId}-google`, {
      project: props.projectId,
      region: props.region,
      zone: props.zone,
    });
    this.location = props.location;
    new SecureGcsBackend(this, id);
  }
}
