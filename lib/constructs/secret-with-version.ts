import {randomBytes} from 'crypto';
import {
  SecretManagerSecret,
  SecretManagerSecretConfig,
} from '@cdktf/provider-google/lib/secret-manager-secret';
import {
  SecretManagerSecretIamMember,
} from '@cdktf/provider-google/lib/secret-manager-secret-iam-member';
import {
  SecretManagerSecretVersion,
} from '@cdktf/provider-google/lib/secret-manager-secret-version';
import {Construct} from 'constructs';

/**
 * The set of properties required to instantiate the secret with a version.
 */
export interface SecretWithVersionProps extends SecretManagerSecretConfig {
  /** The iam member that will have admin access to this secret. */
  iamMember?: string;
}

/**
 * Creates a Secrets Manager Secret and populates it with a default
 * string of base64 encoded random nonsense
 */
export class SecretWithVersion extends SecretManagerSecret {
  /**
   * Constructs the secret with version
   * @param {COnstruct} scope - The stack this secret lives in
   * @param {string} id - the id for the secret
   * @param {SecretWithVersionProps} props - the properties to create
   * the secret
   */
  constructor(scope: Construct, id: string, props: SecretWithVersionProps) {
    super(scope, id, props);
    new SecretManagerSecretVersion(this, 'initial-version', {
      secret: this.id,
      secretData: randomBytes(32).toString('base64'),
      lifecycle: {
        ignoreChanges: ['secret_data'],
      },
    });
    if (props.iamMember) {
      new SecretManagerSecretIamMember(this, 'member', {
        secretId: this.id,
        member: props.iamMember,
        role: 'roles/secretmanager.admin',
      });
    }
  }
}
