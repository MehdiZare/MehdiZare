import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { AiEngineerProfileLink } from "@/components/seo/AiEngineerProfileLink";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchAllPages, getArticles, getArticleBySlug } from "@/lib/strapi";
import { serverEnv } from "@/lib/server-env";
import {
  CMS_PRERENDER_ARTICLE_SLUG,
  findCmsPrerenderArticle,
} from "@/content/fixtures/cms-prerender";
import { StrapiImage } from "@/components/shared/StrapiImage";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { TagBadge } from "@/components/blog/TagBadge";
import { getSiteProfile } from "@/lib/site-profile";
import {
  CANONICAL_IDENTITY_ORIGIN,
  authorIdentityFallbacks,
  isSiteOwnerAuthor,
  resolveArticleAuthorIdentity,
  resolveAuthorPersonId,
  resolveAuthorSameAs,
} from "@/lib/author-identity";
import {
  ARTICLE_LISTING_SORT,
  resolveArticleDates,
  sortArticlesByPublishedDesc,
} from "@/lib/article-dates";
import { resolveReadingTimeMinutes } from "@/lib/reading-time";
import { blankToUndefined } from "@/lib/strings";
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildPageMetadata,
  buildWebPageJsonLd,
  resolveSiteOwnerPersonUrl,
  resolveSiteOwnerSameAs,
  splitKeywords,
  toAbsoluteMediaUrl,
  toAbsoluteUrl,
  toPersonId,
} from "@/lib/seo";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

type ArticleList = Awaited<ReturnType<typeof getArticles>>["data"];
type ArticleRecord = ArticleList[number];

/**
 * The post's own generated share card (`./opengraph-image.tsx`). It is the
 * default og:image / twitter:image and a guaranteed JSON-LD image, so a post
 * with no cover never falls back to the generic site card, and a post with a
 * 1920x1080 WebP cover shares a 1200x630 PNG. An uploaded `seo.metaImage`
 * still overrides it.
 */
const OG_CARD_SIZE = { width: 1200, height: 630 } as const;

function articleOgCardPath(slug: string): string {
  return `/blog/${slug}/opengraph-image`;
}

/** The hero renders in the 8/12 column of `max-w-7xl`: ~795px from 1280px up. */
const HERO_IMAGE_SIZES = "(min-width: 1280px) 795px, (min-width: 1024px) 66vw, 100vw";

function articleAuthorPath(article: ArticleRecord, siteOwnerProfilePath: string): string {
  const slug = blankToUndefined(article.author?.slug);
  return slug ? `/author/${slug}` : siteOwnerProfilePath;
}

const AI_ENGINEER_IN_CONTENT_BLOG_SLUGS = new Set([
  "how-ai-works-from-data-to-decisions",
  "why-most-ai-projects-die-before-production-and-it-s-not-a-tech-problem",
]);

async function getAllArticles(): Promise<ArticleList> {
  // Shared STRAPI_MAX_PAGES cap. Extra slugs still render on demand
  // (dynamicParams defaults to true). Same order as /blog, so previous/next
  // walk the listing rather than the system publish time.
  const articles = await fetchAllPages(getArticles, "articles", { sort: ARTICLE_LISTING_SORT });
  return sortArticlesByPublishedDesc(articles);
}

