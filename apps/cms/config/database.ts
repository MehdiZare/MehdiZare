import path from 'path';
import type { Core } from '@strapi/strapi';
import { validateCmsEnv } from './env-validation';

type EnvAccessor = Core.Config.Shared.ConfigParams['env'];

const SUPPORTED_CLIENTS = ['mysql', 'postgres', 'sqlite'] as const;
type SupportedClient = (typeof SUPPORTED_CLIENTS)[number];

// Any ssl* query parameter (sslmode, ssl, sslrootcert, ...). pg-connection-string
// 2.14+ turns it into an ssl object that replaces the one built below, which
// drops DATABASE_SSL_CA (and sslmode=require means verify-full there). TLS
// comes from DATABASE_SSL plus DATABASE_SSL_CA instead.
const URL_SSL_PARAM = /[?&]ssl[a-z]*=/i;

function sslConfig(env: EnvAccessor) {
  return (
    env.bool('DATABASE_SSL', false) && {
      key: env('DATABASE_SSL_KEY', undefined),
      cert: env('DATABASE_SSL_CERT', undefined),
      ca: env('DATABASE_SSL_CA', undefined),
      capath: env('DATABASE_SSL_CAPATH', undefined),
      cipher: env('DATABASE_SSL_CIPHER', undefined),
      rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
    }
  );
}

function pool(env: EnvAccessor) {
  const max = env.int('DATABASE_POOL_MAX', 10);
  return { min: Math.min(env.int('DATABASE_POOL_MIN', 2), max), max };
}

function postgresConnection(env: EnvAccessor) {
  const databaseUrl = env('DATABASE_URL');
  const schema = env('DATABASE_SCHEMA', 'public');

  if (databaseUrl) {
    // Never echo the URL: it carries the password.
    if (URL_SSL_PARAM.test(databaseUrl)) {
      throw new Error(
        'DATABASE_URL must not carry sslmode or another ssl* parameter. Set DATABASE_SSL=true and DATABASE_SSL_CA instead.',
      );
    }
    // Only the URL: no discrete localhost/strapi defaults to mask a bad URL.
    return { connectionString: databaseUrl, ssl: sslConfig(env), schema };
  }

  if (!env('DATABASE_HOST') || !env('DATABASE_NAME') || !env('DATABASE_USERNAME')) {
    throw new Error(
      'Postgres DB config missing. Set DATABASE_URL, or DATABASE_HOST + DATABASE_NAME + DATABASE_USERNAME (+ DATABASE_PORT / DATABASE_PASSWORD).',
    );
  }

  return {
    host: env('DATABASE_HOST'),
    port: env.int('DATABASE_PORT', 5432),
    database: env('DATABASE_NAME'),
    user: env('DATABASE_USERNAME'),
    password: env('DATABASE_PASSWORD', undefined),
    ssl: sslConfig(env),
    schema,
  };
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  validateCmsEnv(env);
  const isProduction = env('NODE_ENV', 'development') === 'production';
  const client = env('DATABASE_CLIENT', 'sqlite') as SupportedClient;

  if (!SUPPORTED_CLIENTS.includes(client)) {
    throw new Error(
      `Unsupported DATABASE_CLIENT "${client}". Use one of: ${SUPPORTED_CLIENTS.join(', ')}.`,
    );
  }

  // Production runs on Postgres (cms-platform). SQLite stays for local dev,
  // CI and the one-off `strapi export` of the old database file.
  if (isProduction && client === 'sqlite') {
    throw new Error(
      'DATABASE_CLIENT=sqlite is not allowed in production. Set DATABASE_CLIENT=postgres and DATABASE_URL.',
    );
  }

  let connection: Record<string, unknown>;
  if (client === 'postgres') {
    connection = { connection: postgresConnection(env), pool: pool(env) };
  } else if (client === 'mysql') {
    connection = {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslConfig(env),
      },
      pool: pool(env),
    };
  } else {
    const dbFilename = env('DATABASE_FILENAME', '.tmp/data.db');
    connection = {
      connection: {
        filename: path.isAbsolute(dbFilename)
          ? dbFilename
          : path.join(__dirname, '..', '..', dbFilename),
      },
      useNullAsDefault: true,
    };
  }

  return {
    connection: {
      client,
      ...connection,
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  } as Core.Config.Database;
};

export default config;
