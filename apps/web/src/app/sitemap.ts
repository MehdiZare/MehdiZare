import type { MetadataRoute } from "next";
import type { Article, Author, Category, Tag } from "@/types/strapi";
import {
  getAboutPage,
  getArticles,
  getAuthors,
  getBinaPrintPage,
  getCategories,
  getConsultingPage,
  getHomePage,
  getTags,
} from "@/lib/strapi";
import { isBinaPrintEnabled } from "@/lib/feature-flags";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";
import { getSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo";
import taxonomy from "../../../../data/taxonomy.json";

const SITE_URL = getSiteUrl();

export const revalidate = 3600;
/** One parallel CMS round uses the 15s Strapi timeout; finish before the isolate is killed. */
export const maxDuration = 20;

const SITEMAP_MAX_PAGES = 20;

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

async function getAllArticlesForSitemap(): Promise<Article[]> {
  const pageSize = 100;
  let page = 1;
  const articles: Article[] = [];

  while (true) {
    const response = await getArticles({
      pagination: { page, pageSize, withCount: true },
      sort: "publishedAt:desc",
    });

    articles.push(...response.data);

    const pageCount = response.meta.pagination?.pageCount ?? 1;
    if (page >= pageCount || page >= SITEMAP_MAX_PAGES) {
      break;
    }

    page += 1;
  }

  return articles;
}

async function getAllAuthorsForSitemap(): Promise<Author[]> {
  const pageSize = 100;
  let page = 1;
  const authors: Author[] = [];

  while (true) {
    const response = await getAuthors({
      pagination: { page, pageSize, withCount: true },
      sort: "updatedAt:desc",
    });

    authors.push(...response.data);

    const pageCount = response.meta.pagination?.pageCount ?? 1;
    if (page >= pageCount || page >= SITEMAP_MAX_PAGES) {
      break;
    }

    page += 1;
  }

  return authors;
}

async function getAllCategoriesForSitemap(): Promise<Category[]> {
  const pageSize = 100;
  let page = 1;
  const categories: Category[] = [];

  while (true) {
    const response = await getCategories({
      pagination: { page, pageSize, withCount: true },
      sort: "order:asc",
    });

    categories.push(...response.data);

    const pageCount = response.meta.pagination?.pageCount ?? 1;
    if (page >= pageCount || page >= SITEMAP_MAX_PAGES) {
      break;
    }

    page += 1;
  }

  return categories;
}

async function getAllTagsForSitemap(): Promise<Tag[]> {
  const pageSize = 100;
  let page = 1;
  const tags: Tag[] = [];

  while (true) {
    const response = await getTags({
      pagination: { page, pageSize, withCount: true },
      sort: "name:asc",
    });

    tags.push(...response.data);

    const pageCount = response.meta.pagination?.pageCount ?? 1;
    if (page >= pageCount || page >= SITEMAP_MAX_PAGES) {
      break;
    }

    page += 1;
  }

  return tags;
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
      lastModified: now,
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
  const timestamps = {
    home: now,
    about: now,
    binaPrint: now,
    consulting: now,
    aiEngineer: now,
    blog: now,
  };
  return [
    ...buildStaticSitemapPages(now, timestamps, showBinaPrint),
    ...fallbackAuthorPages(now),
    ...fallbackCategoryPages(now),
    ...fallbackTagPages(now),
  ];
}

function mapArticlePages(articles: Article[], now: Date): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];
  for (const article of articles) {
    const slug = normalizeSlug(article.slug);
    if (!slug) continue;
    try {
      const imageUrl = toAbsoluteMediaUrl(article.featuredImage?.url);
      pages.push({
        url: `${SITE_URL}/blog/${slug}`,
        lastModified: safeDate(article.updatedAt, now),
        changeFrequency: "weekly",
        priority: 0.7,
        images: imageUrl ? [imageUrl] : undefined,
      });
    } catch {
      // Skip a malformed row; do not fail the whole sitemap.
    }
  }
  return pages;
}

function mapAuthorPages(authors: Author[], now: Date): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];
  for (const author of authors) {
    const slug = normalizeSlug(author.slug);
    if (!slug) continue;
    try {
      const imageUrl = toAbsoluteMediaUrl(author.profileImage?.url);
      pages.push({
        url: `${SITE_URL}/author/${slug}`,
        lastModified: safeDate(author.updatedAt, now),
        changeFrequency: "monthly",
        priority: 0.6,
        images: imageUrl ? [imageUrl] : undefined,
      });
    } catch {
      // Skip a malformed row; do not fail the whole sitemap.
    }
  }
  return pages;
}

async function buildCmsSitemap(now: Date, showBinaPrint: boolean): Promise<MetadataRoute.Sitemap> {
  const degradedSources: string[] = [];
  const pageTimestamps = {
    home: now,
    about: now,
    binaPrint: now,
    consulting: now,
    aiEngineer: now,
    blog: now,
  };

  const timestampWork = (async () => {
    const [homeRes, aboutRes, consultingRes] = await Promise.all([
      getHomePage(),
      getAboutPage(),
      getConsultingPage(),
    ]);
    pageTimestamps.home = safeDate(homeRes.data?.updatedAt, now);
    pageTimestamps.about = safeDate(aboutRes.data?.updatedAt, now);
    pageTimestamps.consulting = safeDate(consultingRes.data?.updatedAt, now);
    if (showBinaPrint) {
      const binaPrintRes = await getBinaPrintPage();
      pageTimestamps.binaPrint = safeDate(binaPrintRes.data?.updatedAt, now);
    }
  })();

  const [timestampResult, articlesResult, authorsResult, categoriesResult, tagsResult] =
    await Promise.allSettled([
      timestampWork,
      getAllArticlesForSitemap(),
      getAllAuthorsForSitemap(),
      getAllCategoriesForSitemap(),
      getAllTagsForSitemap(),
    ]);

  if (timestampResult.status === "rejected") {
    degradedSources.push("pages");
  }

  let articlePages: MetadataRoute.Sitemap = [];
  if (articlesResult.status === "fulfilled") {
    const articles = articlesResult.value;
    pageTimestamps.blog = maxValidDate(
      articles.map((article) => article.updatedAt),
      pageTimestamps.blog
    );
    articlePages = mapArticlePages(articles, now);
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

  try {
    return await buildCmsSitemap(now, showBinaPrint);
  } catch (error) {
    console.warn("[sitemap] CMS enrichment failed; serving static + taxonomy fallback", error);
    return buildDegradedSitemap(now, showBinaPrint);
  }
}
