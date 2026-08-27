import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { PostCard } from "@/components/blog/PostCard";
import { resolveTagListingCopy } from "@/lib/blog-listing";
import { getTagSeedBySlug } from "@/lib/taxonomy-seed";
import { getTags, getTagBySlug, getArticles } from "@/lib/strapi";
import { buildBreadcrumbJsonLd, buildNoIndexMetadata, buildPageMetadata, buildWebPageJsonLd } from "@/lib/seo";

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

function buildTagHighlights(tagTitle: string): string[] {
  return [
    `Hands-on implementation notes for ${tagTitle}.`,
    "Production tradeoffs, reliability concerns, and practical patterns.",
    "Links to related posts that help you go deeper quickly.",
  ];
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
  const seed = getTagSeedBySlug(slug);

  try {
    const tagRes = await getTagBySlug(slug);
    const tag = tagRes.data[0];

    if (!tag && !seed) {
      return buildNoIndexMetadata("Tag Not Found");
    }

    const { tagTitle, pageDescription } = resolveTagListingCopy({
      slug,
      name: tag?.name,
      seedName: seed?.name,
      headline: tag?.headline,
      seedHeadline: seed?.headline,
      intro: tag?.intro,
      seedIntro: seed?.intro,
      tagDescription: tag?.description,
      seedDescription: seed?.description,
    });

    // buildPageMetadata already prefers a filled seo.metaTitle over this title.
    return buildPageMetadata({
      pathname: `/blog/tag/${slug}`,
      title: tagTitle,
      description: pageDescription,
      seo: tag?.seo,
    });
  } catch {
    if (!seed) {
      return buildNoIndexMetadata("Tag Not Found");
    }

    const { tagTitle, pageDescription } = resolveTagListingCopy({
      slug,
      seedName: seed.name,
      seedHeadline: seed.headline,
      seedIntro: seed.intro,
      seedDescription: seed.description,
    });

    return buildPageMetadata({
      pathname: `/blog/tag/${slug}`,
      title: tagTitle,
      description: pageDescription,
    });
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const seed = getTagSeedBySlug(slug);

  let tag: Awaited<ReturnType<typeof getTagBySlug>>["data"][number] | undefined;
  try {
    const tagRes = await getTagBySlug(slug);
    tag = tagRes.data[0];
  } catch {
    // CMS unavailable -- keep seed fallback mode.
  }

  if (!tag && !seed) {
    notFound();
  }

  let articles: Awaited<ReturnType<typeof getArticles>>["data"] = [];

  try {
    const articlesRes = await getArticles({
      filters: {
        tags: { slug: { $eq: slug } },
      },
      sort: "publishedAt:desc",
      pagination: {
        page: 1,
        pageSize: 12,
        withCount: true,
      },
    });

    articles = articlesRes.data;
  } catch {
    // CMS unavailable -- render evergreen copy with empty-state articles.
  }

  const canonicalPath = `/blog/tag/${slug}`;
  const { tagName, tagTitle, pageDescription } = resolveTagListingCopy({
    slug,
    name: tag?.name,
    seedName: seed?.name,
    headline: tag?.headline,
    seedHeadline: seed?.headline,
    intro: tag?.intro,
    seedIntro: seed?.intro,
    tagDescription: tag?.description,
    seedDescription: seed?.description,
  });
  const highlights = buildTagHighlights(tagTitle);

  return (
    <>
      <JsonLd
        id="tag-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: canonicalPath,
          title: tagTitle,
          description: pageDescription,
          type: "CollectionPage",
        })}
      />
      <JsonLd
        id="tag-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: tagName, path: canonicalPath },
        ])}
      />
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Tag</p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
              {tagTitle}
            </h1>
            <p className="mt-4 text-lg text-mid-gray">{pageDescription}</p>
          </div>

          <div className="mb-12 border border-warm-gray bg-paper p-6">
            <h2 className="font-serif text-2xl text-ink">What You&apos;ll Find Here</h2>
            <ul className="mt-4 space-y-2 text-sm text-mid-gray">
              {highlights.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

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
