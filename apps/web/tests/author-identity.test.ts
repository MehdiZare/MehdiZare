import test from "node:test";
import assert from "node:assert/strict";

import {
  authorIdentityFallbacks,
  buildAuthorListingDescription,
  composeAuthorTitle,
  resolveArticleAuthorIdentity,
  resolveAuthorPageIdentity,
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
