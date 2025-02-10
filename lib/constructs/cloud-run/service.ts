import {join} from 'path';
import {
  CloudRunService,
  CloudRunServiceConfig,
  CloudRunServiceTemplateSpecVolumes,
  CloudRunServiceTemplateSpecContainersVolumeMounts,
} from '@cdktf/provider-google/lib/cloud-run-service';
import {
  SecretManagerSecret,
} from '@cdktf/provider-google/lib/secret-manager-secret';
import {
  SecretManagerSecretIamMember,
} from '@cdktf/provider-google/lib/secret-manager-secret-iam-member';
import {
  ServiceAccount,
} from '@cdktf/provider-google/lib/service-account';
import {Construct} from 'constructs';
import {Cpu} from './cpu';
import {Memory} from './memory';

/**
 * The properties to create the cloud run service using this wrapper.
 */
export interface CloudRunServiceWrapperProps extends Omit<
  CloudRunServiceConfig, 'template' | 'location'
> {
  /**
   * Any additional arguments to pass to the entrypoint. These will replace
   * any cmd properties specified in the image's default settings. If not
   * specified the image's defaults will be used.
   *
   * @default undefined
   */
  cmd?: string[];
  /**
   * Overrides the container's default entrypoint. If unspecified it will use
   * the image's default.
   *
   * @default undefined
   */
  entrypoint?: string[];
  /**
   * Any environment variables to set. These will be set at container deploy
   * time and are not dynamic.
   *
   * @default undefined
   */
  env?: {[varName: string]: string};
  /**
   * The name of the Container Image in the artifact registry
   */
  imageName: string;
  /**
   * The tag to the specific image version to use
   */
  imageTag: string;
  /**
   * The minimum amount of instances to run in parallel
   *
   * @default 0
   */
  minScale?: number;
  /**
   * The maximum amount of instances to run in parallel. Leaving undefined
   * or < 0 will result in an unlimited number of instances. Any positive
   * number that is less than the minScale will raise an error.
   *
   * @default -1
   */
  maxScale?: number;
  /**
   * The name of the service
   */
  name: string;
  /**
   * The port numbers to use for the application
   */
  ports: number[];
  /**
   * The GCP Project this service will deploy to
   */
  project: string;
  /**
   * The GCP Region this service will deploy to
   */
  region: string;
  /**
   * The path to the Artifact Registry where the container image lives
   */
  registryPath: string;
  /**
   * The array of secrets manager secrets to attach to the running image as
   * mounted volumes
   *
   * @default undefined
   */
  secrets?: SecretManagerSecret[];
  /**
   * The service account that will run this container
   */
  serviceAccount: ServiceAccount;
  /**
   * The Vpc Access Connector Id that point to the serverless access connector
   * that the service will use.
   */
  vpcAccessConnectorId?: string;
  /**
   * The memory to allocate to the service.
   *
   * @default Memory.megabytes(512)
   */
  memory?: Memory;
  /**
   * The amount of CPU to allocate to the service
   *
   * @default Cpu.m(1000)
   */
  cpu?: Cpu;
}

/**
 * A convenience wrapper for running a Cloud Run Service. There is a
 * lot that goes into the spec, but this makes it easier to develop quickly
 * without having to remember how to construct the JSON container specs or
 * template metadata/annotations.
 *
 * Here is the full yaml reference:
 * @see https://cloud.google.com/run/docs/reference/yaml/v1
 */
export class CloudRunServiceWrapper extends CloudRunService {
  /**
   * The fully qualified service name for use in granting IAM member/bindings.
   * Of the form:
   * projects/{{project}}/locations/{{location}}/services/{{service}}
   * Creating this ourself otherwise the location is set to the "zone"
   * not the "region" and is registered incorrectly thus making the request
   * for the service an invalid 404.
   * @see https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service_iam
   */
  public readonly serviceName: string;

