import type { Core } from '@strapi/strapi';
import { resolveR2Endpoint, validateCmsEnv } from './env-validation';

type EnvAccessor = Core.Config.Shared.ConfigParams['env'];

// Any of these turns the R2 provider on; then every R2_REQUIRED name must be set.
const R2_TRIGGERS = ['R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const;
const R2_REQUIRED = [...R2_TRIGGERS, 'R2_PUBLIC_URL'] as const;

// Cloudflare R2 through the official S3 provider when the R2 credentials are
// set (cms-platform). Without them uploads stay on the local provider, so dev
// and CI need no bucket. A partial R2 config fails the boot instead of
// silently writing uploads to the container disk, which a redeploy wipes.
function uploadConfig(env: EnvAccessor) {
  if (!R2_TRIGGERS.some((name) => Boolean(env(name)))) {
    return undefined;
  }

  const endpoint = resolveR2Endpoint(env);
  const missing: string[] = R2_REQUIRED.filter((name) => !env(name));
  if (!endpoint) missing.push('R2_ACCOUNT_ID (or R2_ENDPOINT)');
  if (missing.length > 0) {
    throw new Error(`Incomplete R2 upload config, missing: ${missing.join(', ')}.`);
  }

  return {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('R2_PUBLIC_URL'),
        rootPath: env('R2_ROOT_PATH', undefined),
        s3Options: {
          credentials: {
            accessKeyId: env('R2_ACCESS_KEY_ID'),
            secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
          },
          endpoint,
          region: env('R2_REGION', 'auto'),
          forcePathStyle: true,
          // AWS SDK >= 3.729 adds CRC checksums to every request by default;
          // send them only where S3 requires them, for S3-compatible R2.
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
          params: {
            Bucket: env('R2_BUCKET'),
            // R2 has no object ACLs. The key must be present: without it the
            // provider defaults every upload to ACL public-read.
            ACL: undefined,
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  };
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  validateCmsEnv(env);
  const upload = uploadConfig(env);

  return {
    'users-permissions': {
      config: {
        jwtSecret: env('USERS_PERMISSIONS_JWT_SECRET', env('JWT_SECRET')),
      },
    },
    ...(upload ? { upload } : {}),
  };
};

export default config;
