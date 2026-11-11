import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { Article, Author } from "../src/types/strapi.ts";
import { DEFAULT_SITE_PROFILE } from "../src/lib/site-profile-defaults.ts";

// Loads the author route and the blog listing against a stubbed Strapi, then
// asserts the HTML and JSON-LD they emit. Source call-counts stay green when
// the resolver returns the wrong person.
register("./next-entrypoints-hook.mjs", import.meta.url);

process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const STAMP = "2026-01-15T12:00:00.000Z";
const OWNER_SLUG = DEFAULT_SITE_PROFILE.authorSlug;

function author(overrides: Partial<Author> & Pick<Author, "id" | "slug" | "name">): Author {
  return {
    documentId: `doc-${overrides.id}`,
    bioShort: `${overrides.name} writes.`,
    websiteUrl: "",
    linkedinUrl: "",
    jobTitle: "",
    sameAs: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    publishedAt: STAMP,
    ...overrides,
  };
}

const owner = author({
  id: 1,
  name: "Mehdi Zare",
  slug: OWNER_SLUG,
  isPrimary: true,
});

const guest = author({
  id: 2,
  name: "Jane Doe",
  slug: "jane-doe",
  isPrimary: false,
});

function article(id: number, slug: string, title: string, by: Author): Article {
  return {
    id,
    documentId: `article-${id}`,
    title,
    slug,
    content: [],
    author: by,
    publishedDate: "2026-01-15",
    createdAt: STAMP,
    updatedAt: STAMP,
    publishedAt: STAMP,
  };
}

function collection(rows: unknown[]): Response {
  return new Response(
    JSON.stringify({
      data: rows,
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: rows.length } },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  const params = url.searchParams;
  if (url.pathname === "/api/authors") {
    const slug = params.get("filters[slug][$eq]");
    if (slug) return collection([owner, guest].filter((row) => row.slug === slug));
    const primary = params.get("filters[isPrimary][$eq]");
    if (primary === "true") return collection([owner]);
    return collection([owner, guest]);
  }
  if (url.pathname === "/api/articles") return collection([]);
  return collection([]);
}) as typeof fetch;

const { default: AuthorPage } = await import("../src/app/author/[slug]/page.tsx");
const { BlogListPageContent } = await import("../src/components/blog/BlogListPageContent.tsx");

function scriptJson(html: string, id: string): Record<string, unknown> | undefined {
  const match = html.match(new RegExp(`<script id="${id}" type="application/ld\\+json">([^<]*)</script>`));
  return match ? (JSON.parse(match[1]) as Record<string, unknown>) : undefined;
}

test("a guest author page omits empty website and LinkedIn links and does not inherit the owner", async () => {
  const html = renderToStaticMarkup(await AuthorPage({ params: Promise.resolve({ slug: guest.slug }) }));
  const person = scriptJson(html, "author-person-jsonld");

  const profileUrl = `https://www.mehdi-zare.com/author/${guest.slug}`;
  assert.equal(person?.["@id"], `${profileUrl}#person`);
  assert.equal(person?.url, profileUrl);
  assert.equal(html.includes(">Website<"), false);
  assert.equal(html.includes(">LinkedIn<"), false);
  assert.equal(html.includes(`href="${DEFAULT_SITE_PROFILE.authorWebsiteUrl}"`), false);
  assert.equal(html.includes(`href="${DEFAULT_SITE_PROFILE.authorLinkedinUrl}"`), false);
  const sameAs = Array.isArray(person?.sameAs) ? person.sameAs.join(" ") : "";
  assert.equal(sameAs.includes(DEFAULT_SITE_PROFILE.authorLinkedinUrl), false);
});

test("the site owner's author page keeps the profile links and does not emit a second Person", async () => {
  const html = renderToStaticMarkup(await AuthorPage({ params: Promise.resolve({ slug: owner.slug }) }));

  assert.equal(scriptJson(html, "author-person-jsonld"), undefined);
  assert.match(html, new RegExp(`href="${DEFAULT_SITE_PROFILE.authorWebsiteUrl}"`));
  assert.match(html, new RegExp(`href="${DEFAULT_SITE_PROFILE.authorLinkedinUrl}"`));
});

test("the blog listing emits each post's own author Person id", async () => {
  const html = renderToStaticMarkup(
    await BlogListPageContent({
      currentPage: 1,
      articles: [
        article(10, "owner-post", "Owner post", owner),
        article(11, "guest-post", "Guest post", guest),
      ],
      categories: [],
      pageTitle: "Blog",
      pageDescription: "Writing",
      canonicalPath: "/blog",
      canonicalAuthorId: "https://www.mehdi-zare.com/#person",
    })
  );
  const blog = scriptJson(html, "blog-jsonld");
  const posts = blog?.blogPost as Array<{ author: { "@id": string } }>;

  assert.equal(posts[0].author["@id"], "https://www.mehdi-zare.com/#person");
  assert.equal(posts[1].author["@id"], `https://www.mehdi-zare.com/author/${guest.slug}#person`);
});
