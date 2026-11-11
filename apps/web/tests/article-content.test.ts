import test from "node:test";
import assert from "node:assert/strict";

// The answer-first content model's pure rules (CM-02/03/05/06/07/08/11/12,
// GEO-05): what each optional CMS field becomes on the page and in JSON-LD.
// Every input here is the shape Strapi actually sends: missing fields,
// `null`, cleared `""`, and untyped JSON.

const {
  buildSourceCitations,
  isArticleIndexable,
  resolveArticleRobots,
  resolveComparisonTable,
  resolveComparisonTables,
  resolveCrossPosts,
  resolveFaqItems,
  resolveFeaturedImageAlt,
  resolveKeyTakeaways,
  resolveLlmsDescription,
  resolveSeries,
  resolveSources,
  toSafeHttpUrl,
} = await import("../src/lib/article-content.ts");
const { formatSiteDate, resolveContentUpdatedAt } = await import("../src/lib/article-dates.ts");
const { buildBlogPostingJsonLd, buildFAQJsonLd, buildPageMetadata, getSiteUrl } = await import(
  "../src/lib/seo.ts"
);

const cover = (alternativeText: string | null) =>
  ({ id: 1, url: "/uploads/cover.webp", alternativeText }) as never;

// ── Alt precedence (CM-03) ───────────────────────────────────────────────

test("cover alt: featuredImageAlt, then the library alternativeText, then the title", () => {
  assert.equal(
    resolveFeaturedImageAlt({ title: "Title", featuredImageAlt: "Per-article alt", featuredImage: cover("Library alt") }),
    "Per-article alt"
  );
  assert.equal(
    resolveFeaturedImageAlt({ title: "Title", featuredImageAlt: null, featuredImage: cover("Library alt") }),
    "Library alt"
  );
  assert.equal(resolveFeaturedImageAlt({ title: "Title", featuredImage: cover(null) }), "Title");
});

test("a cleared or whitespace alt counts as absent, not as an empty alt", () => {
  assert.equal(
    resolveFeaturedImageAlt({ title: "Title", featuredImageAlt: "   ", featuredImage: cover("") }),
    "Title"
  );
  assert.equal(
    resolveFeaturedImageAlt({ title: "Title", featuredImageAlt: "", featuredImage: cover(" Library ") }),
    "Library"
  );
});

test("og:image:alt for a post follows the same cover alt rule", () => {
  type OgImage = { alt?: string };
  const ogAlt = (article: Parameters<typeof resolveFeaturedImageAlt>[0]) =>
    ((buildPageMetadata({
      pathname: "/blog/post",
      title: "Title",
      description: "desc",
      defaultImage: { url: "/blog/post/opengraph-image", width: 1200, height: 630, alt: resolveFeaturedImageAlt(article) },
      type: "article",
    }).openGraph?.images ?? []) as OgImage[])[0]?.alt;

  assert.equal(ogAlt({ title: "Title", featuredImageAlt: "Per-article alt", featuredImage: cover("Library") }), "Per-article alt");
  assert.equal(ogAlt({ title: "Title", featuredImage: cover("Library") }), "Library");
  assert.equal(ogAlt({ title: "Title" }), "Title");
});

// ── Robots / noindex (CM-11) ────────────────────────────────────────────

test("the noindex box renders noindex, follow and keeps an editor's follow directive", () => {
  assert.equal(resolveArticleRobots({ noindex: true }), "noindex, follow");
  assert.equal(resolveArticleRobots({ noindex: true, seo: { id: 1, metaRobots: "index, follow" } }), "noindex, follow");
  assert.equal(resolveArticleRobots({ noindex: true, seo: { id: 1, metaRobots: "nofollow" } }), "noindex, nofollow");
  assert.equal(
    resolveArticleRobots({ noindex: true, seo: { id: 1, metaRobots: "max-snippet:50" } }),
    "noindex, follow, max-snippet:50"
  );
});

