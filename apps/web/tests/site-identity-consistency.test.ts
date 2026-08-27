import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

import {
  DEFAULT_SITE_PROFILE,
  DEFAULT_SOCIAL_LINKS,
} from "../src/lib/site-profile-defaults.ts";

// Site identity copy lives in three hand-maintained places (#93):
//
//   data/taxonomy.json                     the primary author record, written
//                                          to Strapi verbatim by the seed
//   apps/cms/scripts/seed.ts               the inline `siteSettings` block,
//                                          seeded into the `site-setting` type
//   apps/web/src/lib/site-profile-defaults  DEFAULT_SITE_PROFILE, the runtime
//                                          fallback
//
// The CMS copies win at runtime, so a defaults-only edit silently leaves the
// rendered page disagreeing with the structured data after the next seed. #87
// is the proof: a careful one-value change updated two of the three and missed
// the third, and nothing in the suite caught it.
//
// The previous version of this file enumerated the *location* fields by hand,
// which left the other ~15 shared literals unguarded and made every new shared
// field silently exempt. These assertions instead DERIVE the shared key set, so
// a field added to two sources is covered the day it is added. A key that
// genuinely lives in only one source has to be named in an exemption list
// below, with a reason -- that is the only way to opt out.

const repoRoot = resolve(process.cwd(), "../..");

// ---------------------------------------------------------------------------
// Source 1: data/taxonomy.json
// ---------------------------------------------------------------------------

interface TaxonomyAuthor {
  isPrimary?: boolean;
  [key: string]: unknown;
}

const taxonomy = JSON.parse(
  readFileSync(resolve(repoRoot, "data/taxonomy.json"), "utf8")
) as { authors: TaxonomyAuthor[] };

// Mirrors the primary-author rule in apps/cms/scripts/seed.ts so this test
// tracks whichever record the seed actually writes.
const primaryAuthor =
  taxonomy.authors.find((author) => author.isPrimary) ?? taxonomy.authors[0];

// ---------------------------------------------------------------------------
// Source 2: the `siteSettings` object literal in apps/cms/scripts/seed.ts
// ---------------------------------------------------------------------------

const SEED_PATH = resolve(repoRoot, "apps/cms/scripts/seed.ts");

/**
 * Evaluates a literal AST node. Deliberately total-or-throw: anything that is
 * not a plain literal (a computed value, a spread, an identifier reference)
 * means the seed stopped being a flat block of copy, and this test should say
 * so loudly rather than quietly skipping the key.
 */
function literalValue(node: ts.Node, source: ts.SourceFile): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => literalValue(element, source));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return objectLiteralValue(node, source);
  }

  throw new Error(
    `apps/cms/scripts/seed.ts: siteSettings contains a non-literal value (${
      ts.SyntaxKind[node.kind]
    }: ${node.getText(source)}). This tripwire compares literals; teach it the new shape rather than removing the key.`
  );
}

function objectLiteralValue(
  node: ts.ObjectLiteralExpression,
  source: ts.SourceFile
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const property of node.properties) {
    assert.ok(
      ts.isPropertyAssignment(property),
      `apps/cms/scripts/seed.ts: expected a plain property assignment, got ${
        ts.SyntaxKind[property.kind]
      }`
    );
    const key = ts.isIdentifier(property.name)
      ? property.name.text
      : ts.isStringLiteral(property.name)
        ? property.name.text
        : null;
    assert.ok(key, "apps/cms/scripts/seed.ts: computed keys are not supported here");
    result[key] = literalValue(property.initializer, source);
  }
  return result;
}

function readSeedSiteSettings(): Record<string, unknown> {
  const sourceText = readFileSync(SEED_PATH, "utf8");
  const source = ts.createSourceFile(
    "seed.ts",
    sourceText,
    ts.ScriptTarget.ES2022,
    true
  );

  let literal: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "siteSettings" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      literal = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  assert.ok(
    literal,
    "apps/cms/scripts/seed.ts: expected a `const siteSettings = { … }` object literal"
  );
  return objectLiteralValue(literal, source);
}

const seedSettings = readSeedSiteSettings();

// ---------------------------------------------------------------------------
// Exemptions -- the only way a shared-looking key opts out
// ---------------------------------------------------------------------------

/** Keys in the seed's siteSettings with no DEFAULT_SITE_PROFILE counterpart. */
const SEED_ONLY_KEYS = new Set<string>([]);

