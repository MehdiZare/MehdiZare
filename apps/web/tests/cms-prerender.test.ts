import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_SITE_PROFILE } from "../src/lib/site-profile-defaults.ts";
import {
  CMS_PRERENDER_ARTICLE,
  CMS_PRERENDER_ARTICLE_SLUG,
  CMS_PRERENDER_AUTHOR,
  CMS_PRERENDER_AUTHOR_SLUG,
  CMS_PRERENDER_CATEGORY_SLUG,
  CMS_PRERENDER_HTML_FILES,
  CMS_PRERENDER_TAG_SLUG,
  findCmsPrerenderArticle,
  findCmsPrerenderAuthor,
} from "../src/content/fixtures/cms-prerender.ts";

test("the prerender fixture slugs match the records and the HTML list", () => {
  assert.equal(CMS_PRERENDER_ARTICLE.slug, CMS_PRERENDER_ARTICLE_SLUG);
  assert.equal(CMS_PRERENDER_AUTHOR.slug, CMS_PRERENDER_AUTHOR_SLUG);
  assert.deepEqual(
    [...CMS_PRERENDER_HTML_FILES].sort(),
    [
      `author/${CMS_PRERENDER_AUTHOR_SLUG}.html`,
      `blog/${CMS_PRERENDER_ARTICLE_SLUG}.html`,
      `blog/category/${CMS_PRERENDER_CATEGORY_SLUG}.html`,
      `blog/tag/${CMS_PRERENDER_TAG_SLUG}.html`,
    ].sort()
  );
});

test("the author fixture is the site owner, so Person JSON-LD stays on the identity contract", () => {
  assert.equal(CMS_PRERENDER_AUTHOR_SLUG, DEFAULT_SITE_PROFILE.authorSlug);
  assert.equal(CMS_PRERENDER_AUTHOR.isPrimary, true);
  assert.equal(CMS_PRERENDER_AUTHOR.name, DEFAULT_SITE_PROFILE.authorName);
});

test("category and tag fixture slugs exist in the taxonomy seed, so those pages render without a CMS row", () => {
  // Read the production file, not the test runner's taxonomy stub. A rename
  // in data/taxonomy.json must fail here, not only at postbuild.
  const taxonomy = JSON.parse(
    readFileSync(resolve(process.cwd(), "../../data/taxonomy.json"), "utf8")
  ) as {
    categories: Array<{ slug: string; children?: Array<{ slug: string }> }>;
    tags: Array<{ slug: string }>;
  };
  const categorySlugs = taxonomy.categories.flatMap((category) => [
    category.slug,
    ...(category.children?.map((child) => child.slug) ?? []),
  ]);

  assert.ok(
    categorySlugs.includes(CMS_PRERENDER_CATEGORY_SLUG),
    `${CMS_PRERENDER_CATEGORY_SLUG} must exist in data/taxonomy.json or the category template 404s in a CMS-off build`
  );
  assert.ok(
    taxonomy.tags.some((tag) => tag.slug === CMS_PRERENDER_TAG_SLUG),
    `${CMS_PRERENDER_TAG_SLUG} must exist in data/taxonomy.json or the tag template 404s in a CMS-off build`
  );
});

test("finders return the fixture for its slug and nothing else", () => {
  assert.equal(findCmsPrerenderArticle(CMS_PRERENDER_ARTICLE_SLUG)?.id, CMS_PRERENDER_ARTICLE.id);
  assert.equal(findCmsPrerenderArticle("some-other-post"), undefined);
  assert.equal(findCmsPrerenderAuthor(CMS_PRERENDER_AUTHOR_SLUG)?.id, CMS_PRERENDER_AUTHOR.id);
  assert.equal(findCmsPrerenderAuthor("guest-author"), undefined);
});

test("the fake article slug is noindex so a CMS-off public deploy cannot rank it", () => {
  assert.match(
    CMS_PRERENDER_ARTICLE.seo?.metaRobots ?? "",
    /noindex/i,
    "ssr-visibility-fixture is not a real post; metaRobots must include noindex"
  );
});

test("CMS-off generateStaticParams emits the fixture slugs", () => {
  const pages: Array<{ file: string; slug: string }> = [
    { file: "src/app/blog/[slug]/page.tsx", slug: "CMS_PRERENDER_ARTICLE_SLUG" },
    { file: "src/app/author/[slug]/page.tsx", slug: "CMS_PRERENDER_AUTHOR_SLUG" },
    { file: "src/app/blog/category/[slug]/page.tsx", slug: "CMS_PRERENDER_CATEGORY_SLUG" },
    { file: "src/app/blog/tag/[slug]/page.tsx", slug: "CMS_PRERENDER_TAG_SLUG" },
  ];

  for (const { file, slug } of pages) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    assert.match(
      source,
      /serverEnv\.strapiDisabled/,
      `${file} must consult DISABLE_STRAPI_CMS before falling back to an empty generateStaticParams`
    );
    assert.match(
      source,
      new RegExp(slug),
      `${file} must emit ${slug} when the CMS is disabled`
    );
  }
});
