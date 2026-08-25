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

const ZERO_LITERAL = String.raw`(?:0(?:\.0+)?(?![.\d])|["'\`]0(?:px|%|rem|em)?["'\`])`;

const HIDING_VALUE = String.raw`(?:${ZERO_LITERAL}|[^,{}]{0,120}\?\s*${ZERO_LITERAL}|[^,{}]{0,120}:\s*${ZERO_LITERAL})`;

const HIDING_PROPS = [
  { name: "opacity", pattern: new RegExp(String.raw`\bopacity\s*:\s*${HIDING_VALUE}`) },
  { name: "width", pattern: new RegExp(String.raw`\bwidth\s*:\s*${HIDING_VALUE}`) },
  { name: "height", pattern: new RegExp(String.raw`\bheight\s*:\s*${HIDING_VALUE}`) },
  { name: "scale", pattern: new RegExp(String.raw`\bscale[XY]?\s*:\s*${HIDING_VALUE}`) },
  { name: "visibility", pattern: /\bvisibility\s*:\s*["']hidden["']/ },
];

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsxFiles(full);
    return entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

function skipWs(source: string, index: number): number {
  let i = index;
  while (i < source.length && /\s/.test(source[i] ?? "")) i += 1;
  return i;
}

/** Index just past a `'`, `"`, or `` ` ``-quoted span starting at `index`. */
function skipQuoted(source: string, index: number): number {
  const quote = source[index];
  let i = index + 1;
  while (i < source.length && source[i] !== quote) {
    i += source[i] === "\\" ? 2 : 1;
  }
  return i < source.length ? i + 1 : i;
}

/** Index of the opening quote for the quoted span whose closer is `closeIndex`. */
function skipQuotedBack(source: string, closeIndex: number): number {
  const quote = source[closeIndex];
  let i = closeIndex - 1;
  while (i >= 0) {
    if (source[i] === quote) {
      let slashes = 0;
      let j = i - 1;
      while (j >= 0 && source[j] === "\\") {
        slashes += 1;
        j -= 1;
      }
      if (slashes % 2 === 0) return i;
    }
    i -= 1;
  }
  return 0;
}

/** Expression immediately before `&&` or `?`, starting after the nearest `{`. */
function readExpressionBefore(source: string, opIndex: number): string {
  let end = opIndex;
  while (end > 0 && /\s/.test(source[end - 1] ?? "")) end -= 1;

  let i = end - 1;
  let paren = 0;
  let brace = 0;
  let bracket = 0;

  while (i >= 0) {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      i = skipQuotedBack(source, i) - 1;
      continue;
    }
    if (ch === ")") paren += 1;
    else if (ch === "]") bracket += 1;
    else if (ch === "}") brace += 1;
    else if (ch === "(") {
      if (paren === 0) break;
      paren -= 1;
    } else if (ch === "[") {
      if (bracket === 0) break;
      bracket -= 1;
    } else if (ch === "{") {
      if (brace === 0 && paren === 0 && bracket === 0) {
        return source.slice(i + 1, end).trim();
      }
      brace -= 1;
    }
    i -= 1;
  }

  return source.slice(Math.max(0, i + 1), end).trim();
}

function conditionLooksLikeSsrCollection(condition: string): boolean {
  return /\.length\b|\.size\b|Object\.keys\s*\(|Array\.isArray\s*\(/.test(condition);
}

/** Returns the balanced `open...close` slice starting at `openIndex`. */
function readBalanced(source: string, openIndex: number, open: string, close: string): string {
  let depth = 0;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === "'" || char === '"' || char === "`") {
      i = skipQuoted(source, i) - 1;
      continue;
    }
    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }

  throw new Error(`unbalanced ${open}...${close} starting at index ${openIndex}`);
}

/** Index of the next `:` not nested in `()`, `{}`, `[]`, or quotes. */
function findTopLevelColon(source: string, start: number): number {
  let paren = 0;
  let brace = 0;
  let bracket = 0;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      i = skipQuoted(source, i) - 1;
      continue;
    }
    if (ch === "(") paren += 1;
    else if (ch === ")") paren -= 1;
    else if (ch === "{") brace += 1;
    else if (ch === "}") brace -= 1;
    else if (ch === "[") bracket += 1;
    else if (ch === "]") bracket -= 1;
    else if (ch === ":" && paren === 0 && brace === 0 && bracket === 0) return i;
    else if (ch === ";" && paren === 0 && brace === 0 && bracket === 0) return -1;
  }

  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Slice of one JSX element starting at `<`, including a matching close tag
 * or a self-closing `/>`. Attribute expressions `{...}` are skipped so nested
 * braces do not look like tag delimiters.
 */
