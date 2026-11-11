import test from 'node:test';
import assert from 'node:assert/strict';

import {
  type StrapiEntity,
  type StrapiFetch,
  type TaxonomyAuthor,
  SyncRefusal,
  buildDesiredAuthor,
  diffFields,
  loadTaxonomyAuthors,
  parseFlags,
  primaryTaxonomyAuthor,
  syncSiteIdentity,
} from '../scripts/sync-site-identity';

// Offline: the identity sync (GEO-03) against an in-memory Strapi author with a
// draft and a published row. Nothing here talks to a real CMS.

const TAXONOMY: TaxonomyAuthor = {
  slug: 'mehdi-zare',
  isPrimary: true,
  headline: 'Founder and AI consultant',
  jobTitle: 'Founder and AI consultant',
  bioShort: 'Founder and AI consultant.',
  websiteUrl: 'https://www.mehdi-zare.com',
  knowsAbout: ['Artificial Intelligence', 'AI Engineering'],
  credentials: [
    { title: 'CFA Charterholder', issuer: 'CFA Institute' },
    { title: 'AWS Certified Solutions Architect - Associate', issuer: 'Amazon Web Services' },
  ],
  sameAs: [
    { platform: 'Website', url: 'https://www.mehdi-zare.com' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/mehdizare' },
  ],
  worksForName: '',
  worksForUrl: '',
  addressLocality: 'Miami',
  addressRegion: 'FL',
  addressCountry: 'US',
};

/** What Strapi returns for the record once it matches TAXONOMY. */
function inSync(): StrapiEntity {
  return {
    id: 1,
    documentId: 'doc-1',
    slug: 'mehdi-zare',
    name: 'Mehdi Zare, CFA',
    isPrimary: true,
    headline: 'Founder and AI consultant',
    jobTitle: 'Founder and AI consultant',
    bioShort: 'Founder and AI consultant.',
    websiteUrl: 'https://www.mehdi-zare.com',
    knowsAbout: ['Artificial Intelligence', 'AI Engineering'],
    // Component rows carry ids, and unset attributes come back as null.
    credentials: [
      { id: 11, title: 'CFA Charterholder', issuer: 'CFA Institute', description: null, url: null },
      {
        id: 12,
        title: 'AWS Certified Solutions Architect - Associate',
        issuer: 'Amazon Web Services',
        description: null,
        url: null,
      },
    ],
    sameAs: [
      { id: 21, platform: 'Website', url: 'https://www.mehdi-zare.com' },
      { id: 22, platform: 'LinkedIn', url: 'https://linkedin.com/in/mehdizare' },
    ],
    worksForName: null,
    worksForUrl: null,
    addressLocality: 'Miami',
    addressRegion: 'FL',
    addressCountry: 'US',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Stale identity, as left behind by the #147 repositioning. */
function stale(): StrapiEntity {
  return {
    ...inSync(),
    headline: 'Senior AI Engineer',
    jobTitle: 'Senior AI Engineer',
    worksForName: 'Entarian',
    worksForUrl: 'https://entarian.com',
    knowsAbout: ['Artificial Intelligence'],
    credentials: [{ id: 31, title: 'CFA Charterholder', issuer: 'CFA Institute', description: null, url: null }],
  };
}

interface Call {
  path: string;
  method: string;
  query: Record<string, string>;
  body?: unknown;
}

function fakeStrapi(initial: { published: StrapiEntity; draft?: StrapiEntity | null }) {
  let published = structuredClone(initial.published);
  let draft: StrapiEntity | null =
    initial.draft === undefined ? structuredClone(initial.published) : initial.draft && structuredClone(initial.draft);
  const calls: Call[] = [];

  const strapiFetch = (async (path: string, init: RequestInit = {}, query: Record<string, string> = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, query, body });

    if (method === 'PUT') {
      // Strapi 5: the payload lands on the draft, then the whole draft is published.
      const base = draft ?? published;
      draft = { ...base, ...body.data };
      if (query.status === 'published') published = structuredClone(draft);
      return { data: draft };
    }
    if (query['filters[isPrimary][$eq]'] === 'true') {
      return { data: published.isPrimary ? [published] : [] };
    }
    if (query.status === 'draft') {
      return { data: draft ? [draft] : [] };
    }
    return { data: query['filters[slug][$eq]'] === published.slug ? [published] : [] };
  }) as StrapiFetch;

  return { strapiFetch, calls, published: () => published, draft: () => draft };
}

const quiet = { log: () => {}, warn: () => {} };

test('the repo taxonomy builds an identity the script will send', () => {
  // Values are the taxonomy's business; this only guards against an edit the
  // script would refuse. The fixtures below cover the clear and the lists.
  const desired = buildDesiredAuthor(primaryTaxonomyAuthor(loadTaxonomyAuthors()));
  assert.ok('worksForName' in desired && 'worksForUrl' in desired);
});

test('buildDesiredAuthor normalizes components and sends a cleared employer as null', () => {
  const desired = buildDesiredAuthor(TAXONOMY);
  assert.equal(desired.worksForName, null);
  assert.equal(desired.worksForUrl, null);
  assert.deepEqual((desired.credentials as unknown[])[0], {
    title: 'CFA Charterholder',
    issuer: 'CFA Institute',
    description: null,
    url: null,
  });
  assert.deepEqual((desired.sameAs as unknown[])[1], { platform: 'LinkedIn', url: 'https://linkedin.com/in/mehdizare' });
});

test('buildDesiredAuthor leaves keys the taxonomy omits alone', () => {
  const { headline: _h, credentials: _c, ...rest } = TAXONOMY;
  const desired = buildDesiredAuthor(rest);
  assert.ok(!('headline' in desired));
  assert.ok(!('credentials' in desired));
});

test('buildDesiredAuthor refuses partial or empty required identity', () => {
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, worksForName: 'Acme' }), SyncRefusal);
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, addressRegion: '' }), SyncRefusal);
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, bioShort: '  ' }), SyncRefusal);
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, websiteUrl: '' }), SyncRefusal);
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, sameAs: [{ platform: 'GitHub' }] }), SyncRefusal);
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, credentials: [{ issuer: 'x' }] }), SyncRefusal);
  assert.throws(() => buildDesiredAuthor({ ...TAXONOMY, knowsAbout: 'AI' }), SyncRefusal);
});

