import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REVALIDATE_EVENTS,
  REVALIDATE_HEADER,
  REVALIDATE_SECRET_ENV,
  REVALIDATE_URL_ENV,
  REVALIDATE_WEBHOOK_NAME,
  type RevalidateWebhookDeps,
  type StoredWebhook,
  bootstrapRevalidateWebhook,
  syncRevalidateWebhook,
  webhookUrl,
} from '../src/utils/revalidate-webhook';

// Offline: the boot sync of the web revalidation webhook (REVALIDATION_SECRET
// + WEB_REVALIDATE_URL) against an in-memory webhook store.

const SECRET = 's3cret-value-that-must-never-be-logged';
const URL_WANTED = 'https://www.mehdi-zare.com/api/revalidate';

function fake(initial: StoredWebhook[], env: RevalidateWebhookDeps['env'] = { secret: SECRET, url: URL_WANTED }) {
  let rows = initial.map((row) => ({ ...row }));
  let nextId = 100;
  const logs: string[] = [];
  const runner: string[] = [];
  const writes: string[] = [];
  const deps: RevalidateWebhookDeps = {
    env,
    findWebhooks: async () => rows.map((row) => ({ ...row })),
    createWebhook: async (data) => {
      writes.push('create');
      const row = { id: String(nextId++), ...data };
      rows.push(row);
      return { ...row };
    },
    updateWebhook: async (id, data) => {
      writes.push(`update:${id}`);
      rows = rows.map((row) => (row.id === id ? { id, ...data } : row));
      return { id, ...data };
    },
    deleteWebhook: async (id) => {
      writes.push(`delete:${id}`);
      const row = rows.find((candidate) => candidate.id === id) ?? null;
      rows = rows.filter((candidate) => candidate.id !== id);
      return row;
    },
    runner: {
      add: (webhook) => runner.push(`add:${webhook.id}`),
      update: (webhook) => runner.push(`update:${webhook.id}`),
      remove: (webhook) => runner.push(`remove:${webhook.id}`),
    },
    log: {
      info: (message) => logs.push(message),
      warn: (message) => logs.push(message),
      error: (message) => logs.push(message),
    },
  };
  return { deps, rows: () => rows, logs, runner, writes };
}

const managed = (overrides: Partial<StoredWebhook> = {}): StoredWebhook => ({
  id: '1',
  name: REVALIDATE_WEBHOOK_NAME,
  url: URL_WANTED,
  headers: { [REVALIDATE_HEADER]: SECRET },
  events: [...REVALIDATE_EVENTS],
  isEnabled: true,
  ...overrides,
});

const other: StoredWebhook = {
  id: '7',
  name: 'Some other integration',
  url: 'https://hooks.example.com/strapi',
  headers: {},
  events: ['entry.publish'],
  isEnabled: true,
};

test('the webhook reads REVALIDATION_SECRET and WEB_REVALIDATE_URL and sends x-revalidate-secret', () => {
  assert.equal(REVALIDATE_SECRET_ENV, 'REVALIDATION_SECRET');
  assert.equal(REVALIDATE_URL_ENV, 'WEB_REVALIDATE_URL');
  // apps/web/src/app/api/revalidate/route.ts reads this header.
  assert.equal(REVALIDATE_HEADER, 'x-revalidate-secret');
});

test('the target must be an http(s) URL on /api/revalidate with nothing else', () => {
  assert.equal(webhookUrl(URL_WANTED), URL_WANTED);
  assert.equal(webhookUrl(`${URL_WANTED}/`), URL_WANTED);
  for (const bad of [
    'ftp://www.mehdi-zare.com/api/revalidate',
    'https://www.mehdi-zare.com',
    'https://www.mehdi-zare.com/api/revalidate/blog',
    `${URL_WANTED}?secret=x`,
    'https://user:pass@www.mehdi-zare.com/api/revalidate',
    'not a url',
  ]) {
    assert.equal(webhookUrl(bad), null, bad);
  }
});

test('a missing webhook is created, other webhooks are untouched, and a second boot writes nothing', async () => {
  const run = fake([other]);
  assert.equal(await syncRevalidateWebhook(run.deps), 'created');
  assert.deepEqual(
    run.rows().find((row) => row.name === REVALIDATE_WEBHOOK_NAME),
    managed({ id: '100' }),
  );
  assert.ok(run.rows().some((row) => row.id === '7'));
  assert.deepEqual(run.runner, ['add:100']);

  const again = fake(run.rows());
  assert.equal(await syncRevalidateWebhook(again.deps), 'unchanged');
  assert.deepEqual(again.writes, []);
  assert.deepEqual(again.runner, []);
});

