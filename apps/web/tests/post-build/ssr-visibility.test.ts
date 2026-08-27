import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// Framer Motion inlines the resolved `initial` state as a `style` attribute
// during SSR. An initial state that zeroes opacity, scale or size therefore
// ships in the HTML, and the content stays invisible until hydration runs --
// to a crawler, and to anyone whose JS is slow or blocked, the section is not
// there. PR #28 removed that pattern from the homepage.
//
// This replaces a 1,587-line TypeScript AST scanner that tried to predict the
// same thing by reading component source. The scanner was a heuristic with a
// standing list of "known, accepted gaps", and it cost eight issues of its own
// (#40, #44, #46, #52, #53, #61, #62, #63) -- every one of them about the
// scanner's handling of a syntax shape rather than about a hidden section.
//
// The built HTML is the artifact that actually ships, so asserting on it needs
// no syntax handling at all: identifier variants, spreads, `satisfies` casts,
// aliased imports and stagger inheritance are all already resolved by the time
// Next writes the file. Whatever the components did, this is the result.
//
// Runs after `next build` rather than with the main suite -- see the
// `test:postbuild` script and the CI step that follows Build.

const BUILD_DIR = resolve(import.meta.dirname, "../../.next/server/app");

/**
 * Every route that prerenders from repo-owned data alone, so it is present in
 * *any* build of this app.
 *
 * Naming them, rather than counting pages, is what makes this contract
 * CMS-independent: CI builds with `DISABLE_STRAPI_CMS=true`, so article,
 * category, tag and author pages emit no HTML there, while a local build with
 * Strapi reachable emits ~58 files. A page count calibrated on one is wrong on
 * the other; this list is right on both, and it says which page went missing
 * instead of only how many did.
 *
 * Adding a static route without adding it here is deliberately not a failure
 * -- the scan below covers whatever the build emitted. The list exists to
 * prove the build is real, not to pin the route table.
 */
const ALWAYS_PRERENDERED = [
  "index.html",
  "about.html",
  "ai-engineer.html",
  "bina-print.html",
  "blog.html",
  "consulting.html",
  "contact.html",
];

/**
 * Inline declarations that leave content invisible or collapsed at paint.
 *
 * Deliberately narrow: `opacity:0.5` and `translateY(24px)` are *reveal*
 * animations that keep the content readable and in the layout, which is the
 * pattern this contract steers toward. Only a fully-zeroed value hides.
 */
const HIDING_DECLARATIONS: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /(^|[;\s])opacity:\s*0(?![.\d])/, why: "opacity:0" },
  { pattern: /transform:[^;]*\bscale(?:3d)?\(\s*0(?![.\d])/, why: "scale(0)" },
  { pattern: /(^|[;\s])(?:width|height):\s*0(?![.\d])(?:px|%|r?em|v[wh])?\s*(?:;|$)/, why: "zero size" },
  { pattern: /(^|[;\s])visibility:\s*hidden/, why: "visibility:hidden" },
  { pattern: /(^|[;\s])display:\s*none/, why: "display:none" },
];

function listHtmlFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...listHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Next's own error shells (`_not-found`, `_global-error`) carry framework
 * markup this repo does not author, including a `display:none` toggle. Skipping
 * them keeps the contract about *our* components.
 */
function isAuthoredPage(file: string): boolean {
  return !relative(BUILD_DIR, file).split("/").some((part) => part.startsWith("_"));
}

function hidingStyles(html: string): string[] {
  const offenders: string[] = [];
  for (const match of html.matchAll(/style="([^"]*)"/g)) {
    const style = match[1];
    for (const { pattern, why } of HIDING_DECLARATIONS) {
      if (pattern.test(style)) {
        offenders.push(`${why} in style="${style.slice(0, 120)}"`);
        break;
      }
    }
  }
  return offenders;
}

const buildExists = existsSync(BUILD_DIR);

test("the build output this contract reads actually exists", () => {
  // Without this, every assertion below would pass vacuously on a missing
  // build -- the failure mode that makes a post-build check worthless.
  assert.ok(
    buildExists,
    `No prerendered output at ${BUILD_DIR}. Run \`pnpm --filter=web build\` before \`test:postbuild\`.`
  );

  const pages = new Set(
    listHtmlFiles(BUILD_DIR)
      .filter(isAuthoredPage)
      .map((file) => relative(BUILD_DIR, file))
  );
  const missing = ALWAYS_PRERENDERED.filter((page) => !pages.has(page));
  assert.deepEqual(
    missing,
    [],
    `The build prerendered ${pages.size} authored page(s) but not ${missing.join(", ")}. ` +
      "A build that emitted almost nothing would make this file assert nothing, so " +
      "the scans below are only meaningful once every repo-owned page is present."
  );
});

test("no prerendered page ships content hidden by an inline style", () => {
  if (!buildExists) return;

  const offenders: string[] = [];
  for (const file of listHtmlFiles(BUILD_DIR).filter(isAuthoredPage)) {
    for (const hit of hidingStyles(readFileSync(file, "utf8"))) {
      offenders.push(`${relative(BUILD_DIR, file)}: ${hit}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "These pages ship server-rendered markup whose content is invisible until " +
      "hydration. Animate a transform instead, or render the final value and " +
      "enhance after mount (#28):\n  " +
      offenders.join("\n  ")
  );
});

test("reveal animations still ship, so the check above is not passing on an empty set", () => {
  if (!buildExists) return;

  // The contract is "reveal by transform", not "no animation". If the inline
  // transforms ever vanish entirely, the assertion above starts passing for the
  // wrong reason and this catches that.
  const transforms = listHtmlFiles(BUILD_DIR)
    .filter(isAuthoredPage)
    .flatMap((file) => [...readFileSync(file, "utf8").matchAll(/style="([^"]*transform:[^"]*)"/g)])
    .map((match) => match[1]);

  assert.ok(
    transforms.length > 0,
    "No inline transforms in any prerendered page. Either the reveal animations were removed, or the build no longer inlines initial states -- in both cases the hiding-style assertion above is no longer proving anything."
  );
});
