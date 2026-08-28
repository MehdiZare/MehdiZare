import type { MetadataRoute } from "next";
import type { Article, Author, Category, Tag } from "@/types/strapi";
import {
  fetchAllPages,
  getArticles,
  getAuthors,
  getCategories,
  getTags,
} from "@/lib/strapi";
import { isBinaPrintEnabled } from "@/lib/feature-flags";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";
import { getSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo";
import taxonomy from "../../../../data/taxonomy.json";

const SITE_URL = getSiteUrl();

/**
 * Bounded ISR, not `force-dynamic`.
 *
 * `revalidate = 3600` was what let a published post sit out of the sitemap for
 * up to an hour (#110). Five minutes closes that without making the route
 * uncacheable: a metadata route hardcodes `cache-control: public, max-age=0,
 * must-revalidate`, so a dynamic sitemap means one uncached, four-way paginated
 * Strapi walk per crawler hit, with no CDN shielding and no stale copy to serve
 * if Strapi is slow. Under ISR a degraded regeneration never reaches a crawler,
 * because the previous good copy is served while the new one builds (#118).
 *
 * Invalidation still works on publish, and both paths are real -- read off a
 * build, `.next/server/app/sitemap.xml.meta` carries
 * `x-next-cache-tags: ...,_N_T_/sitemap.xml/route,_N_T_/sitemap.xml,strapi`.
 * The webhook's `revalidatePath("/sitemap.xml")` matches the second tag and its
 * `revalidateTag("strapi")` matches the third.
 */
export const revalidate = 300;
/** Isolate budget: must exceed SITEMAP_DEADLINE_MS so a slow CMS walk can still return the fallback. */
export const maxDuration = 20;

/** Must stay below maxDuration * 1000 so buildDegradedSitemap can return before the isolate is killed. Does not abort in-flight CMS fetches. */
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

function safeDate(input: string | undefined, fallback: Date): Date {
  if (!input) {
    return fallback;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** Newest parseable timestamp in `values`, or `fallback` when none are valid. */
export function maxValidDate(values: Array<string | undefined>, fallback: Date): Date {
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
 * Sitemap rows need slug plus the timestamps lastmod is derived from, and
 * featuredImage.url. Passing this populate overrides getArticles' default
 * articlePopulate (category, tags, author credentials, seo.metaImage).
 */
const SITEMAP_ARTICLE_FIELDS = {
  fields: ["slug", "updatedAt", "publishedAt"],
  populate: { featuredImage: { fields: ["url"] } },
} as const;

function getAllArticlesForSitemap(deadlineMs?: number): Promise<Article[]> {
  return fetchAllPages(
    getArticles,
    "articles",
    {
      ...SITEMAP_ARTICLE_FIELDS,
      sort: "publishedAt:desc",
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

function mapArticlePages(articles: Article[], now: Date): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];
  for (const article of articles) {
    const slug = normalizeSlug(article.slug);
    if (!slug) continue;
    let imageUrl: string | undefined;
    try {
      imageUrl = toAbsoluteMediaUrl(article.featuredImage?.url);
    } catch (error) {
      console.warn(`[sitemap] skipping featuredImage for /blog/${slug}`, error);
    }
    pages.push({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: maxValidDate([article.updatedAt, article.publishedAt], now),
      changeFrequency: "weekly",
      priority: 0.7,
      images: imageUrl ? [imageUrl] : undefined,
    });
  }
  return pages;
}

function mapAuthorPages(authors: Author[], now: Date): MetadataRoute.Sitemap {
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
      lastModified: safeDate(author.updatedAt, now),
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
    blog: now,
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
  if (articlesResult.status === "fulfilled") {
    const articles = articlesResult.value;
    pageTimestamps.blog = maxValidDate(
      articles.flatMap((article) => [article.updatedAt, article.publishedAt]),
      pageTimestamps.blog
    );
    articlePages = mapArticlePages(articles, now);
    if (articles.length > 0 && articlePages.length === 0) {
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
    authorPages = mapAuthorPages(authorsResult.value, now);
  } else {
    degradedSources.push("authors");
  }
  if (authorPages.length === 0) {
    authorPages = fallbackAuthorPages(now);
  }

  let categoryPages: MetadataRoute.Sitemap = [];
  if (categoriesResult.status === "fulfilled") {
    categoryPages = categoriesResult.value.flatMap((category) => {
      const slug = normalizeSlug(category.slug);
      if (!slug) return [];
      return [
        {
          url: `${SITE_URL}/blog/category/${slug}`,
          lastModified: safeDate(category.updatedAt, now),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ];
    });
  }
  if (categoryPages.length === 0) {
    degradedSources.push("categories");
    categoryPages = fallbackCategoryPages(now);
  }

  let tagPages: MetadataRoute.Sitemap = [];
  if (tagsResult.status === "fulfilled") {
    tagPages = tagsResult.value.flatMap((tag) => {
      const slug = normalizeSlug(tag.slug);
      if (!slug) return [];
      return [
        {
          url: `${SITE_URL}/blog/tag/${slug}`,
          lastModified: safeDate(tag.updatedAt, now),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
      ];
    });
  }
  if (tagPages.length === 0) {
    degradedSources.push("tags");
    tagPages = fallbackTagPages(now);
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
