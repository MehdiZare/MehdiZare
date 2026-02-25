import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { getArticles, getCategories } from "@/lib/strapi";
import { getSiteProfile } from "@/lib/site-profile";
import {
  buildBlogJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  toPersonId,
  toAbsoluteMediaUrl,
} from "@/lib/seo";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { PostCard } from "@/components/blog/PostCard";

interface BlogSearchParams {
  page?: string;
}

function normalizePageParam(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

interface BlogPageProps {
  searchParams: Promise<BlogSearchParams>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  const params = await searchParams;
  const currentPage = normalizePageParam(params.page);

  const metadata = buildPageMetadata({
    pathname: "/blog",
    title: "Blog",
    description: siteProfile.siteDescription,
    type: "website",
    keywords: [
      "production AI engineering",
      "LLM systems",
      "AI architecture",
      "reliable AI systems",
      "domain-aware AI",
    ],
  });

  if (currentPage > 1) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const siteProfile = await getSiteProfile();
  const params = await searchParams;
  const currentPage = normalizePageParam(params.page);
  const canonicalPath = "/blog";

  let articles: Awaited<ReturnType<typeof getArticles>>["data"] = [];
  let pagination: Awaited<ReturnType<typeof getArticles>>["meta"]["pagination"] | undefined;
  let categories: Awaited<ReturnType<typeof getCategories>>["data"] = [];

  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      getArticles({
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

  function buildPageUrl(page: number): string {
    return page > 1 ? `/blog?page=${page}` : `/blog`;
  }

  const pageTitle = "Blog";
  const pageDescription =
    siteProfile.siteDescription;
  const canonicalAuthorId = toPersonId(siteProfile.author.profilePath);
  const blogJsonLd = buildBlogJsonLd({
    pathname: canonicalPath,
    title: pageTitle,
    description: siteProfile.siteDescription,
    authorId: canonicalAuthorId,
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
              activeSlug={null}
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
              <p className="mt-2 text-sm text-mid-gray/60">Check back soon for new posts.</p>
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
