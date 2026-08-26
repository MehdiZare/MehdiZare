import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// Framer Motion inlines the resolved `initial` state as a `style` attribute
// during SSR. Any initial state that zeroes out opacity, size, or scale is
// therefore shipped in the HTML, and the content stays hidden until hydration
// runs. PR #28 removed that pattern from the homepage; these contracts keep it
// out of the pages #28 did not cover.

const COMPONENTS_DIR = resolve(process.cwd(), "src/components");
const SRC_ROOT = resolve(process.cwd(), "src");

interface ScanContext {
  filePath?: string;
}

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

function collectStringNames(text: string): string[] {
  return [...text.matchAll(/(["'`])(\w+)\1/g)].map((match) => match[2]);
}

function collectInitialVariantNames(source: string): Set<string> {
  const names = new Set<string>();

  for (const match of source.matchAll(/initial\s*=\s*(["'`])(\w+)\1/g)) {
    names.add(match[2]);
  }

  for (const match of source.matchAll(/initial\s*=\s*\{/g)) {
    const exprBrace = match.index + match[0].lastIndexOf("{");
    const inner = skipWs(source, exprBrace + 1);
    // Inline `initial={{ ... }}` objects can contain string values that are
    // not variant names (`content: "hidden"`). Only mine names from
    // expression forms such as `initial={reduced ? "hidden" : "visible"}`.
    if (source[inner] === "{") continue;
    const expr = readBalanced(source, exprBrace, "{", "}");
    for (const name of collectStringNames(expr)) names.add(name);
  }

  // `initial={start}` names the variants key `start`. Skip `false`/`true` so
  // `<AnimatePresence initial={false}>` does not search for `false: {`.
  for (const match of source.matchAll(/initial\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/g)) {
    if (!NON_VARIANT_INITIAL.has(match[1])) names.add(match[1]);
  }

  return names;
}

function findSameFileObjectLiteral(source: string, ident: string): string | null {
  if (!/^[A-Za-z_$][\w$]*$/.test(ident)) return null;
  const pattern = new RegExp(
    String.raw`\b(?:export\s+)?(?:const|let|var)\s+${escapeRegExp(ident)}(?:\s*:[^=;{]+)?\s*=\s*\{`
  );
  const match = pattern.exec(source);
  if (!match) return null;
  const braceIndex = source.indexOf("{", match.index + match[0].length - 1);
  return readBalanced(source, braceIndex, "{", "}");
}

function isExistingFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function resolveImportedModule(fromFile: string, spec: string): string | null {
  if (!(spec.startsWith(".") || spec.startsWith("@/"))) return null;
  const base = spec.startsWith("@/")
    ? join(SRC_ROOT, spec.slice(2))
    : resolve(dirname(fromFile), spec);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (isExistingFile(candidate)) return candidate;
  }
  return null;
}

function findImportBinding(
  source: string,
  ident: string
): { spec: string; exportedName: string } | null {
  for (const match of source.matchAll(
    /(?:^|\n)\s*import\s+(type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s+from\s+(['"])([^'"]+)\3/g
  )) {
    if (match[1]) continue;
    const spec = match[4];
    for (const raw of match[2].split(",")) {
      const part = raw.trim();
      if (!part || part.startsWith("type ")) continue;
      const aliased = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(part);
      if (aliased && aliased[2] === ident) return { spec, exportedName: aliased[1] };
      if (part === ident) return { spec, exportedName: ident };
    }
  }

  const defaultImport = new RegExp(
    String.raw`(?:^|\n)\s*import\s+(?!type\s)${escapeRegExp(ident)}\s+from\s+(['"])([^'"]+)\1`
  ).exec(source);
  if (defaultImport) return { spec: defaultImport[2], exportedName: "default" };

  return null;
}

function findDefaultExportObjectLiteral(source: string): string | null {
  const literal = /export\s+default\s+\{/.exec(source);
  if (literal) {
    const braceIndex = source.indexOf("{", literal.index);
    return readBalanced(source, braceIndex, "{", "}");
  }
  const ident = /export\s+default\s+([A-Za-z_$][\w$]*)/.exec(source);
  if (!ident) return null;
  return findSameFileObjectLiteral(source, ident[1]);
}

function findImportedObjectLiteral(
  source: string,
  ident: string,
  fromFile: string
): string | null {
  const binding = findImportBinding(source, ident);
  if (!binding) return null;
  const modulePath = resolveImportedModule(fromFile, binding.spec);
  if (!modulePath) return null;
  const imported = readFileSync(modulePath, "utf8");
  if (binding.exportedName === "default") return findDefaultExportObjectLiteral(imported);
  return findSameFileObjectLiteral(imported, binding.exportedName);
}

function resolveVariantsObject(
  source: string,
  ident: string,
  ctx?: ScanContext
): string | null {
  const local = findSameFileObjectLiteral(source, ident);
  if (local) return local;
  if (!ctx?.filePath) return null;
  return findImportedObjectLiteral(source, ident, ctx.filePath);
}

function collectNamedVariantObjects(source: string, name: string): InitialState[] {
  const states: InitialState[] = [];
  const identKey = new RegExp(String.raw`\b${escapeRegExp(name)}\s*:\s*\{`, "g");
  const computedKey = new RegExp(
    String.raw`\[\s*(["'\`])${escapeRegExp(name)}\1\s*\]\s*:\s*\{`,
    "g"
  );

  for (const pattern of [identKey, computedKey]) {
    for (const match of source.matchAll(pattern)) {
      const braceIndex = source.indexOf("{", match.index + match[0].length - 1);
      states.push({
        text: readBalanced(source, braceIndex, "{", "}"),
        index: match.index,
      });
    }
  }

  return states;
}

/**
 * Index of the `<` that opens the JSX tag containing `attrIndex`.
 * `-1` if this `variants=` is not on a tag (`const variants = {` at module scope).
 */
function findJsxTagStart(source: string, attrIndex: number): number {
  let i = attrIndex - 1;
  let brace = 0;

  while (i >= 0) {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      i = skipQuotedBack(source, i) - 1;
      continue;
    }
    if (ch === "}") brace += 1;
    else if (ch === "{") {
      if (brace > 0) brace -= 1;
    } else if (ch === "<" && brace === 0 && !source.startsWith("</", i)) {
      return i;
    }
    i -= 1;
  }

  return -1;
}

function findOpeningTagEnd(source: string, ltIndex: number): number {
  let i = ltIndex + 1;
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
    if (source.startsWith("/>", i)) return i + 2;
    if (source[i] === ">") return i + 1;
    i += 1;
  }
  return source.length;
}

const VARIANT_EXPR_KEYWORDS = new Set([
  "as",
  "satisfies",
  "typeof",
  "new",
  "void",
  "await",
  "const",
  "let",
  "var",
]);

function collectIdentNamesFromExpr(expr: string): string[] {
  const names: string[] = [];
  const tokens = [...expr.matchAll(/[A-Za-z_$][\w$]*/g)];
  for (let i = 0; i < tokens.length; i += 1) {
    const name = tokens[i][0];
    if (NON_VARIANT_INITIAL.has(name) || VARIANT_EXPR_KEYWORDS.has(name)) continue;
    const prev = i > 0 ? tokens[i - 1][0] : "";
    if (prev === "as" || prev === "satisfies") continue;
    names.push(name);
  }
  return names;
}

interface VariantsBinding {
  objectText: string;
  elementStart: number;
  openingTagEnd: number;
}

/**
 * Every `variants={ident}` / `variants={{ ... }}` object in the file, tied to
 * the JSX element that carries the attribute.
 */
function collectVariantsBindings(
  source: string,
  ctx?: ScanContext
): { bindings: VariantsBinding[]; unresolved: string[] } {
  const bindings: VariantsBinding[] = [];
  const unresolved: string[] = [];

  for (const match of source.matchAll(/variants\s*=\s*\{/g)) {
    const exprBrace = match.index + match[0].lastIndexOf("{");
    const inner = skipWs(source, exprBrace + 1);
    const objectTexts: string[] = [];

    if (source[inner] === "{") {
      objectTexts.push(readBalanced(source, exprBrace, "{", "}"));
    } else {
      const expr = readBalanced(source, exprBrace, "{", "}");
      for (const ident of collectIdentNamesFromExpr(expr)) {
        const obj = resolveVariantsObject(source, ident, ctx);
        if (obj) objectTexts.push(obj);
        else unresolved.push(ident);
      }
    }

    const elementStart = findJsxTagStart(source, match.index);
    if (elementStart < 0) continue;
    const openingTagEnd = findOpeningTagEnd(source, elementStart);

    for (const objectText of objectTexts) {
      bindings.push({ objectText, elementStart, openingTagEnd });
    }
  }

  return { bindings, unresolved };
}

/** File index of `initial=` on this opening tag that names `name`, if any. */
function findInitialUsageIndexInTag(
  source: string,
  ltIndex: number,
  openingTagEnd: number,
  name: string
): number | null {
  const tag = source.slice(ltIndex, openingTagEnd);

  for (const match of tag.matchAll(/initial\s*=\s*(["'`])(\w+)\1/g)) {
    if (match[2] === name && match.index !== undefined) return ltIndex + match.index;
  }

  for (const match of tag.matchAll(/initial\s*=\s*\{/g)) {
    if (match.index === undefined) continue;
    const exprBrace = match.index + match[0].lastIndexOf("{");
    const absBrace = ltIndex + exprBrace;
    const inner = skipWs(source, absBrace + 1);
    if (source[inner] === "{") continue;
    const expr = readBalanced(source, absBrace, "{", "}");
    if (collectStringNames(expr).includes(name)) return ltIndex + match.index;
    const identMatch = /^\{\s*([A-Za-z_$][\w$]*)\s*\}$/.exec(expr);
    if (identMatch && identMatch[1] === name && !NON_VARIANT_INITIAL.has(name)) {
      return ltIndex + match.index;
    }
  }

  return null;
}

/**
 * Every initial state a motion element can resolve during SSR: an inline
 * `initial={{ ... }}` object, a same-file `initial={ident}` object, and
 * named variant objects from a `variants=` binding referenced by
 * `initial="name"`, `initial={"name"}`, `initial={ident}`, or a string
 * literal in that expression. Exemption is keyed at the `initial=` usage
 * when that tag names the variant; otherwise at the `variants=` element
 * (stagger children have no `initial=` of their own).
 */
function collectInitialStates(source: string, ctx?: ScanContext): InitialState[] {
  const states: InitialState[] = [];

  for (const match of source.matchAll(/initial\s*=\s*\{/g)) {
    const exprBrace = match.index + match[0].lastIndexOf("{");
    const inner = skipWs(source, exprBrace + 1);
    if (source[inner] === "{") {
      states.push({
        text: readBalanced(source, exprBrace, "{", "}"),
        index: match.index,
      });
      continue;
    }
    const identMatch = /^[A-Za-z_$][\w$]*/.exec(source.slice(inner));
    if (!identMatch || NON_VARIANT_INITIAL.has(identMatch[0])) continue;
    const obj = findSameFileObjectLiteral(source, identMatch[0]);
    if (obj) {
      states.push({ text: obj, index: match.index });
    }
  }

  const names = collectInitialVariantNames(source);
  const { bindings } = collectVariantsBindings(source, ctx);
  for (const name of names) {
    for (const binding of bindings) {
      const objects = collectNamedVariantObjects(binding.objectText, name);
      if (objects.length === 0) continue;
      const usageIndex = findInitialUsageIndexInTag(
        source,
        binding.elementStart,
        binding.openingTagEnd,
        name
      );
      const index = usageIndex ?? binding.elementStart;
      for (const obj of objects) {
        states.push({ text: obj.text, index });
      }
    }
  }

  return states;
}

interface ConditionalRange {
  start: number;
  end: number;
  condition: string;
}

function collectConditionalRanges(source: string): ConditionalRange[] {
  const ranges: ConditionalRange[] = [];

  const pushJsxOrGroup = (start: number, condition: string): number => {
    if (source[start] === "(") {
      const group = readBalanced(source, start, "(", ")");
      ranges.push({ start, end: start + group.length, condition });
      return start + group.length;
    }
    if (source[start] === "<") {
      const jsx = readJsxElement(source, start);
      ranges.push({ start, end: start + jsx.length, condition });
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
      searchFrom = pushJsxOrGroup(next, readExpressionBefore(source, and));
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
    const condition = readExpressionBefore(source, q);
    const trueStart = skipWs(source, q + 1);
    let afterTrue: number;
    if (source[trueStart] === "(" || source[trueStart] === "<") {
      afterTrue = pushJsxOrGroup(trueStart, condition);
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
        searchFrom = pushJsxOrGroup(falseStart, condition);
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
  return collectConditionalRanges(source).some(
    (range) => index >= range.start && index < range.end
  );
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
 * and under AnimatePresence, and the condition is not a collection/length
 * check that can be true during SSR.
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

function hidingOpacityStates(source: string, ctx?: ScanContext): InitialState[] {
  return collectInitialStates(source, ctx).filter((state) =>
    hidingHits(state.text).includes("opacity")
  );
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

test("initial={ident} resolves a same-file object literal", () => {
  const source = `
    const hidden = { opacity: 0 };
    <motion.div initial={hidden} />
  `;
  assert.ok(
    collectInitialStates(source).some((state) => hidingHits(state.text).includes("opacity")),
    "const hidden = { opacity: 0 } plus initial={hidden} must be visible"
  );
});

test("ternary initial= collects string variant names", () => {
  const source = `
    const variants = { hidden: { opacity: 0 }, visible: { y: 0 } };
    <motion.div initial={reduced ? "hidden" : "visible"} variants={variants} />
  `;
  assert.ok(
    collectInitialStates(source).some((state) => hidingHits(state.text).includes("opacity")),
    "initial={reduced ? \"hidden\" : \"visible\"} must collect hidden: { opacity: 0 }"
  );
});

test("computed variant keys matching initial= are collected", () => {
  const source = `
    const variants = { ["hidden"]: { opacity: 0 } };
    <motion.div initial="hidden" variants={variants} />
  `;
  assert.ok(
    collectInitialStates(source).some((state) => hidingHits(state.text).includes("opacity")),
    '["hidden"]: { opacity: 0 } must be visible when initial="hidden"'
  );
});

test("module-scope named variants key exemption off initial= usage, not the definition", () => {
  const source = `
    const variants = { hidden: { opacity: 0 } };
    <AnimatePresence>
      {open && (
        <motion.div initial="hidden" variants={variants} />
      )}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(
    isExemptHidingInitial(source, hiding[0].index),
    true,
    "the definition is module-scope; the initial=\"hidden\" usage is the conditional mount"
  );
});

test("a leftover CSS hidden map is not collected when initial= references a variants= object", () => {
  const source = `
    const css = { hidden: { opacity: 0 } };
    const variants = { hidden: { opacity: 0 } };
    <AnimatePresence>
      {open && (
        <motion.div initial="hidden" variants={variants} />
      )}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(
    hiding.length,
    1,
    "style-map hidden: { opacity: 0 } must not be treated as a motion initial"
  );
  assert.equal(isExemptHidingInitial(source, hiding[0].index), true);
});

test("always-rendered and conditional initial= usages are keyed separately", () => {
  const source = `
    const variants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={variants} />
    <AnimatePresence>
      {open && <motion.div initial="hidden" variants={variants} />}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  const exempt = hiding.filter((state) => isExemptHidingInitial(source, state.index));
  const offenders = hiding.filter((state) => !isExemptHidingInitial(source, state.index));
  assert.equal(offenders.length, 1, "the always-rendered initial=\"hidden\" stays an offender");
  assert.equal(exempt.length, 1, "the conditional usage must not inherit the definition index");
});

test("variants={cardVariants} is collected, not only const variants =", () => {
  const source = `
    const cardVariants = { hidden: { opacity: 0 } };
    <AnimatePresence>
      {open && (
        <motion.div initial="hidden" variants={cardVariants} />
      )}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(isExemptHidingInitial(source, hiding[0].index), true);
});

test("typed const variants objects are still collected", () => {
  const source = `
    const cardVariants: Variants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(
    hiding.length,
    1,
    "const cardVariants: Variants = { hidden: { opacity: 0 } } must resolve through variants={cardVariants}"
  );
  assert.equal(isExemptHidingInitial(source, hiding[0].index), false);
});

test("spread hidden keys on const ident = { are collected", () => {
  const source = `
    const cardVariants = { ...base, hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1, "hidden: { opacity: 0 } inside a spread object must be collected");
  assert.equal(isExemptHidingInitial(source, hiding[0].index), false);
});

test("imported named variants objects are collected", () => {
  const file = resolve(process.cwd(), "tests/fixtures/motion-scanner/uses-import.tsx");
  const source = readFileSync(file, "utf8");
  const ctx = { filePath: file };
  const hiding = hidingOpacityStates(source, ctx);
  assert.equal(hiding.length, 1, "import { cardVariants } from ./motion must resolve the object");
  assert.equal(isExemptHidingInitial(source, hiding[0].index), false);
  assert.deepEqual(collectVariantsBindings(source, ctx).unresolved, []);
});

test("imported default variants objects are collected", () => {
  const file = resolve(process.cwd(), "tests/fixtures/motion-scanner/uses-default-import.tsx");
  const source = readFileSync(file, "utf8");
  const ctx = { filePath: file };
  const hiding = hidingOpacityStates(source, ctx);
  assert.equal(hiding.length, 1, "import cardVariants from ./motion must resolve export default");
  assert.equal(isExemptHidingInitial(source, hiding[0].index), false);
});

test("factory variants={ident} fail closed when the object is not a literal", () => {
  const source = `
    const cardVariants = createVariants({ hidden: { opacity: 0 } });
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.deepEqual(collectVariantsBindings(source).unresolved, ["cardVariants"]);
  assert.equal(
    hidingOpacityStates(source).length,
    0,
    "createVariants({ hidden }) is not inlined; fail closed instead of collecting"
  );
});

test("variants={ident as Type} still resolves ident and skips the type name", () => {
  const source = `
    const cardVariants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={cardVariants as Variants} />
  `;
  assert.deepEqual(collectVariantsBindings(source).unresolved, []);
  assert.equal(hidingOpacityStates(source).length, 1);
});

test("always-rendered named hiding variants stay offenders", () => {
  const source = `
    const cardVariants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(isExemptHidingInitial(source, hiding[0].index), false);
});

test("stagger children inherit named-variant collection from a parent initial=", () => {
  const source = `
    const containerVariants = { hidden: {} };
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="hidden">
      <AnimatePresence>
        {open && <motion.div variants={childVariants} />}
      </AnimatePresence>
    </motion.div>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(
    isExemptHidingInitial(source, hiding[0].index),
    true,
    "childVariants.hidden is used via parent initial=\"hidden\"; exemption keys off the child element"
  );
});

test("always-rendered stagger children with hiding named variants stay offenders", () => {
  const source = `
    const containerVariants = { hidden: {} };
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="hidden">
      <motion.div variants={childVariants} />
    </motion.div>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(
    isExemptHidingInitial(source, hiding[0].index),
    false,
    "Hero/ClientLogos-style children have no initial=; collection keys off the child tag, which is always rendered"
  );
});

test("inline variants={{}} hiding objects follow the element's initial= usage", () => {
  const source = `
    <AnimatePresence>
      {open && <motion.div initial="hidden" variants={{ hidden: { opacity: 0 } }} />}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(isExemptHidingInitial(source, hiding[0].index), true);
});

test("variants={ { ... } } with space or newline is still collected", () => {
  const space = `<motion.div initial="hidden" variants={ { hidden: { opacity: 0 } } } />`;
  const newline = `<motion.div initial="hidden" variants={\n  { hidden: { opacity: 0 } }\n} />`;

  const spaceHiding = hidingOpacityStates(space);
  const newlineHiding = hidingOpacityStates(newline);
  assert.equal(spaceHiding.length, 1, "space after variants={ must still see hidden: { opacity: 0 }");
  assert.equal(newlineHiding.length, 1, "newline after variants={ must still see hidden: { opacity: 0 }");
  assert.equal(isExemptHidingInitial(space, spaceHiding[0].index), false);
  assert.equal(isExemptHidingInitial(newline, newlineHiding[0].index), false);
});

test("a hiding zero on either side of a ternary property is collected", () => {
  assert.ok(hidingHits("{ opacity: visible ? 1 : 0 }").includes("opacity"));
  assert.ok(hidingHits("{ opacity: visible ? 0 : 1 }").includes("opacity"));
  assert.equal(hidingHits("{ opacity: visible ? 1 : 1 }").length, 0);
});

test("quoted strings inside inline initial objects are not variant names", () => {
  const source = `
    const css = { hidden: { opacity: 0 } };
    <motion.div initial={{ content: "hidden", y: 24 }} />
  `;
  assert.equal(
    collectInitialStates(source).filter((state) => hidingHits(state.text).includes("opacity"))
      .length,
    0,
    'content: "hidden" must not collect a stray hidden: { opacity: 0 } object'
  );
});

test("collection .length under AnimatePresence is not exempt", () => {
  const cases = [
    "{items.length && (<motion.div initial={{ opacity: 0 }} />)}",
    "{items.length && <motion.div initial={{ opacity: 0 }} />}",
    "{items.length ? (<motion.div initial={{ opacity: 0 }} />) : null}",
    "{Object.keys(items).length && (<motion.div initial={{ opacity: 0 }} />)}",
    "{items.size && (<motion.div initial={{ opacity: 0 }} />)}",
    "{Array.isArray(items) && (<motion.div initial={{ opacity: 0 }} />)}",
  ];

  for (const mount of cases) {
    const source = `<AnimatePresence>${mount}</AnimatePresence>`;
    const states = collectInitialStates(source);
    assert.equal(states.length, 1, mount);
    assert.equal(isInsideConditionalMount(source, states[0].index), true, mount);
    assert.equal(isInsideAnimatePresence(source, states[0].index), true, mount);
    assert.equal(
      isExemptHidingInitial(source, states[0].index),
      false,
      `${mount} can be true during SSR; AnimatePresence does not hide it`
    );
  }
});

test("no component ships an SSR initial state that hides its content", () => {
  const offenders: string[] = [];

  for (const file of listTsxFiles(COMPONENTS_DIR)) {
    const key = relative(COMPONENTS_DIR, file);
    const source = readFileSync(file, "utf8");
    const ctx = { filePath: file };
    const { unresolved } = collectVariantsBindings(source, ctx);
    for (const ident of unresolved) {
      offenders.push(`${key}: unresolved variants={${ident}}`);
    }

    for (const state of collectInitialStates(source, ctx)) {
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
