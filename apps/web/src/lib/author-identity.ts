import { toPersonId } from "@/lib/seo";
import { blankToUndefined, firstFilled, formatSlugName } from "@/lib/strings";
import { identityUrlKey, normalizeIdentityUrl } from "@/lib/url-normalization";

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
 * The origin identity URLs are canonicalized against. Re-exported so
 * `/author/[slug]` and `/blog/[slug]` cannot pick different ones -- the two
 * routes emitting different `url` values for the same Person is the drift #83
 * calls out.
 *
 * Defined in `site-profile-defaults` rather than here: this constant used to be
 * `getSiteUrl()` while `site-profile.ts` had a second one of the same name
 * bound to `DEFAULT_SITE_PROFILE.authorWebsiteUrl`, so the guarantee in the
 * paragraph above held only for these two routes and not against the Person the
 * root layout emits alongside them (#103).
 */
export { CANONICAL_IDENTITY_ORIGIN } from "@/lib/site-profile-defaults";

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
 * The Site Profile owner is the right fallback for an article with *no* author
 * relation -- that is the site owner's article, which is what the route already
 * assumed before this change. It is the wrong fallback for an article that
 * *has* a relation whose name is blank: the route still derives `authorPath`
 * from the relation's own slug, so borrowing the owner's name puts one person's
 * name above a profile link to another, and points `BlogPosting.author.@id` at
 * a `Person` node the visible byline contradicts.
 *
 * So a present relation is resolved by exactly the rule `/author/[slug]` uses
 * for its name. Role, bio, and identity URLs are not: those fallbacks are the
 * site owner's, and stamping them onto a guest is the same misattribution
 * {@link resolveAuthorAddress} refuses for address. A guest with a blank field
 * gets nothing there, which the byline and `sameAs` both omit. Only the site
 * owner (including an article with no author relation) inherits the profile.
 *
 * `siteOwnerSlug` is the slug `isSiteOwnerAuthor` compares. Callers that have
 * one must pass it, or a present owner record with a cleared field looks like
 * a guest and loses the profile fallback.
 */
const GUEST_IDENTITY_FALLBACKS: AuthorIdentityFallbacks = {
  authorName: "",
  authorRole: "",
  authorBioShort: "",
  websiteUrl: "",
  linkedinUrl: "",
};

export function resolveArticleAuthorIdentity(
  source: AuthorIdentitySource | null | undefined,
  fallbacks: AuthorIdentityFallbacks,
  canonicalOrigin: string,
  siteOwnerSlug = ""
): AuthorIdentity {
  if (isSiteOwnerAuthor(source, siteOwnerSlug)) {
    return resolveAuthorPageIdentity(
      source ?? { name: fallbacks.authorName },
      fallbacks,
      canonicalOrigin
    );
  }

  return resolveAuthorPageIdentity(source ?? {}, GUEST_IDENTITY_FALLBACKS, canonicalOrigin);
}

/**
 * Whether a CMS author record is the site owner.
 *
 * `isPrimary` is optional on the CMS record, so a slug match against the
 * resolved site owner is accepted as the same signal. A missing record (an
 * article with no author relation) is the site owner's article, the same rule
 * {@link resolveArticleAuthorIdentity} applies.
 */
export function isSiteOwnerAuthor(
  source: { slug?: string | null; isPrimary?: boolean } | null | undefined,
  siteOwnerSlug: string
): boolean {
  if (!source) {
    return true;
  }

  return (
    source.isPrimary === true ||
    blankToUndefined(source.slug) === blankToUndefined(siteOwnerSlug)
  );
}

/**
 * The one Person `@id` for an author, on every surface.
 *
 * The site owner is `/#person`: the node the root layout emits on every page
 * and the `publisher` of every post. Posts used to point `author` at
 * `/author/<slug>#person`, which exists only on the author page, and the
 * author page minted it as a second full Person beside `/#person` -- one human,
 * two unrelated entities (GEO-01 / TS-04). A guest author is a different human
 * and keeps a profile-scoped id.
 */
export function resolveAuthorPersonId(
  source: { slug?: string | null; isPrimary?: boolean } | null | undefined,
  siteOwnerSlug: string
): string {
  if (isSiteOwnerAuthor(source, siteOwnerSlug)) {
    return toPersonId();
  }

  const slug = blankToUndefined(source?.slug);
  return slug ? toPersonId(`/author/${slug}`) : toPersonId();
}

/**
 * Person `sameAs` for an author: website, LinkedIn, then the record's own
 * links, normalized against the canonical origin and deduped (apex/www and
 * trailing-slash variants of one URL count once).
 */
export function resolveAuthorSameAs(
  identity: { websiteUrl?: string | null; linkedinUrl?: string | null },
  links: ReadonlyArray<{ url?: string | null }> | null | undefined,
  canonicalOrigin: string
): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  [identity.websiteUrl, identity.linkedinUrl, ...(links?.map((link) => link.url) ?? [])].forEach(
    (url) => {
      const normalized = normalizeIdentityUrl(url, canonicalOrigin);
      if (!normalized) {
        return;
      }

      const key = identityUrlKey(normalized, canonicalOrigin);
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      deduped.push(normalized);
    }
  );

  return deduped;
}

/** The three PostalAddress fields the Person JSON-LD carries. */
export interface AuthorAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

