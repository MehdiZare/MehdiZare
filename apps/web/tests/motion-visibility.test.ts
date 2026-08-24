import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// Framer Motion inlines the resolved `initial` state as a `style` attribute
// during SSR. Any initial state that zeroes out opacity, size, or scale is
// therefore shipped in the HTML, and the content stays hidden until hydration
// runs. PR #28 removed that pattern from the homepage; these contracts keep it
// out of the pages #28 did not cover.

const COMPONENTS_DIR = resolve(process.cwd(), "src/components");

// Components whose hiding initial state is only ever mounted in response to a
// user interaction. They live inside `AnimatePresence` and render nothing at
// all during SSR, so there is no content to hide. The `AnimatePresence`
// assertion below keeps each exemption honest: if one of these ever becomes a
// plain always-rendered motion element, the exemption stops applying.
const INTERACTION_ONLY = new Map([
  ["layout/Navbar.tsx", "mobile menu panel, mounted only while the menu is open"],
  ["consulting/FAQ.tsx", "accordion answer, mounted only while an item is open"],
]);

const HIDING_PROPS = [
  { name: "opacity", pattern: /\bopacity\s*:\s*0(?![.\d])/ },
  { name: "width", pattern: /\bwidth\s*:\s*(?:0(?![.\d])|["'`]0(?:px|%|rem|em)?["'`])/ },
  { name: "height", pattern: /\bheight\s*:\s*(?:0(?![.\d])|["'`]0(?:px|%|rem|em)?["'`])/ },
  { name: "scale", pattern: /\bscale[XY]?\s*:\s*0(?![.\d])/ },
  { name: "visibility", pattern: /\bvisibility\s*:\s*["']hidden["']/ },
];

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsxFiles(full);
    return entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

/** Returns the balanced `{...}` slice starting at `openIndex`. */
function readBalancedBraces(source: string, openIndex: number): string {
  let depth = 0;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }

  return source.slice(openIndex);
}

/**
 * Every initial state a motion element can resolve during SSR: the inline
 * `initial={{ ... }}` object, and the `hidden:` branch of a variants object
 * referenced by `initial="hidden"`.
 */
function collectInitialStates(source: string): string[] {
  const states: string[] = [];

  for (const match of source.matchAll(/initial=\{\{/g)) {
    states.push(readBalancedBraces(source, match.index + "initial=".length));
  }

  for (const match of source.matchAll(/\bhidden\s*:\s*\{/g)) {
    states.push(readBalancedBraces(source, source.indexOf("{", match.index)));
  }

  return states;
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("no component ships an SSR initial state that hides its content", () => {
  const offenders: string[] = [];

  for (const file of listTsxFiles(COMPONENTS_DIR)) {
    const key = relative(COMPONENTS_DIR, file);
    if (INTERACTION_ONLY.has(key)) continue;

    const source = readFileSync(file, "utf8");
    for (const state of collectInitialStates(source)) {
      for (const prop of HIDING_PROPS) {
        if (prop.pattern.test(state)) {
          offenders.push(`${key}: ${prop.name} in ${state.replace(/\s+/g, " ")}`);
        }
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "Motion initial states must not hide content during SSR. Animate a " +
      "transform instead, or render the final value and enhance after mount:\n  " +
      offenders.join("\n  ")
  );
});

test("interaction-only exemptions really are mounted behind AnimatePresence", () => {
  for (const [key, reason] of INTERACTION_ONLY) {
    const source = readFileSync(join(COMPONENTS_DIR, key), "utf8");
    assert.match(
      source,
      /<AnimatePresence/,
      `${key} is exempt because of its ${reason}, but it no longer uses ` +
        "AnimatePresence, so its initial state now ships in the SSR markup."
    );
  }
});

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

test("ProofOfWork score bars carry their real width in the markup", () => {
  const source = readSource("src/components/home/ProofOfWork.tsx");

  assert.doesNotMatch(source, /initial=\{\{/);
  assert.match(source, /--score-bar-width/);
  assert.match(source, /className=\{`score-bar/);
});

test("score bar growth is CSS, ends at the declared width, and respects reduced motion", () => {
  const source = readSource("src/app/globals.css");

  // `both` keeps the final keyframe applied, so the bar rests at the width the
  // markup declared rather than snapping back.
  assert.match(source, /\.score-bar\s*\{[^}]*width:\s*var\(--score-bar-width\)/);
  assert.match(source, /animation:\s*score-bar-grow[^;]*both/);
  assert.match(
    source,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.score-bar\s*\{\s*animation:\s*none/
  );
});

test("CountUp renders its final value on the server", () => {
  const source = readSource("src/components/shared/CountUp.tsx");

  // useState(0) is what made every score render as a literal "0" without JS.
  assert.doesNotMatch(source, /useState\(0\)/);
  assert.match(source, /useState\(end\)/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
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
