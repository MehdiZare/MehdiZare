#!/usr/bin/env node
// Post-deploy smoke check for the media URLs crawlers and social cards see
// (IMG-06).
//
// The site hides a dead CMS image from people: CmsImage swaps in the monogram
// tile on the client. Crawlers and link unfurlers get the 404, so a lost upload
// breaks og:image, the BlogPosting image and the image sitemap with no visible
// symptom (TS-01). This fetches, from the live site:
//
//   - sitemap.xml, and every <image:loc> in it
//   - each /blog/<slug> page in it, and that page's og:image, twitter:image and
//     every JSON-LD `image`
//
// and exits non-zero when any of them is not HTTP 200 with an image/*
// content type, or when the sitemap itself cannot be read.
//
// Usage: node scripts/check-media-urls.mjs [site-url]
//        (default: $SITE_URL, then https://www.mehdi-zare.com)
//
// No dependencies; Node >= 22 for global fetch and AbortSignal.timeout.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SITE_URL = 'https://www.mehdi-zare.com';
const USER_AGENT = 'media-url-check/1.0 (+post-deploy smoke test)';
const TIMEOUT_MS = 15000;
const CONCURRENCY = 4;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decodes the XML/HTML entities that show up inside URLs and attributes. */
export function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function unwrapCdata(value) {
  const match = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(value);
  return match ? match[1] : value;
}

function tagValues(xml, tag) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  return [...xml.matchAll(pattern)]
    .map((match) => decodeEntities(unwrapCdata(match[1])).trim())
    .filter(Boolean);
}

/**
 * Splits a sitemap into page URLs, image URLs and, for a sitemap index, the
 * child sitemaps to fetch.
 */
export function parseSitemap(xml) {
  if (/<sitemapindex[\s>]/.test(xml)) {
    const sitemaps = [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)]
      .flatMap((match) => tagValues(match[1], 'loc'));
    return { pages: [], images: [], sitemaps };
  }

  const pages = [];
  const images = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = match[1];
    // Drop the image blocks first so their <image:loc> is not read as the page <loc>.
    const withoutImages = block.replace(/<image:image>[\s\S]*?<\/image:image>/g, '');
    pages.push(...tagValues(withoutImages, 'loc'));
    images.push(...tagValues(block, 'image:loc'));
  }
  return { pages, images, sitemaps: [] };
}

/** True for a single post page, `/blog/<slug>`, but not listings or archives. */
export function isPostUrl(url) {
  try {
    const { pathname } = new URL(url);
    return /^\/blog\/[^/]+\/?$/.test(pathname) && !/^\/blog\/page\/?$/.test(pathname);
  } catch {
    return false;
  }
}

/** `url` moved onto the origin of `siteUrl`, keeping path, query and hash. */
export function rebase(url, siteUrl) {
  try {
    const source = new URL(url, siteUrl);
    return new URL(`${source.pathname}${source.search}${source.hash}`, new URL(siteUrl).origin).href;
  } catch {
    return url;
  }
}

function attributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([a-z][\w:-]*)\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? '');
  }
  return attrs;
}

const SOCIAL_IMAGE_KEYS = new Set(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']);

/** og:image and twitter:image values from <meta> tags, in either attribute order. */
export function extractMetaImages(html) {
  const found = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase();
    if (SOCIAL_IMAGE_KEYS.has(key) && attrs.content?.trim()) {
      found.push(attrs.content.trim());
    }
  }
  return found;
}

function collectImages(node, found) {
  if (Array.isArray(node)) {
    for (const item of node) collectImages(item, found);
    return;
  }
  if (!node || typeof node !== 'object') return;

  for (const [key, value] of Object.entries(node)) {
    if (key === 'image') {
      for (const image of Array.isArray(value) ? value : [value]) {
        if (typeof image === 'string' && image.trim()) {
          found.push(image.trim());
        } else if (image && typeof image === 'object') {
          const url = image.url ?? image.contentUrl;
          if (typeof url === 'string' && url.trim()) found.push(url.trim());
          collectImages(image, found);
        }
      }
    } else {
      collectImages(value, found);
    }
  }
}

/**
 * Every `image` in the page's JSON-LD: a string, an array, or an ImageObject
 * (`url`/`contentUrl`), at any depth including `@graph`.
 */
export function extractJsonLdImages(html) {
  const found = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      throw new Error('unparseable JSON-LD block');
    }
    collectImages(data, found);
  }
  return found;
}

export function isImageContentType(value) {
  return /^image\//i.test((value ?? '').trim());
}

