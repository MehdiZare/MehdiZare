import test from "node:test";
import assert from "node:assert/strict";

const { normalizeSiteProfile } = await import("../src/lib/site-profile.ts");
const { resolveAuthorAddress, resolveAuthorWorksFor } = await import("../src/lib/author-identity.ts");
const { DEFAULT_SITE_PROFILE } = await import("../src/lib/site-profile-defaults.ts");

const canonicalAuthor = {
  id: 1,
  documentId: "author-1",
  name: "Mehdi Zare",
  slug: "mehdi-zare",
  bioShort: "Principal AI Engineer.",
  websiteUrl: "https://mehdi-zare.com/",
  linkedinUrl: "https://linkedin.com/in/mehdizare/",
  sameAs: [
    { id: 1, platform: "Website", url: "https://www.mehdi-zare.com" },
    { id: 2, platform: "Website", url: "https://mehdi-zare.com" },
    { id: 3, platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
    { id: 4, platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare/" },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: "2026-01-01T00:00:00.000Z",
};

test("site profile normalizes and dedupes canonical identity URLs", () => {
  const profile = normalizeSiteProfile({
    author: canonicalAuthor,
  });

  assert.equal(profile.author.websiteUrl, "https://www.mehdi-zare.com");
  assert.equal(profile.author.linkedinUrl, "https://linkedin.com/in/mehdizare");

  const websiteLinks = profile.author.sameAs.filter(
    (link) => link.platform.toLowerCase() === "website"
  );
  const linkedinLinks = profile.author.sameAs.filter(
    (link) => link.platform.toLowerCase() === "linkedin"
  );

  assert.equal(websiteLinks.length, 1);
  assert.equal(linkedinLinks.length, 1);
  assert.equal(websiteLinks[0]?.url, "https://www.mehdi-zare.com");
  assert.equal(linkedinLinks[0]?.url, "https://linkedin.com/in/mehdizare");
});

test("site profile provides stable geo fallback fields for author", () => {
  const profile = normalizeSiteProfile({
    author: canonicalAuthor,
  });

  assert.equal(profile.author.addressLocality, "Miami");
  assert.equal(profile.author.addressRegion, "FL");
  assert.equal(profile.author.addressCountry, "US");
});

// The defaults above are only reached when the CMS author carries no address.
// A seeded author does carry one, so the CMS value is what actually renders --
// pin that precedence, or a defaults-only edit looks like it changed the site
// when it did not.
test("site profile prefers a CMS author address over the geo fallback", () => {
  const profile = normalizeSiteProfile({
    author: {
      ...canonicalAuthor,
      addressLocality: "Austin",
      addressRegion: "TX",
      addressCountry: "US",
    },
  });

  assert.equal(profile.author.addressLocality, "Austin");
  assert.equal(profile.author.addressRegion, "TX");
});

// #102. The three Person surfaces fed by `resolveSiteProfile` -- the root
// layout, /contact and /consulting -- used to merge the address field by field
// here, independently of the rule /author/[slug] applies. That is how the two
// drifted before (#92), and it is why this assertion lives on the site-profile
// side rather than only on the resolver: without it, `buildAuthorProfile` can
// quietly stop delegating and nothing fails.
test("a partial CMS address is not completed from the geo fallback (#102)", () => {
  const profile = normalizeSiteProfile({
    author: {
      ...canonicalAuthor,
      addressLocality: "Berlin",
      addressRegion: "",
      addressCountry: "DE",
    },
  });

  assert.equal(profile.author.addressLocality, "Berlin");
  assert.equal(
    profile.author.addressRegion,
    undefined,
    'the "Berlin, FL" merge is back: a CMS record that speaks for its own address must not inherit the default region'
  );
  assert.equal(profile.author.addressCountry, "DE");
});

test("the site profile and /author/[slug] resolve the same address (#102)", () => {
  // The two copies agreeing is the actual invariant. Comparing them directly
  // means a change to either one that does not change the other fails here,
  // which no per-surface assertion can catch.
  const author = {
    ...canonicalAuthor,
    addressLocality: "Berlin",
    addressRegion: "",
    addressCountry: "DE",
  };

  const profile = normalizeSiteProfile({ author });
  const routeAddress = resolveAuthorAddress(author, {
    slug: DEFAULT_SITE_PROFILE.authorSlug,
    addressLocality: DEFAULT_SITE_PROFILE.authorAddressLocality,
    addressRegion: DEFAULT_SITE_PROFILE.authorAddressRegion,
    addressCountry: DEFAULT_SITE_PROFILE.authorAddressCountry,
  });

  assert.deepEqual(
    {
      addressLocality: profile.author.addressLocality,
      addressRegion: profile.author.addressRegion,
      addressCountry: profile.author.addressCountry,
    },
    routeAddress,
    "the Person on / , /contact and /consulting disagrees with the Person on /author/[slug] -- the #92 drift is back"
  );
});

test("a partial CMS worksFor is not completed from the employer fallback (#106)", () => {
  const profile = normalizeSiteProfile({
    author: {
      ...canonicalAuthor,
      worksForName: "Entarian",
      worksForUrl: "",
    },
  });

  assert.equal(profile.author.worksForName, "Entarian");
  assert.equal(
    profile.author.worksForUrl,
    undefined,
    'the mixed-employer merge is back: a CMS record that speaks for its own employer must not inherit the default URL'
  );
});

test("the site profile and /author/[slug] resolve the same worksFor (#106)", () => {
  const author = {
    ...canonicalAuthor,
    worksForName: "Entarian",
    worksForUrl: "",
  };

  const profile = normalizeSiteProfile({ author });
  const routeWorksFor = resolveAuthorWorksFor(author, {
    slug: DEFAULT_SITE_PROFILE.authorSlug,
    worksForName: DEFAULT_SITE_PROFILE.authorWorksForName,
    worksForUrl: DEFAULT_SITE_PROFILE.authorWorksForUrl,
  });

  assert.deepEqual(
    {
      worksForName: profile.author.worksForName,
      worksForUrl: profile.author.worksForUrl,
    },
    routeWorksFor,
    "the Person on / , /contact and /consulting disagrees with the Person on /author/[slug] -- the #92 worksFor drift is back"
  );
});
