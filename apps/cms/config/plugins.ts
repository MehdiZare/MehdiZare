import type { Core } from '@strapi/strapi';
import { validateCmsEnv } from './env-validation';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  validateCmsEnv(env);
  const usersPermissionsJwtSecret = env(
    'USERS_PERMISSIONS_JWT_SECRET',
    env('JWT_SECRET')
  );
  const r2AccessKeyId = env('R2_ACCESS_KEY_ID');
  const r2SecretAccessKey = env('R2_SECRET_ACCESS_KEY');
  const r2Bucket = env('R2_BUCKET');
  const r2AccountId = env('R2_ACCOUNT_ID');

  const resolvedEndpoint =
    env('R2_ENDPOINT') ||
    (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');

  const hasR2Config = Boolean(
    r2AccessKeyId &&
      r2SecretAccessKey &&
      r2Bucket &&
      resolvedEndpoint
  );

  const pluginConfig: Core.Config.Plugin = {
    'users-permissions': {
      config: {
        jwtSecret: usersPermissionsJwtSecret,
      },
    },
  };

  if (hasR2Config) {
    pluginConfig.upload = {
      config: {
        provider: 'aws-s3',
        providerOptions: {
          baseUrl: env('R2_PUBLIC_URL'),
          rootPath: env('R2_ROOT_PATH'),
          s3Options: {
            credentials: {
              accessKeyId: r2AccessKeyId,
              secretAccessKey: r2SecretAccessKey,
            },
            endpoint: resolvedEndpoint,
            region: env('R2_REGION', 'auto'),
            forcePathStyle: env.bool('R2_FORCE_PATH_STYLE', false),
            params: {
              Bucket: r2Bucket,
              // Keep key present but value empty/undefined for R2.
              // R2 does not support ACL operations.
              ACL: env('R2_ACL') as string | undefined,
              signedUrlExpires: env.int('R2_SIGNED_URL_EXPIRES', 900),
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

  return pluginConfig;
};

export default config;
