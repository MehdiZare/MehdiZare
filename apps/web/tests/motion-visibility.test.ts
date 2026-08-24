import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Framer Motion inlines the resolved `initial` state as a `style` attribute
// during SSR. Any initial state that zeroes out opacity, size, or scale is
// therefore shipped in the HTML, and the content stays hidden until hydration
// runs. PR #28 removed that pattern from the homepage; these contracts keep it
// out of the pages #28 did not cover.

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("CareerTimeline reveals by transform through named variants", () => {
  const source = readSource("src/components/about/CareerTimeline.tsx");

  assert.doesNotMatch(source, /opacity:\s*0/);
  assert.match(source, /hidden:\s*\{/);
  assert.match(source, /initial="hidden"/);
  // Always a motion element: swapping to a plain div for some clients is the
  // hydration mismatch #28 removed from AnimatedSection.
  assert.match(source, /<motion\.div/);
  // Likewise, a `useReducedMotion()` branch on `initial` makes the server and
  // the client disagree. `MotionConfig reducedMotion="user"` handles it instead.
  assert.doesNotMatch(source, /useReducedMotion/);
});

test("CSS smooth scroll is disabled for reduced-motion users", () => {
  const source = readSource("src/app/globals.css");

  assert.match(source, /scroll-behavior:\s*smooth/);
  assert.match(
    source,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*html\s*\{\s*scroll-behavior:\s*auto/,
    'MotionConfig reducedMotion="user" does not reach CSS scroll-behavior, so ' +
      "globals.css needs its own prefers-reduced-motion guard."
  );
});
