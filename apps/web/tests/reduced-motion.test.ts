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

  assert.match(css, /scroll-behavior:\s*smooth/);
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
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.score-bar\s*\{\s*animation:\s*none/
  );
});

test("CountUp renders its final value on the server", () => {
  const source = readSource("src/components/shared/CountUp.tsx");

  // `useState(0)` is what made every score server-render as a literal "0".
  // The component is behind the bina-print flag today, so the built HTML does
  // not exercise it -- this stays a source assertion for that reason.
  assert.doesNotMatch(source, /useState\(0\)/);
  assert.match(source, /useState\(end\)/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
});
