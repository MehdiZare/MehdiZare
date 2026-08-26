import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { StrapiImage } from "@/components/shared/StrapiImage";
import { getSiteProfile } from "@/lib/site-profile";
import { fetchAllPages, getArticles, getAuthorBySlug, getAuthors } from "@/lib/strapi";
import {
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildPageMetadata,
  buildPersonJsonLd,
  buildProfilePageJsonLd,
  getSiteUrl,
  toAbsoluteMediaUrl,
  toPersonId,
} from "@/lib/seo";
import { identityUrlKey, normalizeIdentityUrl } from "@/lib/url-normalization";

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
}

type AuthorList = Awaited<ReturnType<typeof getAuthors>>["data"];

function getAllAuthors(): Promise<AuthorList> {
  // Shared STRAPI_MAX_PAGES cap. Extra slugs still render on demand
  // (dynamicParams defaults to true).
  return fetchAllPages(getAuthors, "authors", { sort: "updatedAt:desc" });
}

export async function generateStaticParams() {
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
    const response = await getAuthorBySlug(slug);
    const author = response.data[0];

    if (!author) {
      return buildNoIndexMetadata("Author Not Found");
    }

    const role = author.jobTitle ?? author.headline ?? siteProfile.authorRole;
    const title = `${author.name} | ${role}`;
    const description = author.bioShort ?? `Articles by ${author.name}.`;

    return buildPageMetadata({
      pathname: `/author/${author.slug}`,
      title,
      description,
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

const CANONICAL_IDENTITY_ORIGIN = getSiteUrl();

function dedupeUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  urls.forEach((url) => {
    const normalized = normalizeIdentityUrl(url, CANONICAL_IDENTITY_ORIGIN);
    if (!normalized) {
      return;
    }

    const key = identityUrlKey(normalized, CANONICAL_IDENTITY_ORIGIN);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(normalized);
  });

  return deduped;
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
  try {
    const response = await getAuthorBySlug(slug);
    author = response.data[0];
  } catch {
    notFound();
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
    sort: "publishedAt:desc",
    pagination: {
      page: 1,
      pageSize: 24,
    },
  })
    .then((response) => response.data)
    .catch(() => []);

  const authorPath = `/author/${author.slug}`;
  const personId = toPersonId(authorPath);
  const role = author.jobTitle ?? author.headline ?? siteProfile.authorRole;
  const description = author.bioShort ?? `Articles by ${author.name}.`;
  const websiteUrl =
    normalizeIdentityUrl(author.websiteUrl, CANONICAL_IDENTITY_ORIGIN) ??
    siteProfile.author.websiteUrl;
  const linkedinUrl =
    normalizeIdentityUrl(author.linkedinUrl, CANONICAL_IDENTITY_ORIGIN) ??
    siteProfile.author.linkedinUrl;
  const sameAs = dedupeUrls([
    websiteUrl,
    linkedinUrl,
    ...(author.sameAs?.map((link) => link.url) ?? []),
  ]);

  return (
    <section className="bg-paper py-16 sm:py-24">
      <JsonLd
        id="author-profilepage-jsonld"
        data={buildProfilePageJsonLd({
          pathname: authorPath,
          title: author.name,
          description,
          personId,
        })}
      />
      <JsonLd
        id="author-person-jsonld"
        data={buildPersonJsonLd({
          id: personId,
          path: authorPath,
          name: author.name,
          title: role,
          description,
          url: websiteUrl,
          imageUrl: toAbsoluteMediaUrl(author.profileImage?.url),
          worksForName: author.worksForName,
          worksForUrl: author.worksForUrl,
          alumniOf: author.alumniOf,
          credentials:
            author.credentials?.map((credential) => ({
              name: credential.title,
              issuer: credential.issuer,
              url: credential.url,
              description: credential.description,
            })) ?? [],
          addressLocality: author.addressLocality,
          addressRegion: author.addressRegion,
          addressCountry: author.addressCountry,
          mainEntityOfPagePath: authorPath,
          sameAs,
          knowsAbout:
            author.knowsAbout && author.knowsAbout.length > 0
              ? author.knowsAbout
              : siteProfile.knowsAbout,
        })}
      />
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
              {author.profileImage ? (
                <StrapiImage
                  image={author.profileImage}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center font-serif text-4xl text-ink">
                  {author.name
                    .split(" ")
                    .map((part) => part[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Author</p>
              <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">{author.name}</h1>
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
          <h2 className="font-serif text-2xl text-ink">Articles by {author.name}</h2>
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
