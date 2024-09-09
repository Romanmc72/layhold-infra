import {GcsBackend} from 'cdktf';
import {IBaseGCPStack} from '../base';

/**
 * Helper function to return the Terraform backend bucket's name given a
 * specific project
 * @param {string} project - The project Id
 * @return {string} - The Terraform Backend Bucket name
 */
export function getBackendBucketName(project: string): string {
  return `${project}-terraform-backend`;
}

/**
 * Sets up the Google Cloud Storage Backend for the terraform state files
 */
export class SecureGcsBackend extends GcsBackend {
  /**
   * Creates the GCS Backend
   * @param {Construct} scope - The stack to have a backend for
   * @param {string} stackId - The ID for the stack whose backend is remote
   */
  constructor(scope: IBaseGCPStack, stackId: string) {
    const bucket = getBackendBucketName(scope.provider.project!);
    super(scope, {
      bucket,
      prefix: `states/${stackId}/`,
    });
  }
}
