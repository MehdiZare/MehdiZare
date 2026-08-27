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

/** A subcategory link card rendered on a parent category listing. */
export interface SubcategoryCard {
  id: number | string;
  name: string;
  slug: string;
  description?: string;
}

/**
 * Maps CMS or seed child categories onto subcategory cards, resolving the
 * label through the shared display-name rule and treating a blank CMS
 * description as absent so a whitespace-only value cannot render an empty
 * paragraph under the card title. CMS children carry a numeric `id`; seed
 * children have none and are keyed by slug.
 */
export function resolveSubcategoryCards(
  children: Array<{
    id?: number | string;
    name?: string | null;
    slug: string;
    headline?: string | null;
    description?: string | null;
  }>
): SubcategoryCard[] {
  return children.map((child) => ({
    id: child.id ?? child.slug,
    name: resolveTaxonomyDisplayName(child.slug, child.name, child.headline),
    slug: child.slug,
    description: firstFilled(child.description),
  }));
}

export function buildTagListingDescription(tagName: string): string {
  return `Articles tagged ${tagName}.`;
}

/**
 * Shared resolution for every taxonomy listing: the display name used for
 * breadcrumbs, the title used for metadata / h1 / JSON-LD, and the page
 * description. Every candidate goes through `firstFilled`, so a CMS empty
 * string or whitespace-only value is treated as absent instead of winning
 * the chain and rendering blank. Tags and categories share this so the two
 * routes cannot drift apart again.
 */
function resolveTaxonomyListingCopy(input: {
  slug: string;
  name?: string | null;
  seedName?: string | null;
  headline?: string | null;
  seedHeadline?: string | null;
  intro?: string | null;
  seedIntro?: string | null;
  description?: string | null;
  seedDescription?: string | null;
  buildFallbackDescription: (displayName: string) => string;
}): { displayName: string; title: string; pageDescription: string } {
  const displayName = resolveTaxonomyDisplayName(
    input.slug,
    input.name,
    input.seedName
  );
  const title = firstFilled(input.headline, input.seedHeadline) ?? displayName;
  const pageDescription =
    firstFilled(
      input.intro,
      input.seedIntro,
      input.description,
      input.seedDescription
    ) ?? input.buildFallbackDescription(displayName);

  return { displayName, title, pageDescription };
}

/**
 * Resolves the three strings a tag listing renders -- breadcrumb name,
 * display title, and description -- from CMS values with seed fallbacks.
 * Headline wins over name across both sources so the metadata title, the h1,
 * and the JSON-LD name always agree.
 */
export function resolveTagListingCopy(input: {
  slug: string;
  name?: string | null;
  seedName?: string | null;
  headline?: string | null;
  seedHeadline?: string | null;
  intro?: string | null;
  seedIntro?: string | null;
  tagDescription?: string | null;
  seedDescription?: string | null;
}): { tagName: string; tagTitle: string; pageDescription: string } {
  const { displayName, title, pageDescription } = resolveTaxonomyListingCopy({
    slug: input.slug,
    name: input.name,
    seedName: input.seedName,
    headline: input.headline,
    seedHeadline: input.seedHeadline,
    intro: input.intro,
    seedIntro: input.seedIntro,
    description: input.tagDescription,
    seedDescription: input.seedDescription,
    buildFallbackDescription: buildTagListingDescription,
  });

  return { tagName: displayName, tagTitle: title, pageDescription };
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
  const { displayName, title, pageDescription } = resolveTaxonomyListingCopy({
    slug: input.slug,
    name: input.name,
    seedName: input.seedName,
    headline: input.headline,
    seedHeadline: input.seedHeadline,
    intro: input.intro,
    seedIntro: input.seedIntro,
    description: input.categoryDescription,
    seedDescription: input.seedDescription,
    buildFallbackDescription: buildCategoryListingDescription,
  });

  return { categoryName: displayName, categoryTitle: title, pageDescription };
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