  /**
   * Instantiates the cloud run service
   * @param {Construct} scope - the stack this service lives in
   * @param {string} id - the unique service Id
   * @param {CloudRunServiceWrapperProps} props - the props for the service
   */
  constructor(
      scope: Construct,
      id: string,
      props: CloudRunServiceWrapperProps,
  ) {
    // Scaling validation and annotations
    const minScale = props.minScale ?? 0;
    const maxScale = props.maxScale ?? -1;
    const memory = (props.memory ?? Memory.megabytes(512)).toString();
    const cpu = (props.cpu ?? Cpu.m(1000)).toString();
    if (maxScale > 0 && maxScale < minScale) {
      throw new Error(
          'maxScale must be larger than minScale if specified ' +
          `maxScale: ${props.maxScale}; minScale: ${props.minScale};`,
      );
    }
    const annotations: {[key: string]: string} = {
      'autoscaling.knative.dev/minScale': `${minScale}`,
    };
    if (maxScale > -1) {
      annotations['autoscaling.knative.dev/maxScale'] = `${maxScale}`;
    }
    if (props.vpcAccessConnectorId) {
      annotations['run.googleapis.com/vpc-access-connector'] =
        props.vpcAccessConnectorId;
      annotations['run.googleapis.com/vpc-access-egress'] = 'all-traffic';
    }
    // Mounting secrets as attached volumes for real-time and read-only
    // secret synchronization
    const volumes: CloudRunServiceTemplateSpecVolumes[] = [];
    const secretMountDirectory = '/mounts/secrets/';
    const volumeMounts:
      CloudRunServiceTemplateSpecContainersVolumeMounts[] = [];
    if (props.secrets) {
      annotations['run.googleapis.com/secrets'] = props.secrets.map(
          (secret) =>
            `${secret.secretId}:${secret.id}`,
      ).join(',');
      props.secrets.forEach((secret, index) => {
        volumeMounts.push({
          // should only have alphanumeric characters, hyphens and underscores
          name: secret.secretId,
          mountPath: join(secretMountDirectory, secret.secretId),
        });
        volumes.push({
          name: secret.secretId,
          secret: {
            secretName: secret.secretId,
            // Read-only file mode
            defaultMode: 444,
            items: [{
              key: 'latest',
              path: 'secret',
            }],
          },
        });
        new SecretManagerSecretIamMember(
            scope,
            `${id}-access-secret-${index}`,
            {
              role: 'roles/secretmanager.secretAccessor',
              member: `serviceAccount:${props.serviceAccount.email}`,
              secretId: secret.secretId,
            },
        );
      });
    }
    // Adding the secret's file as an env var that matches the name of the
    // secret itself to make it so you don't need to remember the mount
    // directory location.
    const secretsEnvVars: {[s: string]: string} = props.secrets?.reduce(
        (secretMapping, secret) => (
          {
            ...secretMapping,
            [secret.secretId]: join(
                secretMountDirectory,
                secret.secretId,
                'secret',
            ),
          }
        ),
        {},
    ) ?? {};

    // translating the input props to the crazy template.spec syntax
    const properties: CloudRunServiceConfig = {
      name: props.name,
      location: props.region,
      project: props.project,
      template: {
        metadata: {
          annotations,
        },
        spec: {
          serviceAccountName: props.serviceAccount.email,
          containers: [{
            image: `${props.registryPath}/${props.imageName}:${props.imageTag}`,
            command: props.entrypoint,
            args: props.cmd,
            resources: {limits: {memory, cpu}, requests: {memory, cpu}},
            ports: props.ports.map((port) => {
              return {
                containerPort: port,
                name: 'http1',
              };
            }),
            env: Object.entries({...props.env, ...secretsEnvVars}).map(
                ([name, value]) => ({name, value}),
            ),
            volumeMounts,
          }],
          volumes,
        },
      },
    };
    super(scope, id, {...props, ...properties});
    console.log(`project: ${props.project}, region: ${props.region}, name: ${this.name}`);
    this.serviceName = join(
        'projects',
        props.project,
        'locations',
        props.region,
        'services',
        this.name,
    );
  }
}
