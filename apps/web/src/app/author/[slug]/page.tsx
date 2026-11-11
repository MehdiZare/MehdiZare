import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { StrapiImage } from "@/components/shared/StrapiImage";
import { getSiteProfile } from "@/lib/site-profile";
import { fetchAllPages, getArticles, getAuthorBySlug, getAuthors } from "@/lib/strapi";
import { serverEnv } from "@/lib/server-env";
import { ARTICLE_LISTING_SORT, sortArticlesByPublishedDesc } from "@/lib/article-dates";
import {
  CMS_PRERENDER_AUTHOR_SLUG,
  findCmsPrerenderAuthor,
} from "@/content/fixtures/cms-prerender";
import {
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildPageMetadata,
  buildPersonJsonLd,
  buildProfilePageJsonLd,
  toAbsoluteMediaUrl,
} from "@/lib/seo";
import {
  CANONICAL_IDENTITY_ORIGIN,
  authorIdentityFallbacks,
  isSiteOwnerAuthor,
  resolveAuthorAddress,
  resolveAuthorAlumniOf,
  resolveAuthorPageIdentity,
  resolveAuthorPersonId,
  resolveAuthorSameAs,
  resolveAuthorWorksFor,
} from "@/lib/author-identity";

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
}

const AUTHOR_ARTICLE_LIMIT = 24;
const LISTING_OVERFETCH = 5;

type AuthorList = Awaited<ReturnType<typeof getAuthors>>["data"];

function getAllAuthors(): Promise<AuthorList> {
  // Shared STRAPI_MAX_PAGES cap. Extra slugs still render on demand
  // (dynamicParams defaults to true).
  return fetchAllPages(getAuthors, "authors", { sort: "updatedAt:desc" });
}

