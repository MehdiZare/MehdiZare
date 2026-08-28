import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { CMS_PRERENDER_HTML_FILES } from "../../src/content/fixtures/cms-prerender.ts";

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
//
// CI builds with DISABLE_STRAPI_CMS=true. Article/author templates have no
// seed fallback, so a committed fixture catalog prerenders one of each
// (#114). Category/tag pages render from data/taxonomy.json once
// generateStaticParams emits those fixture slugs.

const BUILD_DIR = resolve(import.meta.dirname, "../../.next/server/app");

/**
 * Routes this contract requires to exist as 200s in a CMS-off build (CI).
 *
 * Naming them, rather than counting pages, is what makes this contract
 * CMS-independent: CI builds with `DISABLE_STRAPI_CMS=true`, so the live CMS
 * catalog is absent, while a local build with Strapi reachable emits ~58
 * files. This list is the CMS-off contract CI actually runs: repo-owned
 * pages plus the committed fixture routes. A CMS-on local `test:postbuild`
 * will fail on `blog/ssr-visibility-fixture.html` unless that slug exists
 * in Strapi; run postbuild against a CMS-off build, as CI does.
 *
 * Adding a static route without adding it here is deliberately not a failure
 * -- the scan below covers whatever the build emitted. The list exists to
 * prove the build is real, not to pin the route table.
 */
const ALWAYS_PRERENDERED = [
  "index.html",
  "about.html",
  "ai-engineer.html",
  "blog.html",
  "consulting.html",
  "contact.html",
  ...CMS_PRERENDER_HTML_FILES,
];

/**
 * The status Next will serve for a prerendered page, from the sibling `.meta`.
 *
 * Presence of an HTML file does not mean the route renders. A flipped flag, a
 * CMS gate or a stray `notFound()` still emits a file -- Next writes the
 * not-found shell to that path. `bina-print.html` is exactly this: with
 * `ENABLE_BINA_PRINT` unset the page calls `notFound()`, and its `.meta` reads
 * `"status": 404` for a file carrying no inline styles at all. Counting it as a
 * prerendered page is the same "passes for the wrong reason" failure the list
 * above exists to rule out, so it is not in the list, and any page that starts
 * 404ing is reported as missing rather than silently accepted.
 */
function servedStatus(page: string): number {
  const meta = join(BUILD_DIR, page.replace(/\.html$/, ".meta"));
  if (!existsSync(meta)) {
    return 200;
  }
  try {
    return (JSON.parse(readFileSync(meta, "utf8")) as { status?: number }).status ?? 200;
  } catch {
    return 200;
  }
}

/**
 * Inline declarations that leave content invisible or collapsed at paint.
 *
 * Deliberately narrow: `opacity:0.5` and `translateY(24px)` are *reveal*
 * animations that keep the content readable and in the layout, which is the
 * pattern this contract steers toward. Only a fully-zeroed value hides.
 *
 * `ZERO` covers `0`, `0.0`, `.0`, and `-0` without matching `0.5` / `10`.
 */
const ZERO = String.raw`-?(?:0(?:\.0+)?|\.0+)(?![.\d])`;
const HIDING_DECLARATIONS: Array<{ pattern: RegExp; why: string }> = [
  { pattern: new RegExp(String.raw`(^|[;\s])opacity:\s*${ZERO}`), why: "opacity:0" },
  // scale / scale3d / scaleX / scaleY — axis forms hide the same way as scale(0).
  {
    pattern: new RegExp(String.raw`transform:[^;]*\bscale(?:3d|[XY])?\(\s*${ZERO}`),
    why: "scale(0)",
  },
  {
    pattern: new RegExp(
      String.raw`(^|[;\s])(?:width|height):\s*${ZERO}(?:px|%|r?em|v[wh])?\s*(?:;|$)`
    ),
    why: "zero size",
  },
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

test("hidingStyles detects decimal and signed zero forms", () => {
  // Framer Motion emits `opacity:0` today; CSS/authors can still write 0.0 / .0 / -0.
  assert.deepEqual(hidingStyles('x style="opacity:0.0"'), ["opacity:0 in style=\"opacity:0.0\""]);
  assert.deepEqual(hidingStyles('x style="opacity:.0"'), ["opacity:0 in style=\"opacity:.0\""]);
  assert.deepEqual(hidingStyles('x style="opacity:-0"'), ["opacity:0 in style=\"opacity:-0\""]);
  assert.deepEqual(
    hidingStyles('x style="transform:scaleX(0.0)"'),
    ["scale(0) in style=\"transform:scaleX(0.0)\""]
  );
  assert.deepEqual(hidingStyles('x style="height:.0px"'), ["zero size in style=\"height:.0px\""]);
  assert.deepEqual(hidingStyles('x style="opacity:0.5"'), []);
  assert.deepEqual(hidingStyles('x style="transform:translateY(24px)"'), []);
});

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
  const missing = ALWAYS_PRERENDERED.filter(
    (page) => !pages.has(page) || servedStatus(page) !== 200
  );
  assert.deepEqual(
    missing,
    [],
    `The build prerendered ${pages.size} authored page(s), but ${missing.join(", ")} ` +
      "is absent or does not serve a 200. " +
      "A build that emitted almost nothing would make this file assert nothing, so " +
      "the scans below are only meaningful once every repo-owned page is present."
  );
});

test("no prerendered page ships content hidden by an inline style", () => {
  // Fail closed: a missing build must not soft-pass when this test is run alone.
  assert.ok(
    buildExists,
    `No prerendered output at ${BUILD_DIR}. Run \`pnpm --filter=web build\` before \`test:postbuild\`.`
  );

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
  assert.ok(
    buildExists,
    `No prerendered output at ${BUILD_DIR}. Run \`pnpm --filter=web build\` before \`test:postbuild\`.`
  );

  // `transform:none` is excluded deliberately. When a variant is present but
  // every value sits at its default, Framer still writes a `transform` -- and
  // `buildTransform` returns the literal string "none". Counting bare
  // `transform:` would let a neutered reveal (`hidden: { y: 0 }`) satisfy this
  // guard, which is the exact "passes for the wrong reason" case it exists to
  // catch: deleting `initial=` would be caught, quietly zeroing it would not.
  //
  // The contract is "reveal by transform", not "no animation". If the inline
  // transforms ever vanish entirely, the assertion above starts passing for the
  // wrong reason and this catches that.
  const transforms = listHtmlFiles(BUILD_DIR)
    .filter(isAuthoredPage)
    .flatMap((file) => [...readFileSync(file, "utf8").matchAll(/style="([^"]*transform:(?!none)[^"]*)"/g)])
    .map((match) => match[1]);

  assert.ok(
    transforms.length > 0,
    "No inline transforms in any prerendered page. Either the reveal animations were removed, or the build no longer inlines initial states -- in both cases the hiding-style assertion above is no longer proving anything."
  );
});
