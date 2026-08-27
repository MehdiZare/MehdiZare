import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_SITE_PROFILE } from "../src/lib/site-profile-defaults.ts";
import {
  assertCallsHelper,
  assertConsumesProfileValue,
} from "./contract-assertions.ts";

const pageFiles = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/consulting/page.tsx",
  "src/app/ai-engineer/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/blog/page.tsx",
  "src/app/blog/[slug]/page.tsx",
];

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("key pages consume Site Profile as canonical source", () => {
  for (const file of pageFiles) {
    const source = readSource(file);
    assertCallsHelper(source, "getSiteProfile", "#94", file);
  }
});

// Each entry pins a component field against the *canonical* value read from
// DEFAULT_SITE_PROFILE, rather than against a literal remembered from whenever
// the guard was written (#96). When the copy changes, the guard follows it; a
// guard that names a string nobody uses any more protects nothing.

const LAYOUT = "src/app/layout.tsx";
const NAVBAR = "src/components/layout/Navbar.tsx";
const FOOTER = "src/components/layout/Footer.tsx";

// `profileKey` is the DEFAULT_SITE_PROFILE field the component prop is supposed
// to carry. Naming it lets the value be derived rather than hand-repeated, and
// -- more importantly -- lets the wiring itself be asserted: a component can
// render `{siteName}` perfectly while layout hands that prop the wrong profile
// field, and every component-level guard here would still pass.
const consumptionContracts: Array<{
  file: string;
  field: string;
  profileKey: keyof typeof DEFAULT_SITE_PROFILE;
  fragments?: string[];
}> = [
  { file: NAVBAR, field: "siteName", profileKey: "siteName" },
  { file: NAVBAR, field: "ctaLabel", profileKey: "primaryCtaLabel" },
  { file: FOOTER, field: "siteName", profileKey: "siteName" },
  {
    file: FOOTER,
    field: "credentialLine",
    profileKey: "credentialLine",
    // The guard this replaced pinned this fragment on its own. Widening to the
    // canonical value must not drop it: a redesign that splits the line into
    // two elements hardcodes the halves, not the whole.
    fragments: ["CFA Charterholder"],
  },
  // locationLine is the value #87 moved and #91 had to chase into production.
  // A hardcoded copy in the footer is exactly how that becomes unfixable.
  { file: FOOTER, field: "locationLine", profileKey: "locationLine" },
  { file: FOOTER, field: "footerText", profileKey: "footerText" },
];

for (const { file, field, profileKey, fragments } of consumptionContracts) {
  test(`${file.split("/").pop()} reads ${field} from Site Profile rather than hardcoding it`, () => {
    assertConsumesProfileValue(readSource(file), {
      field,
      value: String(DEFAULT_SITE_PROFILE[profileKey]),
      contract: "#96",
      subject: file,
      fragments,
    });
  });
}

test("layout wires each guarded prop to the profile field its contract names", () => {
  const layout = readSource(LAYOUT);

  for (const { file, field, profileKey } of consumptionContracts) {
    assert.match(
      layout,
      new RegExp(`\\b${field}=\\{\\s*siteProfile\\.${profileKey}\\s*\\}`),
      `${LAYOUT} must pass siteProfile.${profileKey} as ${field} to <${
        file.split("/").pop()?.replace(".tsx", "") ?? file
      }> -- otherwise the component guard for ${field} is pinned to a profile key nothing actually supplies (#96)`
    );
  }
});
