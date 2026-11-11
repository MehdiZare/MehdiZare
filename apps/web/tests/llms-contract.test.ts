import test from "node:test";
import assert from "node:assert/strict";

// CMS off: the route must fall back to the static sections without a network
// read. The CMS-on post list is exercised through buildLlmsTxtContent below
// and through the shared feed query in feed-route.test.ts.
process.env.DISABLE_STRAPI_CMS = "true";

const { GET: getLlmsTxt, revalidate } = await import("../src/app/llms.txt/route.ts");
const { GET: getWellKnownLlmsTxt } = await import("../src/app/.well-known/llms.txt/route.ts");
const { buildLlmsTxtContent } = await import("../src/lib/llms.ts");

const SITE = "https://www.mehdi-zare.com";

test("llms.txt follows the llmstxt.org shape: H1, blockquote summary, H2 link sections", async () => {
  const response = await getLlmsTxt();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");

  const body = await response.text();
  const lines = body.split("\n");
  assert.equal(lines[0], "# Mehdi Zare");
  assert.equal(lines[1], "");
  assert.match(lines[2], /^> \S/);
  assert.equal(
    lines[2],
    "> AI and cloud architect, and CFA Charterholder. Builds and runs his own products with AI coding agents, and helps founders and CTOs take theirs from prototype to production, remotely."
  );

  for (const heading of ["## Services", "## About", "## Writing", "## Optional"]) {
    assert.ok(lines.includes(heading), `missing ${heading}`);
  }

  assert.match(body, new RegExp(`^- \\[Consulting\\]\\(${SITE}/consulting\\)$`, "m"));
  assert.match(body, new RegExp(`^- \\[AI Engineer\\]\\(${SITE}/ai-engineer\\)$`, "m"));
  assert.match(body, new RegExp(`^- \\[Blog\\]\\(${SITE}/blog\\): \\S`, "m"));
  assert.match(body, new RegExp(`^- \\[RSS feed\\]\\(${SITE}/feed\\.xml\\)`, "m"));
  assert.match(body, new RegExp(`^- \\[Sitemap\\]\\(${SITE}/sitemap\\.xml\\)`, "m"));
  assert.match(body, new RegExp(`Canonical host: ${SITE.replace(/\./g, "\\.")}\\.`));

  // Every list item is a markdown link, never a bare URL or key: value line.
  for (const line of lines.filter((candidate) => candidate.startsWith("- "))) {
    assert.match(line, /^- \[[^\]]+\]\(https:\/\/www\.mehdi-zare\.com[^)]*\)(: .+)?$/);
  }
});

test("llms.txt refreshes on the same window as the sitemap and feed", () => {
  assert.equal(revalidate, 300);
});

test("llms.txt lists published posts under Writing as [title](url): excerpt", () => {
  const body = buildLlmsTxtContent([
    {
      title: "Newest post",
      slug: "newest-post",
      excerpt: "What changed\nand why it matters.",
    },
    { title: "Brackets [in] title", slug: "brackets", excerpt: null },
    { title: "", slug: "untitled" },
    { title: "No slug", slug: "  " },
  ]);

  const writing = body.slice(body.indexOf("## Writing"), body.indexOf("## Optional"));
  assert.match(
    writing,
    new RegExp(`^- \\[Newest post\\]\\(${SITE}/blog/newest-post\\): What changed and why it matters\\.$`, "m"),
    "excerpts are collapsed onto one line"
  );
  assert.match(writing, new RegExp(`^- \\[Brackets \\\\\\[in\\\\\\] title\\]\\(${SITE}/blog/brackets\\)$`, "m"));
  assert.doesNotMatch(writing, /untitled/, "a post without a title is skipped");
  assert.doesNotMatch(writing, /No slug/, "a post without a slug is skipped");
  assert.ok(
    writing.indexOf("newest-post") < writing.indexOf("brackets"),
    "posts keep the newest-first order they were given"
  );
});

test(".well-known llms.txt route mirrors main llms.txt content", async () => {
  const [primary, wellKnown] = await Promise.all([getLlmsTxt(), getWellKnownLlmsTxt()]);
  assert.equal(wellKnown.status, 200);
  assert.equal(await wellKnown.text(), await primary.text());
});
