import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { BRAND_COLORS, BRAND_DISPLAY_DOMAIN } = await import("../src/lib/brand.ts");

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const OG_ROUTES = [
  "src/app/opengraph-image.tsx",
  "src/app/blog/[slug]/opengraph-image.tsx",
];

// IMG-09 / TS-11.

test("brand tokens match the globals.css colour tokens", () => {
  const css = readSource("src/app/globals.css");
  const expected: Record<keyof typeof BRAND_COLORS, string> = {
    ink: "--color-ink",
    paper: "--color-paper",
    warmGray: "--color-warm-gray",
    midGray: "--color-mid-gray",
    accentWarm: "--color-accent-warm",
    muted: "--color-muted",
  };

  for (const [key, variable] of Object.entries(expected)) {
    const match = css.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `globals.css is missing ${variable}`);
    assert.equal(
      BRAND_COLORS[key as keyof typeof BRAND_COLORS].toLowerCase(),
      match[1].toLowerCase(),
      `${key} drifted from ${variable}`
    );
  }
});

test("share cards print the site's own domain", () => {
  assert.equal(BRAND_DISPLAY_DOMAIN, "mehdi-zare.com");

  for (const route of OG_ROUTES) {
    const source = readSource(route);
    assert.doesNotMatch(source, /mehdizare\.com/, `${route} prints a domain the site does not own`);
  }
  assert.match(readSource("src/app/opengraph-image.tsx"), /\{BRAND_DISPLAY_DOMAIN\}/);
});

test("share cards use brand tokens rather than literal hex colours", () => {
  for (const route of OG_ROUTES) {
    const source = readSource(route);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${route} has a literal hex colour`);
    assert.match(source, /BRAND_COLORS\./, `${route} should read BRAND_COLORS`);
  }
});
