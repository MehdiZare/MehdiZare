import test from "node:test";
import assert from "node:assert/strict";

import {
  authorIdentityFallbacks,
  buildAuthorListingDescription,
  composeAuthorTitle,
  resolveArticleAuthorIdentity,
  resolveAuthorAddress,
  resolveAuthorAlumniOf,
  resolveAuthorPageIdentity,
  resolveAuthorWorksFor,
} from "../src/lib/author-identity.ts";

// #83. `??` treats a CMS empty string as *present*, so a cleared author field
// beats its Site Profile fallback and reaches the <title>, the visible byline
// and the Person JSON-LD. On the article route the two identity URLs also
// skipped `normalizeIdentityUrl`, which the author route already applied --
// so a blank `websiteUrl` could reach Person `url` / `sameAs` as `""`.

const ORIGIN = "https://www.mehdi-zare.com";

const FALLBACKS = {
  authorName: "Mehdi Zare, CFA",
  authorRole: "Principal AI Engineer",
  authorBioShort: "Principal AI engineer shipping production systems.",
  websiteUrl: "https://www.mehdi-zare.com",
  linkedinUrl: "https://linkedin.com/in/mehdizare",
};

// ---------------------------------------------------------------------------
// composeAuthorTitle
// ---------------------------------------------------------------------------

test("composeAuthorTitle joins a name and role with the separator", () => {
  assert.equal(composeAuthorTitle("Jane Doe", "Staff Engineer"), "Jane Doe | Staff Engineer");
});

test("composeAuthorTitle drops the separator when the role is missing", () => {
  // page.tsx:62 produced "Jane Doe | " for a blank CMS jobTitle.
  assert.equal(composeAuthorTitle("Jane Doe", ""), "Jane Doe");
  assert.equal(composeAuthorTitle("Jane Doe", "   "), "Jane Doe");
  assert.equal(composeAuthorTitle("Jane Doe", undefined), "Jane Doe");
});

test("composeAuthorTitle drops the separator when the name is missing", () => {
  assert.equal(composeAuthorTitle("", "Staff Engineer"), "Staff Engineer");
  assert.equal(composeAuthorTitle("   ", "Staff Engineer"), "Staff Engineer");
});

test("composeAuthorTitle returns an empty string when both halves are blank", () => {
  assert.equal(composeAuthorTitle("  ", ""), "");
});

// ---------------------------------------------------------------------------
// buildAuthorListingDescription
// ---------------------------------------------------------------------------

test("buildAuthorListingDescription prefers a filled bio", () => {
  assert.equal(
    buildAuthorListingDescription("Jane Doe", "  Writes about evals.  "),
    "Writes about evals."
  );
});

test("buildAuthorListingDescription falls back to the articles-by sentence", () => {
  assert.equal(buildAuthorListingDescription("Jane Doe", "   "), "Articles by Jane Doe.");
  assert.equal(buildAuthorListingDescription("Jane Doe", null), "Articles by Jane Doe.");
});

test("buildAuthorListingDescription never renders a nameless articles-by sentence", () => {
  // page.tsx:30 produced the literal "Articles by ." for a blank CMS name.
  assert.doesNotMatch(buildAuthorListingDescription("", null), /Articles by \./);
  assert.doesNotMatch(buildAuthorListingDescription("   ", ""), /Articles by \./);
});

// ---------------------------------------------------------------------------
// resolveAuthorPageIdentity -- /author/[slug]
// ---------------------------------------------------------------------------

test("author page identity resolves name, role and bio from filled CMS values", () => {
  const identity = resolveAuthorPageIdentity(
    {
      slug: "jane-doe",
      name: "Jane Doe",
      jobTitle: "Staff Engineer",
      bioShort: "Writes about evals.",
    },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(identity.name, "Jane Doe");
  assert.equal(identity.role, "Staff Engineer");
  assert.equal(identity.title, "Jane Doe | Staff Engineer");
  assert.equal(identity.description, "Writes about evals.");
});

test("author page identity prefers jobTitle, then headline, then the profile role", () => {
  const fromHeadline = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "Jane Doe", jobTitle: "   ", headline: "Eval Lead" },
    FALLBACKS,
    ORIGIN
  );
  const fromProfile = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "Jane Doe", jobTitle: "", headline: "  " },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(fromHeadline.role, "Eval Lead");
  assert.equal(fromProfile.role, FALLBACKS.authorRole);
});