export async function generateStaticParams() {
  if (serverEnv.strapiDisabled) {
    return [{ slug: CMS_PRERENDER_ARTICLE_SLUG }];
  }

  try {
    const articles = await getAllArticles();
    return articles.map((article) => ({
      slug: article.slug,
    }));
  } catch (error) {
    console.warn("[blog] generateStaticParams: CMS listing failed; skipping static paths", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const article = serverEnv.strapiDisabled
      ? findCmsPrerenderArticle(slug)
      : (await getArticleBySlug(slug)).data[0];

    if (!article) {
      return buildNoIndexMetadata("Post Not Found");
    }

    const siteProfile = await getSiteProfile();
    const { datePublished, dateModified } = resolveArticleDates(article);
    const tagNames = article.tags?.map((tag) => tag.name) ?? [];

    const metadata = buildPageMetadata({
      pathname: `/blog/${slug}`,
      title: article.title,
      description: article.excerpt?.trim() || article.title,
      seo: article.seo,
      defaultImage: {
        url: articleOgCardPath(slug),
        ...OG_CARD_SIZE,
        type: "image/png",
      },
      type: "article",
      publishedTime: datePublished,
      modifiedTime: dateModified,
      authors: [toAbsoluteUrl(articleAuthorPath(article, siteProfile.author.profilePath))],
      section: article.category?.name,
      tags: tagNames,
      keywords:
        tagNames.length > 0
          ? tagNames
          : ["production AI engineering", "LLM systems", "AI architecture"],
    });

    if (!metadata.keywords && article.tags && article.tags.length > 0) {
      metadata.keywords = article.tags.map((tag) => tag.name);
    }

    return metadata;
  } catch {
    return buildNoIndexMetadata("Post Not Found");
  }
}

function formatDate(dateString: string): string {
  // `publishedDate` is date-only and parses as UTC midnight, so format in UTC
  // or a server running in a US timezone renders the day before.
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
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
  if (serverEnv.strapiDisabled) {
    article = findCmsPrerenderArticle(slug);
  } else {
    try {
      const res = await getArticleBySlug(slug);
      article = res.data[0];
    } catch {
      notFound();
    }
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
  // Shared with /author/[slug] (#83). A cleared CMS field is `""`, which `??`
  // treats as present -- it used to reach the byline, the avatar initials and,
  // for the two URLs, Person `url` / `sameAs` as invalid structured data.
  const authorIdentity = resolveArticleAuthorIdentity(
    articleAuthor,
    authorIdentityFallbacks(siteProfile),
    CANONICAL_IDENTITY_ORIGIN,
    siteProfile.author.slug
  );
  const {
    name: authorName,
    role: authorRole,
    bioShort: authorBio,
    websiteUrl: authorWebsite,
    linkedinUrl: authorLinkedIn,
  } = authorIdentity;
  const authorPath = articleAuthorPath(article, siteProfile.author.profilePath);
  // One Person @id per human (GEO-01 / TS-04): the site owner is the layout's
  // `/#person`, inlined here with name and url because Google does not follow
  // an @id to a node on another page.
  const authorIsSiteOwner = isSiteOwnerAuthor(articleAuthor, siteProfile.author.slug);
  const authorPersonId = resolveAuthorPersonId(articleAuthor, siteProfile.author.slug);
  const authorImage =
    articleAuthor?.profileImage ??
    (authorIsSiteOwner ? siteProfile.author.profileImage : undefined);
  // The site owner's sameAs is the layout Person's (which leaves out its own
  // `url`, the website). Both go through `resolveSiteOwnerSameAs`, the same
  // `isSameUrl` comparison, so the two copies of `/#person` on this page agree.
  const authorSameAs = authorIsSiteOwner
    ? resolveSiteOwnerSameAs(siteProfile.author)
    : resolveAuthorSameAs(authorIdentity, articleAuthor?.sameAs, CANONICAL_IDENTITY_ORIGIN);
  const authorInitials = buildInitials(authorName);
  const articleDescription =
    article.excerpt?.trim() || article.title;
  // Every available ratio: the social override, the 16:9 cover, and the
  // 1200x630 card that always exists.
  const articleImages = [
    toAbsoluteMediaUrl(article.seo?.metaImage?.url),
    toAbsoluteMediaUrl(article.featuredImage?.url),
    toAbsoluteUrl(articleOgCardPath(article.slug)),
  ].filter((url): url is string => Boolean(url));
  const articleKeywords = splitKeywords(article.seo?.keywords);
  const fallbackKeywords = article.tags?.map((tag) => tag.name) ?? [];
  const resolvedKeywords = articleKeywords.length > 0 ? articleKeywords : fallbackKeywords;
  const { datePublished, dateModified } = resolveArticleDates(article);
  const readingTimeMinutes = resolveReadingTimeMinutes(article.readingTime, article.content);
  const blogPostingJsonLd = buildBlogPostingJsonLd({
    pathname: articlePath,
    headline: article.title,
    description: articleDescription,
    imageUrls: articleImages,
    datePublished,
    dateModified,
    keywords: resolvedKeywords.length > 0 ? resolvedKeywords : undefined,
    articleSection: article.category?.name,
    readingTimeMinutes,
    author: {
      id: authorPersonId,
      name: authorName,
      // Same `url` as the layout's `/#person` for the site owner, so the two
      // copies of that @id on this page agree; guest authors keep their page.
      url: authorIsSiteOwner
        ? resolveSiteOwnerPersonUrl(siteProfile.author)
        : toAbsoluteUrl(authorPath),
      sameAs: authorSameAs,
      jobTitle: authorRole,
      imageUrl: toAbsoluteMediaUrl(authorImage?.url),
    },
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
                {readingTimeMinutes && (
                  <span className="font-mono text-xs text-mid-gray/60">
                    {readingTimeMinutes} min read
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
                    preload
                    sizes={HERO_IMAGE_SIZES}
                    fallbackAlt={article.title}
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
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-muted">
                    <StrapiImage
                      image={authorImage}
                      fill
                      sizes="56px"
                      fallbackAlt={authorName}
                      className="object-cover"
                      fallback={
                        <div className="flex h-full w-full items-center justify-center font-serif text-xl text-ink">
                          {authorInitials}
                        </div>
                      }
                    />
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
