import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import {
  DEFAULT_MANAGED_DESCRIPTION,
  MANAGED_API_TOKENS_ENV,
  type ManagedTokenDeps,
  type StoredToken,
  bootstrapManagedApiTokens,
  parseManagedApiTokens,
  strapiManagedTokenDeps,
} from '../src/utils/managed-api-tokens';

// Offline: the boot reconcile of the cms-platform-managed API tokens
// (MANAGED_API_TOKENS) against an in-memory token store.

const SALT = 'test-salt';
const READER = 'reader-value-0123456789abcdefABCDEF0123456789abcd';
const WRITER = 'writer-value-0123456789abcdefABCDEF0123456789abcd';
const hash = (value: string) => createHmac('sha512', SALT).update(value).digest('hex');

const env = (entries: Record<string, unknown>): string => JSON.stringify(entries);

function fake(raw: string | undefined, initial: StoredToken[]) {
  let rows = initial.map((row) => ({ ...row, permissions: [...row.permissions] }));
  let nextId = 100;
  const logs: string[] = [];
  const writes: string[] = [];
  const deps: ManagedTokenDeps = {
    env: { raw },
    hash,
    encrypt: (value) => `enc(${value.length})`,
    findByName: async (name) => {
      const row = rows.find((candidate) => candidate.name === name);
      return row ? { ...row, permissions: [...row.permissions] } : null;
    },
    listContentApiNames: async () => rows.map((row) => row.name),
    create: async (attributes) => {
      writes.push(`create:${attributes.name}`);
      const id = nextId++;
      rows.push({
        id,
        name: attributes.name,
        type: attributes.type,
        description: attributes.description,
        permissions: attributes.permissions ?? [],
        accessKey: hash('random-key-from-strapi'),
        lifespan: null,
      });
      return { id };
    },
    update: async (id, attributes) => {
      writes.push(`update:${attributes.name}`);
      rows = rows.map((row) =>
        row.id === id
          ? { ...row, type: attributes.type, description: attributes.description, permissions: attributes.permissions ?? row.permissions }
          : row,
      );
    },
    setKey: async (id, data) => {
      writes.push(`key:${rows.find((row) => row.id === id)?.name}`);
      assert.equal(data.lifespan, null);
      assert.equal(data.expiresAt, null);
      rows = rows.map((row) => (row.id === id ? { ...row, accessKey: data.accessKey, lifespan: null } : row));
    },
    log: { info: (message) => logs.push(message), warn: (message) => logs.push(message) },
  };
  return { deps, rows: () => rows, logs, writes };
}

function assertNoSecrets(texts: string[]) {
  for (const text of texts) {
    for (const secret of [READER, WRITER, hash(READER), hash(WRITER)]) {
      assert.ok(!text.includes(secret), `a value or hash leaked into: ${text.slice(0, 80)}`);
    }
  }
}

function errorOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  assert.fail('expected a throw');
}

async function errorOfPromise(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }
  assert.fail('expected a throw');
}

const WANTED = env({
  vercel: { type: 'read-only', value: READER },
  writer: { type: 'custom', permissions: ['api::article.article.update', 'api::article.article.find', 'api::article.article.find'], value: WRITER },
});

const LEGACY: StoredToken = {
  id: 1,
  name: 'Read Only',
  type: 'read-only',
  description: null,
  permissions: [],
  accessKey: hash('old'),
  lifespan: null,
};

test('MANAGED_API_TOKENS is parsed and validated, and no error carries a value', () => {
  assert.equal(MANAGED_API_TOKENS_ENV, 'MANAGED_API_TOKENS');
  assert.equal(parseManagedApiTokens(undefined), null);
  assert.equal(parseManagedApiTokens('   '), null);
  const specs = parseManagedApiTokens(WANTED)!;
  assert.deepEqual(specs.map((spec) => spec.name), ['vercel', 'writer']);
  assert.deepEqual(specs[1].permissions, ['api::article.article.find', 'api::article.article.update'], 'permissions deduplicated and sorted');
  assert.equal(specs[0].description, DEFAULT_MANAGED_DESCRIPTION);

  const errors = [
    errorOf(() => parseManagedApiTokens(`{"vercel": {"type": "read-only", "value": "${READER}"`)),
    errorOf(() => parseManagedApiTokens(`["${READER}"]`)),
    errorOf(() => parseManagedApiTokens(env({ vercel: { type: 'admin', value: READER } }))),
    errorOf(() => parseManagedApiTokens(env({ vercel: { type: 'read-only', value: 'short' } }))),
    errorOf(() => parseManagedApiTokens(env({ vercel: { type: 'read-only', value: `${READER} x` } }))),
    errorOf(() => parseManagedApiTokens(env({ writer: { type: 'custom', value: WRITER } }))),
    errorOf(() => parseManagedApiTokens(env({ writer: { type: 'custom', permissions: [], value: WRITER } }))),
    errorOf(() => parseManagedApiTokens(env({ vercel: { type: 'read-only', permissions: ['api::a.a.find'], value: READER } }))),
    errorOf(() => parseManagedApiTokens(env({ ' vercel': { type: 'read-only', value: READER } }))),
  ];
  assert.ok(errors.every((message) => message.startsWith(MANAGED_API_TOKENS_ENV)), 'every error names the env var');
  assertNoSecrets(errors);
});