test("a metaRobots that is already noindex/none wins unchanged; an unticked box changes nothing", () => {
  assert.equal(resolveArticleRobots({ noindex: true, seo: { id: 1, metaRobots: "noindex, nofollow" } }), "noindex, nofollow");
  assert.equal(resolveArticleRobots({ noindex: true, seo: { id: 1, metaRobots: "none" } }), "none");
  assert.equal(resolveArticleRobots({ noindex: false, seo: { id: 1, metaRobots: "Index, Follow" } }), "index, follow");
  assert.equal(resolveArticleRobots({ noindex: null }), undefined);
  assert.equal(resolveArticleRobots({}), undefined);
});

test("indexability follows the resolved robots", () => {
  assert.equal(isArticleIndexable({}), true);
  assert.equal(isArticleIndexable({ noindex: false }), true);
  assert.equal(isArticleIndexable({ noindex: true }), false);
  assert.equal(isArticleIndexable({ seo: { id: 1, metaRobots: "NOINDEX" } }), false);
  assert.equal(isArticleIndexable({ seo: { id: 1, metaRobots: "none" } }), false);
});

test("post metadata renders the resolved robots, not just seo.metaRobots", () => {
  const metadata = buildPageMetadata({
    pathname: "/blog/hidden",
    title: "Hidden",
    description: "desc",
    seo: { id: 1, metaRobots: "index, follow" },
    robots: resolveArticleRobots({ noindex: true, seo: { id: 1, metaRobots: "index, follow" } }),
    type: "article",
  });
  assert.equal(metadata.robots, "noindex, follow");

  const indexable = buildPageMetadata({
    pathname: "/blog/visible",
    title: "Visible",
    description: "desc",
    robots: resolveArticleRobots({ noindex: false }),
    type: "article",
  });
  assert.equal(indexable.robots, undefined, "an indexable post keeps the layout's robots");
});

// ── Updated label (CM-02) ───────────────────────────────────────────────

test("Updated shows only when contentUpdatedAt is a later calendar day than the published date", () => {
  assert.equal(
    resolveContentUpdatedAt({ publishedDate: "2026-08-30", contentUpdatedAt: "2026-09-15T12:00:00.000Z" }),
    "2026-09-15T12:00:00.000Z"
  );
  // Same day in New York (published 09:00 EDT, corrected 18:00 EDT): no label.
  assert.equal(
    resolveContentUpdatedAt({ publishedDate: "2026-08-30", contentUpdatedAt: "2026-08-30T22:00:00.000Z" }),
    undefined
  );
  // 02:00 UTC on the 31st is still the 30th in New York.
  assert.equal(
    resolveContentUpdatedAt({ publishedDate: "2026-08-30", contentUpdatedAt: "2026-08-31T02:00:00.000Z" }),
    undefined
  );
  assert.equal(
    resolveContentUpdatedAt({ publishedDate: "2026-08-30", contentUpdatedAt: "2026-08-01T12:00:00.000Z" }),
    undefined,
    "an update dated before publication is not shown"
  );
});

test("Updated never comes from the system updatedAt", () => {
  assert.equal(
    resolveContentUpdatedAt({ publishedDate: "2026-08-30", updatedAt: "2026-10-01T12:00:00.000Z" }),
    undefined
  );
  assert.equal(
    resolveContentUpdatedAt({ publishedDate: "2026-08-30", contentUpdatedAt: "", updatedAt: "2026-10-01T12:00:00.000Z" }),
    undefined
  );
  assert.equal(resolveContentUpdatedAt({ contentUpdatedAt: "not a date", publishedDate: "2026-08-30" }), undefined);
});

test("Updated falls back to publishedAt when the editorial date is empty", () => {
  assert.equal(
    resolveContentUpdatedAt({ publishedAt: "2026-02-25T14:55:26.603Z", contentUpdatedAt: "2026-03-01T12:00:00.000Z" }),
    "2026-03-01T12:00:00.000Z"
  );
});

test("the Updated date is formatted on the site's calendar", () => {
  assert.equal(formatSiteDate("2026-09-15T12:00:00.000Z"), "September 15, 2026");
  assert.equal(formatSiteDate("2026-09-16T02:00:00.000Z"), "September 15, 2026", "still the 15th in New York");
  assert.equal(formatSiteDate("nope"), undefined);
});

// ── Key takeaways (CM-06) ───────────────────────────────────────────────

