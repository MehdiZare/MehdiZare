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

/** Returns the balanced `open...close` slice starting at `openIndex`. */
function readBalanced(source: string, openIndex: number, open: string, close: string): string {
  let depth = 0;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }

  throw new Error(`unbalanced ${open}...${close} starting at index ${openIndex}`);
}

interface InitialState {
  text: string;
  index: number;
}

/**
 * Every initial state a motion element can resolve during SSR: the inline
 * `initial={{ ... }}` object, and the `hidden:` branch of a variants object
 * referenced by `initial="hidden"`.
 */
function collectInitialStates(source: string): InitialState[] {
  const states: InitialState[] = [];

  for (const match of source.matchAll(/initial=\{\{/g)) {
    const braceIndex = match.index + "initial=".length;
    states.push({
      text: readBalanced(source, braceIndex, "{", "}"),
      index: match.index,
    });
  }

  for (const match of source.matchAll(/\bhidden\s*:\s*\{/g)) {
    const braceIndex = source.indexOf("{", match.index);
    states.push({
      text: readBalanced(source, braceIndex, "{", "}"),
      index: match.index,
    });
  }

  return states;
}

/**
 * True when `index` sits inside the `(...)` of a `{cond && ( ... )}` mount.
 * That is the SSR gate: a closed default means the node is not in the HTML.
 * `AnimatePresence` only handles exit; it does not keep `initial` off the page.
 */
function isInsideConditionalMount(source: string, index: number): boolean {
  let searchFrom = 0;

  while (searchFrom < index) {
    const and = source.indexOf("&&", searchFrom);
    if (and === -1 || and >= index) return false;

    let j = and + 2;
    while (j < source.length && /\s/.test(source[j] ?? "")) j += 1;

    if (source[j] === "(") {
      const group = readBalanced(source, j, "(", ")");
      const end = j + group.length;
      if (index >= j && index < end) return true;
      searchFrom = Math.max(end, and + 2);
    } else {
      searchFrom = and + 2;
    }
  }

  return false;
}

function hidingHits(state: string): string[] {
  return HIDING_PROPS.filter((prop) => prop.pattern.test(state)).map((prop) => prop.name);
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("the hiding-initial scanner still sees Navbar's interaction-only panel", () => {
  const navbar = readSource("src/components/layout/Navbar.tsx");
  const hits = collectInitialStates(navbar).filter((state) => hidingHits(state.text).length > 0);
  assert.ok(
    hits.some((state) => /opacity\s*:\s*0/.test(state.text) && /height\s*:\s*0/.test(state.text)),
    "scanner no longer sees Navbar's hiding initial; the per-node helper is now a blind skip"
  );
});

test("conditionally mounted hiding initials are ignored; always-rendered ones are not", () => {
  const source = `
    <motion.div initial={{ opacity: 0 }} />
    {mobileMenuOpen && (
      <motion.div initial={{ opacity: 0, height: 0 }} />
    )}
  `;
  const states = collectInitialStates(source);
  assert.equal(states.length, 2);

  const always = states.find((state) => !/height/.test(state.text));
  const conditional = states.find((state) => /height/.test(state.text));
  assert.ok(always && conditional);
  assert.equal(isInsideConditionalMount(source, always.index), false);
  assert.equal(isInsideConditionalMount(source, conditional.index), true);
});

test("unparenthesized && JSX and ternaries are not treated as conditional mounts", () => {
  // Fail closed: only `{cond && ( ... )}` is exempt. Other SSR-safe shapes
  // still fail the scanner so authors add parens rather than us guessing JSX.
  const unparen = `
    {mobileMenuOpen && <motion.div initial={{ opacity: 0 }} />}
  `;
  const unparenStates = collectInitialStates(unparen);
  assert.equal(unparenStates.length, 1);
  assert.equal(isInsideConditionalMount(unparen, unparenStates[0].index), false);

  const ternary = `
    {isOpen ? (
      <motion.div initial={{ opacity: 0 }} />
    ) : null}
  `;
  const ternaryStates = collectInitialStates(ternary);
  assert.equal(ternaryStates.length, 1);
  assert.equal(isInsideConditionalMount(ternary, ternaryStates[0].index), false);
});

test("no component ships an SSR initial state that hides its content", () => {
  const offenders: string[] = [];

  for (const file of listTsxFiles(COMPONENTS_DIR)) {
    const key = relative(COMPONENTS_DIR, file);
    const source = readFileSync(file, "utf8");

    for (const state of collectInitialStates(source)) {
      if (isInsideConditionalMount(source, state.index)) continue;

      for (const prop of hidingHits(state.text)) {
        offenders.push(`${key}: ${prop} in ${state.text.replace(/\s+/g, " ")}`);
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

test("Navbar and FAQ hiding initials sit on conditionally mounted nodes", () => {
  for (const key of ["layout/Navbar.tsx", "consulting/FAQ.tsx"]) {
    const source = readSource(`src/components/${key}`);
    const hiding = collectInitialStates(source).filter((state) => hidingHits(state.text).length > 0);

    assert.ok(hiding.length > 0, `${key} should still have a detectable hiding initial`);
    for (const state of hiding) {
      assert.ok(
        isInsideConditionalMount(source, state.index),
        `${key} hiding initial is not behind \`{cond && (}\`. Only that parenthesized form is exempt; add parens or drop the hiding initial:\n  ${state.text}`
      );
    }
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
  assert.match(source, /<section\s+id="proof-of-work"/);
  assert.match(source, /--score-bar-width/);
  assert.match(source, /className=\{`score-bar/);
  assert.match(source, /"--score-bar-width":\s*`\$\{score\.value\}%`/);
  assert.match(source, /<CountUp\s+end=\{overallScore\}/);
  assert.match(source, /<CountUp\s+end=\{score\.value\}/);
  assert.doesNotMatch(source, /\bwidth\s*:\s*0/);
});

test("score bar growth is CSS, ends at the declared width, and respects reduced motion", () => {
  const source = readSource("src/app/globals.css");

  // `both` fills backwards so the bar does not flash at full width before the
  // animation starts. The declared width is what it rests at after.
  assert.match(source, /\.score-bar\s*\{[^}]*width:\s*var\(--score-bar-width\)/);
  assert.match(source, /animation:\s*score-bar-grow[^;]*both/);
  assert.match(source, /@keyframes\s*score-bar-grow[\s\S]*from\s*\{\s*width:\s*0%/);
  assert.match(source, /@keyframes\s*score-bar-grow[\s\S]*to\s*\{\s*width:\s*var\(--score-bar-width\)/);

  const namedTimeline = source.match(
    /#proof-of-work\s*\{[^}]*view-timeline-name:\s*(--[A-Za-z0-9-]+)/
  );
  assert.ok(namedTimeline, "#proof-of-work must declare a named view timeline");

  const supportsBody = source.match(
    /@supports\s*\(animation-timeline:\s*view\(\)\)\s*\{\s*\.score-bar\s*\{([^}]*)\}/
  );
  assert.ok(supportsBody, "@supports (animation-timeline: view()) must retarget .score-bar");
  const consumedTimeline = supportsBody[1].match(/animation-timeline:\s*(--[A-Za-z0-9-]+)/);
  assert.ok(consumedTimeline, ".score-bar must consume a named timeline");
  assert.equal(
    consumedTimeline[1],
    namedTimeline[1],
    "the bar must consume the same timeline the section names"
  );
  assert.match(supportsBody[1], /animation-range:\s*entry\s+0%\s+cover\s+40%/);
  assert.match(supportsBody[1], /animation-duration:\s*auto/);

  assert.match(
    source,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.score-bar\s*\{\s*animation:\s*none;\s*animation-timeline:\s*auto/
  );
});

test("CountUp renders its final value on the server", () => {
  const source = readSource("src/components/shared/CountUp.tsx");

  // useState(0) is what made every score render as a literal "0" without JS.
  assert.doesNotMatch(source, /useState\(0\)/);
  assert.match(source, /useState\(end\)/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /if\s*\(!armed\)/);
  assert.match(source, /setCount\(0\)/);
  assert.match(source, /rootMargin:\s*"0px 0px 10% 0px"/);
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
