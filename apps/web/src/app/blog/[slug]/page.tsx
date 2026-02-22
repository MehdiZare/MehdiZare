import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticles, getArticleBySlug } from "@/lib/strapi";
import { StrapiImage } from "@/components/shared/StrapiImage";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { TagBadge } from "@/components/blog/TagBadge";
import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const res = await getArticles({
      pagination: { pageSize: 100, withCount: false },
    });
    return res.data.map((article) => ({
      slug: article.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mehdi-zare.com";
    const { slug } = await params;
    const res = await getArticleBySlug(slug);
    const article = res.data[0];

    if (!article) {
      return { title: "Post Not Found | Mehdi Zare" };
    }

    const seo = article.seo;
    return {
      title: seo?.metaTitle ?? `${article.title} | Mehdi Zare`,
      description:
        seo?.metaDescription ?? article.excerpt ?? "",
      keywords: seo?.keywords,
      robots: seo?.metaRobots,
      alternates: { canonical: seo?.canonicalURL ?? `${siteUrl}/blog/${slug}` },
      openGraph: {
        title: seo?.metaTitle ?? article.title,
        description: seo?.metaDescription ?? article.excerpt ?? "",
        type: "article",
        publishedTime: article.publishedDate ?? article.publishedAt,
        images: seo?.metaImage
          ? [
              {
                url: seo.metaImage.url,
                width: seo.metaImage.width,
                height: seo.metaImage.height,
                alt: seo.metaImage.alternativeText ?? article.title,
              },
            ]
          : article.featuredImage
            ? [
                {
                  url: article.featuredImage.url,
                  width: article.featuredImage.width,
                  height: article.featuredImage.height,
                  alt:
                    article.featuredImage.alternativeText ?? article.title,
                },
              ]
            : undefined,
      },
    };
  } catch {
    return { title: "Post Not Found | Mehdi Zare" };
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  let article;
  try {
    const res = await getArticleBySlug(slug);
    article = res.data[0];
  } catch {
    notFound();
  }

  if (!article) {
    notFound();
  }

  // Fetch all articles to determine previous/next
  let previousArticle = null;
  let nextArticle = null;

  try {
    const allArticlesRes = await getArticles({
      sort: "publishedDate:desc",
      pagination: { pageSize: 100, withCount: false },
    });
    const allArticles = allArticlesRes.data;
    const currentIndex = allArticles.findIndex(
      (a) => a.slug === article.slug
    );

    if (currentIndex > 0) {
      nextArticle = allArticles[currentIndex - 1]; // newer article
    }
    if (currentIndex < allArticles.length - 1) {
      previousArticle = allArticles[currentIndex + 1]; // older article
    }
  } catch {
    // Silently fail -- prev/next navigation is optional
  }

  const displayDate =
    article.publishedDate ?? article.publishedAt;

  return (
    <section className="bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Main Content */}
          <article className="lg:col-span-8">
            {/* Meta row */}
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
              {article.category && (
                <Link
                  href={`/blog?category=${article.category.slug}`}
                  className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent-warm"
                >
                  {article.category.name}
                </Link>
              )}
              {displayDate && (
                <time
                  dateTime={displayDate}
                  className="font-mono text-xs text-mid-gray"
                >
                  {formatDate(displayDate)}
                </time>
              )}
              {article.readingTime && (
                <span className="font-mono text-xs text-mid-gray/60">
                  {article.readingTime} min read
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl leading-tight text-ink lg:text-4xl">
              {article.title}
            </h1>

            {/* Featured Image */}
            {article.featuredImage && (
              <div className="mt-8 aspect-video overflow-hidden relative">
                <StrapiImage
                  image={article.featuredImage}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            )}

            {/* Article Body */}
            <div className="mt-10">
              <BlocksRenderer content={article.content} />
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-warm-gray pt-6">
                {article.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )}

            {/* Author Card */}
            <div className="mt-10 border border-warm-gray bg-paper p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-muted font-serif text-xl text-ink">
                  MZ
                </div>
                <div>
                  <h3 className="font-serif text-lg text-ink">
                    Mehdi Zare, CFA
                  </h3>
                  <p className="font-mono text-xs text-accent-warm">
                    Principal AI Engineer
                  </p>
                  <p className="mt-2 text-sm text-mid-gray leading-relaxed">
                    Bridging the worlds of artificial intelligence and finance.
                    Passionate about building intelligent systems, quantitative
                    strategies, and the intersection of AI with fintech.
                  </p>
                </div>
              </div>
            </div>

            {/* Previous / Next Navigation */}
            {(previousArticle || nextArticle) && (
              <nav className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {previousArticle ? (
                  <Link
                    href={`/blog/${previousArticle.slug}`}
                    className="group border border-warm-gray bg-paper p-5 transition hover:border-ink"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-mid-gray/60">
                      Previous
                    </span>
                    <p className="mt-1 text-sm font-medium text-ink group-hover:text-accent-warm transition">
                      {previousArticle.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}
                {nextArticle ? (
                  <Link
                    href={`/blog/${nextArticle.slug}`}
                    className="group border border-warm-gray bg-paper p-5 text-right transition hover:border-ink"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-mid-gray/60">
                      Next
                    </span>
                    <p className="mt-1 text-sm font-medium text-ink group-hover:text-accent-warm transition">
                      {nextArticle.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}
              </nav>
            )}

            <div className="mt-12 border-t border-warm-gray pt-10">
              <BeehiivEmbed
                source="blog_post_footer"
                title="Get the weekly AI + Finance briefing"
                description="One Bina Print insight, one AI/finance take, and one actionable framework each week."
              />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:col-span-4 lg:block">
            <TableOfContents content={article.content} />
          </aside>
        </div>
      </div>
    </section>
  );
}
