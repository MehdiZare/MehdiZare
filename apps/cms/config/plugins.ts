import type { Core } from '@strapi/strapi';
import { validateCmsEnv } from './env-validation';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  validateCmsEnv(env);

  return {
    'users-permissions': {
      config: {
        jwtSecret: env('USERS_PERMISSIONS_JWT_SECRET', env('JWT_SECRET')),
      },
    },
  };
};

export default config;
