// Boot guard: with REQUIRE_EXISTING_ADMIN=true (set by cms-platform), a
// database without an admin user stops the boot. A wrong DATABASE_URL, schema
// or an empty restore then fails the deploy instead of serving Strapi's
// first-admin registration page to anyone who finds it first.
//
// Only the serving commands (`strapi start`, `strapi develop`) are guarded.
// Every Strapi CLI command that loads the app (`admin:create-user`, `import`,
// `export`, `transfer`, `console`, ...) also runs the bootstrap lifecycle, and
// the runbook needs `import` and `admin:create-user` on an empty database
// before the first boot.

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

const SERVING_COMMANDS = new Set(['start', 'develop']);

// The Strapi CLI command: the first non-option argument after the script.
// `develop` workers are cluster forks and inherit the primary's argv.
export function strapiCommand(argv: readonly string[] = process.argv): string | undefined {
  return argv.slice(2).find((arg) => !arg.startsWith('-'));
}

export function isServingCommand(argv: readonly string[] = process.argv): boolean {
  const command = strapiCommand(argv);
  return command !== undefined && SERVING_COMMANDS.has(command);
}

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
  argv: readonly string[] = process.argv,
): Promise<void> {
  if (!isEnabled(requireExistingAdmin) || !isServingCommand(argv)) {
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
    `[admin-check] REQUIRE_EXISTING_ADMIN=true but the database has 0 admin users; refusing to boot. Check DATABASE_URL and DATABASE_SCHEMA, or restore the data and create the admin with \`strapi admin:create-user\` first (that command and \`strapi import\` are not guarded). ${target}`,
  );
}
