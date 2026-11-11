import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkImage,
  checkSiteMedia,
  decodeEntities,
  extractJsonLdImages,
  extractMetaImages,
  isImageContentType,
  isPostUrl,
  parseSitemap,
  rebase,
} from './check-media-urls.mjs';

const SITE = 'https://www.example.com';

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<url>
<loc>${SITE}/</loc>
</url>
<url>
<loc>${SITE}/blog/first-post</loc>
<image:image>
<image:loc>${SITE}/cms-uploads/cover.webp?w=1&amp;q=75</image:loc>
</image:image>
</url>
<url>
<loc>${SITE}/blog/page/2</loc>
</url>
<url>
<loc>${SITE}/blog/category/ai</loc>
</url>
</urlset>`;

const POST_HTML = `<!doctype html><html><head>
<meta property="og:image" content="https://media.example.com/uploads/cover.webp"/>
<meta content="/twitter-image?v=1&amp;x=2" name="twitter:image"/>
<meta property="og:title" content="Not an image"/>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"BlogPosting","image":{"@type":"ImageObject","url":"https://media.example.com/uploads/cover.webp"}},
  {"@type":"Person","image":["https://media.example.com/uploads/me.jpg"]}
]}</script>
<script type="application/ld+json">{"@type":"Organization","image":"https://media.example.com/uploads/logo.png"}</script>
</head><body></body></html>`;

test('decodeEntities handles named and numeric entities', () => {
  assert.equal(decodeEntities('a&amp;b&#38;c&#x26;d&quot;'), 'a&b&c&d"');
  assert.equal(decodeEntities('&unknown;'), '&unknown;');
});

test('parseSitemap separates page locs from image locs and decodes &amp;', () => {
  const parsed = parseSitemap(SITEMAP);
  assert.deepEqual(parsed.pages, [
    `${SITE}/`,
    `${SITE}/blog/first-post`,
    `${SITE}/blog/page/2`,
    `${SITE}/blog/category/ai`,
  ]);
  assert.deepEqual(parsed.images, [`${SITE}/cms-uploads/cover.webp?w=1&q=75`]);
  assert.deepEqual(parsed.sitemaps, []);
});

test('parseSitemap returns child sitemaps for a sitemap index', () => {
  const parsed = parseSitemap(
    `<sitemapindex><sitemap><loc>${SITE}/sitemap/0.xml</loc></sitemap><sitemap><loc><![CDATA[${SITE}/sitemap/1.xml]]></loc></sitemap></sitemapindex>`
  );
  assert.deepEqual(parsed.sitemaps, [`${SITE}/sitemap/0.xml`, `${SITE}/sitemap/1.xml`]);
  assert.deepEqual(parsed.pages, []);
});

test('isPostUrl matches single posts only', () => {
  assert.equal(isPostUrl(`${SITE}/blog/first-post`), true);
  assert.equal(isPostUrl(`${SITE}/blog/first-post/`), true);
  assert.equal(isPostUrl(`${SITE}/blog`), false);
  assert.equal(isPostUrl(`${SITE}/blog/page/2`), false);
  assert.equal(isPostUrl(`${SITE}/blog/category/ai`), false);
  assert.equal(isPostUrl('not a url'), false);
});

test('extractMetaImages reads og:image and twitter:image in either attribute order', () => {
  assert.deepEqual(extractMetaImages(POST_HTML), [
    'https://media.example.com/uploads/cover.webp',
    '/twitter-image?v=1&x=2',
  ]);
});

test('extractJsonLdImages reads strings, arrays and ImageObjects at any depth', () => {
  assert.deepEqual(extractJsonLdImages(POST_HTML), [
    'https://media.example.com/uploads/cover.webp',
    'https://media.example.com/uploads/me.jpg',
    'https://media.example.com/uploads/logo.png',
  ]);
});

test('extractJsonLdImages rejects a malformed JSON-LD block', () => {
  assert.throws(() => extractJsonLdImages('<script type="application/ld+json">{oops</script>'), /JSON-LD/);
});

test('isImageContentType', () => {
  assert.equal(isImageContentType('image/webp'), true);
  assert.equal(isImageContentType('IMAGE/PNG; charset=binary'), true);
  assert.equal(isImageContentType('application/json'), false);
  assert.equal(isImageContentType(null), false);
});

function response(status, contentType, body = '') {
  return new Response(body, { status, headers: contentType ? { 'content-type': contentType } : {} });
}

test('checkImage fails on a 404 JSON body and on a 200 non-image', async () => {
  assert.match(await checkImage('x', async () => response(404, 'application/json', '{}')), /HTTP 404/);
  assert.match(await checkImage('x', async () => response(200, 'text/html', '<html>')), /not image/);
  assert.equal(await checkImage('x', async () => response(200, 'image/webp', 'RIFF')), null);
  assert.match(
    await checkImage('x', async () => {
      throw new Error('boom');
    }),
    /request failed: boom/
  );
});

function fakeSite(routes) {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    const route = routes[url];
    return route ? route() : response(404, 'text/plain', 'missing');
  };
  return { fetchImpl, requested };
}

const quiet = () => {};

test('checkSiteMedia reports a dead sitemap image, a dead og:image and a dead JSON-LD image', async () => {
  const { fetchImpl, requested } = fakeSite({
    [`${SITE}/sitemap.xml`]: () => response(200, 'application/xml', SITEMAP),
    [`${SITE}/blog/first-post`]: () => response(200, 'text/html', POST_HTML),
    [`${SITE}/twitter-image?v=1&x=2`]: () => response(200, 'image/png'),
    'https://media.example.com/uploads/logo.png': () => response(200, 'image/png'),
  });

  const failures = await checkSiteMedia(SITE, { fetchImpl, log: quiet });
  const failed = failures.map((failure) => failure.url).sort();

  assert.deepEqual(failed, [
    'https://media.example.com/uploads/cover.webp',
    'https://media.example.com/uploads/me.jpg',
    `${SITE}/cms-uploads/cover.webp?w=1&q=75`,
  ]);
  // Listing and archive pages are not fetched; each image is fetched once.
  assert.ok(!requested.includes(`${SITE}/blog/page/2`));
  assert.ok(!requested.includes(`${SITE}/blog/category/ai`));
  assert.equal(requested.filter((url) => url === 'https://media.example.com/uploads/cover.webp').length, 1);
});

test('checkSiteMedia passes when every media URL is a 200 image', async () => {
  const image = () => response(200, 'image/webp');
  const { fetchImpl } = fakeSite({
    [`${SITE}/sitemap.xml`]: () => response(200, 'application/xml', SITEMAP),
    [`${SITE}/blog/first-post`]: () => response(200, 'text/html', POST_HTML),
    [`${SITE}/cms-uploads/cover.webp?w=1&q=75`]: image,
    [`${SITE}/twitter-image?v=1&x=2`]: image,
    'https://media.example.com/uploads/cover.webp': image,
    'https://media.example.com/uploads/me.jpg': image,
    'https://media.example.com/uploads/logo.png': image,
  });

  assert.deepEqual(await checkSiteMedia(SITE, { fetchImpl, log: quiet }), []);
});

test('checkSiteMedia fails closed when the sitemap is unreachable or empty', async () => {
  const unreachable = fakeSite({});
  const failures = await checkSiteMedia(SITE, { fetchImpl: unreachable.fetchImpl, log: quiet });
  assert.equal(failures.length, 1);
  assert.match(failures[0].reason, /sitemap unreadable: HTTP 404/);

  const empty = fakeSite({ [`${SITE}/sitemap.xml`]: () => response(200, 'application/xml', '<urlset></urlset>') });
  const emptyFailures = await checkSiteMedia(SITE, { fetchImpl: empty.fetchImpl, log: quiet });
  assert.equal(emptyFailures.length, 1);
  assert.match(emptyFailures[0].reason, /no <loc> entries/);
});

test('rebase moves a URL onto another origin, keeping path and query', () => {
  assert.equal(rebase(`${SITE}/blog/a?x=1`, 'https://preview.example.dev/'), 'https://preview.example.dev/blog/a?x=1');
  assert.equal(rebase('::bad', 'not a url'), '::bad');
});

test('checkSiteMedia reads post pages from the checked origin, not the canonical one', async () => {
  const PREVIEW = 'https://preview.example.dev';
  const { fetchImpl, requested } = fakeSite({
    [`${PREVIEW}/sitemap.xml`]: () =>
      response(200, 'application/xml', `<urlset><url><loc>${SITE}/blog/first-post</loc></url></urlset>`),
    [`${PREVIEW}/blog/first-post`]: () =>
      response(200, 'text/html', `<meta property="og:image" content="${SITE}/opengraph-image"/>`),
    [`${SITE}/opengraph-image`]: () => response(200, 'image/png'),
  });
  assert.deepEqual(await checkSiteMedia(PREVIEW, { fetchImpl, log: quiet }), []);
  assert.ok(!requested.includes(`${SITE}/blog/first-post`));
});

test('checkSiteMedia fails a post page that has no social image', async () => {
  const { fetchImpl } = fakeSite({
    [`${SITE}/sitemap.xml`]: () =>
      response(200, 'application/xml', `<urlset><url><loc>${SITE}/blog/bare</loc></url></urlset>`),
    [`${SITE}/blog/bare`]: () => response(200, 'text/html', '<html><head></head></html>'),
  });
  const failures = await checkSiteMedia(SITE, { fetchImpl, log: quiet });
  assert.deepEqual(failures.map((failure) => failure.reason), ['no og:image or twitter:image']);
});
