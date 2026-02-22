import type { Core } from '@strapi/strapi';
import { validateCmsEnv } from './env-validation';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  proxy: env.bool('IS_BEHIND_PROXY', true),
});

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  validateCmsEnv(env);
  return config({ env });
};
