import type { Article, Author, BlocksContent, Category, Tag } from "@/types/strapi";
import { DEFAULT_SITE_PROFILE, DEFAULT_SOCIAL_LINKS } from "@/lib/site-profile-defaults";

/**
 * Tiny CMS catalog used when `DISABLE_STRAPI_CMS=true` so CI's post-build
 * SSR-visibility scan can see article / author / category / tag / pagination
 * templates (#114, #120). Production builds with Strapi reachable never
 * consult this file. A Strapi outage (CMS on, fetch failing) still returns
 * empty `generateStaticParams`, so these paths are not published by accident.
 *
 * Keep this set small. Category and tag pages already fall back to
 * `data/taxonomy.json` once `generateStaticParams` emits a slug; the article
 * and author templates have no seed fallback and need a full record. Pagination
 * reuses `BlogListPageContent`; the extra route is so that template is scanned.
 */

export const CMS_PRERENDER_ARTICLE_SLUG = "ssr-visibility-fixture";
/**
 * Part 2 of the fixture series, so the series navigation renders a real link
 * that resolves in a CMS-off build instead of pointing at a 404.
 */
export const CMS_PRERENDER_SERIES_PART_SLUG = "ssr-visibility-fixture-part-2";
export const CMS_PRERENDER_SERIES = "SSR visibility fixture series";
export const CMS_PRERENDER_AUTHOR_SLUG = DEFAULT_SITE_PROFILE.authorSlug;
export const CMS_PRERENDER_CATEGORY_SLUG = "ai-engineering";
export const CMS_PRERENDER_TAG_SLUG = "llms";
/** Pagination segment only. `/blog/page/1` redirects to `/blog`. */
export const CMS_PRERENDER_BLOG_PAGE = "2";

export const CMS_PRERENDER_HTML_FILES = [
  `blog/${CMS_PRERENDER_ARTICLE_SLUG}.html`,
  `blog/${CMS_PRERENDER_SERIES_PART_SLUG}.html`,
  `author/${CMS_PRERENDER_AUTHOR_SLUG}.html`,
  `blog/category/${CMS_PRERENDER_CATEGORY_SLUG}.html`,
  `blog/tag/${CMS_PRERENDER_TAG_SLUG}.html`,
  `blog/page/${CMS_PRERENDER_BLOG_PAGE}.html`,
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
  // Fake slug, not a real post. If DISABLE_STRAPI_CMS is ever set on a
  // public deploy, this URL must not be indexed. The author/category/tag
  // fixtures reuse live identity slugs, so they stay indexable.
  seo: {
    id: 9005,
    metaRobots: "noindex, nofollow",
  },
  publishedDate: STAMP,
  readingTime: 1,
  createdAt: STAMP,
  updatedAt: STAMP,
  publishedAt: STAMP,
  // Content model v2: one of every answer-first section, so the CMS-off build
  // prerenders each renderer and the post-build scan can check its HTML.
  noindex: true,
  // A later calendar day than publishedDate, so the "Updated" label renders.
  contentUpdatedAt: "2026-02-20T15:00:00.000Z",
  featuredImageAlt: "Fixture cover alt text",
  keyTakeaways: [
    { id: 1, text: "Fixture takeaway one: the answer comes first." },
    { id: 2, text: "Fixture takeaway two: every section is server-rendered." },
  ],
  comparisonTables: [
    {
      id: 1,
      caption: "Fixture comparison",
      columns: ["Model", "Score", "Price"],
      rows: [
        ["Fixture A", "61", "$1"],
        ["Fixture B", "56", "$2"],
      ],
      notes: "Fixture numbers, not real benchmarks.",
    },
  ],
  sources: [
    {
      id: 1,
      title: "Fixture source",
      url: "https://example.com/fixture-source",
      publisher: "Example",
      accessedAt: "2026-01-14",
    },
  ],
  series: CMS_PRERENDER_SERIES,
  seriesPart: 1,
  faq: [
    {
      id: 1,
      question: "Is this fixture indexable?",
      answer: "No. It is noindex so a CMS-off deploy cannot rank it.",
    },
  ],
  crossPostXUrl: "https://x.com/mehdizare",
  crossPostLinkedinUrl: "https://www.linkedin.com/in/mehdizare",
};

/** Part 2 of the fixture series; deliberately plain, so the old template is covered too. */
export const CMS_PRERENDER_SERIES_PART: Article = {
  id: 9006,
  documentId: "ssr-fixture-article-part-2",
  title: "SSR visibility fixture, part 2",
  slug: CMS_PRERENDER_SERIES_PART_SLUG,
  excerpt: "Second part of the committed fixture series.",
  content: fixtureBody,
  category: CMS_PRERENDER_CATEGORY,
  tags: [CMS_PRERENDER_TAG],
  author: CMS_PRERENDER_AUTHOR,
  seo: {
    id: 9007,
    metaRobots: "noindex, nofollow",
  },
  noindex: true,
  series: CMS_PRERENDER_SERIES,
  seriesPart: 2,
  publishedDate: STAMP,
  readingTime: 1,
  createdAt: STAMP,
  updatedAt: STAMP,
  publishedAt: STAMP,
};

export const CMS_PRERENDER_ARTICLES: readonly Article[] = [
  CMS_PRERENDER_ARTICLE,
  CMS_PRERENDER_SERIES_PART,
];

export function findCmsPrerenderArticle(slug: string): Article | undefined {
  return CMS_PRERENDER_ARTICLES.find((article) => article.slug === slug);
}

/** The fixture stand-in for `getArticlesInSeries`. */
export function findCmsPrerenderSeries(series: string): Article[] {
  return CMS_PRERENDER_ARTICLES.filter((article) => article.series === series);
}

export function findCmsPrerenderAuthor(slug: string): Author | undefined {
  return slug === CMS_PRERENDER_AUTHOR.slug ? CMS_PRERENDER_AUTHOR : undefined;
}