test("key takeaways drop blanks and cap at five", () => {
  assert.deepEqual(
    resolveKeyTakeaways({
      keyTakeaways: [
        { text: " One " },
        { text: "" },
        { text: "   " },
        null as never,
        { text: "Two" },
        { text: "Three" },
        { text: "Four" },
        { text: "Five" },
        { text: "Six" },
      ],
    }),
    ["One", "Two", "Three", "Four", "Five"]
  );
  assert.deepEqual(resolveKeyTakeaways({ keyTakeaways: null }), []);
  assert.deepEqual(resolveKeyTakeaways({}), []);
});

test("llms.txt notes are the takeaways when present, else the excerpt", () => {
  assert.equal(
    resolveLlmsDescription({ excerpt: "Excerpt.", keyTakeaways: [{ text: "First" }, { text: "Second?" }] }),
    "First. Second?"
  );
  assert.equal(resolveLlmsDescription({ excerpt: " Excerpt. ", keyTakeaways: [{ text: " " }] }), "Excerpt.");
  assert.equal(resolveLlmsDescription({ excerpt: "", keyTakeaways: [] }), undefined);
});

// ── FAQ (CM-12) ─────────────────────────────────────────────────────────

test("FAQ keeps only complete pairs, and FAQPage is null when none are visible", () => {
  const items = resolveFaqItems({
    faq: [
      { question: " Q1? ", answer: " A1. " },
      { question: "Q2?", answer: "" },
      { question: "", answer: "orphan answer" },
    ],
  });
  assert.deepEqual(items, [{ question: "Q1?", answer: "A1." }]);

  const jsonLd = buildFAQJsonLd(items) as { "@type": string; mainEntity: Array<Record<string, unknown>> };
  assert.equal(jsonLd["@type"], "FAQPage");
  assert.equal(jsonLd.mainEntity.length, 1);
  assert.equal(jsonLd.mainEntity[0].name, "Q1?");

  assert.equal(buildFAQJsonLd(resolveFaqItems({ faq: [{ question: "Q?", answer: "  " }] })), null);
  assert.equal(buildFAQJsonLd(resolveFaqItems({ faq: null })), null);
  assert.equal(buildFAQJsonLd(resolveFaqItems({})), null);
});

// ── Sources and citation (CM-07) ────────────────────────────────────────