/**
 * Resolves the address for `/author/[slug]`'s `Person` JSON-LD (#92).
 *
 * `/`, `/contact` and `/consulting` all resolve their address through
 * `resolveSiteProfile`, which falls back to `DEFAULT_SITE_PROFILE` when the CMS
 * author carries none. `/author/[slug]` read the raw CMS record, so the same
 * Person could carry a full address on `/` and no address at all on
 * `/author/mehdi-zare` -- the NAP inconsistency structured data exists to
 * remove.
 *
 * The fallback is deliberately scoped to the **site owner**. On a multi-author
 * site, stamping the owner's address onto a guest author's Person markup would
 * be a worse error than omitting it, so a non-owner gets only their own values.
 * `isPrimary` is optional on the CMS record, so a slug match against the
 * resolved site owner is accepted as the same signal.
 *
 * The address is resolved as **one unit**, not field by field (#102). A record
 * that supplies any of the three supplies all of it; only a record with no
 * address at all inherits the owner's. Merging per field published a Person at
 * an address that never existed: clearing `addressRegion` while setting
 * `addressLocality` to `Berlin` -- the ordinary shape of an international move,
 * where there is no state to name -- emitted `Berlin, FL, DE`. Google reads
 * `PostalAddress` as a single unit, and because every property on it is
 * optional free text, no validator flags the result. It is wrong in a way
 * nothing reports.
 *
 * Failing toward an incomplete address rather than a confidently wrong one is
 * the same rule `apps/cms/scripts/sync-site-identity.ts` already applies when
 * it refuses to write a partial address.
 */
export function resolveAuthorAddress(
  source: {
    slug?: string | null;
    isPrimary?: boolean;
    addressLocality?: string | null;
    addressRegion?: string | null;
    addressCountry?: string | null;
  },
  siteOwner: {
    slug: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  }
): AuthorAddress {
  const isSiteOwner = isSiteOwnerAuthor(source, siteOwner.slug);

  const own: AuthorAddress = {
    addressLocality: blankToUndefined(source.addressLocality),
    addressRegion: blankToUndefined(source.addressRegion),
    addressCountry: blankToUndefined(source.addressCountry),
  };

  const suppliesAnyAddress = Boolean(
    firstFilled(own.addressLocality, own.addressRegion, own.addressCountry)
  );

  if (!isSiteOwner || suppliesAnyAddress) {
    return own;
  }

  return {
    addressLocality: siteOwner.addressLocality,
    addressRegion: siteOwner.addressRegion,
    addressCountry: siteOwner.addressCountry,
  };
}

/** The two Organization fields the Person JSON-LD `worksFor` node carries. */
export interface AuthorWorksFor {
  worksForName?: string;
  worksForUrl?: string;
}

/**
 * Resolves the employer for `/author/[slug]`'s `Person` JSON-LD (#106).
 *
 * Same unit semantics as {@link resolveAuthorAddress}: `worksFor` is one
 * Organization node, and merging name and url independently published mixed
 * employers -- one company's name with another company's careers URL, or the inverse.
 * A record that supplies either field supplies both as-is; only a record with
 * neither inherits the site owner's pair.
 *
 * The fallback is scoped to the **site owner** for the same reason as address:
 * stamping the owner's employer onto a guest author's Person would be worse
 * than omitting it.
 */
export function resolveAuthorWorksFor(
  source: {
    slug?: string | null;
    isPrimary?: boolean;
    worksForName?: string | null;
    worksForUrl?: string | null;
  },
  siteOwner: {
    slug: string;
    worksForName?: string;
    worksForUrl?: string;
  }
): AuthorWorksFor {
  const isSiteOwner = isSiteOwnerAuthor(source, siteOwner.slug);

  const own: AuthorWorksFor = {
    worksForName: blankToUndefined(source.worksForName),
    worksForUrl: blankToUndefined(source.worksForUrl),
  };

  const suppliesAnyWorksFor = Boolean(firstFilled(own.worksForName, own.worksForUrl));

  if (!isSiteOwner || suppliesAnyWorksFor) {
    return own;
  }

  return {
    worksForName: siteOwner.worksForName,
    worksForUrl: siteOwner.worksForUrl,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => blankToUndefined(item))
    .filter((item): item is string => Boolean(item));
}

/**
 * Resolves `alumniOf` for `/author/[slug]`'s `Person` JSON-LD (#106).
 *
 * Arrays do not merge field-by-field like address or worksFor, but the author
 * page still read the raw CMS record while the root layout fell back to
 * `DEFAULT_SITE_PROFILE` -- the same NAP inconsistency #92 fixed for address.
 * The site owner inherits the default list only when the CMS record carries
 * none; guest authors never borrow the owner's alumni list.
 */
export function resolveAuthorAlumniOf(
  source: {
    slug?: string | null;
    isPrimary?: boolean;
    alumniOf?: string[] | null;
  },
  siteOwner: {
    slug: string;
    alumniOf: readonly string[];
  }
): { alumniOf: string[] } {
  const isSiteOwner = isSiteOwnerAuthor(source, siteOwner.slug);

  const own = normalizeStringArray(source.alumniOf);

  if (!isSiteOwner || own.length > 0) {
    return { alumniOf: own };
  }

  return { alumniOf: [...siteOwner.alumniOf] };
}
