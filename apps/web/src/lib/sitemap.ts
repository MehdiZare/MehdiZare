import type { MetadataRoute } from "next";
import type { Article, Author, Category, Tag, SEO } from "@/types/strapi";
import {
  fetchAllPages,
  fetchAllPagesResult,
  getArticles,
  getAuthors,
  getCategories,
  getTags,
} from "@/lib/strapi";
import { isBinaPrintEnabled } from "@/lib/feature-flags";
import { ARTICLE_LISTING_SORT, resolveArticleLastModified } from "@/lib/article-dates";
import { isArticleIndexable } from "@/lib/article-content";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";
import {
  getSiteUrl,
  normalizeRobotsValue,
  resolveCanonicalUrl,
  toAbsoluteMediaUrl,
} from "@/lib/seo";
import taxonomy from "../../../../data/taxonomy.json";

const SITE_URL = getSiteUrl();

/**
 * Sitemap entries for every indexable page. Served as XML by
 * `app/sitemap-main.xml/route.ts`, which `/sitemap.xml` rewrites to; that file
 * explains why this is not an `app/sitemap.ts` metadata route, and holds the
 * route's `revalidate` and `maxDuration`.
 */

/**
 * Must stay below the route's `maxDuration` (20 s) * 1000 so
 * buildDegradedSitemap can return before the isolate is killed. Does not abort
 * in-flight CMS fetches.
 */
export const SITEMAP_DEADLINE_MS = 16_000;

/**
 * When the repo-owned pages last changed: the build that shipped them.
 *
 * `next.config.ts` stamps `BUILD_TIME` once per build and Next inlines it, so
 * it is fixed for the life of a deploy rather than advancing on every ISR
 * regeneration or, under a dynamic route, on every request. That distinction is
 * the whole point (#113) -- a `lastmod` of "now" tells a crawler every page
 * changed seconds ago, every time it looks, and Google discounts `lastmod`
 * sitemap-wide once it decides the value is unreliable.
 *
 * Falls back to module-load time, which is still deploy-scoped in practice, if
 * the stamp is ever missing or unparseable.
 */
const MODULE_LOADED_AT = new Date();

export function repoContentLastModified(): Date {
  const stamped = process.env.BUILD_TIME;
  if (!stamped) return MODULE_LOADED_AT;
  const parsed = new Date(stamped);
  return Number.isNaN(parsed.getTime()) ? MODULE_LOADED_AT : parsed;
}