/**
 * Keys present in both sources whose *shapes* legitimately differ, so a deep
 * comparison would fail on structure rather than on copy: the web defaults
 * carry `id` / `order` / `external` that the CMS assigns and the seed does not
 * write. Each has a dedicated test below comparing the fields that do
 * round-trip. This is an exemption from the comparison *method*, not from
 * being compared at all.
 */
const STRUCTURED_KEYS = new Set(["navItems", "socialLinks"]);

/**
 * Keys on the taxonomy author with no DEFAULT_SITE_PROFILE counterpart, and
 * why. Adding a key here is a deliberate statement that the value is not
 * duplicated -- if it is, guard it instead.
 */
const AUTHOR_ONLY_KEYS = new Map<string, string>([
  ["isPrimary", "structural flag consumed by the seed, not rendered copy"],
  ["headline", "no defaults counterpart; the web fallback for role is authorRole"],
  ["credentials", "CMS-only; the web surfaces read credentials from Strapi"],
  ["sameAs", "compared against DEFAULT_SOCIAL_LINKS by its own test below"],
]);

/**
 * Taxonomy author keys whose defaults counterpart is not derivable by the
 * `author` + PascalCase rule.
 */
const AUTHOR_KEY_ALIASES = new Map<string, string>([
  ["jobTitle", "authorRole"],
]);

function pascalCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The DEFAULT_SITE_PROFILE key a taxonomy author key maps to, if any. */
function defaultsKeyFor(authorKey: string): string | undefined {
  const alias = AUTHOR_KEY_ALIASES.get(authorKey);
  if (alias) {
    return alias;
  }

  const prefixed = `author${pascalCase(authorKey)}`;
  const candidates = [prefixed, authorKey];
  return candidates.find((candidate) => candidate in DEFAULT_SITE_PROFILE);
}

const defaults = DEFAULT_SITE_PROFILE as unknown as Record<string, unknown>;

// ---------------------------------------------------------------------------
// seed siteSettings <-> DEFAULT_SITE_PROFILE
// ---------------------------------------------------------------------------

test("every key the seed and the web defaults share carries the same value", () => {
  const shared = Object.keys(seedSettings).filter(
    (key) => key in defaults && !STRUCTURED_KEYS.has(key)
  );

  assert.ok(
    shared.length >= 18,
    `expected the seed and the defaults to share the site identity copy, found only ${shared.length} shared keys (${shared.join(", ")}) -- a rename that empties this set would otherwise make the tripwire vacuous`
  );

  for (const key of shared) {
    assert.deepEqual(
      seedSettings[key],
      defaults[key],
      `${key} disagrees between apps/cms/scripts/seed.ts and site-profile-defaults.ts. The CMS copy wins at runtime, so this ships as a page that contradicts its own structured data (#93).`
    );
  }
});

test("a seed siteSettings key with no defaults counterpart is declared, not silent", () => {
  const unmatched = Object.keys(seedSettings).filter(
    (key) => !(key in defaults) && !SEED_ONLY_KEYS.has(key)
  );

  assert.deepEqual(
    unmatched,
    [],
    `these seed siteSettings keys have no DEFAULT_SITE_PROFILE counterpart: ${unmatched.join(", ")}. Either add the counterpart so the value is guarded, or name the key in SEED_ONLY_KEYS with a reason.`
  );
});

// ---------------------------------------------------------------------------
// taxonomy author <-> DEFAULT_SITE_PROFILE
// ---------------------------------------------------------------------------

test("every taxonomy author field with a defaults counterpart carries the same value", () => {
  assert.ok(primaryAuthor, "data/taxonomy.json: expected a primary author");

  const compared: string[] = [];
  for (const key of Object.keys(primaryAuthor)) {
    if (AUTHOR_ONLY_KEYS.has(key)) {
      continue;
    }

    const defaultsKey = defaultsKeyFor(key);
    if (!defaultsKey) {
      continue;
    }

    compared.push(key);
    assert.deepEqual(
      primaryAuthor[key],
      defaults[defaultsKey],
      `data/taxonomy.json author.${key} disagrees with DEFAULT_SITE_PROFILE.${defaultsKey}. The seeded CMS author wins at runtime, so this is the #87 failure shape: the footer and the Person JSON-LD end up naming different things.`
    );
  }

  assert.ok(
    compared.length >= 12,
    `expected to compare the author identity fields, compared only ${compared.length} (${compared.join(", ")})`
  );
});