test("only absolute http(s) URLs survive", () => {
  assert.equal(toSafeHttpUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(toSafeHttpUrl(" http://example.com "), "http://example.com/");
  assert.equal(toSafeHttpUrl("javascript:alert(1)"), undefined);
  assert.equal(toSafeHttpUrl("/relative"), undefined);
  assert.equal(toSafeHttpUrl("ftp://example.com"), undefined);
  assert.equal(toSafeHttpUrl(""), undefined);
  assert.equal(toSafeHttpUrl(null), undefined);
});

test("sources keep their title, drop unsafe links and malformed dates", () => {
  const sources = resolveSources({
    sources: [
      { title: "Model card", url: "https://example.com/card", publisher: " Example ", accessedAt: "2026-08-30" },
      { title: "Unsafe", url: "javascript:alert(1)", accessedAt: "30 Aug" },
      { title: "  ", url: "https://example.com/untitled" },
    ],
  });
  assert.deepEqual(sources, [
    { title: "Model card", url: "https://example.com/card", publisher: "Example", accessedAt: "2026-08-30" },
    { title: "Unsafe", url: undefined, publisher: undefined, accessedAt: undefined },
  ]);
});

test("BlogPosting carries a CreativeWork citation per linked source", () => {
  const citations = buildSourceCitations(
    resolveSources({
      sources: [
        { title: "Model card", url: "https://example.com/card" },
        { title: "No link", url: "not a url" },
      ],
    })
  );
  assert.deepEqual(citations, [{ "@type": "CreativeWork", name: "Model card", url: "https://example.com/card" }]);

  const jsonLd = buildBlogPostingJsonLd({
    pathname: "/blog/sourced",
    headline: "Sourced",
    description: "desc",
    citations,
    discussionUrl: "https://x.com/mehdizare/status/1",
  });
  assert.deepEqual(jsonLd.citation, [
    { "@type": "CreativeWork", name: "Model card", url: "https://example.com/card" },
  ]);
  assert.equal(jsonLd.discussionUrl, "https://x.com/mehdizare/status/1");

  const bare = buildBlogPostingJsonLd({
    pathname: "/blog/bare",
    headline: "Bare",
    description: "desc",
    citations: [],
  });
  assert.equal(bare.citation, undefined, "no sources, no citation key");
  assert.equal(bare.discussionUrl, undefined);
  assert.equal(String(bare.url), `${getSiteUrl()}/blog/bare`);
});

// ── Comparison tables (CM-05) ───────────────────────────────────────────

test("a well-formed table is normalized: numbers stringified, short rows padded, blank rows dropped", () => {
  assert.deepEqual(
    resolveComparisonTable({
      caption: " Evals ",
      columns: ["Benchmark", "Model A", "Model B"],
      rows: [["AA Index", 61, 56], ["CursorBench", "69.9%"], ["", null, ""]],
      notes: " Re-fetched at write time. ",
    }),
    {
      caption: "Evals",
      columns: ["Benchmark", "Model A", "Model B"],
      rows: [
        ["AA Index", "61", "56"],
        ["CursorBench", "69.9%", ""],
      ],
      notes: "Re-fetched at write time.",
    }
  );
});

test("a malformed table is skipped whole instead of misattributing values", () => {
  const malformed = [
    { columns: "Benchmark, A", rows: [["x", "1"]] },
    { columns: ["A", "B"], rows: "nope" },
    { columns: ["A", "B"], rows: [["1", "2", "3"]] },
    { columns: ["A", { nested: true }], rows: [["1", "2"]] },
    { columns: ["A", "B"], rows: [["1", ["2"]]] },
    { columns: ["A", "B"], rows: [] },
    { columns: [], rows: [["1"]] },
    { columns: ["", ""], rows: [["1", "2"]] },
    { columns: ["A", "B"], rows: ["not a row"] },
  ];
  for (const table of malformed) {
    assert.equal(resolveComparisonTable(table), null, JSON.stringify(table));
  }
  assert.equal(resolveComparisonTable(null), null);
  assert.deepEqual(
    resolveComparisonTables({ comparisonTables: [...malformed, { columns: ["A"], rows: [["ok"]] }] }).length,
    1
  );
});

// ── Series and cross-posts (CM-08) ──────────────────────────────────────

test("series parts are ordered by part, deduped, and mark the current post", () => {
  const series = resolveSeries(
    { slug: "part-2", title: "Part two", series: "Agents", seriesPart: 2 },
    [
      { slug: "part-3", title: "Part three", series: "Agents", seriesPart: 3 },
      { slug: "part-1", title: "Part one", series: "Agents", seriesPart: 1 },
      { slug: "part-2", title: "Part two (dup)", series: "Agents", seriesPart: 2 },
      { slug: "other", title: "Other series", series: "Evals", seriesPart: 1 },
      { slug: "", title: "No slug", series: "Agents", seriesPart: 4 },
      { slug: "unnumbered", title: "Unnumbered", series: "Agents", seriesPart: null },
    ]
  );
  assert.ok(series);
  assert.equal(series.name, "Agents");
  assert.equal(series.part, 2);
  assert.deepEqual(
    series.parts.map((part) => [part.slug, part.part, part.isCurrent]),
    [
      ["part-1", 1, false],
      ["part-2", 2, true],
      ["part-3", 3, false],
      ["unnumbered", undefined, false],
    ]
  );
});

test("no series name, no series nav", () => {
  assert.equal(resolveSeries({ slug: "a", title: "A", series: "  " }, []), null);
  assert.equal(resolveSeries({ slug: "a", title: "A" }, []), null);
  const solo = resolveSeries({ slug: "a", title: "A", series: "Solo", seriesPart: 0 }, []);
  assert.deepEqual(solo, { name: "Solo", part: undefined, parts: [{ slug: "a", title: "A", part: undefined, isCurrent: true }] });
});

test("cross-post links are only absolute http(s) URLs", () => {
  assert.deepEqual(
    resolveCrossPosts({ crossPostXUrl: "https://x.com/mehdizare/status/1", crossPostLinkedinUrl: "linkedin.com/x" }),
    { x: "https://x.com/mehdizare/status/1", linkedin: undefined }
  );
});
