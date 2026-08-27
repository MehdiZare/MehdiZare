import test from "node:test";
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

const NAVBAR = "src/components/layout/Navbar.tsx";
const FOOTER = "src/components/layout/Footer.tsx";

const consumptionContracts: Array<{
  file: string;
  field: string;
  value: string;
}> = [
  { file: NAVBAR, field: "siteName", value: DEFAULT_SITE_PROFILE.siteName },
  { file: NAVBAR, field: "ctaLabel", value: DEFAULT_SITE_PROFILE.primaryCtaLabel },
  { file: FOOTER, field: "siteName", value: DEFAULT_SITE_PROFILE.siteName },
  {
    file: FOOTER,
    field: "credentialLine",
    value: DEFAULT_SITE_PROFILE.credentialLine,
  },
  // locationLine is the value #87 moved and #91 had to chase into production.
  // A hardcoded copy in the footer is exactly how that becomes unfixable.
  {
    file: FOOTER,
    field: "locationLine",
    value: DEFAULT_SITE_PROFILE.locationLine,
  },
  { file: FOOTER, field: "footerText", value: DEFAULT_SITE_PROFILE.footerText },
];

for (const { file, field, value } of consumptionContracts) {
  test(`${file.split("/").pop()} reads ${field} from Site Profile rather than hardcoding it`, () => {
    assertConsumesProfileValue(readSource(file), {
      field,
      value,
      contract: "#96",
      subject: file,
    });
  });
}
