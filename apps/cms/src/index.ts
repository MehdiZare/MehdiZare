import type { Core } from '@strapi/strapi';
import { ensureExistingAdmin } from './utils/require-existing-admin';

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
   * REQUIRE_EXISTING_ADMIN=true (src/utils/require-existing-admin.ts).
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureExistingAdmin(strapi);
  },
};
