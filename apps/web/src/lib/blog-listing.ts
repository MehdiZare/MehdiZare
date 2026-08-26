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

export function formatTagName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveTagName(
  slug: string,
  ...candidates: Array<string | null | undefined>
): string {
  return firstFilled(...candidates) ?? formatTagName(slug);
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
  const tagName = resolveTagName(input.slug, input.name, input.seedName);
  const pageDescription =
    firstFilled(
      input.intro,
      input.seedIntro,
      input.tagDescription,
      input.seedDescription
    ) ?? buildTagListingDescription(tagName);

  return { tagName, pageDescription };
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
