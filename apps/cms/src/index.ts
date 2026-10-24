import type { Core } from '@strapi/strapi';
import { bootstrapManagedApiTokens, strapiManagedTokenDeps } from './utils/managed-api-tokens';
import { ensureExistingAdmin } from './utils/require-existing-admin';
import { bootstrapRevalidateWebhook, strapiRevalidateWebhookDeps } from './utils/revalidate-webhook';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * Refuses to boot against a database without an admin user when
   * REQUIRE_EXISTING_ADMIN=true (src/utils/require-existing-admin.ts), then
   * applies what cms-platform manages: the API tokens in MANAGED_API_TOKENS
   * (a malformed value fails the boot) and the web revalidation webhook from
   * REVALIDATION_SECRET + WEB_REVALIDATE_URL. Neither logs a secret.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureExistingAdmin(strapi);
    await bootstrapManagedApiTokens(strapiManagedTokenDeps(strapi));
    await bootstrapRevalidateWebhook(strapiRevalidateWebhookDeps(strapi));
  },
};
