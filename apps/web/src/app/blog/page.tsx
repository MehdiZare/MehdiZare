import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, getCategories } from "@/lib/strapi";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { PostCard } from "@/components/blog/PostCard";

export const metadata: Metadata = {
  title: "Blog | Mehdi Zare",
  description:
    "Insights on AI, finance, and technology. Read articles about artificial intelligence engineering, quantitative strategies, and the future of fintech.",
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    tag?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const categorySlug = params.category ?? null;
  const tagSlug = params.tag ?? null;

  // Build filters based on search params
  const filters: Record<string, unknown> = {};
  if (categorySlug) {
    filters.category = { slug: { $eq: categorySlug } };
  }
  if (tagSlug) {
    filters.tags = { slug: { $eq: tagSlug } };
  }

  let articles: Awaited<ReturnType<typeof getArticles>>["data"] = [];
  let pagination: Awaited<ReturnType<typeof getArticles>>["meta"]["pagination"] | undefined;
  let categories: Awaited<ReturnType<typeof getCategories>>["data"] = [];

  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      getArticles({
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sort: "publishedDate:desc",
        pagination: {
          page: currentPage,
          pageSize: 9,
          withCount: true,
        },
      }),
      getCategories(),
    ]);

    articles = articlesRes.data;
    pagination = articlesRes.meta.pagination;
    categories = categoriesRes.data;
  } catch {
    // CMS unavailable — render empty state
  }

  const hasNextPage = pagination
    ? currentPage < pagination.pageCount
    : false;
  const hasPrevPage = currentPage > 1;

  // Build pagination search params
  function buildPageUrl(page: number): string {
    const sp = new URLSearchParams();
    if (page > 1) sp.set("page", String(page));
    if (categorySlug) sp.set("category", categorySlug);
    if (tagSlug) sp.set("tag", tagSlug);
    const qs = sp.toString();
    return qs ? `/blog?${qs}` : "/blog";
  }

  return (
    <section className="bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Writing</p>
          <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg text-mid-gray">
            Insights on AI, finance, and technology
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-10">
          <CategoryFilter
            categories={categories}
            activeSlug={categorySlug}
          />
        </div>

        {/* Articles Grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <PostCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-mid-gray">No posts yet.</p>
            <p className="mt-2 text-sm text-mid-gray/60">
              Check back soon for new content.
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pageCount > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            {hasPrevPage ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="border border-warm-gray bg-paper px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
              >
                Previous
              </Link>
            ) : (
              <span className="border border-warm-gray bg-muted px-5 py-2.5 text-sm font-medium text-mid-gray/50 cursor-not-allowed">
                Previous
              </span>
            )}

            <span className="font-mono text-sm text-mid-gray">
              Page {currentPage} of {pagination.pageCount}
            </span>

            {hasNextPage ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="border border-warm-gray bg-paper px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
              >
                Next
              </Link>
            ) : (
              <span className="border border-warm-gray bg-muted px-5 py-2.5 text-sm font-medium text-mid-gray/50 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
