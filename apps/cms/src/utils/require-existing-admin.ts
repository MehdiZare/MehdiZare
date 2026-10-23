// Boot guard: with REQUIRE_EXISTING_ADMIN=true (set by cms-platform), a
// database without an admin user stops the boot. A wrong DATABASE_URL, schema
// or an empty restore then fails the deploy instead of serving Strapi's
// first-admin registration page to anyone who finds it first.

type DatabaseConnection = {
  client?: string;
  connection?: {
    connectionString?: string;
    database?: string;
    user?: string;
    schema?: string;
    filename?: string;
  };
};

type StrapiLike = {
  config: { get: (path: string) => unknown };
  db: { query: (uid: string) => { count: () => Promise<unknown> } };
  log: { info: (message: string) => void };
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isEnabled(value: string | undefined): boolean {
  return TRUE_VALUES.has(String(value ?? '').trim().toLowerCase());
}

// Names only: never the connection string or password.
export function describeDatabaseTarget(database: DatabaseConnection | undefined): string {
  const client = database?.client ?? 'unknown';
  const connection = database?.connection ?? {};
  if (client === 'sqlite') {
    return 'client=sqlite';
  }

  let name = connection.database;
  let user = connection.user;
  if (connection.connectionString) {
    try {
      const url = new URL(connection.connectionString);
      name = decodeURIComponent(url.pathname.replace(/^\//, '')) || undefined;
      user = decodeURIComponent(url.username) || undefined;
    } catch {
      // Unparseable URL: report nothing from it.
    }
  }

  return `client=${client} database=${name ?? 'unknown'} schema=${connection.schema ?? 'public'} user=${user ?? 'unknown'}`;
}

export async function ensureExistingAdmin(
  strapi: StrapiLike,
  requireExistingAdmin = process.env.REQUIRE_EXISTING_ADMIN,
): Promise<void> {
  if (!isEnabled(requireExistingAdmin)) {
    return;
  }

  const count = Number(await strapi.db.query('admin::user').count());
  if (!Number.isFinite(count)) {
    throw new Error('[admin-check] Could not count admin users.');
  }

  if (count > 0) {
    strapi.log.info(`[admin-check] Found ${count} admin user(s).`);
    return;
  }

  const target = describeDatabaseTarget(
    strapi.config.get('database.connection') as DatabaseConnection | undefined,
  );
  throw new Error(
    `[admin-check] REQUIRE_EXISTING_ADMIN=true but the database has 0 admin users; refusing to boot. Check DATABASE_URL and DATABASE_SCHEMA, or create the admin with \`strapi admin:create-user\` first. ${target}`,
  );
}
