import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { PostCard } from "@/components/blog/PostCard";
import {
  resolveCategoryListingCopy,
  resolveSubcategoryCards,
  resolveTaxonomyDisplayName,
  type SubcategoryCard,
} from "@/lib/blog-listing";
import { getCategorySeedBySlug } from "@/lib/taxonomy-seed";
import { getCategories, getCategoryBySlug, getArticles } from "@/lib/strapi";
import {
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";

type ArticleList = Awaited<ReturnType<typeof getArticles>>["data"];

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

function buildWhatYouWillFindPoints(
  categoryTitle: string,
  subcategories: SubcategoryCard[]
): string[] {
  const points = [
    `Production-focused implementation patterns for ${categoryTitle}.`,
    "Architecture and tooling decisions that hold up beyond prototypes.",
    "Evaluation and reliability practices to keep AI systems trustworthy.",
  ];

  if (subcategories.length > 0) {
    points.push(
      `Focused tracks: ${subcategories
        .slice(0, 4)
        .map((subcategory) => subcategory.name)
        .join(", ")}.`
    );
  }

  return [...new Set(points)];
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
  const { slug } = await params;
  const seed = getCategorySeedBySlug(slug);

  try {
    const res = await getCategoryBySlug(slug);
    const category = res.data[0];

    if (!category && !seed) {
      return buildNoIndexMetadata("Category Not Found");
    }

    const { categoryTitle, pageDescription } = resolveCategoryListingCopy({
      slug,
      name: category?.name,
      seedName: seed?.name,
      headline: category?.headline,
      seedHeadline: seed?.headline,
      intro: category?.intro,
      seedIntro: seed?.intro,
      categoryDescription: category?.description,
      seedDescription: seed?.description,
    });

    // buildPageMetadata already prefers a filled seo.metaTitle over this title.
    return buildPageMetadata({
      pathname: `/blog/category/${slug}`,
      title: categoryTitle,
      description: pageDescription,
      seo: category?.seo,
      type: "website",
    });
  } catch {
    if (!seed) {
      return buildNoIndexMetadata("Category Not Found");
    }

    const { categoryTitle, pageDescription } = resolveCategoryListingCopy({
      slug,
      seedName: seed.name,
      seedHeadline: seed.headline,
      seedIntro: seed.intro,
      seedDescription: seed.description,
    });

    return buildPageMetadata({
      pathname: `/blog/category/${slug}`,
      title: categoryTitle,
      description: pageDescription,
      type: "website",
    });
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const seed = getCategorySeedBySlug(slug);

  let category: Awaited<ReturnType<typeof getCategoryBySlug>>["data"][number] | undefined;
  try {
    const res = await getCategoryBySlug(slug);
    category = res.data[0];
  } catch {
    // CMS unavailable -- keep seed fallback mode.
  }

  if (!category && !seed) {
    notFound();
  }

  const {
    categoryName,
    categoryTitle,
    pageDescription: categoryDescription,
  } = resolveCategoryListingCopy({
    slug,
    name: category?.name,
    seedName: seed?.name,
    headline: category?.headline,
    seedHeadline: seed?.headline,
    intro: category?.intro,
    seedIntro: seed?.intro,
    categoryDescription: category?.description,
    seedDescription: seed?.description,
  });

  const parentSeed = seed?.parentSlug ? getCategorySeedBySlug(seed.parentSlug) : undefined;
  const parentInfo = category?.parent
    ? {
        name: resolveTaxonomyDisplayName(
          category.parent.slug,
          category.parent.name,
          category.parent.headline
        ),
        slug: category.parent.slug,
      }
    : parentSeed
      ? {
          name: resolveTaxonomyDisplayName(
            parentSeed.slug,
            parentSeed.name,
            parentSeed.headline
          ),
          slug: parentSeed.slug,
        }
      : null;

  const subcategories: SubcategoryCard[] = resolveSubcategoryCards(
    category?.children && category.children.length > 0
      ? category.children
      : (seed?.children ?? [])
  );

  const childSlugs = subcategories.map((subcategory) => subcategory.slug);
  const isParent = subcategories.length > 0;
  const canonicalPath = `/blog/category/${slug}`;

  let articles: ArticleList = [];

  try {
    const res = await getArticles({
      filters: {
        category: { slug: { $eq: slug } },
      },
      sort: "publishedAt:desc",
      pagination: {
        page: 1,
        pageSize: 12,
      },
    });
    articles = res.data;

    if (childSlugs.length > 0) {
      const childResults = await Promise.all(
        childSlugs.map((childSlug) =>
          getArticles({
            filters: {
              category: { slug: { $eq: childSlug } },
            },
            sort: "publishedAt:desc",
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
        if (seenIds.has(article.id)) {
          return false;
        }

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
    // CMS unavailable -- render evergreen copy with empty-state articles.
  }

  const breadcrumbItems = parentInfo
    ? [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        {
          name: parentInfo.name,
          path: `/blog/category/${parentInfo.slug}`,
        },
        { name: categoryName, path: canonicalPath },
      ]
    : [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: categoryName, path: canonicalPath },
      ];

  const whatYouWillFind = buildWhatYouWillFindPoints(categoryTitle, subcategories);

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
          {parentInfo && (
            <nav className="mb-8 font-mono text-xs text-mid-gray">
              <Link href="/blog" className="text-accent-warm hover:underline">
                Blog
              </Link>
              <span className="mx-2">/</span>
              <Link
                href={`/blog/category/${parentInfo.slug}`}
                className="text-accent-warm hover:underline"
              >
                {parentInfo.name}
              </Link>
              <span className="mx-2">/</span>
              <span>{categoryName}</span>
            </nav>
          )}

          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
              Category
            </p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
              {categoryTitle}
            </h1>
            <p className="mt-4 text-lg text-mid-gray">{categoryDescription}</p>
          </div>

          <div className="mb-12 border border-warm-gray bg-paper p-6">
            <h2 className="font-serif text-2xl text-ink">What You&apos;ll Find Here</h2>
            <ul className="mt-4 space-y-2 text-sm text-mid-gray">
              {whatYouWillFind.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          {isParent && subcategories.length > 0 && (
            <div className="mb-12">
              <h2 className="mb-6 font-serif text-2xl text-ink">
                Subcategories
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {subcategories.map((child) => (
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