test('a rotated secret, drifted headers or events, a moved URL or a disabled webhook is updated', async () => {
  const drifts: Partial<StoredWebhook>[] = [
    { headers: { [REVALIDATE_HEADER]: 'old-secret' } },
    { headers: { [REVALIDATE_HEADER]: SECRET, 'x-extra': '1' } },
    { events: ['entry.publish'] },
    { url: 'https://mehdi-zare-old.vercel.app/api/revalidate' },
    { isEnabled: false },
  ];
  for (const drift of drifts) {
    const run = fake([managed(drift)]);
    assert.equal(await syncRevalidateWebhook(run.deps), 'updated', JSON.stringify(Object.keys(drift)));
    assert.deepEqual(run.rows(), [managed()]);
    assert.deepEqual(run.runner, ['update:1']);
  }
});

test('duplicates on the route are removed; a hand-made one is adopted when no managed one exists', async () => {
  const handMade = managed({ id: '3', name: 'revalidate', headers: { [REVALIDATE_HEADER]: 'typo' } });
  const run = fake([handMade, managed({ id: '4' }), other]);
  assert.equal(await syncRevalidateWebhook(run.deps), 'unchanged');
  assert.deepEqual(run.rows().map((row) => row.id).sort(), ['4', '7']);
  assert.deepEqual(run.runner, ['remove:3']);

  const adopt = fake([handMade]);
  assert.equal(await syncRevalidateWebhook(adopt.deps), 'updated');
  assert.deepEqual(adopt.rows(), [managed({ id: '3' })]);
});

test('a failed duplicate removal still updates the managed webhook and retries next boot', async () => {
  const run = fake([
    managed({ headers: { [REVALIDATE_HEADER]: 'old-secret' } }),
    managed({ id: '3', name: 'manual' }),
    managed({ id: '4', name: 'another duplicate' }),
    other,
  ]);
  const remove = run.deps.deleteWebhook;
  run.deps.deleteWebhook = async (id) => {
    if (id === '3') throw new Error(`SQL bindings: ${SECRET}`);
    return remove(id);
  };
  assert.equal(await syncRevalidateWebhook(run.deps), 'updated');
  assert.deepEqual(run.rows().find((row) => row.id === '1'), managed());
  assert.deepEqual(run.rows().map((row) => row.id).sort(), ['1', '3', '7']);
  assert.ok(run.logs.some((line) => line.includes('removed 1 duplicate')));
  assert.ok(run.logs.some((line) => line.includes('cleanup failed')));
  assert.ok(run.logs.every((line) => !line.includes(SECRET)));

  run.deps.deleteWebhook = remove;
  assert.equal(await syncRevalidateWebhook(run.deps), 'unchanged');
  assert.deepEqual(run.rows().map((row) => row.id).sort(), ['1', '7']);
});

test('missing or unusable env skips and leaves an existing webhook alone', async () => {
  const envs: RevalidateWebhookDeps['env'][] = [
    { url: URL_WANTED },
    { secret: SECRET },
    { secret: '  ', url: URL_WANTED },
    { secret: SECRET, url: 'ftp://x/api/revalidate' },
    { secret: SECRET, url: 'https://www.mehdi-zare.com' },
  ];
  for (const env of envs) {
    const run = fake([managed({ headers: { [REVALIDATE_HEADER]: 'old-secret' } })], env);
    assert.equal(await syncRevalidateWebhook(run.deps), 'skipped');
    assert.deepEqual(run.writes, []);
  }
});

test('the secret never reaches a log line, and a store failure does not stop the boot', async () => {
  const all: string[] = [];
  for (const rows of [[], [managed({ headers: { [REVALIDATE_HEADER]: 'old' } })], [managed(), managed({ id: '9', name: 'x' })]]) {
    const run = fake(rows);
    await syncRevalidateWebhook(run.deps);
    all.push(...run.logs);
  }
  assert.ok(all.length > 0);
  for (const line of all) assert.ok(!line.includes(SECRET), `secret leaked into: ${line}`);

  for (const existing of [[], [managed({ headers: { [REVALIDATE_HEADER]: 'old' } })]]) {
    const run = fake(existing);
    run.deps.createWebhook = run.deps.updateWebhook = async () => {
      throw new Error(`SQL bindings: ${SECRET}`);
    };
    await bootstrapRevalidateWebhook(run.deps);
    assert.ok(run.logs.some((line) => line.includes('sync failed')));
    assert.ok(run.logs.every((line) => !line.includes(SECRET)));
    assert.ok(run.logs.every((line) => !line.includes(': created.') && !line.includes(': updated.')));
  }

  const vanished = fake([managed({ headers: { [REVALIDATE_HEADER]: 'old' } })]);
  vanished.deps.updateWebhook = async () => null;
  await assert.rejects(syncRevalidateWebhook(vanished.deps), /disappeared during update/);
});
