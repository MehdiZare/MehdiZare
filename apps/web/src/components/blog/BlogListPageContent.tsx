import Link from "next/link";
import type { Category, Article } from "@/types/strapi";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildBlogJsonLd,
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
  toAbsoluteMediaUrl,
} from "@/lib/seo";
import { buildBlogPageUrl } from "@/lib/blog-listing";
import { PostCard } from "@/components/blog/PostCard";

interface BlogListPageContentProps {
  currentPage: number;
  articles: Article[];
  categories: Category[];
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
  pageTitle: string;
  pageDescription: string;
  canonicalPath: string;
  canonicalAuthorId: string;
}

export function BlogListPageContent({
  currentPage,
  articles,
  categories,
  pagination,
  pageTitle,
  pageDescription,
  canonicalPath,
  canonicalAuthorId,
}: BlogListPageContentProps) {
  const hasNextPage = pagination ? currentPage < pagination.pageCount : false;
  const hasPrevPage = currentPage > 1;

  const blogJsonLd = buildBlogJsonLd({
    pathname: canonicalPath,
    title: pageTitle,
    description: pageDescription,
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
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Writing</p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">Blog</h1>
            <p className="mt-4 text-lg text-mid-gray">{pageDescription}</p>
          </div>

          <div className="mb-10">
            <CategoryFilter categories={categories} activeSlug={null} />
          </div>

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

          {pagination && pagination.pageCount > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              {hasPrevPage ? (
                <Link
                  href={buildBlogPageUrl(currentPage - 1)}
                  className="border border-warm-gray bg-paper px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed border border-warm-gray bg-muted px-5 py-2.5 text-sm font-medium text-mid-gray/50">
                  Previous
                </span>
              )}

              <span className="font-mono text-sm text-mid-gray">
                Page {currentPage} of {pagination.pageCount}
              </span>

              {hasNextPage ? (
                <Link
                  href={buildBlogPageUrl(currentPage + 1)}
                  className="border border-warm-gray bg-paper px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed border border-warm-gray bg-muted px-5 py-2.5 text-sm font-medium text-mid-gray/50">
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