test("a taxonomy author field with no defaults counterpart is declared, not silent", () => {
  const unmatched = Object.keys(primaryAuthor).filter(
    (key) => !AUTHOR_ONLY_KEYS.has(key) && !defaultsKeyFor(key)
  );

  assert.deepEqual(
    unmatched,
    [],
    `these data/taxonomy.json author fields map to nothing in DEFAULT_SITE_PROFILE: ${unmatched.join(", ")}. Either add the counterpart so the value is guarded, or name the field in AUTHOR_ONLY_KEYS with a reason.`
  );
});

test("declared exemptions still exist, so the lists cannot rot into noise", () => {
  for (const key of AUTHOR_ONLY_KEYS.keys()) {
    assert.ok(
      key in primaryAuthor,
      `AUTHOR_ONLY_KEYS names "${key}", which is no longer a taxonomy author field -- drop it`
    );
  }
  for (const key of SEED_ONLY_KEYS) {
    assert.ok(
      key in seedSettings,
      `SEED_ONLY_KEYS names "${key}", which is no longer a seed siteSettings key -- drop it`
    );
  }
  for (const key of STRUCTURED_KEYS) {
    assert.ok(
      key in seedSettings && key in defaults,
      `STRUCTURED_KEYS names "${key}", which is no longer shared by both sources -- drop it, or its dedicated test is guarding nothing`
    );
  }
  for (const [authorKey, defaultsKey] of AUTHOR_KEY_ALIASES) {
    assert.ok(
      authorKey in primaryAuthor,
      `AUTHOR_KEY_ALIASES maps "${authorKey}", which is no longer a taxonomy author field -- drop it`
    );
    assert.ok(
      defaultsKey in defaults,
      `AUTHOR_KEY_ALIASES points "${authorKey}" at "${defaultsKey}", which is no longer a DEFAULT_SITE_PROFILE key`
    );
  }
});

// ---------------------------------------------------------------------------
// The social links, which use a different key name in each source
// ---------------------------------------------------------------------------

function platformUrlPairs(
  links: ReadonlyArray<{ platform?: unknown; url?: unknown }>
): Array<{ platform: unknown; url: unknown }> {
  return links.map((link) => ({ platform: link.platform, url: link.url }));
}

test("the social links agree across all three sources", () => {
  // `sameAs` on the author, `socialLinks` in the seed's siteSettings, and
  // DEFAULT_SOCIAL_LINKS on the web side are the same five pairs written out
  // three times. The key names differ, so the derived intersection above
  // cannot see them.
  const fromDefaults = platformUrlPairs(DEFAULT_SOCIAL_LINKS);
  const fromSeed = platformUrlPairs(
    seedSettings.socialLinks as Array<{ platform?: unknown; url?: unknown }>
  );
  const fromTaxonomy = platformUrlPairs(
    primaryAuthor.sameAs as Array<{ platform?: unknown; url?: unknown }>
  );

  assert.deepEqual(fromSeed, fromDefaults);
  assert.deepEqual(fromTaxonomy, fromDefaults);
});

test("the nav items agree between the seed and the web defaults", () => {
  // DEFAULT_NAV_ITEMS carries id/order/external that the seed does not, so
  // compare the label/href pairs the CMS actually round-trips.
  const seedNav = (
    seedSettings.navItems as Array<{ label?: unknown; href?: unknown }>
  ).map((item) => ({ label: item.label, href: item.href }));
  const defaultNav = DEFAULT_SITE_PROFILE.navItems.map((item) => ({
    label: item.label,
    href: item.href,
  }));

  assert.deepEqual(seedNav, defaultNav);
});

// ---------------------------------------------------------------------------
// Derived relationships within the defaults
// ---------------------------------------------------------------------------

test("the footer location line matches the structured address defaults", () => {
  // Not a duplication across sources -- a composition within one. The footer
  // string and the PostalAddress fields have to describe the same place.
  assert.equal(
    DEFAULT_SITE_PROFILE.locationLine,
    `${DEFAULT_SITE_PROFILE.authorAddressLocality}, ${DEFAULT_SITE_PROFILE.authorAddressRegion}`
  );
});
