import {KmsCryptoKey} from '@cdktf/provider-google/lib/kms-crypto-key';
import {
  KmsCryptoKeyIamBinding,
} from '@cdktf/provider-google/lib/kms-crypto-key-iam-binding';
import {KmsKeyRing} from '@cdktf/provider-google/lib/kms-key-ring';
import {
  StorageBucket,
  StorageBucketConfig,
} from '@cdktf/provider-google/lib/storage-bucket';
import {Construct} from 'constructs';

/**
 * Creates a Kms key name based on a bucket name
 * @param {string} bucketName - The name of the bucket
 * @return {string} - The name to use for the bucket's KMS key
 */
export function generateKmsKeyNameForBucket(bucketName: string): string {
  return `${bucketName}-kms-key`;
}

export interface SecureBucketProps extends StorageBucketConfig {
  /**
   * Specify your own KMS key. If one is not specified, one will be provided.
   */
  encryptionKey?: KmsCryptoKey;
  /**
   * The default location for things (when one is required)
   * @example 'US'
   */
  location: string;
  /**
   * The globally unique name of the bucket
   */
  name: string;
  /**
   * The GCP Project ID that this stack will be deployed to
   */
  projectId: string;
  /**
   * The unique GCP Project Number
   */
  projectNumber: number;
}

/**
 * This is an override of the default settings on a GCS bucket to minimize the
 * risk that we misconfigure a bucket and publicly expose our data.
 */
export class SecureBucket extends StorageBucket {
  /**
   * The key used to encrypt data in this bucket.
   * The key associated to the bucket is otherwise not accessible.
   */
  public readonly kmsKey: KmsCryptoKey;

  /**
   * This is the constructor for the secure bucket
   * @param {Construct} scope - The app this bucket lives in
   * @param {string} id - The unique resource Id
   * @param {SecureBucketProps} props - The properties for a secure bucket
   */
  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    let kmsKey: KmsCryptoKey;
    if (!props.encryptionKey) {
      const kmsKeyName = generateKmsKeyNameForBucket(props.name);
      const kmsKeyRingName = `${kmsKeyName}-ring`;
      const keyRing = new KmsKeyRing(scope, kmsKeyRingName, {
        location: props.location.toLowerCase(),
        name: kmsKeyRingName,
      });
      kmsKey = new KmsCryptoKey(scope, kmsKeyName, {
        name: kmsKeyName,
        // Rotate after one year
        rotationPeriod: `${86400 * 365}s`,
        keyRing: keyRing.id,
      });
      new KmsCryptoKeyIamBinding(scope, `${kmsKeyName}-iam-bind`, {
        cryptoKeyId: kmsKey.id,
        role: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
        // If the default Storage Service Account for the project does not
        // have access to the key, nothing will be encrypted
        members: [
          `serviceAccount:service-${props.projectNumber}` +
          '@gs-project-accounts.iam.gserviceaccount.com',
        ],
      });
    } else {
      kmsKey = props.encryptionKey;
    }
    super(scope, id, {
      ...props,
      location: props.location,
      name: props.name,
      project: props.projectId,
      publicAccessPrevention: 'enforced',
      uniformBucketLevelAccess: true,
      encryption: {
        defaultKmsKeyName: kmsKey.id,
      },
    });
    this.kmsKey = kmsKey;
  }
}
