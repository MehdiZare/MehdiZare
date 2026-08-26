import { getArticles, getCategories } from "@/lib/strapi";

export const BLOG_PAGE_SIZE = 9;

export const BLOG_PAGE_DESCRIPTION =
  "Writing on production AI systems, LLM architecture, and shipping AI in finance, defense, healthcare, and enterprise.";

function firstFilled(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return undefined;
}

/** Title-cases a taxonomy slug for use as a last-resort display label. */
export function formatSlugName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Picks the first non-blank candidate, treating CMS empty strings and
 * whitespace as absent, and falls back to the slug-derived label.
 */
export function resolveTaxonomyDisplayName(
  slug: string,
  ...candidates: Array<string | null | undefined>
): string {
  return firstFilled(...candidates) ?? formatSlugName(slug);
}

export function buildTagListingDescription(tagName: string): string {
  return `Articles tagged ${tagName}.`;
}

export function resolveTagListingCopy(input: {
  slug: string;
  name?: string | null;
  seedName?: string | null;
  intro?: string | null;
  seedIntro?: string | null;
  tagDescription?: string | null;
  seedDescription?: string | null;
}): { tagName: string; pageDescription: string } {
  const tagName = resolveTaxonomyDisplayName(input.slug, input.name, input.seedName);
  const pageDescription =
    firstFilled(
      input.intro,
      input.seedIntro,
      input.tagDescription,
      input.seedDescription
    ) ?? buildTagListingDescription(tagName);

  return { tagName, pageDescription };
}

export function buildCategoryListingDescription(categoryName: string): string {
  return `Articles in ${categoryName}.`;
}

/**
 * Resolves the three strings a category listing renders -- breadcrumb name,
 * display title, and description -- from CMS values with seed fallbacks.
 * Headline wins over name across both sources so the metadata title, the h1,
 * and the JSON-LD name always agree.
 */
export function resolveCategoryListingCopy(input: {
  slug: string;
  name?: string | null;
  seedName?: string | null;
  headline?: string | null;
  seedHeadline?: string | null;
  intro?: string | null;
  seedIntro?: string | null;
  categoryDescription?: string | null;
  seedDescription?: string | null;
}): { categoryName: string; categoryTitle: string; pageDescription: string } {
  const categoryName = resolveTaxonomyDisplayName(
    input.slug,
    input.name,
    input.seedName
  );
  const categoryTitle =
    firstFilled(input.headline, input.seedHeadline) ?? categoryName;
  const pageDescription =
    firstFilled(
      input.intro,
      input.seedIntro,
      input.categoryDescription,
      input.seedDescription
    ) ?? buildCategoryListingDescription(categoryName);

  return { categoryName, categoryTitle, pageDescription };
}

export function buildBlogPageUrl(page: number): string {
  return page > 1 ? `/blog/page/${page}` : "/blog";
}

export function parsePositivePageNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export type BlogListingData = {
  articles: Awaited<ReturnType<typeof getArticles>>["data"];
  pagination: Awaited<ReturnType<typeof getArticles>>["meta"]["pagination"] | undefined;
  categories: Awaited<ReturnType<typeof getCategories>>["data"];
};

export async function getBlogListingData(currentPage: number): Promise<BlogListingData> {
  const [articlesResult, categoriesResult] = await Promise.allSettled([
    getArticles({
      sort: "publishedAt:desc",
      pagination: {
        page: currentPage,
        pageSize: BLOG_PAGE_SIZE,
        withCount: true,
      },
    }),
    getCategories(),
  ]);

  return {
    articles: articlesResult.status === "fulfilled" ? articlesResult.value.data : [],
    pagination: articlesResult.status === "fulfilled" ? articlesResult.value.meta.pagination : undefined,
    categories: categoriesResult.status === "fulfilled" ? categoriesResult.value.data : [],
  };
}
