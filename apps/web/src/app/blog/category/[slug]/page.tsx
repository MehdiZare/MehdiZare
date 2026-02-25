import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCategories, getCategoryBySlug, getArticles } from "@/lib/strapi";
import {
  buildPageMetadata,
  buildWebPageJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo";
import { PostCard } from "@/components/blog/PostCard";

type ArticleList = Awaited<ReturnType<typeof getArticles>>["data"];

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const res = await getCategories();
    const categories = res.data;
    const slugs: { slug: string }[] = [];

    for (const category of categories) {
      slugs.push({ slug: category.slug });
      if (category.children && category.children.length > 0) {
        for (const child of category.children) {
          slugs.push({ slug: child.slug });
        }
      }
    }

    return slugs;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const res = await getCategoryBySlug(slug);
    const category = res.data[0];

    if (!category) {
      return {
        title: "Category Not Found",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    return buildPageMetadata({
      pathname: `/blog/category/${slug}`,
      title: category.seo?.metaTitle ?? category.headline ?? category.name,
      description:
        category.seo?.metaDescription ?? category.description ?? `Articles in ${category.name}`,
      seo: category.seo,
      type: "website",
    });
  } catch {
    return {
      title: "Category Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  let category;
  try {
    const res = await getCategoryBySlug(slug);
    category = res.data[0];
  } catch {
    notFound();
  }

  if (!category) {
    notFound();
  }

  const isParent = category.children && category.children.length > 0;
  const hasParent = Boolean(category.parent);
  const canonicalPath = `/blog/category/${slug}`;

  const categoryTitle = category.headline ?? category.name;
  const categoryDescription =
    category.intro ?? category.description ?? `Articles in ${category.name}`;

  let articles: ArticleList = [];

  try {
    const res = await getArticles({
      filters: {
        category: { slug: { $eq: slug } },
      },
      sort: "publishedDate:desc",
      pagination: {
        page: 1,
        pageSize: 12,
      },
    });
    articles = res.data;

    if (isParent && category.children && category.children.length > 0) {
      const childResults = await Promise.all(
        category.children.map((child) =>
          getArticles({
            filters: {
              category: { slug: { $eq: child.slug } },
            },
            sort: "publishedDate:desc",
            pagination: {
              page: 1,
              pageSize: 12,
            },
          })
        )
      );

      for (const childRes of childResults) {
        articles = [...articles, ...childRes.data];
      }

      const seenIds = new Set<number>();
      articles = articles.filter((article) => {
        if (seenIds.has(article.id)) return false;
        seenIds.add(article.id);
        return true;
      });

      articles.sort((a, b) => {
        const dateA = a.publishedDate ?? a.publishedAt;
        const dateB = b.publishedDate ?? b.publishedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }
  } catch {
    // CMS unavailable -- render empty state
  }

  const breadcrumbItems = hasParent
    ? [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        {
          name: category.parent!.name,
          path: `/blog/category/${category.parent!.slug}`,
        },
        { name: category.name, path: canonicalPath },
      ]
    : [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: category.name, path: canonicalPath },
      ];

  return (
    <>
      <JsonLd
        id="category-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: canonicalPath,
          title: categoryTitle,
          description: categoryDescription,
          type: "CollectionPage",
        })}
      />
      <JsonLd
        id="category-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd(breadcrumbItems)}
      />
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Breadcrumb */}
          {hasParent && category.parent && (
            <nav className="mb-8 font-mono text-xs text-mid-gray">
              <Link href="/blog" className="text-accent-warm hover:underline">
                Blog
              </Link>
              <span className="mx-2">/</span>
              <Link
                href={`/blog/category/${category.parent.slug}`}
                className="text-accent-warm hover:underline"
              >
                {category.parent.name}
              </Link>
              <span className="mx-2">/</span>
              <span>{category.name}</span>
            </nav>
          )}

          {/* Page Header */}
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
              Category
            </p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
              {categoryTitle}
            </h1>
            {categoryDescription && (
              <p className="mt-4 text-lg text-mid-gray">
                {categoryDescription}
              </p>
            )}
          </div>

          {/* Subcategory Cards (parent categories only) */}
          {isParent && category.children && category.children.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-6 font-serif text-2xl text-ink">
                Subcategories
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/blog/category/${child.slug}`}
                    className="group border border-warm-gray bg-paper p-6 transition hover:border-ink"
                  >
                    <h3 className="font-serif text-lg text-ink group-hover:text-accent-warm">
                      {child.name}
                    </h3>
                    {child.description && (
                      <p className="mt-2 text-sm text-mid-gray">
                        {child.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Articles Section */}
          {isParent && (
            <h2 className="mb-6 font-serif text-2xl text-ink">All Articles</h2>
          )}

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <PostCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg text-mid-gray">
                No posts yet in this category.
              </p>
              <p className="mt-2 text-sm text-mid-gray/60">
                Check back soon for new posts.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
