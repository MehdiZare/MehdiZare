import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// #121. After page copy became repo-owned and seed stopped writing these
// single-types (#116 / #119), the leftover Strapi schemas were a silent-no-op
// admin surface. They are deleted so deploying CMS drops the unused tables.

const cmsRoot = resolve(process.cwd(), "../../apps/cms");

const retiredApis = [
  "home-page",
  "about-page",
  "consulting-page",
  "bina-print-page",
  "site-setting",
  "newsletter-page",
];

const keptApis = ["article", "author", "category", "tag", "contact-submission"];

const keptComponents = [
  "shared/credential.json",
  "shared/seo.json",
  "shared/social-link.json",
];

const retiredComponents = [
  "bina/mover.json",
  "bina/step.json",
  "consulting/audience.json",
  "consulting/faq.json",
  "consulting/tier.json",
  "home/credibility-item.json",
  "home/featured-on-item.json",
  "home/value-card.json",
  "shared/education.json",
  "shared/experience.json",
  "shared/nav-item.json",
  "shared/stat.json",
];

test("retired Strapi page single-types are gone from the CMS source tree", () => {
  for (const name of retiredApis) {
    assert.equal(
      existsSync(resolve(cmsRoot, "src/api", name)),
      false,
      `apps/cms/src/api/${name} must not exist (#121)`
    );
  }
});

test("leftover components that only served the retired single-types are gone", () => {
  for (const rel of retiredComponents) {
    assert.equal(
      existsSync(resolve(cmsRoot, "src/components", rel)),
      false,
      `apps/cms/src/components/${rel} must not exist (#121)`
    );
  }
});

test("components still used by article, author, category, and tag remain", () => {
  for (const rel of keptComponents) {
    assert.ok(
      existsSync(resolve(cmsRoot, "src/components", rel)),
      `apps/cms/src/components/${rel} must remain`
    );
  }
});

test("CMS-backed collections the site still reads remain", () => {
  for (const name of keptApis) {
    assert.ok(
      existsSync(resolve(cmsRoot, "src/api", name)),
      `apps/cms/src/api/${name} must remain`
    );
  }
});

test("generated CMS types no longer name the retired single-types", () => {
  const generated = resolve(cmsRoot, "types/generated/contentTypes.d.ts");
  const source = readFileSync(generated, "utf8");
  for (const name of retiredApis) {
    assert.doesNotMatch(
      source,
      new RegExp(`api::${name}\\.${name}`),
      `generated contentTypes still lists ${name}`
    );
  }
});
