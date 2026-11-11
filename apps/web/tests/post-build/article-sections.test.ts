import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CMS_PRERENDER_ARTICLE_SLUG,
  CMS_PRERENDER_SERIES,
  CMS_PRERENDER_SERIES_PART_SLUG,
} from "../../src/content/fixtures/cms-prerender.ts";

// The answer-first post sections on the page that actually ships (CM-02/05/
// 06/07/08/11/12, GEO-05). CI builds with DISABLE_STRAPI_CMS=true, and the
// committed article fixture carries one of every new field, so the prerendered
// HTML proves each renderer reached the server output -- in order, with the
// JSON-LD that describes it. Part 2 of the fixture series is deliberately
// plain: it pins that a post without the fields renders none of them.

const BUILD_DIR = resolve(import.meta.dirname, "../../.next/server/app");
const ARTICLE_HTML = join(BUILD_DIR, `blog/${CMS_PRERENDER_ARTICLE_SLUG}.html`);
const PLAIN_HTML = join(BUILD_DIR, `blog/${CMS_PRERENDER_SERIES_PART_SLUG}.html`);

function read(file: string): string {
  assert.ok(
    existsSync(file),
    `No prerendered ${file}. Run \`DISABLE_STRAPI_CMS=true pnpm --filter=web build\` before \`test:postbuild\`.`
  );
  return readFileSync(file, "utf8");
}

/** Every JSON-LD block in the page, parsed. */
function jsonLdBlocks(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(
    (match) => {
      const parsed = JSON.parse(match[1]) as unknown;
      return (Array.isArray(parsed) ? parsed : [parsed]) as Array<Record<string, unknown>>;
    }
  );
}

/** The server-rendered article markup, before the RSC payload repeats it. */
function articleMarkup(html: string): string {
  const start = html.indexOf("<article");
  const end = html.indexOf("</article>", start);
  assert.ok(start >= 0 && end > start, "the post renders an <article>");
  return html.slice(start, end);
}

test("the fixture post renders every answer-first section, in order", () => {
  const article = articleMarkup(read(ARTICLE_HTML));
  const markers = [
    "<h1",
    'data-article-section="key-takeaways"',
    'class="prose', // the Blocks body
    'data-article-section="comparison-tables"',
    'data-article-section="sources"',
    'data-article-section="series"',
    'data-article-section="faq"',
  ];
  const positions = markers.map((marker) => {
    const index = article.indexOf(marker);
    assert.ok(index >= 0, `the prerendered post contains ${marker}`);
    return index;
  });
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "sections render in answer-first order");
});

test("the Updated label sits beside the published date", () => {
  const article = articleMarkup(read(ARTICLE_HTML));
  assert.match(article, /Updated(?:<!-- -->)? <time dateTime="2026-02-20T15:00:00\.000Z">February 20, 2026<\/time>/);
  assert.match(articleMarkup(read(PLAIN_HTML)), /<time/, "the plain part still shows its date");
  assert.doesNotMatch(articleMarkup(read(PLAIN_HTML)), /Updated/);
});

test("the comparison table is a semantic, captioned, scrollable table", () => {
  const article = articleMarkup(read(ARTICLE_HTML));
  assert.match(article, /<div role="region" aria-label="Fixture comparison" tabindex="0" class="overflow-x-auto/);
  assert.match(article, /<caption[^>]*>Fixture comparison<\/caption>/);
  assert.equal(article.match(/<th scope="col"/g)?.length, 3);
  assert.equal(article.match(/<th scope="row"/g)?.length, 2);
});

test("sources, series nav, FAQ and cross-posts are in the server HTML", () => {
  const article = articleMarkup(read(ARTICLE_HTML));
  assert.match(
    article,
    /<a href="https:\/\/example\.com\/fixture-source" target="_blank" rel="noopener noreferrer"[^>]*>Fixture source<\/a>/
  );
  assert.match(article, new RegExp(`Part 1 of ${CMS_PRERENDER_SERIES}`));
  assert.match(article, new RegExp(`href="/blog/${CMS_PRERENDER_SERIES_PART_SLUG}"`), "the series links part 2");
  assert.match(article, /<h3[^>]*>Is this fixture indexable\?<\/h3>/);
  assert.match(article, /Discuss this post on/);
});

test("FAQPage JSON-LD mirrors the visible FAQ, and only where one is visible", () => {
  const faqPages = jsonLdBlocks(read(ARTICLE_HTML)).filter((block) => block["@type"] === "FAQPage");
  assert.equal(faqPages.length, 1);
  const [question] = faqPages[0].mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
  assert.equal(question.name, "Is this fixture indexable?");

  const plain = jsonLdBlocks(read(PLAIN_HTML));
  assert.equal(plain.filter((block) => block["@type"] === "FAQPage").length, 0, "no FAQ, no FAQPage");
});

test("BlogPosting cites the sources and carries the editorial dateModified", () => {
  const posting = jsonLdBlocks(read(ARTICLE_HTML)).find((block) => block["@type"] === "BlogPosting");
  assert.ok(posting);
  assert.deepEqual(posting.citation, [
    { "@type": "CreativeWork", name: "Fixture source", url: "https://example.com/fixture-source" },
  ]);
  assert.equal(posting.dateModified, "2026-02-20T15:00:00.000Z", "contentUpdatedAt, not updatedAt");
  assert.equal(posting.discussionUrl, "https://x.com/mehdizare");

  const plain = jsonLdBlocks(read(PLAIN_HTML)).find((block) => block["@type"] === "BlogPosting");
  assert.ok(plain);
  assert.equal(plain.citation, undefined);
});

test("a post without the new fields renders none of the new sections", () => {
  const article = articleMarkup(read(PLAIN_HTML));
  for (const section of ["key-takeaways", "comparison-tables", "sources", "faq", "cross-posts"]) {
    assert.doesNotMatch(article, new RegExp(`data-article-section="${section}"`), section);
  }
  assert.match(article, /data-article-section="series"/, "part 2 still shows its series");
});

test("both fixture posts render noindex robots", () => {
  for (const file of [ARTICLE_HTML, PLAIN_HTML]) {
    assert.match(read(file), /<meta name="robots" content="noindex, nofollow"\/>/);
  }
});