export async function generateStaticParams() {
  if (serverEnv.strapiDisabled) {
    return [{ slug: CMS_PRERENDER_AUTHOR_SLUG }];
  }

  try {
    const authors = await getAllAuthors();
    return authors.map((author) => ({ slug: author.slug }));
  } catch (error) {
    console.warn("[author] generateStaticParams: CMS listing failed; skipping static paths", error);
    return [];
  }
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const siteProfile = await getSiteProfile();

  try {
    const { slug } = await params;
    const author = serverEnv.strapiDisabled
      ? findCmsPrerenderAuthor(slug)
      : (await getAuthorBySlug(slug)).data[0];

    if (!author) {
      return buildNoIndexMetadata("Author Not Found");
    }

    const identity = resolveAuthorPageIdentity(
      author,
      authorIdentityFallbacks(siteProfile),
      CANONICAL_IDENTITY_ORIGIN
    );

    return buildPageMetadata({
      pathname: `/author/${author.slug}`,
      title: identity.title,
      description: identity.description,
      image: author.profileImage,
      type: "website",
      keywords: [
        "author profile",
        "AI engineering",
        "production AI",
        "domain-driven AI",
        "LLM systems",
      ],
    });
  } catch {
    return buildNoIndexMetadata("Author Not Found");
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const siteProfile = await getSiteProfile();
  const { slug } = await params;

  let author;
  if (serverEnv.strapiDisabled) {
    author = findCmsPrerenderAuthor(slug);
  } else {
    try {
      const response = await getAuthorBySlug(slug);
      author = response.data[0];
    } catch {
      notFound();
    }
  }

  if (!author) {
    notFound();
  }

  const authoredArticles: Awaited<ReturnType<typeof getArticles>>["data"] = await getArticles({
    filters: {
      author: {
        slug: {
          $eq: slug,
        },
      },
    },
    sort: ARTICLE_LISTING_SORT,
    // Over-fetch: Postgres puts NULL publishedDate rows first under DESC, so
    // undated posts would otherwise take slots from the newest dated ones.
    pagination: {
      page: 1,
      pageSize: AUTHOR_ARTICLE_LIMIT + LISTING_OVERFETCH,
    },
  })
    .then((response) => sortArticlesByPublishedDesc(response.data).slice(0, AUTHOR_ARTICLE_LIMIT))
    .catch(() => []);

  const authorPath = `/author/${author.slug}`;
  // One Person @id per human (GEO-01 / TS-04). For the site owner this page
  // is a ProfilePage *about* the layout's `/#person` rather than a second,
  // unrelated Person node; only a guest author gets a Person of their own.
  const authorIsSiteOwner = isSiteOwnerAuthor(author, siteProfile.author.slug);
  const personId = resolveAuthorPersonId(author, siteProfile.author.slug);
  const identity = resolveAuthorPageIdentity(
    author,
    authorIdentityFallbacks(siteProfile),
    CANONICAL_IDENTITY_ORIGIN
  );
  const { name: authorName, role, description, websiteUrl, linkedinUrl } = identity;
  // #92. The other three PostalAddress surfaces fall back to the Site Profile;
  // this one read the raw CMS record. The fallback applies to the site owner
  // only -- inventing an address for a guest author would be worse than
  // omitting it.
  const address = resolveAuthorAddress(author, siteProfile.author);
  const worksFor = resolveAuthorWorksFor(author, siteProfile.author);
  const { alumniOf } = resolveAuthorAlumniOf(author, siteProfile.author);
  const sameAs = resolveAuthorSameAs(
    { websiteUrl, linkedinUrl },
    author.sameAs,
    CANONICAL_IDENTITY_ORIGIN
  );

  const personJsonLd = authorIsSiteOwner
    ? null
    : buildPersonJsonLd({
        id: personId,
        path: authorPath,
        name: authorName,
        title: role,
        description,
        url: websiteUrl,
        imageUrl: toAbsoluteMediaUrl(author.profileImage?.url),
        worksForName: worksFor.worksForName,
        worksForUrl: worksFor.worksForUrl,
        alumniOf,
        credentials:
          author.credentials?.map((credential) => ({
            name: credential.title,
            issuer: credential.issuer,
            url: credential.url,
            description: credential.description,
          })) ?? [],
        addressLocality: address.addressLocality,
        addressRegion: address.addressRegion,
        addressCountry: address.addressCountry,
        mainEntityOfPagePath: authorPath,
        sameAs,
        knowsAbout:
          author.knowsAbout && author.knowsAbout.length > 0
            ? author.knowsAbout
            : siteProfile.knowsAbout,
      });

  return (
    <section className="bg-paper py-16 sm:py-24">
      <JsonLd
        id="author-profilepage-jsonld"
        data={buildProfilePageJsonLd({
          pathname: authorPath,
          title: authorName,
          description,
          personId,
        })}
      />
      {personJsonLd ? <JsonLd id="author-person-jsonld" data={personJsonLd} /> : null}
      <JsonLd
        id="author-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Author", path: authorPath },
        ])}
      />

      <div className="mx-auto max-w-6xl px-6">
        <div className="border border-warm-gray bg-paper p-8 sm:p-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[180px_1fr] md:items-start">
            <div className="relative aspect-square overflow-hidden border border-warm-gray bg-muted">
              <StrapiImage
                image={author.profileImage}
                fill
                sizes="(min-width: 768px) 180px, 100vw"
                fallbackAlt={authorName}
                className="object-cover"
                preload
                fallback={
                  <div className="flex h-full items-center justify-center font-serif text-4xl text-ink">
                    {authorName
                      .split(" ")
                      .map((part) => part[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                }
              />
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Author</p>
              <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">{authorName}</h1>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-accent-warm">{role}</p>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-mid-gray">{description}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                >
                  Website
                </a>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                >
                  LinkedIn
                </a>
                <TrackedLink
                  href="/contact"
                  eventName="funnel_contact_intent"
                  eventProperties={{
                    section: "author_profile",
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

        {author.bioLong && author.bioLong.length > 0 ? (
          <div className="mt-10 border border-warm-gray bg-paper p-8">
            <BlocksRenderer content={author.bioLong} />
          </div>
        ) : null}

        <div className="mt-10">
          <h2 className="font-serif text-2xl text-ink">Articles by {authorName}</h2>
          {authoredArticles.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {authoredArticles.map((article) => {
                const published = article.publishedDate ?? article.publishedAt;

                return (
                  <Link
                    key={article.documentId}
                    href={`/blog/${article.slug}`}
                    className="border border-warm-gray bg-paper p-5 transition hover:border-ink"
                  >
                    <h3 className="font-medium text-ink">{article.title}</h3>
                    {article.excerpt ? <p className="mt-2 text-sm text-mid-gray">{article.excerpt}</p> : null}
                    {published ? (
                      <p className="mt-3 font-mono text-xs text-mid-gray/70">{formatDate(published)}</p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-mid-gray">No published articles found for this author yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
