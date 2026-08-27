import { getSiteUrl } from "@/lib/seo";
import { blankToUndefined, firstFilled, formatSlugName } from "@/lib/strings";
import { normalizeIdentityUrl } from "@/lib/url-normalization";

/**
 * Author identity resolution shared by `/author/[slug]` and `/blog/[slug]`.
 *
 * Both routes render the same person's name, role, bio and identity URLs into
 * a title, a visible byline and `Person` JSON-LD, and both used to do it with
 * `??`. A CMS field a content editor cleared is `""`, which is not nullish, so
 * it won the chain: the title came out `"Jane Doe | "`, the description came
 * out `"Articles by ."`, and on the article route `""` reached Person `url`
 * and `sameAs` as invalid structured data (#83).
 *
 * The two routes had also drifted -- the author route ran identity URLs through
 * `normalizeIdentityUrl` and the article route did not, so the same Person
 * could carry different `url` values on different pages. Resolving both here
 * means they cannot drift again.
 */

/**
 * The origin identity URLs are canonicalized against. Exported so
 * `/author/[slug]` and `/blog/[slug]` cannot pick different ones -- the two
 * routes emitting different `url` values for the same Person is the drift #83
 * calls out.
 */
export const CANONICAL_IDENTITY_ORIGIN = getSiteUrl();

const TITLE_SEPARATOR = " | ";

/** The subset of a CMS author these helpers read. */
export interface AuthorIdentitySource {
  slug?: string | null;
  name?: string | null;
  jobTitle?: string | null;
  headline?: string | null;
  bioShort?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
}

/** Site Profile values used when the CMS author has nothing usable. */
export interface AuthorIdentityFallbacks {
  authorName: string;
  authorRole: string;
  authorBioShort: string;
  websiteUrl: string;
  linkedinUrl: string;
}

/**
 * Projects the Site Profile onto the fallbacks both routes need.
 *
 * Deriving these inline is how the two routes drifted: the article route read
 * `siteProfile.author.websiteUrl` without the normalization the author route
 * applied. One projection means one answer.
 */
export function authorIdentityFallbacks(siteProfile: {
  authorName: string;
  authorRole: string;
  authorBioShort: string;
  author: { websiteUrl: string; linkedinUrl: string };
}): AuthorIdentityFallbacks {
  return {
    authorName: siteProfile.authorName,
    authorRole: siteProfile.authorRole,
    authorBioShort: siteProfile.authorBioShort,
    websiteUrl: siteProfile.author.websiteUrl,
    linkedinUrl: siteProfile.author.linkedinUrl,
  };
}

export interface AuthorIdentity {
  name: string;
  role: string;
  bioShort: string;
  websiteUrl: string;
  linkedinUrl: string;
  /** `name | role`, with the separator omitted when either half is absent. */
  title: string;
  /** The bio when filled, otherwise the articles-by sentence. */
  description: string;
}

/**
 * Joins a name and role for a page title, omitting the separator when either
 * half is blank so a missing CMS field cannot leave `"Jane Doe | "` in a
 * `<title>` or an OpenGraph tag.
 */
export function composeAuthorTitle(
  name: string | null | undefined,
  role: string | null | undefined
): string {
  return [blankToUndefined(name), blankToUndefined(role)]
    .filter((part): part is string => part !== undefined)
    .join(TITLE_SEPARATOR);
}

/**
 * The description for an author surface: their short bio when they have one,
 * otherwise an articles-by sentence. A blank name yields the bare "Articles."
 * rather than the literal `"Articles by ."` the raw template produced.
 */
export function buildAuthorListingDescription(
  name: string | null | undefined,
  bioShort: string | null | undefined
): string {
  const bio = blankToUndefined(bioShort);
  if (bio) {
    return bio;
  }

  const filledName = blankToUndefined(name);
  return filledName ? `Articles by ${filledName}.` : "Articles.";
}

function resolveIdentityUrl(
  value: string | null | undefined,
  fallback: string,
  canonicalOrigin: string
): string {
  return normalizeIdentityUrl(value, canonicalOrigin) ?? fallback;
}

function resolveRole(
  source: AuthorIdentitySource | null | undefined,
  fallbacks: AuthorIdentityFallbacks
): string {
  return (
    firstFilled(source?.jobTitle, source?.headline, fallbacks.authorRole) ?? ""
  );
}

/**
 * Identity for `/author/[slug]`, which describes *that* author.
 *
 * The name falls back to the slug label rather than to `authorName`: borrowing
 * the site owner's name for a record whose name is blank would attribute a
 * different person's articles to them.
 */
export function resolveAuthorPageIdentity(
  source: AuthorIdentitySource,
  fallbacks: AuthorIdentityFallbacks,
  canonicalOrigin: string
): AuthorIdentity {
  const slug = blankToUndefined(source.slug);
  const name =
    firstFilled(source.name) ?? (slug ? formatSlugName(slug) : "");
  const role = resolveRole(source, fallbacks);
  const bioShort =
    firstFilled(source.bioShort, fallbacks.authorBioShort) ?? "";

  return {
    name,
    role,
    bioShort,
    websiteUrl: resolveIdentityUrl(
      source.websiteUrl,
      fallbacks.websiteUrl,
      canonicalOrigin
    ),
    linkedinUrl: resolveIdentityUrl(
      source.linkedinUrl,
      fallbacks.linkedinUrl,
      canonicalOrigin
    ),
    title: composeAuthorTitle(name, role),
    description: buildAuthorListingDescription(name, source.bioShort),
  };
}

/**
 * Identity for the byline and `Person` JSON-LD on `/blog/[slug]`.
 *
 * Here the Site Profile owner *is* the right fallback: an article with no
 * author relation is the site owner's, which is what the route already assumed
 * before this change.
 */
export function resolveArticleAuthorIdentity(
  source: AuthorIdentitySource | null | undefined,
  fallbacks: AuthorIdentityFallbacks,
  canonicalOrigin: string
): AuthorIdentity {
  const name = firstFilled(source?.name, fallbacks.authorName) ?? "";
  const role = resolveRole(source, fallbacks);
  const bioShort =
    firstFilled(source?.bioShort, fallbacks.authorBioShort) ?? "";

  return {
    name,
    role,
    bioShort,
    websiteUrl: resolveIdentityUrl(
      source?.websiteUrl,
      fallbacks.websiteUrl,
      canonicalOrigin
    ),
    linkedinUrl: resolveIdentityUrl(
      source?.linkedinUrl,
      fallbacks.linkedinUrl,
      canonicalOrigin
    ),
    title: composeAuthorTitle(name, role),
    description: buildAuthorListingDescription(name, source?.bioShort),
  };
}
