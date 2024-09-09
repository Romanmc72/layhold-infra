import {GoogleProvider} from '@cdktf/provider-google/lib/provider';
import {TerraformStack} from 'cdktf';

/**
 * The common interface used by the base GCP stack. This helps to alleviate any
 * circular references that may arise from stacks that need to know the shape
 * of the Base GCP Stack but that the Base GCP Stack also needs to be aware of.
 * Both can reference this interface and not need to worry about a dependency
 * conflict.
 */
export interface IBaseGCPStack extends TerraformStack {
  /**
   * The google provider for this stack
   */
  readonly provider: GoogleProvider;
  /**
   * The GCP location that GCP stacks will default to (not included in
   * provider, but required by GCS)
   */
  readonly location: string;
}
