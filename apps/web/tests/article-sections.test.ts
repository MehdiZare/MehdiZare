import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// The answer-first post sections (CM-05/06/07/08/12, GEO-05), rendered for
// real so the assertions are on the HTML a crawler receives. The post-build
// scan (tests/post-build/article-sections.test.ts) checks the same sections
// on the prerendered fixture page, in order.

const {
  ArticleFaq,
  ArticleSources,
  ComparisonTables,
  CrossPostLinks,
  KeyTakeaways,
  SeriesNav,
} = await import("../src/components/blog/ArticleSections.tsx");

function render(element: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(element);
}

test("every section renders nothing when its field is empty", () => {
  assert.equal(render(createElement(KeyTakeaways, { items: [] })), "");
  assert.equal(render(createElement(ComparisonTables, { tables: [] })), "");
  assert.equal(render(createElement(ArticleSources, { sources: [] })), "");
  assert.equal(render(createElement(SeriesNav, { series: null })), "");
  assert.equal(render(createElement(ArticleFaq, { items: [] })), "");
  assert.equal(render(createElement(CrossPostLinks, { links: {} })), "");
});

test("key takeaways render as a labelled list", () => {
  const html = render(createElement(KeyTakeaways, { items: ["First answer.", "Second <answer>."] }));
  assert.match(html, /<section aria-labelledby="key-takeaways-heading"/);
  assert.match(html, /<h2 id="key-takeaways-heading"[^>]*>Key takeaways<\/h2>/);
  assert.equal(html.match(/<li>/g)?.length, 2);
  assert.match(html, /Second &lt;answer&gt;\./, "CMS text is escaped, not injected");
});