test('diffFields ignores component ids and treats null, "" and missing as equal', () => {
  const desired = buildDesiredAuthor(TAXONOMY);
  assert.deepEqual(diffFields(inSync(), null, desired), {});
  assert.deepEqual(diffFields({ ...inSync(), worksForName: '', worksForUrl: undefined }, null, desired), {});
});

test('parseFlags: dry run is the default and --apply with --dry-run is refused', () => {
  assert.deepEqual(parseFlags([]), { apply: false, allowDraftPublish: false });
  assert.deepEqual(parseFlags(['--dry-run']), { apply: false, allowDraftPublish: false });
  assert.deepEqual(parseFlags(['--apply', '--allow-draft-publish']), { apply: true, allowDraftPublish: true });
  assert.throws(() => parseFlags(['--apply', '--dry-run']), SyncRefusal);
});

test('a dry run reports every stale field and issues no write', async () => {
  const cms = fakeStrapi({ published: stale() });
  const result = await syncSiteIdentity([TAXONOMY], { apply: false, allowDraftPublish: false, strapiFetch: cms.strapiFetch, ...quiet });

  assert.equal(result.written, false);
  assert.deepEqual(Object.keys(result.changes).sort(), [
    'credentials',
    'headline',
    'jobTitle',
    'knowsAbout',
    'worksForName',
    'worksForUrl',
  ]);
  assert.deepEqual(cms.calls.filter((call) => call.method !== 'GET'), []);
  // Both reads populate exactly the owned component lists.
  for (const read of cms.calls.filter((call) => call.query['filters[slug][$eq]'])) {
    assert.equal(read.query['populate[0]'], 'sameAs');
    assert.equal(read.query['populate[1]'], 'credentials');
  }
});