function readJsxElement(source: string, ltIndex: number): string {
  if (source[ltIndex] !== "<") {
    throw new Error(`expected JSX '<' at index ${ltIndex}`);
  }
  if (source.startsWith("</", ltIndex)) {
    throw new Error(`expected opening JSX tag at index ${ltIndex}`);
  }

  const isFragment = source.startsWith("<>", ltIndex);
  const nameMatch = isFragment ? null : /^[A-Za-z][\w.-]*/.exec(source.slice(ltIndex + 1));
  if (!isFragment && !nameMatch) {
    throw new Error(`expected JSX tag name at index ${ltIndex}`);
  }

  const tagName = isFragment ? "" : nameMatch![0];
  let i = ltIndex + (isFragment ? 2 : 1 + tagName.length);

  const skipExpr = () => {
    const expr = readBalanced(source, i, "{", "}");
    i += expr.length;
  };

  if (!isFragment) {
    while (i < source.length) {
      const ch = source[i];
      if (ch === "{") {
        skipExpr();
        continue;
      }
      if (ch === "'" || ch === '"' || ch === "`") {
        i = skipQuoted(source, i);
        continue;
      }
      if (source.startsWith("/>", i)) {
        return source.slice(ltIndex, i + 2);
      }
      if (ch === ">") {
        i += 1;
        break;
      }
      i += 1;
    }
  }

  const close = isFragment ? "</>" : `</${tagName}>`;
  const nestedOpen = isFragment ? "<>" : `<${tagName}`;
  let depth = 1;

  while (i < source.length && depth > 0) {
    if (source[i] === "{") {
      skipExpr();
      continue;
    }
    if (source.startsWith(close, i)) {
      depth -= 1;
      if (depth === 0) return source.slice(ltIndex, i + close.length);
      i += close.length;
      continue;
    }
    if (isFragment) {
      if (source.startsWith("<>", i)) {
        depth += 1;
        i += 2;
        continue;
      }
    } else if (
      source.startsWith(nestedOpen, i) &&
      /[\s>/]/.test(source[i + nestedOpen.length] ?? "")
    ) {
      depth += 1;
      i += nestedOpen.length;
      continue;
    }
    i += 1;
  }

  throw new Error(`unclosed JSX <${tagName || ""}> starting at index ${ltIndex}`);
}

interface InitialState {
  text: string;
  index: number;
}

const NON_VARIANT_INITIAL = new Set(["false", "true", "null", "undefined"]);