test("author page identity falls back to the slug label rather than another author's name", () => {
  // The page describes *this* author. Borrowing the site owner's name for a
  // record whose name is blank would attribute their articles to someone else.
  const identity = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "   " },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(identity.name, "Jane Doe");
  assert.notEqual(identity.name, FALLBACKS.authorName);
});

test("author page identity never emits a dangling title separator", () => {
  // The slug and the authorRole fallback both have to be blank for a half to
  // actually come out empty -- with either one filled, the separator can never
  // dangle and this test cannot fail.
  const bothBlank = resolveAuthorPageIdentity(
    { slug: "", name: "", jobTitle: "", headline: "" },
    { ...FALLBACKS, authorRole: "" },
    ORIGIN
  );

  assert.equal(bothBlank.title, "");

  const roleBlank = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "Jane Doe", jobTitle: "", headline: "" },
    { ...FALLBACKS, authorRole: "  " },
    ORIGIN
  );

  assert.equal(roleBlank.title, "Jane Doe");
  assert.doesNotMatch(roleBlank.title, /\|/);
});

test("author page identity normalizes identity URLs and rejects blank ones", () => {
  const blank = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "Jane Doe", websiteUrl: "   ", linkedinUrl: "" },
    FALLBACKS,
    ORIGIN
  );
  const filled = resolveAuthorPageIdentity(
    {
      slug: "jane-doe",
      name: "Jane Doe",
      websiteUrl: "https://mehdi-zare.com/",
      linkedinUrl: "https://linkedin.com/in/janedoe/",
    },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(blank.websiteUrl, FALLBACKS.websiteUrl);
  assert.equal(blank.linkedinUrl, FALLBACKS.linkedinUrl);
  assert.equal(filled.websiteUrl, "https://www.mehdi-zare.com");
  assert.equal(filled.linkedinUrl, "https://linkedin.com/in/janedoe");
});

// ---------------------------------------------------------------------------
// resolveArticleAuthorIdentity -- /blog/[slug]
// ---------------------------------------------------------------------------

test("article author identity uses the article's author when filled", () => {
  const identity = resolveArticleAuthorIdentity(
    {
      slug: "jane-doe",
      name: "Jane Doe",
      jobTitle: "Staff Engineer",
      bioShort: "Writes about evals.",
    },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(identity.name, "Jane Doe");
  assert.equal(identity.role, "Staff Engineer");
  assert.equal(identity.bioShort, "Writes about evals.");
});

test("article author identity falls back to the site owner when there is no author relation", () => {
  const identity = resolveArticleAuthorIdentity(undefined, FALLBACKS, ORIGIN);

  assert.equal(identity.name, FALLBACKS.authorName);
  assert.equal(identity.role, FALLBACKS.authorRole);
  assert.equal(identity.bioShort, FALLBACKS.authorBioShort);
  assert.equal(identity.websiteUrl, FALLBACKS.websiteUrl);
  assert.equal(identity.linkedinUrl, FALLBACKS.linkedinUrl);
});

test("article author identity treats blank CMS values as absent, not as present", () => {
  // This is the `??` bug: every one of these fields would otherwise win as "".
  const identity = resolveArticleAuthorIdentity(
    {
      slug: "jane-doe",
      name: "   ",
      jobTitle: "",
      headline: "  ",
      bioShort: "",
    },
    FALLBACKS,
    ORIGIN
  );

  // The name falls back to the slug label, not to the site owner: the route
  // still links the byline to /author/jane-doe, so borrowing `authorName` here
  // would name one person above a profile link to another.
  assert.equal(identity.name, "Jane Doe");
  assert.equal(identity.role, FALLBACKS.authorRole);
  assert.equal(identity.bioShort, FALLBACKS.authorBioShort);
});

test("article author identity never borrows the site owner's name for a linked author", () => {
  // #83's cross-route rule, from the article side. `/blog/[slug]` derives
  // authorPath and BlogPosting.author.@id from the *relation's* slug, so a
  // byline naming the owner over a link to /author/jane-doe attributes Jane's
  // article to the owner in the structured data.
  const article = resolveArticleAuthorIdentity(
    { slug: "jane-doe", name: "   " },
    FALLBACKS,
    ORIGIN
  );
  const page = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "   " },
    FALLBACKS,
    ORIGIN
  );

  assert.notEqual(article.name, FALLBACKS.authorName);
  assert.equal(
    article.name,
    page.name,
    "the two routes render the same Person, so they must resolve the same name"
  );
});

