import test from 'node:test';
import assert from 'node:assert/strict';
import databaseConfig from '../config/database';
import pluginsConfig from '../config/plugins';
import serverConfig from '../config/server';
import {
  describeDatabaseTarget,
  ensureExistingAdmin,
  isEnabled,
  isServingCommand,
  strapiCommand,
} from '../src/utils/require-existing-admin';

type Vars = Record<string, string | undefined>;

// Production crypto so validateCmsEnv (a module-level latch) passes in any order.
const CRYPTO: Vars = {
  APP_KEYS: 'test-key-a,test-key-b',
  API_TOKEN_SALT: 'test-salt',
  ADMIN_JWT_SECRET: 'test-admin-jwt',
  TRANSFER_TOKEN_SALT: 'test-transfer-salt',
  JWT_SECRET: 'test-jwt',
  ENCRYPTION_KEY: 'test-encryption-key',
};

// Same contract as Strapi's env helper: empty or unset means the default.
function makeEnv(vars: Vars) {
  const read = (key: string, fallback?: unknown): any => {
    const value = vars[key];
    return value === undefined ? fallback : value;
  };
  const env = Object.assign(read, {
    int: (key: string, fallback?: number) =>
      vars[key] === undefined ? fallback : parseInt(vars[key] as string, 10),
    bool: (key: string, fallback?: boolean) =>
      vars[key] === undefined ? fallback : vars[key] === 'true',
    array: (key: string, fallback?: string[]) =>
      vars[key] === undefined ? fallback : (vars[key] as string).split(',').map((v) => v.trim()),
  });
  return { env: env as any };
}

const production = (vars: Vars) => makeEnv({ NODE_ENV: 'production', ...CRYPTO, ...vars });
const PG_URL = 'postgresql://mehdizare_cms:pw@db.example.test:25060/mehdizare_cms';

test('postgres with DATABASE_URL passes only connectionString, ssl and schema', () => {
  const result: any = databaseConfig(
    production({
      DATABASE_CLIENT: 'postgres',
      DATABASE_URL: PG_URL,
      DATABASE_SSL: 'true',
      DATABASE_SSL_CA: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
      DATABASE_POOL_MAX: '3',
    }),
  );
  const { connection } = result.connection;
  assert.deepEqual(Object.keys(connection).sort(), ['connectionString', 'schema', 'ssl']);
  assert.equal(connection.connectionString, PG_URL);
  assert.equal(connection.schema, 'public');
  assert.match(connection.ssl.ca, /BEGIN CERTIFICATE/);
  assert.equal(connection.ssl.rejectUnauthorized, true);
  assert.deepEqual(result.connection.pool, { min: 2, max: 3 });
});

test('postgres SSL stays off unless DATABASE_SSL=true', () => {
  const result: any = databaseConfig(
    production({ DATABASE_CLIENT: 'postgres', DATABASE_URL: PG_URL }),
  );
  assert.equal(result.connection.connection.ssl, false);
});

test('pool min never exceeds pool max', () => {
  const result: any = databaseConfig(
    production({ DATABASE_CLIENT: 'postgres', DATABASE_URL: PG_URL, DATABASE_POOL_MAX: '1' }),
  );
  assert.deepEqual(result.connection.pool, { min: 1, max: 1 });
});

for (const query of ['?sslmode=require', '?ssl=true', '?foo=1&sslrootcert=/ca.pem']) {
  test(`DATABASE_URL with ${query} is rejected without echoing the URL`, () => {
    assert.throws(
      () =>
        databaseConfig(
          production({ DATABASE_CLIENT: 'postgres', DATABASE_URL: `${PG_URL}${query}` }),
        ),
      (error: Error) => {
        assert.match(error.message, /must not carry sslmode/);
        assert.doesNotMatch(error.message, /pw@/);
        return true;
      },
    );
  });
}

test('postgres without a URL or discrete config throws', () => {
  assert.throws(
    () => databaseConfig(production({ DATABASE_CLIENT: 'postgres' })),
    /Postgres DB config missing/,
  );
});

