import { getArticles, getCategories } from "@/lib/strapi";

export const BLOG_PAGE_SIZE = 9;

export const BLOG_PAGE_DESCRIPTION =
  "Writing on production AI systems, LLM architecture, and shipping AI in finance, defense, healthcare, and enterprise.";

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
