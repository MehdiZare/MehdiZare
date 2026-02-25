import { getArticles, getCategories } from "@/lib/strapi";

export const BLOG_PAGE_SIZE = 9;

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
  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      getArticles({
        sort: "publishedDate:desc",
        pagination: {
          page: currentPage,
          pageSize: BLOG_PAGE_SIZE,
          withCount: true,
        },
      }),
      getCategories(),
    ]);

    return {
      articles: articlesRes.data,
      pagination: articlesRes.meta.pagination,
      categories: categoriesRes.data,
    };
  } catch {
    return {
      articles: [],
      pagination: undefined,
      categories: [],
    };
  }
}