function collectInitialVariantNames(source: string): Set<string> {
  const names = new Set<string>();

  for (const match of source.matchAll(/initial\s*=\s*(["'`])(\w+)\1/g)) {
    names.add(match[2]);
  }
  for (const match of source.matchAll(/initial\s*=\s*\{\s*(["'`])(\w+)\1\s*\}/g)) {
    names.add(match[2]);
  }
  // `initial={start}` names the variants key `start`. Skip `false`/`true` so
  // `<AnimatePresence initial={false}>` does not search for `false: {`.
  for (const match of source.matchAll(/initial\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/g)) {
    if (!NON_VARIANT_INITIAL.has(match[1])) names.add(match[1]);
  }

  return names;
}

/**
 * Every initial state a motion element can resolve during SSR: an inline
 * `initial={{ ... }}` object (whitespace-tolerant), and named variant
 * objects referenced by `initial="name"` / `initial={"name"}`.
 */
function collectInitialStates(source: string): InitialState[] {
  const states: InitialState[] = [];

  for (const match of source.matchAll(/initial\s*=\s*\{/g)) {
    const exprBrace = match.index + match[0].lastIndexOf("{");
    const inner = skipWs(source, exprBrace + 1);
    if (source[inner] !== "{") continue;
    states.push({
      text: readBalanced(source, exprBrace, "{", "}"),
      index: match.index,
    });
  }

  for (const name of collectInitialVariantNames(source)) {
    const pattern = new RegExp(String.raw`\b${escapeRegExp(name)}\s*:\s*\{`, "g");
    for (const match of source.matchAll(pattern)) {
      const braceIndex = source.indexOf("{", match.index);
      states.push({
        text: readBalanced(source, braceIndex, "{", "}"),
        index: match.index,
      });
    }
  }

  return states;
}

function collectConditionalRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  const pushJsxOrGroup = (start: number): number => {
    if (source[start] === "(") {
      const group = readBalanced(source, start, "(", ")");
      ranges.push([start, start + group.length]);
      return start + group.length;
    }
    if (source[start] === "<") {
      const jsx = readJsxElement(source, start);
      ranges.push([start, start + jsx.length]);
      return start + jsx.length;
    }
    return start + 1;
  };

  let searchFrom = 0;
  while (searchFrom < source.length) {
    const and = source.indexOf("&&", searchFrom);
    if (and === -1) break;
    const next = skipWs(source, and + 2);
    if (source[next] === "(" || source[next] === "<") {
      searchFrom = pushJsxOrGroup(next);
    } else {
      searchFrom = and + 2;
    }
  }

  searchFrom = 0;
  while (searchFrom < source.length) {
    const q = source.indexOf("?", searchFrom);
    if (q === -1) break;
    const prev = source[q - 1];
    const nextChar = source[q + 1];
    if (prev === "?" || nextChar === "?" || nextChar === "." || nextChar === ":") {
      searchFrom = q + 1;
      continue;
    }
    const trueStart = skipWs(source, q + 1);
    let afterTrue: number;
    if (source[trueStart] === "(" || source[trueStart] === "<") {
      afterTrue = pushJsxOrGroup(trueStart);
    } else {
      const colonAt = findTopLevelColon(source, trueStart);
      if (colonAt === -1) {
        searchFrom = q + 1;
        continue;
      }
      afterTrue = colonAt;
    }
    const colon = skipWs(source, afterTrue);
    if (source[colon] === ":") {
      const falseStart = skipWs(source, colon + 1);
      if (source[falseStart] === "(" || source[falseStart] === "<") {
        searchFrom = pushJsxOrGroup(falseStart);
        continue;
      }
    }
    searchFrom = afterTrue;
  }

  return ranges;
}

/**
 * True when `index` sits inside a conditionally mounted JSX region:
 * `{cond && ( ... )}`, `{cond && <jsx />}`, or either branch of a ternary
 * that starts with `(` or `<`.
 */
function isInsideConditionalMount(source: string, index: number): boolean {
  return collectConditionalRanges(source).some(([start, end]) => index >= start && index < end);
}

function collectAnimatePresenceRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const open = "<AnimatePresence";
  const close = "</AnimatePresence>";
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const start = source.indexOf(open, searchFrom);
    if (start === -1) break;
    const afterName = start + open.length;
    if (source[afterName] && !/[\s>/]/.test(source[afterName])) {
      searchFrom = afterName;
      continue;
    }

    let i = afterName;
    let selfClosing = false;
    while (i < source.length) {
      if (source[i] === "{") {
        const expr = readBalanced(source, i, "{", "}");
        i += expr.length;
        continue;
      }
      if (source[i] === "'" || source[i] === '"' || source[i] === "`") {
        i = skipQuoted(source, i);
        continue;
      }
      if (source.startsWith("/>", i)) {
        selfClosing = true;
        i += 2;
        break;
      }
      if (source[i] === ">") {
        i += 1;
        break;
      }
      i += 1;
    }

    if (selfClosing) {
      searchFrom = i;
      continue;
    }

    let depth = 1;
    let cursor = i;
    while (cursor < source.length && depth > 0) {
      const nextOpen = source.indexOf(open, cursor);
      const nextClose = source.indexOf(close, cursor);
      if (nextClose === -1) {
        throw new Error(`unclosed AnimatePresence starting at index ${start}`);
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        const afterNested = nextOpen + open.length;
        if (!source[afterNested] || /[\s>/]/.test(source[afterNested])) {
          depth += 1;
          cursor = afterNested;
          continue;
        }
        cursor = afterNested;
        continue;
      }
      depth -= 1;
      cursor = nextClose + close.length;
    }

    ranges.push([start, cursor]);
    searchFrom = start + open.length;
  }

  return ranges;
}

function isInsideAnimatePresence(source: string, index: number): boolean {
  return collectAnimatePresenceRanges(source).some(([start, end]) => index >= start && index < end);
}

/**
 * Hiding initials are ignored only when they sit in a conditional mount
 * *and* under AnimatePresence (the Navbar/FAQ shape), and the condition is
 * not a collection/length check that can be true during SSR.
 */
function isExemptHidingInitial(source: string, index: number): boolean {
  if (!isInsideAnimatePresence(source, index)) return false;
  const range = collectConditionalRanges(source).find(
    (candidate) => index >= candidate.start && index < candidate.end
  );
  if (!range) return false;
  if (conditionLooksLikeSsrCollection(range.condition)) return false;
  return true;
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
    hits.some((state) => {
      const props = hidingHits(state.text);
      return props.includes("opacity") && props.includes("height");
    }),
    "scanner no longer sees Navbar's hiding initial; the per-node helper is now a blind skip"
  );
});

test("conditionally mounted hiding initials are ignored; always-rendered ones are not", () => {
  const source = `
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} />
      {mobileMenuOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} />
      )}
    </AnimatePresence>
  `;
  const states = collectInitialStates(source);
  assert.equal(states.length, 2);

  const always = states.find((state) => !/height/.test(state.text));
  const conditional = states.find((state) => /height/.test(state.text));
  assert.ok(always && conditional);
  assert.equal(isInsideConditionalMount(source, always.index), false);
  assert.equal(isInsideConditionalMount(source, conditional.index), true);
  assert.equal(isExemptHidingInitial(source, always.index), false);
  assert.equal(isExemptHidingInitial(source, conditional.index), true);
});

test("parenthesized && without AnimatePresence is not exempt", () => {
  const source = `
    {items.length && (
      <motion.div initial={{ opacity: 0 }} />
    )}
  `;
  const states = collectInitialStates(source);
  assert.equal(states.length, 1);
  assert.equal(isInsideConditionalMount(source, states[0].index), true);
  assert.equal(isInsideAnimatePresence(source, states[0].index), false);
  assert.equal(isExemptHidingInitial(source, states[0].index), false);
});

test("unparenthesized && JSX and ternaries are conditional mounts", () => {
  const unparen = `
    {mobileMenuOpen && <motion.div initial={{ opacity: 0 }} />}
  `;
  const unparenStates = collectInitialStates(unparen);
  assert.equal(unparenStates.length, 1);
  assert.equal(isInsideConditionalMount(unparen, unparenStates[0].index), true);
  assert.equal(isExemptHidingInitial(unparen, unparenStates[0].index), false);

  const ternary = `
    {isOpen ? (
      <motion.div initial={{ opacity: 0 }} />
    ) : null}
  `;
  const ternaryStates = collectInitialStates(ternary);
  assert.equal(ternaryStates.length, 1);
  assert.equal(isInsideConditionalMount(ternary, ternaryStates[0].index), true);
  assert.equal(isExemptHidingInitial(ternary, ternaryStates[0].index), false);

  const ternaryFalse = `
    {isOpen ? null : <motion.div initial={{ opacity: 0 }} />}
  `;
  const falseStates = collectInitialStates(ternaryFalse);
  assert.equal(falseStates.length, 1);
  assert.equal(isInsideConditionalMount(ternaryFalse, falseStates[0].index), true);
});

test("unparenthesized && JSX and ternaries under AnimatePresence are exempt", () => {
  const unparen = `
    <AnimatePresence>
      {mobileMenuOpen && <motion.div initial={{ opacity: 0 }} />}
    </AnimatePresence>
  `;
  const unparenStates = collectInitialStates(unparen);
  assert.equal(unparenStates.length, 1);
  assert.equal(isExemptHidingInitial(unparen, unparenStates[0].index), true);

  const ternary = `
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div initial={{ opacity: 0 }} />
      ) : null}
    </AnimatePresence>
  `;
  const ternaryStates = collectInitialStates(ternary);
  assert.equal(ternaryStates.length, 1);
  assert.equal(isExemptHidingInitial(ternary, ternaryStates[0].index), true);

  const ternaryFalse = `
    <AnimatePresence>
      {isOpen ? null : <motion.div initial={{ opacity: 0 }} />}
    </AnimatePresence>
  `;
  const falseStates = collectInitialStates(ternaryFalse);
  assert.equal(falseStates.length, 1);
  assert.equal(isExemptHidingInitial(ternaryFalse, falseStates[0].index), true);
});

test("initial={ { ... } } with space or newline is still collected", () => {
  const space = `<motion.div initial={ { opacity: 0 } } />`;
  const newline = `<motion.div initial={\n  { opacity: 0 }\n} />`;

  assert.equal(collectInitialStates(space).length, 1);
  assert.equal(collectInitialStates(newline).length, 1);
  assert.ok(hidingHits(collectInitialStates(space)[0].text).includes("opacity"));
  assert.ok(hidingHits(collectInitialStates(newline)[0].text).includes("opacity"));
});

test("named variants referenced by initial= are collected", () => {
  const source = `
    const variants = { start: { opacity: 0 } };
    <motion.div initial="start" variants={variants} />
  `;
  const states = collectInitialStates(source);
  assert.ok(
    states.some((state) => hidingHits(state.text).includes("opacity")),
    "initial=\"start\" with start: { opacity: 0 } must be visible to the scanner"
  );

  const quoted = `
    const variants = { start: { opacity: 0 } };
    <motion.div initial={"start"} variants={variants} />
  `;
  assert.ok(collectInitialStates(quoted).some((state) => hidingHits(state.text).includes("opacity")));

  const ident = `
    const variants = { start: { opacity: 0 } };
    <motion.div initial={start} variants={variants} />
  `;
  assert.ok(
    collectInitialStates(ident).some((state) => hidingHits(state.text).includes("opacity")),
    "initial={start} must collect the start: { opacity: 0 } variant"
  );

  const presenceFalse = `
    const css = { false: { opacity: 0 } };
    <AnimatePresence initial={false}>
      <motion.div />
    </AnimatePresence>
  `;
  assert.equal(collectInitialStates(presenceFalse).length, 0);
});

test("a non-motion hidden object is not treated as an initial", () => {
  const source = `
    const css = { hidden: { opacity: 0 } };
    <div style={css.hidden} />
  `;
  assert.equal(collectInitialStates(source).length, 0);
});

test("opacity 0.0 and quoted zero count as hiding", () => {
  assert.ok(hidingHits("{ opacity: 0.0 }").includes("opacity"));
  assert.ok(hidingHits("{ opacity: '0' }").includes("opacity"));
  assert.ok(hidingHits('{ scale: "0" }').includes("scale"));
  assert.ok(hidingHits("{ width: 0.0 }").includes("width"));
  assert.ok(hidingHits("{ height: 0.00 }").includes("height"));
  assert.equal(hidingHits("{ opacity: 0.5 }").length, 0);
  assert.equal(hidingHits("{ scale: 0.25 }").length, 0);
});

test("braces inside strings do not truncate an initial object", () => {
  const source = `<motion.div initial={{ content: "}", opacity: 0 }} />`;
  const states = collectInitialStates(source);
  assert.equal(states.length, 1);
  assert.ok(
    hidingHits(states[0].text).includes("opacity"),
    "a quoted } before opacity: 0 must not hide the rest of the object from the scanner"
  );
});

test("no component ships an SSR initial state that hides its content", () => {
  const offenders: string[] = [];

  for (const file of listTsxFiles(COMPONENTS_DIR)) {
    const key = relative(COMPONENTS_DIR, file);
    const source = readFileSync(file, "utf8");

    for (const state of collectInitialStates(source)) {
      if (isExemptHidingInitial(source, state.index)) continue;

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

test("Navbar and FAQ hiding initials sit on conditionally mounted nodes under AnimatePresence", () => {
  for (const key of ["layout/Navbar.tsx", "consulting/FAQ.tsx"]) {
    const source = readSource(`src/components/${key}`);
    const hiding = collectInitialStates(source).filter((state) => hidingHits(state.text).length > 0);

    assert.ok(hiding.length > 0, `${key} should still have a detectable hiding initial`);
    for (const state of hiding) {
      assert.ok(
        isExemptHidingInitial(source, state.index),
        `${key} hiding initial is not behind \`{cond &&\` / ternary under AnimatePresence. ` +
          `That pair is the SSR-absent contract; add the wrapper or drop the hiding initial:\n  ${state.text}`
      );
    }
  }
});

test("CareerTimeline reveals by transform through named variants", () => {
  const source = readSource("src/components/about/CareerTimeline.tsx");

  assert.ok(!hidingHits(source).includes("opacity"));
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

  assert.equal(
    collectInitialStates(source).length,
    0,
    "ProofOfWork must not use a motion initial; bar width lives in markup"
  );
  assert.match(source, /<section\s+id="proof-of-work"/);
  assert.match(source, /--score-bar-width/);
  assert.match(source, /className=\{`score-bar/);
  assert.match(source, /"--score-bar-width":\s*`\$\{score\.value\}%`/);
  assert.match(source, /<CountUp\s+end=\{overallScore\}/);
  assert.match(source, /<CountUp\s+end=\{score\.value\}/);
  assert.ok(!hidingHits(source).includes("width"));
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