async function request(url, fetchImpl) {
  return fetchImpl(url, {
    redirect: 'follow',
    headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/** Fetches one image URL; resolves to a failure string, or null when it is fine. */
export async function checkImage(url, fetchImpl = fetch) {
  try {
    const response = await request(url, fetchImpl);
    const type = response.headers.get('content-type') ?? '';
    // Only the status and headers matter; do not download the image.
    await response.body?.cancel().catch(() => {});
    if (response.status !== 200) return `HTTP ${response.status} (${type || 'no content-type'})`;
    if (!isImageContentType(type)) return `content-type ${type || '(none)'} is not image/*`;
    return null;
  } catch (error) {
    return `request failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function fetchText(url, fetchImpl) {
  const response = await request(url, fetchImpl);
  const body = await response.text();
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  return body;
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Runs the whole check against `siteUrl`. Returns the failures; an empty list
 * means every media URL answered 200 with an image content type.
 */
export async function checkSiteMedia(siteUrl, { fetchImpl = fetch, log = console.log } = {}) {
  const failures = [];
  const fail = (url, reason, source) => {
    failures.push({ url, reason, source });
    log(`  FAIL ${url} -- ${reason} [${source}]`);
  };

  // --- sitemap ------------------------------------------------------------
  const sitemapUrl = new URL('/sitemap.xml', siteUrl).href;
  const pages = [];
  const images = new Map(); // url -> first source that referenced it
  const queue = [sitemapUrl];
  const seenSitemaps = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (seenSitemaps.has(current)) continue;
    seenSitemaps.add(current);
    let xml;
    try {
      xml = await fetchText(current, fetchImpl);
    } catch (error) {
      fail(current, `sitemap unreadable: ${error instanceof Error ? error.message : String(error)}`, 'sitemap');
      continue;
    }
    const parsed = parseSitemap(xml);
    pages.push(...parsed.pages);
    // Child sitemaps one level deep; an index nested in an index is not a thing Next emits.
    if (current === sitemapUrl) queue.push(...parsed.sitemaps.map((child) => rebase(child, siteUrl)));
    for (const image of parsed.images) {
      if (!images.has(image)) images.set(image, `sitemap ${current}`);
    }
  }

  if (failures.length === 0 && pages.length === 0) {
    fail(sitemapUrl, 'sitemap has no <loc> entries', 'sitemap');
  }

  // --- post pages -----------------------------------------------------------
  // The sitemap writes every <loc> on the configured canonical origin, so on a
  // preview deploy it names production pages. Read the posts from the origin
  // being checked; the media URLs those pages emit are checked as emitted,
  // since that is what crawlers and card scrapers will fetch.
  const posts = [...new Set(pages.filter(isPostUrl).map((page) => rebase(page, siteUrl)))];
  log(`Sitemap: ${pages.length} page(s), ${images.size} image(s), ${posts.length} post(s).`);

  await mapPool(posts, CONCURRENCY, async (postUrl) => {
    let html;
    try {
      html = await fetchText(postUrl, fetchImpl);
    } catch (error) {
      fail(postUrl, `post page unreadable: ${error instanceof Error ? error.message : String(error)}`, 'post');
      return;
    }

    const add = (raw, kind) => {
      let absolute;
      try {
        absolute = new URL(raw, postUrl).href;
      } catch {
        fail(raw, 'not a valid URL', `${kind} on ${postUrl}`);
        return;
      }
      if (!images.has(absolute)) images.set(absolute, `${kind} on ${postUrl}`);
    };

    const meta = extractMetaImages(html);
    // Every post has one: its cover, or the generated app/opengraph-image fallback.
    if (meta.length === 0) {
      fail(postUrl, 'no og:image or twitter:image', 'post');
    }
    for (const image of meta) add(image, 'meta image');

    let jsonLd = [];
    try {
      jsonLd = extractJsonLdImages(html);
    } catch (error) {
      fail(postUrl, error instanceof Error ? error.message : String(error), 'post');
    }
    for (const image of jsonLd) add(image, 'JSON-LD image');
  });

  // --- images ---------------------------------------------------------------
  const entries = [...images.entries()];
  await mapPool(entries, CONCURRENCY, async ([url, source]) => {
    const reason = await checkImage(url, fetchImpl);
    if (reason) {
      fail(url, reason, source);
    } else {
      log(`  ok   ${url}`);
    }
  });

  return failures;
}

export async function main(argv = process.argv.slice(2)) {
  const siteUrl = argv[0] || process.env.SITE_URL || DEFAULT_SITE_URL;
  try {
    new URL(siteUrl);
  } catch {
    console.error(`Not a URL: ${siteUrl}`);
    return 2;
  }

  console.log(`Checking media URLs on ${siteUrl}`);
  const failures = await checkSiteMedia(siteUrl);
  if (failures.length > 0) {
    console.error(`\n${failures.length} media check(s) failed.`);
    return 1;
  }
  console.log('\nAll media URLs answered 200 with an image content type.');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
