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
import { getSiteProfile } from "@/lib/site-profile";
import { getSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo";
import taxonomy from "../../../../data/taxonomy.json";

const SITE_URL = getSiteUrl();

export const revalidate = 3600;

function safeDate(input: string | undefined, fallback: Date): Date {
  if (!input) {
    return fallback;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

async function getAllArticlesForSitemap(): Promise<Article[]> {
  const pageSize = 100;
  let page = 1;
  const articles: Article[] = [];

  while (true) {
    const response = await getArticles({
      pagination: { page, pageSize, withCount: true },
      sort: "publishedDate:desc",
    });

    articles.push(...response.data);

    const pageCount = response.meta.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
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
    if (page >= pageCount) {
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
    if (page >= pageCount) {
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
    if (page >= pageCount) {
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

function getFallbackCategorySlugs(): string[] {
  const input = taxonomy as TaxonomyFallbackData;
  const slugs: string[] = [];

  input.categories?.forEach((category) => {
    const categorySlug = normalizeSlug(category.slug);
    if (categorySlug) {
      slugs.push(categorySlug);
    }

    category.children?.forEach((child) => {
      const childSlug = normalizeSlug(child.slug);
      if (childSlug) {
        slugs.push(childSlug);
      }
    });
  });

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const showBinaPrint = isBinaPrintEnabled();
  const degradedSources: string[] = [];
  const pageTimestamps = {
    home: now,
    about: now,
    binaPrint: now,
    consulting: now,
    blog: now,
  };

  try {
    const [homeRes, aboutRes, consultingRes] =
      await Promise.all([
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
  } catch {
    // Keep build-time fallback dates when CMS is unavailable.
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: pageTimestamps.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: pageTimestamps.about,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/consulting`,
      lastModified: pageTimestamps.consulting,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: pageTimestamps.blog,
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
      lastModified: pageTimestamps.binaPrint,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  let articlePages: MetadataRoute.Sitemap = [];
  let authorPages: MetadataRoute.Sitemap = [];

  try {
    const articles = await getAllArticlesForSitemap();
    if (articles.length > 0) {
      pageTimestamps.blog = safeDate(articles[0]?.updatedAt, pageTimestamps.blog);
    }

    articlePages = articles.map((article) => {
      const imageUrl = toAbsoluteMediaUrl(article.featuredImage?.url);

      return {
        url: `${SITE_URL}/blog/${article.slug}`,
        lastModified: safeDate(article.updatedAt, now),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: imageUrl ? [imageUrl] : undefined,
      };
    });
  } catch {
    degradedSources.push("articles");
  }

  try {
    const authors = await getAllAuthorsForSitemap();

    authorPages = authors.map((author) => ({
      url: `${SITE_URL}/author/${author.slug}`,
      lastModified: safeDate(author.updatedAt, now),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      images: author.profileImage?.url
        ? [toAbsoluteMediaUrl(author.profileImage.url)].filter(
            (imageUrl): imageUrl is string => Boolean(imageUrl)
          )
        : undefined,
    }));
  } catch {
    degradedSources.push("authors");
  }

  if (authorPages.length === 0) {
    try {
      const siteProfile = await getSiteProfile();
      const profilePath = siteProfile.author.profilePath;
      if (profilePath.startsWith("/author/")) {
        authorPages = [
          {
            url: `${SITE_URL}${profilePath}`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.6,
            images: siteProfile.author.profileImage?.url
              ? [toAbsoluteMediaUrl(siteProfile.author.profileImage.url)].filter(
                  (imageUrl): imageUrl is string => Boolean(imageUrl)
                )
              : undefined,
          },
        ];
      }
    } catch {
      // Best-effort fallback only.
    }
  }

  const categoryPages: MetadataRoute.Sitemap = await (async () => {
    try {
      const allCategories = await getAllCategoriesForSitemap();

      return allCategories.map((category) => ({
        url: `${SITE_URL}/blog/category/${category.slug}`,
        lastModified: safeDate(category.updatedAt, now),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    } catch {
      degradedSources.push("categories");
      return FALLBACK_CATEGORY_SLUGS.map((slug) => ({
        url: `${SITE_URL}/blog/category/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  })();

  const tagPages: MetadataRoute.Sitemap = await (async () => {
    try {
      const allTags = await getAllTagsForSitemap();

      return allTags.map((tag) => ({
        url: `${SITE_URL}/blog/tag/${tag.slug}`,
        lastModified: safeDate(tag.updatedAt, now),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    } catch {
      degradedSources.push("tags");
      return FALLBACK_TAG_SLUGS.map((slug) => ({
        url: `${SITE_URL}/blog/tag/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  })();

  if (degradedSources.length > 0) {
    const uniqueSources = dedupeStrings(degradedSources);
    console.warn(
      `[sitemap] CMS-backed sections unavailable (${uniqueSources.join(
        ", "
      )}); serving fallback sitemap entries where possible.`
    );
  }

  return [...staticPages, ...articlePages, ...authorPages, ...categoryPages, ...tagPages];
}