test("comparison tables are semantic, captioned, and scroll horizontally", () => {
  const html = render(
    createElement(ComparisonTables, {
      tables: [
        {
          caption: "Evals",
          columns: ["Benchmark", "Model A", "Model B"],
          rows: [["AA Index", "61", "56"]],
          notes: "Fixture numbers.",
        },
        { columns: ["A", "B"], rows: [["1", "2"]] },
      ],
    })
  );
  assert.match(html, /<div role="region" aria-label="Evals" tabindex="0" class="overflow-x-auto/);
  assert.match(html, /<table[^>]*><caption[^>]*>Evals<\/caption>/);
  assert.equal(html.match(/<th scope="col"/g)?.length, 5);
  assert.match(html, /<th scope="row"[^>]*>AA Index<\/th><td[^>]*>61<\/td><td[^>]*>56<\/td>/);
  assert.match(html, /Fixture numbers\./);
  assert.match(
    html,
    /<caption class="sr-only">Comparison table 2<\/caption>/,
    "a table without a caption still has an accessible name"
  );
});

test("sources link out with noopener, like the site's other external links", () => {
  const html = render(
    createElement(ArticleSources, {
      sources: [
        { title: "Model card", url: "https://example.com/card", publisher: "Example", accessedAt: "2026-08-30" },
        { title: "Offline note" },
      ],
    })
  );
  assert.match(html, /<h2 id="article-sources-heading"[^>]*>Sources<\/h2>/);
  assert.match(html, /<ol /);
  assert.match(
    html,
    /<a href="https:\/\/example\.com\/card" target="_blank" rel="noopener noreferrer"[^>]*>Model card<\/a>, Example, accessed <time dateTime="2026-08-30">August 30, 2026<\/time>/
  );
  assert.match(html, /<span class="text-ink">Offline note<\/span>/, "a source without a safe URL is plain text");
  assert.equal(html.match(/<a /g)?.length, 1);
});

test("series nav names the part and links the other parts", () => {
  const html = render(
    createElement(SeriesNav, {
      series: {
        name: "Agents",
        part: 2,
        parts: [
          { slug: "part-1", title: "One", part: 1, isCurrent: false },
          { slug: "part-2", title: "Two", part: 2, isCurrent: true },
        ],
      },
    })
  );
  assert.match(html, /<nav aria-label="Series: Agents"/);
  assert.match(html, />Part 2 of Agents<\/p>/);
  assert.match(html, /<a [^>]*href="\/blog\/part-1"[^>]*>Part 1: One<\/a>/);
  assert.match(html, /<span aria-current="page"[^>]*>Part 2: Two<\/span>/);
  assert.doesNotMatch(html, /href="\/blog\/part-2"/, "the current part is not a link to itself");

  const solo = render(
    createElement(SeriesNav, {
      series: { name: "Solo", parts: [{ slug: "a", title: "A", isCurrent: true }] },
    })
  );
  assert.match(solo, />Part of Solo<\/p>/);
  assert.doesNotMatch(solo, /<ol/, "a one-part series has nothing to link");
});

test("the FAQ is always visible: headings and paragraphs, no collapsed panel", () => {
  const html = render(
    createElement(ArticleFaq, { items: [{ question: "Is it visible?", answer: "Yes, without a click." }] })
  );
  assert.match(html, /<h2 id="article-faq-heading"[^>]*>Frequently asked questions<\/h2>/);
  assert.match(html, /<h3[^>]*>Is it visible\?<\/h3><p[^>]*>Yes, without a click\.<\/p>/);
  assert.doesNotMatch(html, /<button|aria-expanded|<details|hidden/);
});

test("cross-post links read naturally with one or two networks", () => {
  const both = render(
    createElement(CrossPostLinks, { links: { x: "https://x.com/a", linkedin: "https://linkedin.com/b" } })
  );
  assert.match(both, /Discuss this post on <span><a href="https:\/\/x\.com\/a" target="_blank" rel="noopener noreferrer"[^>]*>X<\/a><\/span><span> or <a [^>]*>LinkedIn<\/a><\/span>\./);
  const one = render(createElement(CrossPostLinks, { links: { linkedin: "https://linkedin.com/b" } }));
  assert.doesNotMatch(one, / or /);
});

test("StrapiImage: the alt prop (featuredImageAlt) beats the library alt, which beats the fallback", () => {
  // next/image does not render under the bare node test runner, so this pins
  // the one line that orders the candidates; resolveFeaturedImageAlt's own
  // tests cover the blank-string handling.
  const source = readFileSync(resolve(process.cwd(), "src/components/shared/StrapiImage.tsx"), "utf8");
  assert.match(source, /firstFilled\(altOverride, image\.alternativeText, fallbackAlt\)/);
});

test("the post page renders the sections in answer-first order and FAQPage from the visible list", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/blog/[slug]/page.tsx"), "utf8");
  const order = [
    "<h1",
    "<KeyTakeaways",
    "<BlocksRenderer",
    "<ComparisonTables",
    "<ArticleSources",
    "<SeriesNav",
    "<ArticleFaq",
  ].map((marker) => {
    const index = source.indexOf(marker);
    assert.ok(index >= 0, `post page renders ${marker}`);
    return index;
  });
  assert.deepEqual([...order].sort((a, b) => a - b), order, "sections appear in the specified order");

  assert.match(source, /const faqJsonLd = buildFAQJsonLd\(faqItems\)/);
  assert.match(source, /<ArticleFaq items=\{faqItems\} \/>/, "FAQPage and the visible FAQ share one array");
  assert.match(source, /\{faqJsonLd \? <JsonLd id="blog-post-faq-jsonld"/);
  assert.match(source, /robots: resolveArticleRobots\(article\)/);
  assert.match(source, /alt=\{coverAlt\}/);
  assert.match(source, /citations: buildSourceCitations\(sources\)/);
});

test("the listing card uses the same cover alt rule as the hero", () => {
  const card = readFileSync(resolve(process.cwd(), "src/components/blog/PostCard.tsx"), "utf8");
  assert.match(card, /alt=\{resolveFeaturedImageAlt\(article\)\}/);
});