test('--apply clears the employer with explicit nulls, replaces lists, publishes, and then settles', async () => {
  const cms = fakeStrapi({ published: stale() });
  const result = await syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: false, strapiFetch: cms.strapiFetch, ...quiet });

  assert.equal(result.written, true);
  const writes = cms.calls.filter((call) => call.method === 'PUT');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, 'authors/doc-1');
  assert.equal(writes[0].query.status, 'published');

  const data = (writes[0].body as { data: Record<string, unknown> }).data;
  assert.ok('worksForName' in data && data.worksForName === null);
  assert.ok('worksForUrl' in data && data.worksForUrl === null);
  // Whole list, no ids: Strapi replaces rather than merges.
  assert.equal((data.credentials as unknown[]).length, 2);
  assert.ok((data.credentials as Array<Record<string, unknown>>).every((entry) => !('id' in entry)));
  // Already-correct fields are not sent.
  assert.ok(!('sameAs' in data));
  assert.ok(!('addressLocality' in data));

  assert.equal(cms.published().worksForName, null);

  const again = fakeStrapi({ published: cms.published() });
  const second = await syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: false, strapiFetch: again.strapiFetch, ...quiet });
  assert.equal(second.written, false);
  assert.deepEqual(second.changes, {});
  assert.deepEqual(again.calls.filter((call) => call.method !== 'GET'), []);
});

test('an owned field that differs only in the draft is still sent, so the draft value cannot go live', async () => {
  const cms = fakeStrapi({ published: inSync(), draft: { ...inSync(), bioShort: 'half-written bio' } });
  const result = await syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: false, strapiFetch: cms.strapiFetch, ...quiet });

  assert.deepEqual(result.changes, { bioShort: 'Founder and AI consultant.' });
  assert.equal(cms.published().bioShort, 'Founder and AI consultant.');
});

test('an unrelated unpublished draft edit blocks --apply unless --allow-draft-publish', async () => {
  const draft = { ...stale(), name: 'Draft name nobody published' };

  const blocked = fakeStrapi({ published: stale(), draft });
  await assert.rejects(
    syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: false, strapiFetch: blocked.strapiFetch, ...quiet }),
    (error: unknown) => error instanceof SyncRefusal && /differs from the published record in: name/.test(error.message)
  );
  assert.deepEqual(blocked.calls.filter((call) => call.method !== 'GET'), []);

  const dryRun = fakeStrapi({ published: stale(), draft });
  const preview = await syncSiteIdentity([TAXONOMY], { apply: false, allowDraftPublish: false, strapiFetch: dryRun.strapiFetch, ...quiet });
  assert.equal(preview.written, false);

  const allowed = fakeStrapi({ published: stale(), draft });
  const result = await syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: true, strapiFetch: allowed.strapiFetch, ...quiet });
  assert.equal(result.written, true);
});

test('refuses to write to an author apps/web does not render', async () => {
  const notPrimary = fakeStrapi({ published: { ...stale(), isPrimary: false } });
  await assert.rejects(
    syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: false, strapiFetch: notPrimary.strapiFetch, ...quiet }),
    /not flagged isPrimary/
  );
  assert.deepEqual(notPrimary.calls.filter((call) => call.method !== 'GET'), []);

  const missing = fakeStrapi({ published: { ...stale(), slug: 'someone-else' } });
  await assert.rejects(
    syncSiteIdentity([TAXONOMY], { apply: true, allowDraftPublish: false, strapiFetch: missing.strapiFetch, ...quiet }),
    /no author with slug "mehdi-zare"/
  );
});
