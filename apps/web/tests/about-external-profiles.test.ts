import test from "node:test";
import assert from "node:assert/strict";

import { buildAboutFallback } from "../src/content/fallbacks/about.ts";
import { normalizeSiteProfile } from "../src/lib/site-profile.ts";
import { DEFAULT_SOCIAL_LINKS } from "../src/lib/site-profile-defaults.ts";
import { getSiteUrl } from "../src/lib/seo.ts";

// #100 moved /about off the `about-page` CMS row and onto the repo fallback.
// The row held four links; `DEFAULT_SOCIAL_LINKS` holds five, the extra one
// being the site's own URL, which the footer wants and this grid does not.
// Passing the profile straight through therefore added a self-referential
// `target="_blank"` card to a section titled "Portfolio & External Profiles"
// -- a visible change the refactor was not supposed to make.

function siteHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

test("the About profiles grid excludes the site's own URL", () => {
  const { socialLinks } = buildAboutFallback(normalizeSiteProfile(undefined));

  const ownLinks = socialLinks.filter((link) => siteHost(link.url) === siteHost(getSiteUrl()));
  assert.deepEqual(
    ownLinks,
    [],
    `"Portfolio & External Profiles" lists profiles held elsewhere, so the site's own URL does not belong in it. Found: ${ownLinks
      .map((link) => `${link.platform} -> ${link.url}`)
      .join(", ")}`
  );
});

test("every other default profile still reaches the About grid", () => {
  const { socialLinks } = buildAboutFallback(normalizeSiteProfile(undefined));

  // Without this, filtering everything out would satisfy the assertion above.
  const expected = DEFAULT_SOCIAL_LINKS.filter(
    (link) => siteHost(link.url) !== siteHost(getSiteUrl())
  ).map((link) => link.platform);

  assert.deepEqual(
    socialLinks.map((link) => link.platform),
    expected
  );
  assert.ok(expected.length >= 4, `Expected the external profiles to survive, got ${expected.length}.`);
});

test("a profile URL that will not parse is kept rather than dropped", () => {
  // Deciding which links are valid is not this filter's job; dropping an
  // unparseable one would silently remove a profile the site does list.
  const profile = normalizeSiteProfile(undefined);
  const { socialLinks } = buildAboutFallback({
    ...profile,
    socialLinks: [{ id: 99, platform: "Elsewhere", url: "not a url" }],
  });

  assert.deepEqual(socialLinks, [{ id: 99, platform: "Elsewhere", url: "not a url" }]);
});
