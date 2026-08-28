import type { Article, Author, BlocksContent, Category, Tag } from "@/types/strapi";
import { DEFAULT_SITE_PROFILE, DEFAULT_SOCIAL_LINKS } from "@/lib/site-profile-defaults";

/**
 * Tiny CMS catalog used when `DISABLE_STRAPI_CMS=true` so CI's post-build
 * SSR-visibility scan can see article / author / category / tag templates
 * (#114). Production builds with Strapi reachable never consult this file.
 *
 * Keep this set small. Category and tag pages already fall back to
 * `data/taxonomy.json` once `generateStaticParams` emits a slug; the article
 * and author templates have no seed fallback and need a full record.
 */

export const CMS_PRERENDER_ARTICLE_SLUG = "ssr-visibility-fixture";
export const CMS_PRERENDER_AUTHOR_SLUG = DEFAULT_SITE_PROFILE.authorSlug;
export const CMS_PRERENDER_CATEGORY_SLUG = "ai-engineering";
export const CMS_PRERENDER_TAG_SLUG = "llms";

export const CMS_PRERENDER_HTML_FILES = [
  `blog/${CMS_PRERENDER_ARTICLE_SLUG}.html`,
  `author/${CMS_PRERENDER_AUTHOR_SLUG}.html`,
  `blog/category/${CMS_PRERENDER_CATEGORY_SLUG}.html`,
  `blog/tag/${CMS_PRERENDER_TAG_SLUG}.html`,
] as const;

const STAMP = "2026-01-15T12:00:00.000Z";

const fixtureBody: BlocksContent = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        text: "Fixture body for the post-build SSR visibility scan. Shared reveal components are already covered by repo-owned pages; this copy exists so the article template itself is prerendered in CI.",
      },
    ],
  },
];

export const CMS_PRERENDER_CATEGORY: Category = {
  id: 9001,
  documentId: "ssr-fixture-category",
  name: "AI Engineering",
  slug: CMS_PRERENDER_CATEGORY_SLUG,
  createdAt: STAMP,
  updatedAt: STAMP,
  publishedAt: STAMP,
};

export const CMS_PRERENDER_TAG: Tag = {
  id: 9002,
  documentId: "ssr-fixture-tag",
  name: "LLMs",
  slug: CMS_PRERENDER_TAG_SLUG,
  createdAt: STAMP,
  updatedAt: STAMP,
  publishedAt: STAMP,
};

export const CMS_PRERENDER_AUTHOR: Author = {
  id: 9003,
  documentId: "ssr-fixture-author",
  name: DEFAULT_SITE_PROFILE.authorName,
  slug: CMS_PRERENDER_AUTHOR_SLUG,
  isPrimary: true,
  headline: DEFAULT_SITE_PROFILE.authorRole,
  bioShort: DEFAULT_SITE_PROFILE.authorBioShort,
  websiteUrl: DEFAULT_SITE_PROFILE.authorWebsiteUrl,
  linkedinUrl: DEFAULT_SITE_PROFILE.authorLinkedinUrl,
  sameAs: [...DEFAULT_SOCIAL_LINKS],
  jobTitle: DEFAULT_SITE_PROFILE.authorRole,
  worksForName: DEFAULT_SITE_PROFILE.authorWorksForName,
  worksForUrl: DEFAULT_SITE_PROFILE.authorWorksForUrl,
  alumniOf: [...DEFAULT_SITE_PROFILE.authorAlumniOf],
  knowsAbout: [...DEFAULT_SITE_PROFILE.knowsAbout],
  addressLocality: DEFAULT_SITE_PROFILE.authorAddressLocality,
  addressRegion: DEFAULT_SITE_PROFILE.authorAddressRegion,
  addressCountry: DEFAULT_SITE_PROFILE.authorAddressCountry,
  createdAt: STAMP,
  updatedAt: STAMP,
  publishedAt: STAMP,
};

export const CMS_PRERENDER_ARTICLE: Article = {
  id: 9004,
  documentId: "ssr-fixture-article",
  title: "SSR visibility fixture",
  slug: CMS_PRERENDER_ARTICLE_SLUG,
  excerpt: "Committed fixture so CI prerenders the article template without Strapi.",
  content: fixtureBody,
  category: CMS_PRERENDER_CATEGORY,
  tags: [CMS_PRERENDER_TAG],
  author: CMS_PRERENDER_AUTHOR,
  publishedDate: STAMP,
  readingTime: 1,
  createdAt: STAMP,
  updatedAt: STAMP,
  publishedAt: STAMP,
};

export function findCmsPrerenderArticle(slug: string): Article | undefined {
  return slug === CMS_PRERENDER_ARTICLE.slug ? CMS_PRERENDER_ARTICLE : undefined;
}

export function findCmsPrerenderAuthor(slug: string): Author | undefined {
  return slug === CMS_PRERENDER_AUTHOR.slug ? CMS_PRERENDER_AUTHOR : undefined;
}