test('postgres discrete config is used when no URL is set', () => {
  const result: any = databaseConfig(
    production({
      DATABASE_CLIENT: 'postgres',
      DATABASE_HOST: 'db.example.test',
      DATABASE_NAME: 'mehdizare_cms',
      DATABASE_USERNAME: 'mehdizare_cms',
    }),
  );
  const { connection } = result.connection;
  assert.equal(connection.connectionString, undefined);
  assert.equal(connection.host, 'db.example.test');
  assert.equal(connection.port, 5432);
});

test('sqlite is refused in production', () => {
  assert.throws(
    () => databaseConfig(production({ DATABASE_CLIENT: 'sqlite', DATABASE_FILENAME: '/data/cms.db' })),
    /not allowed in production/,
  );
  assert.throws(() => databaseConfig(production({})), /not allowed in production/);
});

test('sqlite stays the development default', () => {
  const result: any = databaseConfig(makeEnv({ NODE_ENV: 'development' }));
  assert.equal(result.connection.client, 'sqlite');
  assert.match(result.connection.connection.filename, /\.tmp\/data\.db$/);
});

test('an unknown client is rejected', () => {
  assert.throws(
    () => databaseConfig(makeEnv({ DATABASE_CLIENT: 'oracle' })),
    /Unsupported DATABASE_CLIENT/,
  );
});

const R2: Vars = {
  R2_ACCOUNT_ID: 'acct123',
  R2_BUCKET: 'mehdizare-media',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_PUBLIC_URL: 'https://media.mehdi-zare.com',
  R2_ROOT_PATH: 'media',
};

test('uploads use the local provider without R2 credentials', () => {
  const result: any = pluginsConfig(makeEnv({ R2_PUBLIC_URL: 'https://media.mehdi-zare.com' }));
  assert.equal(result.upload, undefined);
  assert.ok(result['users-permissions']);
});

test('R2 credentials switch uploads to aws-s3 against the R2 endpoint, without ACL', () => {
  const result: any = pluginsConfig(production(R2));
  const { provider, providerOptions } = result.upload.config;
  assert.equal(provider, 'aws-s3');
  assert.equal(providerOptions.baseUrl, 'https://media.mehdi-zare.com');
  assert.equal(providerOptions.rootPath, 'media');
  const s3 = providerOptions.s3Options;
  assert.equal(s3.endpoint, 'https://acct123.r2.cloudflarestorage.com');
  assert.equal(s3.region, 'auto');
  assert.equal(s3.forcePathStyle, true);
  assert.deepEqual(s3.credentials, {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  });
  assert.equal(s3.params.Bucket, 'mehdizare-media');
  // Present but undefined: the provider only skips its public-read default
  // when the ACL key exists.
  assert.ok('ACL' in s3.params);
  assert.equal(s3.params.ACL, undefined);
});

test('R2_ENDPOINT overrides the account-derived endpoint', () => {
  const result: any = pluginsConfig(
    production({ ...R2, R2_ENDPOINT: 'https://eu.r2.example.test' }),
  );
  assert.equal(result.upload.config.providerOptions.s3Options.endpoint, 'https://eu.r2.example.test');
});

test('a partial R2 config fails instead of falling back to local disk', () => {
  assert.throws(
    () => pluginsConfig(production({ R2_BUCKET: 'mehdizare-media', R2_ACCESS_KEY_ID: 'k' })),
    (error: Error) => {
      assert.match(error.message, /R2_SECRET_ACCESS_KEY/);
      assert.match(error.message, /R2_PUBLIC_URL/);
      assert.match(error.message, /R2_ACCOUNT_ID/);
      assert.doesNotMatch(error.message, /\bk\b/);
      return true;
    },
  );
});

test('server url comes from URL only when set', () => {
  assert.equal(
    (serverConfig(production({ URL: 'https://cms.svc.mehdi-zare.com' })) as any).url,
    'https://cms.svc.mehdi-zare.com',
  );
  assert.ok(!('url' in (serverConfig(production({})) as any)));
});