test('unset MANAGED_API_TOKENS reads and writes nothing and logs one line', async () => {
  const run = fake(undefined, []);
  assert.equal(await bootstrapManagedApiTokens(run.deps), null);
  assert.deepEqual(run.writes, []);
  assert.equal(run.logs.length, 1);
});

test('missing tokens are created with the Terraform value as the key; a second boot writes nothing', async () => {
  const run = fake(WANTED, [LEGACY]);
  const summary = (await bootstrapManagedApiTokens(run.deps))!;
  assert.deepEqual(summary.created, ['vercel', 'writer']);
  assert.deepEqual(summary.unmanaged, ['Read Only']);
  assert.equal(run.rows().find((row) => row.name === 'vercel')!.accessKey, hash(READER));
  assert.equal(run.rows().find((row) => row.name === 'writer')!.accessKey, hash(WRITER));
  assert.deepEqual(run.rows().find((row) => row.name === 'Read Only'), LEGACY, 'an unlisted token is untouched');
  assert.ok(!run.writes.some((write) => write.endsWith('Read Only')));
  assertNoSecrets(run.logs);
  assert.ok(run.logs.some((line) => line.includes('Read Only')), 'unlisted names are logged');

  run.writes.length = 0;
  const again = (await bootstrapManagedApiTokens(run.deps))!;
  assert.deepEqual(run.writes, []);
  assert.deepEqual(again.unchanged, ['vercel', 'writer']);
});

test('settings drift updates settings only; a new value (or a lifespan) re-keys only', async () => {
  const run = fake(WANTED, [
    { id: 7, name: 'vercel', type: 'full-access', description: 'hand-made', permissions: [], accessKey: hash(READER), lifespan: null },
    {
      id: 8,
      name: 'writer',
      type: 'custom',
      description: DEFAULT_MANAGED_DESCRIPTION,
      permissions: ['api::article.article.update', 'api::article.article.find'],
      accessKey: hash('rotated-away'),
      lifespan: 7776000000,
    },
  ]);
  const summary = (await bootstrapManagedApiTokens(run.deps))!;
  assert.deepEqual(summary.updated, ['vercel']);
  assert.deepEqual(summary.rekeyed, ['writer']);
  assert.deepEqual(run.writes.sort(), ['key:writer', 'update:vercel']);
  assert.equal(run.rows().find((row) => row.name === 'vercel')!.type, 'read-only');
  assert.equal(run.rows().find((row) => row.name === 'writer')!.lifespan, null);
  assertNoSecrets(run.logs);
});

test('a permission change on a custom token is a settings update', async () => {
  const changed = env({ writer: { type: 'custom', permissions: ['api::article.article.find'], value: WRITER } });
  const run = fake(changed, [
    {
      id: 9,
      name: 'writer',
      type: 'custom',
      description: DEFAULT_MANAGED_DESCRIPTION,
      permissions: ['api::article.article.find', 'api::article.article.update'],
      accessKey: hash(WRITER),
      lifespan: null,
    },
  ]);
  const summary = (await bootstrapManagedApiTokens(run.deps))!;
  assert.deepEqual(summary.updated, ['writer']);
  assert.deepEqual(run.rows()[0].permissions, ['api::article.article.find']);
});

test('a failed key write rethrows without the hash, the encrypted key or driver detail', async () => {
  // A database error can embed the query bindings; simulate Knex leaking them.
  const leaked = new Error(`update "admin::api-token" set "access_key" = '${hash(READER)}' where "id" = 7 - connection refused`);
  let updates = 0;
  const strapi = {
    service: (name: string) => (name === 'admin::api-token-content-api' ? { create: async () => ({}), update: async () => undefined } : {}),
    db: {
      query: () => ({
        findOne: async () => null,
        findMany: async () => [],
        update: async () => {
          updates += 1;
          throw leaked;
        },
      }),
    },
    config: { get: () => SALT },
    log: { info: () => undefined, warn: () => undefined },
  };
  const message = await errorOfPromise(
    strapiManagedTokenDeps(strapi as unknown as Parameters<typeof strapiManagedTokenDeps>[0]).setKey(7, {
      accessKey: hash(READER),
      encryptedKey: 'encrypted-key-sentinel',
      lifespan: null,
      expiresAt: null,
    }),
  );
  assert.equal(updates, 1, 'the store write was attempted');
  assert.ok(message.startsWith(MANAGED_API_TOKENS_ENV), 'the rethrown error names the env var');
  assertNoSecrets([message]);
  assert.ok(!message.includes('encrypted-key-sentinel'), 'the encrypted key never reaches the error');
  assert.ok(!message.includes('connection refused'), 'no driver detail survives');
});
