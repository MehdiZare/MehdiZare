import type { Core } from '@strapi/strapi';

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

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...r2Origins],
            'media-src': ["'self'", 'data:', 'blob:', ...r2Origins],
            'connect-src': ["'self'", 'https:', ...r2Origins],
          },
        },
      },
    },
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
