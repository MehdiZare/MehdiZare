import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { getTags, getTagBySlug, getArticles } from "@/lib/strapi";
import { getSiteProfile } from "@/lib/site-profile";
import { buildPageMetadata, buildWebPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";
import { PostCard } from "@/components/blog/PostCard";

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const tagsRes = await getTags();
    return tagsRes.data.map((tag) => ({ slug: tag.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const tagRes = await getTagBySlug(slug);
    const tag = tagRes.data[0];

    if (!tag) {
      return buildPageMetadata({
        pathname: `/blog/tag/${slug}`,
        title: "Tag Not Found",
        description: "The requested tag could not be found.",
      });
    }

    const siteProfile = await getSiteProfile();

    return buildPageMetadata({
      pathname: `/blog/tag/${slug}`,
      title: tag.seo?.metaTitle ?? tag.headline ?? tag.name,
      description: tag.seo?.metaDescription ?? tag.description ?? siteProfile.siteDescription,
      seo: tag.seo,
    });
  } catch {
    return buildPageMetadata({
      pathname: `/blog/tag/${slug}`,
      title: "Tag Not Found",
      description: "The requested tag could not be found.",
    });
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;

  let tagRes;
  try {
    tagRes = await getTagBySlug(slug);
  } catch {
    notFound();
  }

  const tag = tagRes.data[0];

  if (!tag) {
    notFound();
  }

  let articles: Awaited<ReturnType<typeof getArticles>>["data"] = [];

  try {
    const articlesRes = await getArticles({
      filters: {
        tags: { slug: { $eq: slug } },
      },
      sort: "publishedDate:desc",
      pagination: {
        page: 1,
        pageSize: 12,
        withCount: true,
      },
    });

    articles = articlesRes.data;
  } catch {
    // CMS unavailable — render empty state
  }

  const canonicalPath = `/blog/tag/${slug}`;
  const pageTitle = tag.headline ?? tag.name;
  const pageDescription = tag.description ?? "";
  const introText = tag.intro ?? "";

  return (
    <>
      <JsonLd
        id="tag-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: canonicalPath,
          title: pageTitle,
          description: pageDescription,
          type: "CollectionPage",
        })}
      />
      <JsonLd
        id="tag-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: tag.name, path: canonicalPath },
        ])}
      />
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Tag</p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
              {pageTitle}
            </h1>
            {introText && (
              <p className="mt-4 text-lg text-mid-gray">
                {introText}
              </p>
            )}
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
              <p className="text-lg text-mid-gray">No posts yet with this tag.</p>
              <p className="mt-2 text-sm text-mid-gray/60">Check back soon for new posts.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
