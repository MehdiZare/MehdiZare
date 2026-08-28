import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The parts of the motion contract that leave no trace in the built HTML.
//
// `tests/post-build/ssr-visibility.test.ts` covers the thing that matters most
// -- that no page ships hidden content -- by reading the build output. These
// three cannot be checked that way: CSS animation behaviour and reduced-motion
// handling live in the stylesheet and in client-only state, so the source is
// the only place to assert them.
//
// Kept deliberately short. This is what survived of a 1,587-line AST scanner
// whose remaining assertions were themselves source greps.

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("CSS smooth scroll is disabled for reduced-motion users", () => {
  const css = readSource("src/app/globals.css");

  assert.match(css, /html\s*\{[^}]*scroll-behavior:\s*smooth/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*html\s*\{\s*scroll-behavior:\s*auto/,
    'MotionConfig reducedMotion="user" does not reach CSS scroll-behavior, so globals.css needs its own guard.'
  );
});

test("score bars rest at their declared width and stop animating for reduced motion", () => {
  const css = readSource("src/app/globals.css");

  // `both` fills backwards so the bar does not flash at full width before the
  // animation starts. The declared width is where it rests afterwards.
  assert.match(css, /\.score-bar\s*\{[^}]*width:\s*var\(--score-bar-width\)/);
  assert.match(css, /animation:\s*score-bar-grow[^;]*both/);
  assert.match(css, /@keyframes\s*score-bar-grow[\s\S]*to\s*\{\s*width:\s*var\(--score-bar-width\)/);
  assert.match(
    css,
    // `animation-timeline: auto` has to go with `animation: none`. Without it
    // the @supports block keeps the scroll timeline attached, so a
    // reduced-motion user still gets scroll-driven bar growth -- the exact bug
    // the pair exists to prevent.
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.score-bar\s*\{\s*animation:\s*none;\s*animation-timeline:\s*auto/
  );
});

test("the score-bar scroll timeline is declared and consumed under the same name", () => {
  const css = readSource("src/app/globals.css");

  // A two-place invariant: `#proof-of-work` declares the timeline and
  // `.score-bar` consumes it. Rename either side and the bars silently stop
  // animating on scroll, with nothing else red. Capture both and compare,
  // rather than asserting a literal name twice.
  const declared = css.match(/#proof-of-work\s*\{[^}]*view-timeline-name:\s*(--[\w-]+)/);
  const consumed = css.match(/\.score-bar\s*\{[^}]*animation-timeline:\s*(--[\w-]+)/);

  assert.ok(declared, "#proof-of-work must declare a view-timeline-name");
  assert.ok(consumed, ".score-bar must consume a named animation-timeline");
  assert.equal(
    consumed[1],
    declared[1],
    "the timeline .score-bar consumes must be the one #proof-of-work declares"
  );

  // The bar sits in an overflow-hidden track, so a bare `view()` timeline would
  // always be "in view" of that track and finish on load.
  assert.match(css, /animation-range:\s*entry\s+0%\s+cover\s+40%/);
  assert.match(css, /animation-duration:\s*auto/);
});

test("ProofOfWork renders the markup that stylesheet contract depends on", () => {
  const source = readSource("src/components/home/ProofOfWork.tsx");

  // The CSS above consumes `--score-bar-width` on `.score-bar` inside
  // `#proof-of-work`. Nothing else asserts those three are ever emitted, and
  // the component is behind the bina-print flag, so the built HTML cannot
  // reach it either -- delete the inline custom property and the bars break
  // with an otherwise green suite.
  assert.match(source, /id="proof-of-work"/);
  assert.match(source, /score-bar/);
  assert.match(source, /"--score-bar-width":\s*`\$\{[^}]+\}%`/);
});

test("CountUp renders its final value on the server", () => {
  const source = readSource("src/components/shared/CountUp.tsx");

  // `useState(0)` is what made every score server-render as a literal "0".
  // The component is behind the bina-print flag today, so the built HTML does
  // not exercise it -- this stays a source assertion for that reason.
  assert.doesNotMatch(source, /useState\(0\)/);
  assert.match(source, /useState\(end\)/);
  assert.match(
    source,
    /if\s*\(\s*window\.matchMedia\(\s*["']\(prefers-reduced-motion:\s*reduce\)["']\s*\)\.matches\s*\)\s*return/
  );
});

test("CareerTimeline reveals by transform and never branches initial on useReducedMotion", () => {
  // HTML cannot show a hydration footgun: branching `initial` on
  // `useReducedMotion()` mismatches SSR vs client. MotionProvider already sets
  // reducedMotion="user", so the source must keep a stable initial.
  const source = readSource("src/components/about/CareerTimeline.tsx");

  assert.match(source, /initial="hidden"/);
  assert.match(source, /hidden:\s*\{\s*y:\s*24\s*\}/);
  assert.match(source, /visible:\s*\([^)]*\)\s*=>\s*\(\s*\{[^}]*\by:\s*0\b/);
  assert.doesNotMatch(source, /useReducedMotion/);
  assert.doesNotMatch(source, /opacity:\s*0/);
});
