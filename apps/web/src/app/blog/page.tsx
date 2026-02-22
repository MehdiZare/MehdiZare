import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { getArticles, getCategories } from "@/lib/strapi";
import {
  buildBlogJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  toAbsoluteMediaUrl,
} from "@/lib/seo";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { PostCard } from "@/components/blog/PostCard";

const blogMetadataDescription =
  "Field notes on shipping AI systems in production: architecture, reliability, and domain-aware engineering decisions.";

interface BlogSearchParams {
  page?: string;
  category?: string;
  tag?: string;
}

function normalizePageParam(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normalizeSlugParam(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildBlogPath(page: number, categorySlug: string | null, tagSlug: string | null): string {
  const sp = new URLSearchParams();
  if (page > 1) sp.set("page", String(page));
  if (categorySlug) sp.set("category", categorySlug);
  if (tagSlug) sp.set("tag", tagSlug);

  const qs = sp.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

interface BlogPageProps {
  searchParams: Promise<BlogSearchParams>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const currentPage = normalizePageParam(params.page);
  const categorySlug = normalizeSlugParam(params.category);
  const tagSlug = normalizeSlugParam(params.tag);
  const isVariantPage = currentPage > 1 || Boolean(categorySlug) || Boolean(tagSlug);

  const metadata = buildPageMetadata({
    pathname: "/blog",
    title: "Blog",
    description: blogMetadataDescription,
    type: "website",
    keywords: [
      "production AI engineering",
      "LLM systems",
      "AI architecture",
      "reliable AI systems",
      "domain-aware AI",
    ],
  });

  if (isVariantPage) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const currentPage = normalizePageParam(params.page);
  const categorySlug = normalizeSlugParam(params.category);
  const tagSlug = normalizeSlugParam(params.tag);
  const canonicalPath = "/blog";

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
    return buildBlogPath(page, categorySlug, tagSlug);
  }

  const pageTitle = "Blog";
  const pageDescription =
    "Practical writing on shipping AI systems that work in production.";
  const blogJsonLd = buildBlogJsonLd({
    pathname: canonicalPath,
    title: pageTitle,
    description: blogMetadataDescription,
    posts: articles.map((article) => ({
      title: article.title,
      path: `/blog/${article.slug}`,
      datePublished: article.publishedDate || article.publishedAt,
      imageUrl: toAbsoluteMediaUrl(article.featuredImage?.url),
    })),
  });

  return (
    <>
      <JsonLd
        id="blog-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: canonicalPath,
          title: pageTitle,
          description: pageDescription,
          type: "CollectionPage",
        })}
      />
      <JsonLd
        id="blog-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <JsonLd id="blog-jsonld" data={blogJsonLd} />
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Writing</p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
              Blog
            </h1>
            <p className="mt-4 text-lg text-mid-gray">
              {pageDescription}
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
                Check back soon, or subscribe for new posts.
              </p>
              <Link
                href="/newsletter"
                className="mt-5 inline-block rounded-sm border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                Join the newsletter
              </Link>
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
    </>
  );
}