test("article author identity still falls back to the site owner with no relation at all", () => {
  // The other half of the rule: an article with no author relation *is* the
  // owner's, and authorPath falls back to the owner's profile path with it.
  const identity = resolveArticleAuthorIdentity(null, FALLBACKS, ORIGIN);

  assert.equal(identity.name, FALLBACKS.authorName);
});

test("article author identity never lets a blank URL reach Person url or sameAs", () => {
  // The most severe leak in #83: "" is invalid structured data, not just blank
  // copy. The author route already guarded this; the article route did not.
  const identity = resolveArticleAuthorIdentity(
    { slug: "jane-doe", name: "Jane Doe", websiteUrl: "   ", linkedinUrl: "" },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(identity.websiteUrl, FALLBACKS.websiteUrl);
  assert.equal(identity.linkedinUrl, FALLBACKS.linkedinUrl);
  assert.notEqual(identity.websiteUrl, "");
  assert.notEqual(identity.linkedinUrl, "");
});

test("article author identity rejects an unparseable URL instead of emitting it", () => {
  const identity = resolveArticleAuthorIdentity(
    { slug: "jane-doe", name: "Jane Doe", websiteUrl: "not a url", linkedinUrl: "javascript:alert(1)" },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(identity.websiteUrl, FALLBACKS.websiteUrl);
  assert.equal(identity.linkedinUrl, FALLBACKS.linkedinUrl);
});

test("article author identity normalizes a canonical-origin URL the same way the author route does", () => {
  // The two routes emitting different `url` values for the same Person is the
  // inconsistency #83 calls out.
  const article = resolveArticleAuthorIdentity(
    { slug: "jane-doe", name: "Jane Doe", websiteUrl: "https://mehdi-zare.com/" },
    FALLBACKS,
    ORIGIN
  );
  const authorPage = resolveAuthorPageIdentity(
    { slug: "jane-doe", name: "Jane Doe", websiteUrl: "https://mehdi-zare.com/" },
    FALLBACKS,
    ORIGIN
  );

  assert.equal(article.websiteUrl, authorPage.websiteUrl);
  assert.equal(article.websiteUrl, "https://www.mehdi-zare.com");
});

test("article author identity produces initials-safe names", () => {
  // authorName feeds buildInitials(); a blank name produced a blank avatar.
  const identity = resolveArticleAuthorIdentity(
    { slug: "jane-doe", name: "" },
    FALLBACKS,
    ORIGIN
  );

  assert.ok(identity.name.trim().length > 0);
});

// ---------------------------------------------------------------------------
// authorIdentityFallbacks
// ---------------------------------------------------------------------------

test("authorIdentityFallbacks projects the Site Profile fields both routes need", () => {
  // Both routes must derive their fallbacks the same way; deriving them inline
  // is how the article route ended up reading siteProfile.author.websiteUrl
  // without the normalization the author route applied.
  const siteProfile = {
    authorName: "Mehdi Zare, CFA",
    authorRole: "Principal AI Engineer",
    authorBioShort: "Principal AI engineer shipping production systems.",
    author: {
      websiteUrl: "https://www.mehdi-zare.com",
      linkedinUrl: "https://linkedin.com/in/mehdizare",
    },
  };

  assert.deepEqual(authorIdentityFallbacks(siteProfile), FALLBACKS);
});

// ---------------------------------------------------------------------------
// resolveAuthorAddress -- #92
// ---------------------------------------------------------------------------
//
// Three of the four surfaces that emit a PostalAddress resolve it through
// resolveSiteProfile, which falls back to DEFAULT_SITE_PROFILE when the CMS
// author carries no address. /author/[slug] read the raw CMS author instead,
// so the same Person could carry a full address on / and none on
// /author/mehdi-zare -- exactly the NAP inconsistency structured data exists
// to remove.
//
// The fix is deliberately narrow: the fallback applies to the *site owner*
// only. Stamping the owner's address onto a guest author's Person markup would
// be worse than omitting it.

const SITE_OWNER = {
  slug: "mehdi-zare",
  addressLocality: "Miami",
  addressRegion: "FL",
  addressCountry: "US",
};

test("author address falls back to the site profile for the primary author", () => {
  const address = resolveAuthorAddress(
    { slug: "mehdi-zare", isPrimary: true },
    SITE_OWNER
  );

  assert.deepEqual(address, {
    addressLocality: "Miami",
    addressRegion: "FL",
    addressCountry: "US",
  });
});

test("author address falls back when the slug matches the site owner without isPrimary", () => {
  // isPrimary is optional on the CMS record; the slug is the durable signal.
  const address = resolveAuthorAddress({ slug: "mehdi-zare" }, SITE_OWNER);

  assert.equal(address.addressLocality, "Miami");
  assert.equal(address.addressRegion, "FL");
});

test("author address does not invent an address for a different author", () => {
  const address = resolveAuthorAddress({ slug: "jane-doe" }, SITE_OWNER);

  assert.deepEqual(address, {
    addressLocality: undefined,
    addressRegion: undefined,
    addressCountry: undefined,
  });
});

test("author address keeps a guest author's own address untouched", () => {
  const address = resolveAuthorAddress(
    {
      slug: "jane-doe",
      addressLocality: "Berlin",
      addressRegion: "BE",
      addressCountry: "DE",
    },
    SITE_OWNER
  );

  assert.deepEqual(address, {
    addressLocality: "Berlin",
    addressRegion: "BE",
    addressCountry: "DE",
  });
});

test("author address prefers the author's own values over the fallback", () => {
  const address = resolveAuthorAddress(
    {
      slug: "mehdi-zare",
      isPrimary: true,
      addressLocality: "Austin",
      addressRegion: "TX",
      addressCountry: "US",
    },
    SITE_OWNER
  );

  assert.equal(address.addressLocality, "Austin");
  assert.equal(address.addressRegion, "TX");
  assert.equal(address.addressCountry, "US");
});

test("author address treats a blank CMS address field as absent", () => {
  // Same defect class as the rest of #83: "" and "   " are *present* to `??`.
  const owner = resolveAuthorAddress(
    { slug: "mehdi-zare", isPrimary: true, addressLocality: "   ", addressRegion: "" },
    SITE_OWNER
  );
  const guest = resolveAuthorAddress(
    { slug: "jane-doe", addressLocality: "  ", addressRegion: "" },
    SITE_OWNER
  );

  assert.equal(owner.addressLocality, "Miami");
  assert.equal(owner.addressRegion, "FL");
  assert.equal(guest.addressLocality, undefined);
  assert.equal(guest.addressRegion, undefined);
});

test("author address trims the values it returns", () => {
  const address = resolveAuthorAddress(
    { slug: "jane-doe", addressLocality: "  Berlin  " },
    SITE_OWNER
  );

  assert.equal(address.addressLocality, "Berlin");
});

test("a partial site-owner address is emitted as-is, never merged with the fallback (#102)", () => {
  // The regression this replaces: the three components used to resolve
  // independently, so an owner record filling some of them inherited the rest
  // and published "Berlin, FL, DE" -- a person in a state they do not live in.
  // Google reads PostalAddress as one unit, and since every property on it is
  // optional free text, no validator flags that. It was wrong silently.
  //
  // The shape below is the realistic trigger, not a contrived one: relocating
  // abroad and clearing addressRegion because there is no state to name.
  const address = resolveAuthorAddress(
    {
      slug: "mehdi-zare",
      isPrimary: true,
      addressLocality: "Berlin",
      addressRegion: "",
      addressCountry: "DE",
    },
    SITE_OWNER
  );

  assert.deepEqual(address, {
    addressLocality: "Berlin",
    addressRegion: undefined,
    addressCountry: "DE",
  });
  assert.notEqual(
    address.addressRegion,
    SITE_OWNER.addressRegion,
    "the owner's region must not leak into an address the CMS record already speaks for"
  );
});

test("the site owner inherits the full fallback only with no address at all (#102)", () => {
  // The other half of all-or-nothing: inheriting is still right when the record
  // says nothing, which is what keeps /author/[slug] consistent with the Person
  // the root layout emits (#92).
  const blank = resolveAuthorAddress(
    { slug: "mehdi-zare", isPrimary: true },
    SITE_OWNER
  );

  assert.deepEqual(blank, {
    addressLocality: SITE_OWNER.addressLocality,
    addressRegion: SITE_OWNER.addressRegion,
    addressCountry: SITE_OWNER.addressCountry,
  });

  // A single filled field is enough to make the record speak for itself.
  const countryOnly = resolveAuthorAddress(
    { slug: "mehdi-zare", isPrimary: true, addressCountry: "DE" },
    SITE_OWNER
  );

  assert.deepEqual(countryOnly, {
    addressLocality: undefined,
    addressRegion: undefined,
    addressCountry: "DE",
  });
});

// ---------------------------------------------------------------------------
// resolveAuthorWorksFor -- /author/[slug] (#106)
// ---------------------------------------------------------------------------

const SITE_OWNER_WORKS_FOR = {
  slug: "mehdi-zare",
  worksForName: "Entarian",
  worksForUrl: "https://entarian.com",
};

test("author worksFor falls back to the site profile for the primary author", () => {
  const worksFor = resolveAuthorWorksFor(
    { slug: "mehdi-zare", isPrimary: true },
    SITE_OWNER_WORKS_FOR
  );

  assert.deepEqual(worksFor, {
    worksForName: "Entarian",
    worksForUrl: "https://entarian.com",
  });
});

test("author worksFor does not invent an employer for a different author", () => {
  const worksFor = resolveAuthorWorksFor({ slug: "jane-doe" }, SITE_OWNER_WORKS_FOR);

  assert.deepEqual(worksFor, {
    worksForName: undefined,
    worksForUrl: undefined,
  });
});

test("author worksFor keeps a guest author's own employer untouched", () => {
  const worksFor = resolveAuthorWorksFor(
    {
      slug: "jane-doe",
      worksForName: "Acme Corp",
      worksForUrl: "https://acme.example",
    },
    SITE_OWNER_WORKS_FOR
  );

  assert.deepEqual(worksFor, {
    worksForName: "Acme Corp",
    worksForUrl: "https://acme.example",
  });
});

test("a partial site-owner worksFor is emitted as-is, never merged with the fallback (#106)", () => {
  const worksFor = resolveAuthorWorksFor(
    {
      slug: "mehdi-zare",
      isPrimary: true,
      worksForName: "Entarian",
      worksForUrl: "",
    },
    SITE_OWNER_WORKS_FOR
  );

  assert.equal(worksFor.worksForName, "Entarian");
  assert.equal(worksFor.worksForUrl, undefined);
  assert.notEqual(
    worksFor.worksForUrl,
    SITE_OWNER_WORKS_FOR.worksForUrl,
    "the owner's URL must not leak into an employer the CMS record already speaks for"
  );
});

test("the site owner inherits the full worksFor fallback only with no employer at all (#106)", () => {
  const blank = resolveAuthorWorksFor(
    { slug: "mehdi-zare", isPrimary: true },
    SITE_OWNER_WORKS_FOR
  );

  assert.deepEqual(blank, {
    worksForName: SITE_OWNER_WORKS_FOR.worksForName,
    worksForUrl: SITE_OWNER_WORKS_FOR.worksForUrl,
  });

  const nameOnly = resolveAuthorWorksFor(
    { slug: "mehdi-zare", isPrimary: true, worksForName: "Entarian" },
    SITE_OWNER_WORKS_FOR
  );

  assert.deepEqual(nameOnly, {
    worksForName: "Entarian",
    worksForUrl: undefined,
  });
});

// ---------------------------------------------------------------------------
// resolveAuthorAlumniOf -- /author/[slug] (#106)
// ---------------------------------------------------------------------------

const SITE_OWNER_ALUMNI = {
  slug: "mehdi-zare",
  alumniOf: [
    "University of Maryland, Smith School of Business",
    "University of Tehran",
  ],
};

test("author alumniOf falls back to the site profile for the primary author", () => {
  const { alumniOf } = resolveAuthorAlumniOf(
    { slug: "mehdi-zare", isPrimary: true },
    SITE_OWNER_ALUMNI
  );

  assert.deepEqual(alumniOf, [...SITE_OWNER_ALUMNI.alumniOf]);
});

test("author alumniOf does not borrow the site owner's list for a guest author", () => {
  const { alumniOf } = resolveAuthorAlumniOf({ slug: "jane-doe" }, SITE_OWNER_ALUMNI);

  assert.deepEqual(alumniOf, []);
});

test("author alumniOf keeps a guest author's own list untouched", () => {
  const { alumniOf } = resolveAuthorAlumniOf(
    { slug: "jane-doe", alumniOf: ["State University"] },
    SITE_OWNER_ALUMNI
  );

  assert.deepEqual(alumniOf, ["State University"]);
});