function safeDate(input: string | undefined): Date | undefined {
  if (!input) {
    return undefined;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Newest parseable timestamp in `values`, or `fallback` when none are valid. */
export function maxValidDate<T extends Date | undefined>(
  values: Array<string | undefined>,
  fallback: T
): Date | T {
  let latest: Date | null = null;
  for (const value of values) {
    if (!value) continue;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!latest || parsed > latest) latest = parsed;
  }
  return latest ?? fallback;
}

/**
 * Fetch only the slug, the system and editorial dates, image URL, indexability
 * metadata, and the category and tag slugs that decide which taxonomy pages
 * have posts. This overrides the full articlePopulate, including author
 * credentials and seo.metaImage.
 *
 * New fields are appended rather than inserted so earlier ones keep their
 * positions. Strapi 5 answers an unknown field with a 400, which would drop
 * every article from the sitemap; `contentUpdatedAt` (lastmod, CM-02) and
 * `noindex` (CM-11) are content-model v2, so `getArticles` strips them and
 * retries once when the CMS has not been deployed with them yet.
 */
const SITEMAP_ARTICLE_FIELDS = {
  fields: ["slug", "updatedAt", "publishedAt", "publishedDate", "contentUpdatedAt", "noindex"],
  populate: {
    featuredImage: { fields: ["url"] },
    seo: { fields: ["metaRobots", "canonicalURL"] },
    category: { fields: ["slug"] },
    tags: { fields: ["slug"] },
  },
} as const;

function getAllArticlesForSitemap(deadlineMs?: number) {
  return fetchAllPagesResult(
    getArticles,
    "articles",
    {
      ...SITEMAP_ARTICLE_FIELDS,
      sort: ARTICLE_LISTING_SORT,
    },
    { deadlineMs }
  );
}

function getAllAuthorsForSitemap(deadlineMs?: number): Promise<Author[]> {
  return fetchAllPages(getAuthors, "authors", { sort: "updatedAt:desc" }, { deadlineMs });
}

function getAllCategoriesForSitemap(deadlineMs?: number): Promise<Category[]> {
  return fetchAllPages(getCategories, "categories", { sort: "order:asc" }, { deadlineMs });
}

function getAllTagsForSitemap(deadlineMs?: number): Promise<Tag[]> {
  return fetchAllPages(getTags, "tags", { sort: "name:asc" }, { deadlineMs });
}

interface TaxonomyCategoryNode {
  slug?: string;
  children?: TaxonomyCategoryNode[];
}

interface TaxonomyTagNode {
  slug?: string;
}

interface TaxonomyFallbackData {
  categories?: TaxonomyCategoryNode[];
  tags?: TaxonomyTagNode[];
}

function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function collectCategorySlugs(
  nodes: TaxonomyCategoryNode[],
  acc: string[]
): void {
  for (const node of nodes) {
    const slug = normalizeSlug(node.slug);
    if (slug) acc.push(slug);
    if (node.children?.length) collectCategorySlugs(node.children, acc);
  }
}

function getFallbackCategorySlugs(): string[] {
  const input = taxonomy as TaxonomyFallbackData;
  const slugs: string[] = [];
  collectCategorySlugs(input.categories ?? [], slugs);
  return dedupeStrings(slugs);
}

function getFallbackTagSlugs(): string[] {
  const input = taxonomy as TaxonomyFallbackData;
  const slugs = (input.tags ?? [])
    .map((tag) => normalizeSlug(tag.slug))
    .filter((slug): slug is string => Boolean(slug));

  return dedupeStrings(slugs);
}

const FALLBACK_CATEGORY_SLUGS = getFallbackCategorySlugs();
const FALLBACK_TAG_SLUGS = getFallbackTagSlugs();

function fallbackAuthorPages(now: Date): MetadataRoute.Sitemap {
  const slug = normalizeSlug(DEFAULT_SITE_PROFILE.authorSlug);
  if (!slug) return [];
  return [
    {
      url: `${SITE_URL}/author/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}

function fallbackCategoryPages(now: Date): MetadataRoute.Sitemap {
  return FALLBACK_CATEGORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/blog/category/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}

function fallbackTagPages(now: Date): MetadataRoute.Sitemap {
  return FALLBACK_TAG_SLUGS.map((slug) => ({
    url: `${SITE_URL}/blog/tag/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}

function buildStaticSitemapPages(
  now: Date,
  timestamps: {
    home: Date;
    about: Date;
    binaPrint: Date;
    consulting: Date;
    aiEngineer: Date;
    blog: Date;
  },
  showBinaPrint: boolean
): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: timestamps.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: timestamps.about,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/consulting`,
      lastModified: timestamps.consulting,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ai-engineer`,
      lastModified: timestamps.aiEngineer,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: timestamps.blog,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: repoContentLastModified(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  if (showBinaPrint) {
    staticPages.splice(2, 0, {
      url: `${SITE_URL}/bina-print`,
      lastModified: timestamps.binaPrint,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  return staticPages;
}

function buildDegradedSitemap(now: Date, showBinaPrint: boolean): MetadataRoute.Sitemap {
  // Everything this path can emit is repo-owned -- the static pages, and the
  // category/tag/author fallbacks from `data/taxonomy.json` -- so all of it
  // dates from the build. Using `now` here was doubly wrong: it is not a
  // modification date, and it made a CMS outage look like a site-wide edit.
  const builtAt = repoContentLastModified();
  const timestamps = {
    home: builtAt,
    about: builtAt,
    binaPrint: builtAt,
    consulting: builtAt,
    aiEngineer: builtAt,
    blog: builtAt,
  };
  return [
    ...buildStaticSitemapPages(now, timestamps, showBinaPrint),
    ...fallbackAuthorPages(builtAt),
    ...fallbackCategoryPages(builtAt),
    ...fallbackTagPages(builtAt),
  ];
}

/** Compare canonical and sitemap URLs modulo a trailing slash on the path. */
function normalizeSitemapUrl(value: string): string {
  const url = new URL(value);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

/** Match the robots and canonical metadata rendered by CMS-backed pages. */
function isSitemapCandidate(pathname: string, seo?: SEO): boolean {
  const directives = normalizeRobotsValue(seo?.metaRobots)?.split(", ") ?? [];
  return !directives.some(directive => directive === "noindex" || directive === "none")
    && normalizeSitemapUrl(resolveCanonicalUrl(pathname, seo?.canonicalURL))
      === normalizeSitemapUrl(`${SITE_URL}${pathname}`);
}

function mapArticlePages(articles: Article[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];
  for (const article of articles) {
    const slug = normalizeSlug(article.slug);
    // `noindex` posts render `noindex, follow`, so the sitemap must not submit them.
    if (!slug || !isArticleIndexable(article) || !isSitemapCandidate(`/blog/${slug}`, article.seo)) continue;
    let imageUrl: string | undefined;
    try {
      imageUrl = toAbsoluteMediaUrl(article.featuredImage?.url);
    } catch (error) {
      console.warn(`[sitemap] skipping featuredImage for /blog/${slug}`, error);
    }
    pages.push({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: resolveArticleLastModified(article),
      changeFrequency: "weekly",
      priority: 0.7,
      images: imageUrl ? [imageUrl] : undefined,
    });
  }
  return pages;
}

/** Slug -> newest article lastmod among the term's posts. A key means "has posts". */
type TermPostDates = Map<string, Date | undefined>;

function recordTermPost(terms: TermPostDates, slug: unknown, lastModified: Date | undefined): void {
  const key = normalizeSlug(slug);
  if (!key) return;
  const current = terms.get(key);
  terms.set(key, current && (!lastModified || current > lastModified) ? current : lastModified);
}

/**
 * Which categories and tags have at least one published post, and when the
 * newest of them last changed (TS-02 / CM-09 / GEO-14). Empty terms render a
 * "No posts yet" page that is `noindex, follow`, so the sitemap must not
 * submit them; a term's lastmod comes from its newest post rather than from
 * the term row's own `updatedAt`.
 */
function collectTermPostDates(articles: Article[]): {
  categories: TermPostDates;
  tags: TermPostDates;
} {
  const categories: TermPostDates = new Map();
  const tags: TermPostDates = new Map();
  for (const article of articles) {
    const lastModified = resolveArticleLastModified(article);
    recordTermPost(categories, article.category?.slug, lastModified);
    for (const tag of article.tags ?? []) {
      recordTermPost(tags, tag?.slug, lastModified);
    }
  }
  return { categories, tags };
}

/**
 * A category listing also shows its direct children's posts, so a parent with
 * no posts of its own is still non-empty when a child has some. Returns
 * `null` for an empty category, else its newest post date (possibly
 * undefined).
 */
function categoryPostDate(
  category: Category,
  slug: string,
  terms: TermPostDates
): { lastModified: Date | undefined } | null {
  const slugs = [slug, ...(category.children ?? []).map((child) => normalizeSlug(child?.slug))];
  let found = false;
  let newest: Date | undefined;
  for (const candidate of slugs) {
    if (!candidate || !terms.has(candidate)) continue;
    found = true;
    const date = terms.get(candidate);
    if (date && (!newest || date > newest)) newest = date;
  }
  return found ? { lastModified: newest } : null;
}

function mapAuthorPages(authors: Author[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];
  for (const author of authors) {
    const slug = normalizeSlug(author.slug);
    if (!slug) continue;
    let imageUrl: string | undefined;
    try {
      imageUrl = toAbsoluteMediaUrl(author.profileImage?.url);
    } catch (error) {
      console.warn(`[sitemap] skipping profileImage for /author/${slug}`, error);
    }
    pages.push({
      url: `${SITE_URL}/author/${slug}`,
      lastModified: safeDate(author.updatedAt),
      changeFrequency: "monthly",
      priority: 0.6,
      images: imageUrl ? [imageUrl] : undefined,
    });
  }
  return pages;
}

async function buildCmsSitemap(now: Date, showBinaPrint: boolean): Promise<MetadataRoute.Sitemap> {
  const deadlineMs = Date.now() + SITEMAP_DEADLINE_MS;
  const degradedSources: string[] = [];
  const builtAt = repoContentLastModified();
  const pageTimestamps = {
    home: builtAt,
    about: builtAt,
    binaPrint: builtAt,
    consulting: builtAt,
    aiEngineer: builtAt,
    blog: builtAt,
  };

  // The static pages' copy lives in the repo, so their lastmod is not a CMS
  // row (#100). Reading it from Strapi reported 2026-02-25 for pages that had
  // in fact changed that morning. With force-dynamic this falls through to
  // request-time `now` — tracked as #113 (deploy-stable lastmod).
  const [articlesResult, authorsResult, categoriesResult, tagsResult] =
    await Promise.allSettled([
      getAllArticlesForSitemap(deadlineMs),
      getAllAuthorsForSitemap(deadlineMs),
      getAllCategoriesForSitemap(deadlineMs),
      getAllTagsForSitemap(deadlineMs),
    ]);

  let articlePages: MetadataRoute.Sitemap = [];
  // null when the article walk failed or stopped early: post counts are
  // unknown, so the taxonomy is listed unfiltered rather than dropped.
  // A fulfilled partial walk (later-page error, deadline, or the page cap)
  // is the same situation — `fetchAllPagesResult` reports it as incomplete.
  let termPostDates: ReturnType<typeof collectTermPostDates> | null = null;
  if (articlesResult.status === "fulfilled") {
    const articles = articlesResult.value.items;
    pageTimestamps.blog = maxValidDate(
      articles.map((article) => resolveArticleLastModified(article)?.toISOString()),
      pageTimestamps.blog
    );
    if (articlesResult.value.complete) {
      termPostDates = collectTermPostDates(articles);
    }
    articlePages = mapArticlePages(articles);
    if (articles.length > 0 && !articles.some(article => normalizeSlug(article.slug))) {
      // Rows came back but mapArticlePages emitted nothing — a fields/populate
      // mismatch (missing slug) looks exactly like this and would otherwise
      // ship a sitemap with zero article URLs.
      console.warn(
        `[sitemap] ${articles.length} article(s) returned but none produced a URL.`
      );
    }
  } else {
    degradedSources.push("articles");
  }

  let authorPages: MetadataRoute.Sitemap = [];
  if (authorsResult.status === "fulfilled") {
    authorPages = mapAuthorPages(authorsResult.value);
  } else {
    degradedSources.push("authors");
  }
  if (authorPages.length === 0) {
    authorPages = fallbackAuthorPages(builtAt);
  }

  let categoryPages: MetadataRoute.Sitemap = [];
  if (categoriesResult.status === "fulfilled") {
    categoryPages = categoriesResult.value.flatMap((category) => {
      const slug = normalizeSlug(category.slug);
      if (!slug || !isSitemapCandidate(`/blog/category/${slug}`, category.seo)) return [];
      const posts = termPostDates ? categoryPostDate(category, slug, termPostDates.categories) : undefined;
      if (posts === null) return [];
      return [
        {
          url: `${SITE_URL}/blog/category/${slug}`,
          lastModified: posts?.lastModified ?? safeDate(category.updatedAt),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ];
    });
  }
  if (categoryPages.length === 0 && !(categoriesResult.status === "fulfilled"
    && categoriesResult.value.some(category => normalizeSlug(category.slug)))) {
    degradedSources.push("categories");
    categoryPages = fallbackCategoryPages(builtAt);
  }

  let tagPages: MetadataRoute.Sitemap = [];
  if (tagsResult.status === "fulfilled") {
    tagPages = tagsResult.value.flatMap((tag) => {
      const slug = normalizeSlug(tag.slug);
      if (!slug || !isSitemapCandidate(`/blog/tag/${slug}`, tag.seo)) return [];
      if (termPostDates && !termPostDates.tags.has(slug)) return [];
      return [
        {
          url: `${SITE_URL}/blog/tag/${slug}`,
          lastModified: termPostDates?.tags.get(slug) ?? safeDate(tag.updatedAt),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
      ];
    });
  }
  if (tagPages.length === 0 && !(tagsResult.status === "fulfilled"
    && tagsResult.value.some(tag => normalizeSlug(tag.slug)))) {
    degradedSources.push("tags");
    tagPages = fallbackTagPages(builtAt);
  }

  if (degradedSources.length > 0) {
    console.warn(
      `[sitemap] CMS-backed sections unavailable (${dedupeStrings(degradedSources).join(
        ", "
      )}); serving fallback sitemap entries where possible.`
    );
  }

  return [
    ...buildStaticSitemapPages(now, pageTimestamps, showBinaPrint),
    ...articlePages,
    ...authorPages,
    ...categoryPages,
    ...tagPages,
  ];
}

/**
 * Builds the sitemap from Strapi, racing SITEMAP_DEADLINE_MS. When the CMS is
 * down, slow or partial it still returns a sitemap: static pages plus the
 * data/taxonomy.json fallback, possibly without articles (see the route).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const showBinaPrint = isBinaPrintEnabled();
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  // Keep a handle so a late CMS rejection after the deadline wins cannot
  // surface as an unhandledRejection. Failures before the race settles still
  // go through the catch below.
  const cmsWork = buildCmsSitemap(now, showBinaPrint);
  void cmsWork.catch((error) => {
    if (settled) {
      console.warn("[sitemap] CMS enrichment failed after a result was already returned", error);
    }
  });

  try {
    // Promise.allSettled inside buildCmsSitemap absorbs CMS failures, so this
    // catch is only for unexpected throws (and a throw from the fallback
    // builder). The race is what returns a sitemap when the CMS is merely slow,
    // instead of waiting until maxDuration kills the isolate.
    const result = await Promise.race([
      cmsWork,
      new Promise<MetadataRoute.Sitemap>((resolve) => {
        deadline = setTimeout(() => {
          console.warn(
            `[sitemap] CMS did not finish within ${SITEMAP_DEADLINE_MS}ms; serving static + taxonomy fallback`
          );
          resolve(buildDegradedSitemap(now, showBinaPrint));
        }, SITEMAP_DEADLINE_MS);
      }),
    ]);
    settled = true;
    return result;
  } catch (error) {
    settled = true;
    console.warn("[sitemap] CMS enrichment failed; serving static + taxonomy fallback", error);
    return buildDegradedSitemap(now, showBinaPrint);
  } finally {
    clearTimeout(deadline);
  }
}
