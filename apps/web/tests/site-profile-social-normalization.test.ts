import test from "node:test";
import assert from "node:assert/strict";

const { normalizeSiteProfile } = await import("../src/lib/site-profile.ts");

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
  const profile = normalizeSiteProfile(undefined, {
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
  const profile = normalizeSiteProfile(undefined, {
    author: canonicalAuthor,
  });

  assert.equal(profile.author.addressLocality, "Arlington");
  assert.equal(profile.author.addressRegion, "VA");
  assert.equal(profile.author.addressCountry, "US");
});
