import type { Core } from '@strapi/strapi';
import { readAllowedCorsOrigins, validateCmsEnv } from './env-validation';

function toOrigin(urlValue: string | undefined): string | null {
  if (!urlValue) return null;

  try {
    const parsed = new URL(urlValue);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  validateCmsEnv(env);
  const r2AccountId = env('R2_ACCOUNT_ID');
  const resolvedEndpoint =
    env('R2_ENDPOINT') ||
    (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : undefined);

  const r2Origins = Array.from(
    new Set(
      [
        toOrigin(env('R2_PUBLIC_URL')),
        toOrigin(resolvedEndpoint),
      ].filter((value): value is string => Boolean(value))
    )
  );
  const corsOrigins = readAllowedCorsOrigins(env);

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'default-src': ["'self'"],
            'base-uri': ["'self'"],
            'frame-ancestors': ["'none'"],
            'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...r2Origins],
            'media-src': ["'self'", 'data:', 'blob:', ...r2Origins],
            'connect-src': ["'self'", 'https:', ...r2Origins],
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        origin: corsOrigins,
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        credentials: true,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