function fakeStrapi(count: number, database: unknown) {
  const logs: string[] = [];
  return {
    logs,
    strapi: {
      config: { get: (path: string) => (path === 'database.connection' ? database : undefined) },
      db: { query: (uid: string) => ({ count: async () => (uid === 'admin::user' ? count : -1) }) },
      log: { info: (message: string) => logs.push(message) },
    },
  };
}

// process.argv as the Docker CMD and `pnpm start` produce it.
const START_ARGV = ['/usr/local/bin/node', '/app/apps/cms/node_modules/@strapi/strapi/bin/strapi.js', 'start'];
const cliArgv = (...args: string[]) => ['/usr/local/bin/node', '/app/apps/cms/node_modules/.bin/strapi', ...args];

const PG_DATABASE = {
  client: 'postgres',
  connection: { connectionString: PG_URL, schema: 'public', ssl: false },
};

test('REQUIRE_EXISTING_ADMIN is off unless explicitly true', () => {
  assert.equal(isEnabled(undefined), false);
  assert.equal(isEnabled(''), false);
  assert.equal(isEnabled('false'), false);
  assert.equal(isEnabled('true'), true);
  assert.equal(isEnabled(' TRUE '), true);
});

test('the admin guard does nothing when disabled', async () => {
  const { strapi } = fakeStrapi(0, PG_DATABASE);
  await ensureExistingAdmin(strapi, undefined, START_ARGV);
});

test('the admin guard passes with an admin user', async () => {
  const { strapi, logs } = fakeStrapi(1, PG_DATABASE);
  await ensureExistingAdmin(strapi, 'true', START_ARGV);
  assert.deepEqual(logs, ['[admin-check] Found 1 admin user(s).']);
});

test('the admin guard refuses an empty database and logs names only', async () => {
  const { strapi } = fakeStrapi(0, PG_DATABASE);
  await assert.rejects(ensureExistingAdmin(strapi, 'true', START_ARGV), (error: Error) => {
    assert.match(error.message, /refusing to boot/);
    assert.match(
      error.message,
      /client=postgres database=mehdizare_cms schema=public user=mehdizare_cms/,
    );
    assert.doesNotMatch(error.message, /pw|db\.example\.test|postgresql:/);
    return true;
  });
});

test('the admin guard covers only the serving commands', () => {
  assert.equal(strapiCommand(START_ARGV), 'start');
  assert.equal(strapiCommand(cliArgv('--debug', 'develop')), 'develop');
  assert.equal(isServingCommand(START_ARGV), true);
  assert.equal(isServingCommand(cliArgv('develop')), true);
  for (const command of ['admin:create-user', 'import', 'export', 'transfer', 'console', 'build']) {
    assert.equal(isServingCommand(cliArgv(command, '--force')), false, command);
  }
  // An option value named like a serving command does not count.
  assert.equal(isServingCommand(cliArgv('admin:create-user', '--firstname', 'start')), false);
  assert.equal(isServingCommand(['/usr/local/bin/node', '/app/scripts/seed.ts']), false);
});

test('admin:create-user and import run on an empty database with the guard enabled', async () => {
  for (const argv of [
    cliArgv('admin:create-user', '--email', 'owner@example.test'),
    cliArgv('import', '--file', 'export.tar.gz.enc', '--force'),
  ]) {
    const { strapi, logs } = fakeStrapi(0, PG_DATABASE);
    await ensureExistingAdmin(strapi, 'true', argv);
    assert.deepEqual(logs, []);
  }
});

test('describeDatabaseTarget reads discrete config and never fails on a bad URL', () => {
  assert.equal(
    describeDatabaseTarget({
      client: 'postgres',
      connection: { database: 'd', user: 'u', schema: 's' },
    }),
    'client=postgres database=d schema=s user=u',
  );
  assert.equal(
    describeDatabaseTarget({ client: 'postgres', connection: { connectionString: 'not a url' } }),
    'client=postgres database=unknown schema=public user=unknown',
  );
});
