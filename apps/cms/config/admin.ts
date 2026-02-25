import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    sessions: {
      // Strapi 5 admin session defaults (seconds). Env vars remain optional overrides.
      accessTokenLifespan: env.int('ADMIN_AUTH_ACCESS_TOKEN_LIFESPAN', 1800),
      maxRefreshTokenLifespan: env.int('ADMIN_AUTH_MAX_REFRESH_TOKEN_LIFESPAN', 2_592_000),
      idleRefreshTokenLifespan: env.int('ADMIN_AUTH_IDLE_REFRESH_TOKEN_LIFESPAN', 1_209_600),
      maxSessionLifespan: env.int('ADMIN_AUTH_MAX_SESSION_LIFESPAN', 2_592_000),
      idleSessionLifespan: env.int('ADMIN_AUTH_IDLE_SESSION_LIFESPAN', 7_200),
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});

export default config;
