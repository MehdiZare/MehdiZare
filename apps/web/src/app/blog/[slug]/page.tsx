import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { AiEngineerProfileLink } from "@/components/seo/AiEngineerProfileLink";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchAllPages, getArticles, getArticleBySlug } from "@/lib/strapi";
import { StrapiImage } from "@/components/shared/StrapiImage";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { TagBadge } from "@/components/blog/TagBadge";
import { getSiteProfile } from "@/lib/site-profile";
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  splitKeywords,
  toAbsoluteMediaUrl,
  toPersonId,
} from "@/lib/seo";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

type ArticleList = Awaited<ReturnType<typeof getArticles>>["data"];

const AI_ENGINEER_IN_CONTENT_BLOG_SLUGS = new Set([
  "how-ai-works-from-data-to-decisions",
  "why-most-ai-projects-die-before-production-and-it-s-not-a-tech-problem",
]);

function getAllArticles(): Promise<ArticleList> {
  return fetchAllPages(getArticles, "articles", { sort: "publishedAt:desc" });
}

export async function generateStaticParams() {
  try {
    const articles = await getAllArticles();
    return articles.map((article) => ({
      slug: article.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const siteProfile = await getSiteProfile();

  try {
    const { slug } = await params;
    const res = await getArticleBySlug(slug);
    const article = res.data[0];

    if (!article) {
      return {
        title: "Post Not Found",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const metadata = buildPageMetadata({
      pathname: `/blog/${slug}`,
      title: article.title,
      description:
        article.excerpt || siteProfile.siteDescription,
      seo: article.seo,
      image: article.featuredImage,
      type: "article",
      publishedTime: article.publishedDate || article.publishedAt,
      modifiedTime: article.updatedAt,
      keywords:
        article.tags && article.tags.length > 0
          ? article.tags.map((tag) => tag.name)
          : ["production AI engineering", "LLM systems", "AI architecture"],
    });

    if (!metadata.keywords && article.tags && article.tags.length > 0) {
      metadata.keywords = article.tags.map((tag) => tag.name);
    }

    return metadata;
  } catch {
    return {
      title: "Post Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "AU";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const siteProfile = await getSiteProfile();
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
    const allArticles = await getAllArticles();
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
  const articlePath = `/blog/${article.slug}`;
  const articleAuthor = article.author;
  const authorName = articleAuthor?.name ?? siteProfile.authorName;
  const authorRole =
    articleAuthor?.jobTitle ?? articleAuthor?.headline ?? siteProfile.authorRole;
  const authorBio =
    articleAuthor?.bioShort ?? siteProfile.authorBioShort;
  const authorPath = articleAuthor?.slug
    ? `/author/${articleAuthor.slug}`
    : siteProfile.author.profilePath;
  const authorPersonId = toPersonId(authorPath);
  const authorWebsite = articleAuthor?.websiteUrl ?? siteProfile.author.websiteUrl;
  const authorLinkedIn = articleAuthor?.linkedinUrl ?? siteProfile.author.linkedinUrl;
  const authorInitials = buildInitials(authorName);
  const articleDescription =
    article.excerpt || siteProfile.siteDescription;
  const primaryImage =
    toAbsoluteMediaUrl(article.seo?.metaImage?.url) ??
    toAbsoluteMediaUrl(article.featuredImage?.url);
  const articleKeywords = splitKeywords(article.seo?.keywords);
  const fallbackKeywords = article.tags?.map((tag) => tag.name) ?? [];
  const resolvedKeywords = articleKeywords.length > 0 ? articleKeywords : fallbackKeywords;
  const blogPostingJsonLd = buildBlogPostingJsonLd({
    pathname: articlePath,
    headline: article.title,
    description: articleDescription,
    imageUrl: primaryImage,
    datePublished: displayDate,
    dateModified: article.updatedAt,
    keywords: resolvedKeywords.length > 0 ? resolvedKeywords : undefined,
    articleSection: article.category?.name,
    readingTimeMinutes: article.readingTime,
    authorId: authorPersonId,
    publisherId: toPersonId(),
  });

  return (
    <>
      <JsonLd
        id="blog-post-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: articlePath,
          title: article.title,
          description: articleDescription,
          type: "WebPage",
        })}
      />
      <CmsStructuredData
        idPrefix="blog-post-cms-jsonld"
        data={article.seo?.structuredData}
      />
      <JsonLd id="blog-post-jsonld" data={blogPostingJsonLd} />
      <JsonLd
        id="blog-post-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: article.title, path: articlePath },
        ])}
      />
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main Content */}
            <article className="lg:col-span-8">
              {/* Meta row */}
              <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
                {article.category && (
                  <Link
                    href={`/blog/category/${article.category.slug}`}
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
              {AI_ENGINEER_IN_CONTENT_BLOG_SLUGS.has(article.slug) ? (
                <AiEngineerProfileLink section="blog_body" className="mt-10" />
              ) : null}

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
                    {authorInitials}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-ink">
                      {authorName}
                    </h3>
                    <p className="font-mono text-xs text-accent-warm">
                      {authorRole}
                    </p>
                    <p className="mt-2 text-sm text-mid-gray leading-relaxed">
                      {authorBio}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={authorPath}
                        className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                      >
                        Author Profile
                      </Link>
                      {authorWebsite && (
                        <a
                          href={authorWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                        >
                          Website
                        </a>
                      )}
                      {authorLinkedIn && (
                        <a
                          href={authorLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                        >
                          LinkedIn
                        </a>
                      )}
                      <TrackedLink
                        href="/consulting"
                        eventName="funnel_blog_nav_to_consulting"
                        eventProperties={{
                          section: "blog_author_card",
                          cta_label: siteProfile.primaryCtaLabel,
                          destination: "/consulting",
                          interaction_type: "link_click",
                          origin_content_type: "blog_post",
                        }}
                        className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                      >
                        {siteProfile.primaryCtaLabel}
                      </TrackedLink>
                      <TrackedLink
                        href="/contact"
                        eventName="funnel_contact_intent"
                        eventProperties={{
                          section: "blog_author_card",
                          cta_label: "Contact",
                          destination: "/contact",
                          interaction_type: "link_click",
                        }}
                        className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                      >
                        Contact
                      </TrackedLink>
                    </div>
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

            </article>

            {/* Sidebar */}
            <aside className="hidden lg:col-span-4 lg:block">
              <TableOfContents content={article.content} />
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
