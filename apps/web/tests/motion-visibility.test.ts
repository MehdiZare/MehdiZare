import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

// Framer Motion inlines the resolved `initial` state as a `style` attribute
// during SSR. Any initial state that zeroes out opacity, size, or scale is
// therefore shipped in the HTML, and the content stays hidden until hydration
// runs. PR #28 removed that pattern from the homepage; these contracts keep it
// out of the pages #28 did not cover.
//
// The scanner below is a TypeScript AST walk. JSX parentage, module resolution
// and type-only syntax (`as` / `satisfies`) are things the compiler already
// models, so the scanner asks it instead of re-deriving them from indexes.
//
// ---------------------------------------------------------------------------
// Known, accepted gaps
// ---------------------------------------------------------------------------
// This is a heuristic scanner, not a type checker, and it will never be total.
// The shapes below are known to be unhandled. None of them occurs anywhere in
// `src/components` today, and each one is cheap to spot in review.
//
// THE RULE: a gap on this list becomes actionable only when a real file under
// `src/components` actually exhibits the shape. Do not open an issue, and do
// not widen the scanner, for a shape that exists only in a hypothetical. This
// file has already generated a dozen issues about itself; that is the treadmill
// this list exists to stop. When a gap does show up in a real component, fix
// the component first — the scanner second.
//
//  - `initial={IDENT}` where IDENT is a string constant (`const NAME = "hidden"`)
//    resolves to the identifier's *name*, not its value. Direction: misses a
//    hiding variant. Writing `initial="hidden"` is the idiom everywhere here.
//  - `findVariableInitializer` is scope-blind and order-dependent: it takes the
//    first declaration of a name in file order and ignores shadowing. Two
//    same-named variants objects in one file resolve to the wrong one.
//  - a non-motion wrapper carrying an `initial=` prop of its own (`<Foo
//    initial="x">`) re-roots the inheritance chain even though Framer never
//    sees that prop. Direction: misses an inherited hiding variant.
//  - the old scanner's `isInsideDir` project-boundary guard is gone.
//    `ts.resolveModuleName` can follow a path mapping out of the web package.
//    It only ever *reads* files, and node_modules is still refused.
//  - `<AnimatePresence initial={false}>` genuinely suppresses the initial state
//    of its children (verified against 13.1.1); the scanner treats it as
//    transparent. Direction: false positives only, so it fails closed.

const CWD = process.cwd();
const COMPONENTS_DIR = resolve(CWD, "src/components");

/** Compiler options from the real tsconfig, so `paths` (`@/*`) resolve. */
const COMPILER_OPTIONS: ts.CompilerOptions = (() => {
  const configPath = join(CWD, "tsconfig.json");
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  return ts.parseJsonConfigFileContent(config, ts.sys, CWD).options;
})();

interface ScanContext {
  /** Absolute path of the scanned file; imports only resolve when it is set. */
  filePath?: string;
}

interface InitialState {
  /** Source text of the object literal Framer would inline during SSR. */
  text: string;
  line: number;
  /** Under `<AnimatePresence>` and behind a condition that can be false in SSR. */
  exempt: boolean;
  conditionallyMounted: boolean;
  underAnimatePresence: boolean;
}

interface MotionScan {
  states: InitialState[];
  /** Fail-closed notes pushed where resolution gave up. */
  offenders: string[];
}

type JsxTag = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

// ---------------------------------------------------------------------------
// Hiding values
// ---------------------------------------------------------------------------

/** `0`, `0.0`, `.0`, and the quoted forms with any CSS length unit. */
const ZERO_NUMBER = String.raw`(?:0(?:\.0+)?|\.0+)(?![.\d])`;

const ZERO_UNIT = String.raw`(?:px|%|rem|em|ex|ch|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cm|mm|in|pt|pc|q)`;

const ZERO_LITERAL = String.raw`(?:${ZERO_NUMBER}|["'\`]${ZERO_NUMBER}${ZERO_UNIT}?["'\`])`;

// A keyframe array animates from its first entry, and that entry is what SSR
// inlines: `initial={{ opacity: [0, 1] }}` really does ship `opacity:0`.
// Only the leading value hides; `[1, 0]` renders `opacity:1`.
const HIDING_VALUE = String.raw`(?:${ZERO_LITERAL}|\[\s*${ZERO_LITERAL}|[^,{}]{0,120}\?\s*${ZERO_LITERAL}|[^,{}]{0,120}:\s*${ZERO_LITERAL})`;

const HIDING_PROPS = [
  { name: "opacity", pattern: new RegExp(String.raw`\bopacity\s*:\s*${HIDING_VALUE}`) },
  { name: "width", pattern: new RegExp(String.raw`\bwidth\s*:\s*${HIDING_VALUE}`) },
  { name: "height", pattern: new RegExp(String.raw`\bheight\s*:\s*${HIDING_VALUE}`) },
  { name: "scale", pattern: new RegExp(String.raw`\bscale[XY]?\s*:\s*${HIDING_VALUE}`) },
  { name: "visibility", pattern: /\bvisibility\s*:\s*["']hidden["']/ },
];

/** Hiding properties named in a chunk of source text. */
function hidingHits(text: string): string[] {
  return HIDING_PROPS.filter((prop) => prop.pattern.test(text)).map((prop) => prop.name);
}

// ---------------------------------------------------------------------------
// Parsing and module resolution
// ---------------------------------------------------------------------------

const VIRTUAL_FILE = join(CWD, "__motion-scanner__.tsx");
const parsedFiles = new Map<string, ts.SourceFile>();

function parseSource(source: string, filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    filePath.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX
  );
}

function parseFile(filePath: string): ts.SourceFile {
  const cached = parsedFiles.get(filePath);
  if (cached) return cached;
  const parsed = parseSource(readFileSync(filePath, "utf8"), filePath);
  parsedFiles.set(filePath, parsed);
  return parsed;
}

/** Project-local file a specifier points at, via the real tsconfig `paths`. */
function resolveModuleFile(spec: string, containingFile: string): string | null {
  const { resolvedModule } = ts.resolveModuleName(
    spec,
    containingFile,
    COMPILER_OPTIONS,
    ts.sys
  );
  if (!resolvedModule || resolvedModule.isExternalLibraryImport) return null;
  const file = resolvedModule.resolvedFileName;
  return file.includes("/node_modules/") ? null : file;
}

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsxFiles(full);
    return entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

function readSource(relativePath: string): string {
  return readFileSync(resolve(CWD, relativePath), "utf8");
}

// ---------------------------------------------------------------------------
// Expression helpers
// ---------------------------------------------------------------------------

/** Strips the wrappers that carry no runtime value: `(x)`, `x as T`, `x satisfies T`, `x!`. */
function unwrap(expr: ts.Expression): ts.Expression {
  let current = expr;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isFalseExpression(expr: ts.Expression | undefined): boolean {
  return expr !== undefined && unwrap(expr).kind === ts.SyntaxKind.FalseKeyword;
}

/** Every `const`/`let`/`var` initializer bound to `name`, anywhere in the file. */
function findVariableInitializer(source: ts.SourceFile, name: string): ts.Expression | null {
  const matches: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      matches.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return matches[0] ?? null;
}

function asObjectLiteral(expr: ts.Expression | null): ts.ObjectLiteralExpression | null {
  if (!expr) return null;
  const target = unwrap(expr);
  return ts.isObjectLiteralExpression(target) ? target : null;
}

interface ImportBinding {
  spec: string;
  exportedName: string;
}

function findImportBinding(source: ts.SourceFile, name: string): ImportBinding | null {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const clause = statement.importClause;
    if (clause.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const spec = statement.moduleSpecifier.text;

    if (clause.name && clause.name.text === name) return { spec, exportedName: "default" };

    const bindings = clause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if (element.isTypeOnly || element.name.text !== name) continue;
      return { spec, exportedName: element.propertyName?.text ?? name };
    }
  }
  return null;
}

function findDefaultExportObject(source: ts.SourceFile): ts.ObjectLiteralExpression | null {
  for (const statement of source.statements) {
    if (!ts.isExportAssignment(statement) || statement.isExportEquals) continue;
    const target = unwrap(statement.expression);
    if (ts.isObjectLiteralExpression(target)) return target;
    if (ts.isIdentifier(target)) return asObjectLiteral(findVariableInitializer(source, target.text));
  }
  return null;
}

/**
 * The object literal `name` is bound to, following one import hop. `null` means
 * "cannot prove what this is" — callers must fail closed on it.
 */
function resolveVariantsObject(
  source: ts.SourceFile,
  name: string,
  ctx?: ScanContext
): ts.ObjectLiteralExpression | null {
  const local = findVariableInitializer(source, name);
  if (local) return asObjectLiteral(local);

  if (!ctx?.filePath) return null;
  const binding = findImportBinding(source, name);
  if (!binding) return null;
  const modulePath = resolveModuleFile(binding.spec, ctx.filePath);
  if (!modulePath) return null;

  const imported = parseFile(modulePath);
  if (binding.exportedName === "default") return findDefaultExportObject(imported);
  return asObjectLiteral(findVariableInitializer(imported, binding.exportedName));
}

// ---------------------------------------------------------------------------
// JSX helpers
// ---------------------------------------------------------------------------

function tagName(tag: JsxTag): string {
  return tag.tagName.getText(tag.getSourceFile());
}

function getAttribute(tag: JsxTag, name: string): ts.JsxAttribute | null {
  for (const property of tag.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue;
    if (ts.isIdentifier(property.name) && property.name.text === name) return property;
  }
  return null;
}

/** The attribute value as an expression. `undefined` for a bare `foo` / `foo="s"`. */
function attributeExpression(attr: ts.JsxAttribute): ts.Expression | undefined {
  const initializer = attr.initializer;
  if (!initializer) return undefined;
  if (ts.isStringLiteral(initializer)) return initializer;
  return ts.isJsxExpression(initializer) ? initializer.expression : undefined;
}

/** The JSX node whose `.parent` chain leads out of this element. */
function elementNode(tag: JsxTag): ts.Node {
  return ts.isJsxOpeningElement(tag) ? tag.parent : tag;
}

function* ancestorTags(tag: JsxTag): Generator<JsxTag> {
  let node: ts.Node | undefined = elementNode(tag).parent;
  while (node) {
    if (ts.isJsxElement(node)) yield node.openingElement;
    else if (ts.isJsxSelfClosingElement(node)) yield node;
    node = node.parent;
  }
}

function optsOutOfInherit(tag: JsxTag): boolean {
  const attr = getAttribute(tag, "inherit");
  return attr !== null && isFalseExpression(attributeExpression(attr));
}

// ---------------------------------------------------------------------------
// `initial` semantics
// ---------------------------------------------------------------------------

type InitialSpec =
  /** No `initial` prop: whatever an ancestor resolves applies. */
  | { kind: "absent" }
  /** `initial={false}`: this element renders its animate state. */
  | { kind: "off" }
  /** `initial={{ ... }}` or an identifier bound to an object literal. */
  | { kind: "object"; object: ts.ObjectLiteralExpression }
  /** `initial="hidden"`, `initial={cond ? "a" : "b"}`, `initial={name}`. */
  | { kind: "names"; names: string[] };

function stringLiteralsIn(expr: ts.Expression): string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isStringLiteralLike(node)) names.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(expr);
  return names;
}

function initialSpec(tag: JsxTag, source: ts.SourceFile): InitialSpec {
  const attr = getAttribute(tag, "initial");
  if (!attr) return { kind: "absent" };
  const expr = attributeExpression(attr);
  if (!expr) return { kind: "absent" };
  if (isFalseExpression(expr)) return { kind: "off" };

  const target = unwrap(expr);
  if (ts.isObjectLiteralExpression(target)) return { kind: "object", object: target };
  if (ts.isIdentifier(target)) {
    if (target.text === "undefined") return { kind: "names", names: [] };
    const bound = asObjectLiteral(findVariableInitializer(source, target.text));
    if (bound) return { kind: "object", object: bound };
    return { kind: "names", names: [target.text] };
  }
  return { kind: "names", names: stringLiteralsIn(target) };
}

/**
 * Variant names Framer resolves for this element during SSR.
 *
 * Verified against framer-motion 13.1.1 with `renderToStaticMarkup`:
 *
 *  - `inherit={false}` gates only state arriving from an ancestor. The
 *    element's own `initial="hidden"` still applies — and still propagates to
 *    its own descendants, so the element becomes a new root of the chain.
 *  - `initial={false}` on an intermediate wrapper does NOT stop a descendant
 *    from inheriting the ancestor's hidden state. Only on the element itself
 *    does it opt that element out.
 *  - the nearest ancestor that names a variant wins; wrappers with no `initial`
 *    of their own, motion or not, are transparent.
 */
function ssrVariantNames(tag: JsxTag, source: ts.SourceFile): string[] {
  const own = initialSpec(tag, source);
  // The element's own `initial` outranks everything, `inherit` included.
  if (own.kind === "off" || own.kind === "object") return [];
  // An `initial` the scanner cannot read a name out of (`initial={props.state}`)
  // is not proof the element overrode anything, so keep walking.
  if (own.kind === "names" && own.names.length > 0) return own.names;
  if (optsOutOfInherit(tag)) return [];

  for (const ancestor of ancestorTags(tag)) {
    const spec = initialSpec(ancestor, source);
    // `off` and `object` wrappers are transparent: they neither supply a name
    // nor stop the ancestor's name from reaching this element.
    if (spec.kind === "names" && spec.names.length > 0) return spec.names;
    // A wrapper that supplied no name of its own and refuses inherited state
    // is where the chain ends.
    if (optsOutOfInherit(ancestor)) return [];
  }
  return [];
}

function propertyKey(property: ts.ObjectLiteralElementLike): string | null {
  const name = property.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) {
    return name.expression.text;
  }
  return null;
}

/** Reporter for anything the scanner refuses to guess about. */
type Report = (description: string) => void;

/**
 * Properties of an object literal with `...spread` sources folded in. A spread
 * the scanner cannot resolve to a literal hides an unknown set of keys, so it
 * is reported and the caller keeps whatever it could see.
 */
function flattenProperties(
  object: ts.ObjectLiteralExpression,
  source: ts.SourceFile,
  ctx: ScanContext | undefined,
  report: Report,
  seen = new Set<ts.Node>()
): ts.ObjectLiteralElementLike[] {
  if (seen.has(object)) return [];
  seen.add(object);

  const properties: ts.ObjectLiteralElementLike[] = [];
  for (const property of object.properties) {
    if (!ts.isSpreadAssignment(property)) {
      properties.push(property);
      continue;
    }
    const spread = unwrap(property.expression);
    const resolved = ts.isObjectLiteralExpression(spread)
      ? spread
      : ts.isIdentifier(spread)
        ? resolveVariantsObject(source, spread.text, ctx)
        : null;
    if (!resolved) {
      report(`unresolved spread {...${spread.getText(spread.getSourceFile())}}`);
      continue;
    }
    properties.push(...flattenProperties(resolved, source, ctx, report, seen));
  }
  return properties;
}

/**
 * Source text Framer would inline for one variant object: its own text plus the
 * text of every spread it pulls in, so `hidden: { ...hiddenStyles }` is scanned
 * rather than skipped. Spreads it cannot follow are reported.
 */
function variantText(
  object: ts.ObjectLiteralExpression,
  source: ts.SourceFile,
  ctx: ScanContext | undefined,
  report: Report
): string {
  const parts = [object.getText(object.getSourceFile())];
  const seen = new Set<ts.Node>([object]);

  const visit = (current: ts.ObjectLiteralExpression): void => {
    for (const property of current.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = unwrap(property.expression);
        const resolved = ts.isObjectLiteralExpression(spread)
          ? spread
          : ts.isIdentifier(spread)
            ? resolveVariantsObject(source, spread.text, ctx)
            : null;
        if (!resolved) {
          report(`unresolved spread {...${spread.getText(spread.getSourceFile())}}`);
          continue;
        }
        if (seen.has(resolved)) continue;
        seen.add(resolved);
        parts.push(resolved.getText(resolved.getSourceFile()));
        visit(resolved);
        continue;
      }
      if (!ts.isPropertyAssignment(property)) continue;
      const value = unwrap(property.initializer);
      if (ts.isObjectLiteralExpression(value) && !seen.has(value)) {
        seen.add(value);
        visit(value);
      }
    }
  };

  visit(object);
  return parts.join(" ");
}

/** Object literals a variant key resolves to, including `name: () => ({ ... })`. */
function variantObjectsFor(
  variants: ts.ObjectLiteralExpression,
  name: string,
  source: ts.SourceFile,
  ctx: ScanContext | undefined,
  report: Report
): ts.ObjectLiteralExpression[] {
  const objects: ts.ObjectLiteralExpression[] = [];
  for (const property of flattenProperties(variants, source, ctx, report)) {
    if (!ts.isPropertyAssignment(property) || propertyKey(property) !== name) continue;
    const value = unwrap(property.initializer);
    if (ts.isObjectLiteralExpression(value)) {
      objects.push(value);
      continue;
    }
    if (
      (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) &&
      !ts.isBlock(value.body)
    ) {
      const returned = unwrap(value.body);
      if (ts.isObjectLiteralExpression(returned)) objects.push(returned);
      else report(`unresolved variant ${name}: ${value.getText(value.getSourceFile())}`);
      continue;
    }
    report(`unresolved variant ${name}: ${value.getText(value.getSourceFile())}`);
  }
  return objects;
}

/**
 * Objects a `variants=` expression resolves to. Anything the scanner cannot
 * prove is reported through `onUnresolved` so the scan fails closed.
 */
function variantsObjectsFromExpression(
  expr: ts.Expression,
  source: ts.SourceFile,
  ctx: ScanContext | undefined,
  onUnresolved: (description: string) => void
): ts.ObjectLiteralExpression[] {
  const target = unwrap(expr);

  if (ts.isObjectLiteralExpression(target)) return [target];

  if (ts.isIdentifier(target)) {
    const resolved = resolveVariantsObject(source, target.text, ctx);
    if (resolved) return [resolved];
    onUnresolved(target.text);
    return [];
  }

  if (ts.isConditionalExpression(target)) {
    return [
      ...variantsObjectsFromExpression(target.whenTrue, source, ctx, onUnresolved),
      ...variantsObjectsFromExpression(target.whenFalse, source, ctx, onUnresolved),
    ];
  }

  onUnresolved(target.getText(source));
  return [];
}

// ---------------------------------------------------------------------------
// Conditional mounts
// ---------------------------------------------------------------------------

function conditionLooksLikeSsrCollection(condition: string): boolean {
  return /\.length\b|\.size\b|Object\.keys\s*\(|Array\.isArray\s*\(/.test(condition);
}

interface MountContext {
  conditionallyMounted: boolean;
  underAnimatePresence: boolean;
  exempt: boolean;
}

/**
 * Whether this element is absent from SSR markup: it must sit under
 * `<AnimatePresence>` and inside a `{cond && ...}` / ternary branch whose
 * condition is not a collection check that is already true on the server.
 */
function mountContext(tag: JsxTag, source: ts.SourceFile): MountContext {
  const conditions: string[] = [];
  let underAnimatePresence = false;

  let child: ts.Node = elementNode(tag);
  let node: ts.Node | undefined = child.parent;

  while (node) {
    if (ts.isJsxElement(node) && tagName(node.openingElement) === "AnimatePresence") {
      underAnimatePresence = true;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      node.right === child
    ) {
      conditions.push(node.left.getText(source));
    }
    if (
      ts.isConditionalExpression(node) &&
      (node.whenTrue === child || node.whenFalse === child)
    ) {
      conditions.push(node.condition.getText(source));
    }
    child = node;
    node = node.parent;
  }

  const conditionallyMounted = conditions.length > 0;
  return {
    conditionallyMounted,
    underAnimatePresence,
    exempt:
      conditionallyMounted &&
      underAnimatePresence &&
      !conditions.some(conditionLooksLikeSsrCollection),
  };
}

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

/**
 * Tags whose props Framer reads. Anything unresolvable on one of these is an
 * offender; the same shape on a plain `<div>` is nobody's business.
 */
function isMotionTag(tag: JsxTag): boolean {
  const name = tagName(tag);
  return name.startsWith("motion.") || name === "AnimatePresence";
}

function scanSource(source: string, ctx?: ScanContext): MotionScan {
  const parsed = parseSource(source, ctx?.filePath ?? VIRTUAL_FILE);
  const states: InitialState[] = [];
  const offenders: string[] = [];

  const lineOf = (node: ts.Node) =>
    parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1;

  // One `variants=` binding is walked once per applicable variant name, so the
  // same unreadable spread can surface more than once. Report it once.
  const reporter =
    (node: ts.Node): Report =>
    (description) => {
      const message = `line ${lineOf(node)}: ${description}`;
      if (!offenders.includes(message)) offenders.push(message);
    };

  const record = (text: string, tag: JsxTag) => {
    states.push({
      text,
      line: lineOf(elementNode(tag)),
      ...mountContext(tag, parsed),
    });
  };

  /**
   * `<motion.div {...rest} />` can carry an `initial` or `variants` the scanner
   * never sees. Prove the spread holds neither, or report it.
   */
  const checkSpreadAttributes = (tag: JsxTag) => {
    if (!isMotionTag(tag)) return;
    for (const property of tag.attributes.properties) {
      if (!ts.isJsxSpreadAttribute(property)) continue;
      const spread = unwrap(property.expression);
      const resolved = ts.isObjectLiteralExpression(spread)
        ? spread
        : ts.isIdentifier(spread)
          ? resolveVariantsObject(parsed, spread.text, ctx)
          : null;
      const report = reporter(property);
      if (!resolved) {
        report(`unresolved spread {...${spread.getText(parsed)}} on <${tagName(tag)}>`);
        continue;
      }
      const keys = flattenProperties(resolved, parsed, ctx, report).map(propertyKey);
      if (keys.includes("initial") || keys.includes("variants")) {
        report(
          `spread {...${spread.getText(parsed)}} sets initial/variants on <${tagName(tag)}>`
        );
      }
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag: JsxTag = node;
      checkSpreadAttributes(tag);

      const own = initialSpec(tag, parsed);
      if (own.kind === "object") {
        record(variantText(own.object, parsed, ctx, reporter(own.object)), tag);
      }

      const variantsAttr = getAttribute(tag, "variants");
      const variantsExpr = variantsAttr ? attributeExpression(variantsAttr) : undefined;
      if (variantsExpr) {
        const report = reporter(variantsExpr);
        const objects = variantsObjectsFromExpression(variantsExpr, parsed, ctx, (description) =>
          report(`unresolved variants={${description}}`)
        );
        const names = ssrVariantNames(tag, parsed);
        for (const object of objects) {
          for (const name of names) {
            for (const variant of variantObjectsFor(object, name, parsed, ctx, report)) {
              record(variantText(variant, parsed, ctx, report), tag);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return { states, offenders };
}

function collectInitialStates(source: string, ctx?: ScanContext): InitialState[] {
  return scanSource(source, ctx).states;
}

function hidingStates(source: string, ctx?: ScanContext): InitialState[] {
  return collectInitialStates(source, ctx).filter((state) => hidingHits(state.text).length > 0);
}

function hidingOpacityStates(source: string, ctx?: ScanContext): InitialState[] {
  return collectInitialStates(source, ctx).filter((state) =>
    hidingHits(state.text).includes("opacity")
  );
}

/**
 * Everything wrong with one file: hiding initials that ship during SSR, plus
 * every `variants=` the scanner could not resolve. Both live in one list so the
 * production scan cannot silently drop the fail-closed half.
 */
function findHidingOffenders(source: string, ctx?: ScanContext): string[] {
  const scan = scanSource(source, ctx);
  const offenders = [...scan.offenders];

  for (const state of scan.states) {
    if (state.exempt) continue;
    for (const prop of hidingHits(state.text)) {
      offenders.push(`line ${state.line}: ${prop} in ${state.text.replace(/\s+/g, " ")}`);
    }
  }

  return offenders;
}

/**
 * `ts.createSourceFile` error-recovers instead of throwing, and a tree built
 * out of a broken file scans as "nothing to see here". A real component that
 * does not parse is a fail-closed offender, not a pass. (Snippet sources in the
 * unit tests are deliberate fragments, so this is checked per real file.)
 */
function parseErrorOffenders(filePath: string, source: string): string[] {
  const parsed = parseSource(source, filePath) as ts.SourceFile & {
    parseDiagnostics?: readonly ts.Diagnostic[];
  };
  const diagnostics = parsed.parseDiagnostics ?? [];
  return diagnostics.slice(0, 1).map((diagnostic) => {
    const line =
      diagnostic.start === undefined
        ? 0
        : parsed.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
    return `line ${line}: does not parse, so the scan cannot see it — ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`;
  });
}

/** The per-file step the directory scan runs, shared so fixtures exercise it. */
function scanFile(filePath: string, label: string): string[] {
  const source = readFileSync(filePath, "utf8");
  return [...parseErrorOffenders(filePath, source), ...findHidingOffenders(source, { filePath })].map(
    (offender) => `${label}: ${offender}`
  );
}

function fixture(name: string): string {
  return resolve(CWD, "tests/fixtures/motion-scanner", name);
}

// ---------------------------------------------------------------------------
// Scanner contracts
// ---------------------------------------------------------------------------

test("the hiding-initial scanner still sees Navbar's interaction-only panel", () => {
  const navbar = readSource("src/components/layout/Navbar.tsx");
  assert.ok(
    hidingStates(navbar).some((state) => {
      const props = hidingHits(state.text);
      return props.includes("opacity") && props.includes("height");
    }),
    "scanner no longer sees Navbar's hiding initial; the per-node helper is now a blind skip"
  );
});

test("inline hiding initials are collected; a non-motion object is not", () => {
  const inline = `<motion.div initial={{ opacity: 0 }} />`;
  assert.equal(hidingOpacityStates(inline).length, 1);

  const styleMap = `
    const css = { hidden: { opacity: 0 } };
    <div style={css.hidden} />
  `;
  assert.equal(collectInitialStates(styleMap).length, 0);
});

test("initial={ident} resolves a same-file object literal", () => {
  const source = `
    const hidden = { opacity: 0 };
    <motion.div initial={hidden} />
  `;
  assert.equal(
    hidingOpacityStates(source).length,
    1,
    "const hidden = { opacity: 0 } plus initial={hidden} must be visible"
  );
});

test("hiding values cover zero literals, quoted zeros, and either ternary branch", () => {
  assert.ok(hidingHits("{ opacity: 0.0 }").includes("opacity"));
  assert.ok(hidingHits("{ opacity: '0' }").includes("opacity"));
  assert.ok(hidingHits('{ scale: "0" }').includes("scale"));
  assert.ok(hidingHits("{ width: 0.0 }").includes("width"));
  assert.ok(hidingHits("{ height: 0.00 }").includes("height"));
  assert.ok(hidingHits("{ opacity: visible ? 1 : 0 }").includes("opacity"));
  assert.ok(hidingHits("{ opacity: visible ? 0 : 1 }").includes("opacity"));
  assert.ok(hidingHits('{ visibility: "hidden" }').includes("visibility"));
  assert.equal(hidingHits("{ opacity: 0.5 }").length, 0);
  assert.equal(hidingHits("{ scale: 0.25 }").length, 0);
  assert.equal(hidingHits("{ opacity: visible ? 1 : 1 }").length, 0);
  assert.equal(hidingHits('{ visibility: "visible" }').length, 0);
});

test("leading-dot zeros and viewport-unit zeros hide too", () => {
  assert.ok(hidingHits("{ opacity: .0 }").includes("opacity"));
  assert.ok(hidingHits("{ opacity: .00 }").includes("opacity"));
  for (const unit of ["vw", "vh", "svh", "dvh", "ch", "rem", "px", "%"]) {
    assert.ok(hidingHits(`{ width: "0${unit}" }`).includes("width"), unit);
  }
  assert.equal(hidingHits("{ opacity: .5 }").length, 0);
  assert.equal(hidingHits('{ width: "100vw" }').length, 0);
});

test("a keyframe array hides when its first entry is zero", () => {
  // Verified against framer-motion 13.1.1: initial={{ opacity: [0, 1] }} ships
  // style="opacity:0", scale:[0,1] ships transform:scale(0), and
  // width:["0%","100%"] ships width:0%. A trailing zero renders the first entry.
  assert.ok(hidingHits("{ opacity: [0, 1] }").includes("opacity"));
  assert.ok(hidingHits("{ scale: [0, 1] }").includes("scale"));
  assert.ok(hidingHits('{ width: ["0%", "100%"] }').includes("width"));
  assert.equal(hidingHits("{ opacity: [1, 0] }").length, 0);
  assert.equal(hidingHits("{ scale: [0.95, 1] }").length, 0);

  const inline = `<motion.div initial={{ opacity: [0, 1] }} />`;
  assert.equal(hidingOpacityStates(inline).length, 1);
});

test("named variants are collected through every initial= spelling", () => {
  const cases = [
    `<motion.div initial="hidden" variants={variants} />`,
    `<motion.div initial={"hidden"} variants={variants} />`,
    `<motion.div initial={reduced ? "hidden" : "visible"} variants={variants} />`,
  ];

  for (const usage of cases) {
    const source = `const variants = { hidden: { opacity: 0 }, visible: { y: 0 } };\n${usage}`;
    assert.equal(hidingOpacityStates(source).length, 1, usage);
  }

  const identName = `
    const variants = { start: { opacity: 0 } };
    <motion.div initial={start} variants={variants} />
  `;
  assert.equal(
    hidingOpacityStates(identName).length,
    1,
    "initial={start} names the start variant when start is not a local object"
  );

  const computedKey = `
    const variants = { ["hidden"]: { opacity: 0 } };
    <motion.div initial="hidden" variants={variants} />
  `;
  assert.equal(hidingOpacityStates(computedKey).length, 1);

  const factoryVariant = `
    const variants = { hidden: (i: number) => ({ opacity: 0, delay: i }) };
    <motion.div initial="hidden" variants={variants} />
  `;
  assert.equal(
    hidingOpacityStates(factoryVariant).length,
    1,
    "a variant written as a custom-value function still renders opacity 0 on the server"
  );
});

test("a variants object is only read through the element that binds it", () => {
  const leftoverMap = `
    const css = { hidden: { opacity: 0 } };
    const variants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={variants} />
  `;
  assert.equal(
    hidingOpacityStates(leftoverMap).length,
    1,
    "style-map hidden: { opacity: 0 } must not be treated as a motion initial"
  );

  const inlineObjectInitial = `
    const css = { hidden: { opacity: 0 } };
    <motion.div initial={{ content: "hidden", y: 24 }} />
  `;
  assert.equal(
    hidingOpacityStates(inlineObjectInitial).length,
    0,
    'content: "hidden" must not collect a stray hidden: { opacity: 0 } object'
  );

  const presenceFalse = `
    const css = { false: { opacity: 0 } };
    <AnimatePresence initial={false}>
      <motion.div />
    </AnimatePresence>
  `;
  assert.equal(collectInitialStates(presenceFalse).length, 0);
});

test("always-rendered named hiding variants stay offenders", () => {
  const source = `
    const cardVariants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(hiding[0].exempt, false);
});

test("typed variants objects are still collected", () => {
  const typed = `
    const cardVariants: Variants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.equal(hidingOpacityStates(typed).length, 1);
});

test("a resolvable spread inside a variants object is followed", () => {
  const source = `
    const base = { hidden: { opacity: 0 } };
    const cardVariants = { ...base, visible: { opacity: 1 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.equal(
    hidingOpacityStates(source).length,
    1,
    "hidden: { opacity: 0 } arrives through ...base and still ships"
  );
  assert.deepEqual(findHidingOffenders(source).filter((o) => o.includes("unresolved")), []);
});

test("a resolvable spread inside a variant value is followed", () => {
  const source = `
    const hiddenStyles = { opacity: 0 };
    const cardVariants = { hidden: { ...hiddenStyles, y: 24 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.equal(
    hidingOpacityStates(source).length,
    1,
    "the spread source is part of what Framer inlines, so it must be scanned"
  );
});

test("an unresolvable spread inside a variants object fails closed", () => {
  const inMap = `
    const cardVariants = { ...makeBase(), hidden: { y: 24 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.deepEqual(
    findHidingOffenders(inMap).map((offender) => offender.replace(/^line \d+: /, "")),
    ["unresolved spread {...makeBase()}"],
    "an unreadable spread can carry any variant key, including a hiding one"
  );

  const inValue = `
    const cardVariants = { hidden: { ...makeHidden(), y: 24 } };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.deepEqual(
    findHidingOffenders(inValue).map((offender) => offender.replace(/^line \d+: /, "")),
    ["unresolved spread {...makeHidden()}"],
    "an unreadable spread inside the variant value can carry opacity: 0"
  );
});

test("a variant key bound to something unreadable fails closed", () => {
  const source = `
    const cardVariants = { hidden: buildHidden() };
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.deepEqual(
    findHidingOffenders(source).map((offender) => offender.replace(/^line \d+: /, "")),
    ["unresolved variant hidden: buildHidden()"]
  );
});

test("JSX spread attributes on a motion element fail closed", () => {
  const unresolvable = `<motion.div {...rest} />`;
  assert.deepEqual(
    findHidingOffenders(unresolvable).map((offender) => offender.replace(/^line \d+: /, "")),
    ["unresolved spread {...rest} on <motion.div>"],
    "a spread the scanner cannot read may carry initial= or variants="
  );

  const carriesInitial = `
    const motionProps = { initial: { opacity: 0 } };
    <motion.div {...motionProps} />
  `;
  assert.deepEqual(
    findHidingOffenders(carriesInitial).map((offender) => offender.replace(/^line \d+: /, "")),
    ["spread {...motionProps} sets initial/variants on <motion.div>"]
  );

  const provablySafe = `
    const layoutProps = { className: "grid", id: "x" };
    <motion.div {...layoutProps} />
  `;
  assert.deepEqual(findHidingOffenders(provablySafe), []);

  const plainElement = `<div {...rest} />`;
  assert.deepEqual(
    findHidingOffenders(plainElement),
    [],
    "Framer never reads props off a plain <div>, so its spreads are not our business"
  );
});

test("variants={ident as Type} and {ident satisfies Type} resolve the ident", () => {
  for (const expr of ["cardVariants as Variants", "cardVariants satisfies Variants", "(cardVariants)"]) {
    const source = `
      const cardVariants = { hidden: { opacity: 0 } };
      <motion.div initial="hidden" variants={${expr}} />
    `;
    assert.deepEqual(findHidingOffenders(source).filter((o) => o.includes("unresolved")), [], expr);
    assert.equal(hidingOpacityStates(source).length, 1, expr);
  }
});

test("a module-scope const variants = {} is not a JSX binding", () => {
  const source = `
    const variants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={variants} />
  `;
  assert.deepEqual(
    findHidingOffenders(source).filter((offender) => offender.includes("unresolved")),
    []
  );
});

// ---------------------------------------------------------------------------
// Fail-closed resolution (#62)
// ---------------------------------------------------------------------------

test("factory variants={ident} fail closed", () => {
  const source = `
    const cardVariants = createVariants({ hidden: { opacity: 0 } });
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.deepEqual(
    findHidingOffenders(source).map((offender) => offender.replace(/^line \d+: /, "")),
    ["unresolved variants={cardVariants}"],
    "createVariants({ hidden }) is not inlined; fail closed instead of collecting"
  );
  assert.equal(hidingOpacityStates(source).length, 0);
});

test("an undeclared variants={ident} fails closed", () => {
  const source = `
    <motion.div initial="hidden" variants={cardVariants} />
    const variants = { leftover: { opacity: 0 } };
  `;
  assert.deepEqual(
    findHidingOffenders(source).map((offender) => offender.replace(/^line \d+: /, "")),
    ["unresolved variants={cardVariants}"]
  );
});

test("the production scan path reports an unresolved variants={ident}", () => {
  // Same `scanFile` the directory scan below runs, so the fail-closed branch
  // cannot rot out of the production wiring while CI stays green.
  const offenders = scanFile(fixture("factory-variants.tsx"), "factory-variants.tsx");
  assert.deepEqual(
    offenders.map((offender) => offender.replace(/^(.*?): line \d+: /, "$1: ")),
    ["factory-variants.tsx: unresolved variants={cardVariants}"]
  );
});

// ---------------------------------------------------------------------------
// Imported variants (#61)
// ---------------------------------------------------------------------------

test("imported named variants objects are collected", () => {
  const file = fixture("uses-import.tsx");
  const ctx = { filePath: file };
  const source = readFileSync(file, "utf8");
  const hiding = hidingOpacityStates(source, ctx);

  assert.equal(hiding.length, 1, "import { cardVariants } from ./imported-variants must resolve");
  assert.equal(hiding[0].exempt, false);
  assert.equal(hidingHits(hiding[0].text).includes("scale"), false);
  assert.deepEqual(findHidingOffenders(source, ctx).filter((o) => o.includes("unresolved")), []);
});

test("imported default variants objects are collected", () => {
  const file = fixture("uses-default-import.tsx");
  const ctx = { filePath: file };
  const source = readFileSync(file, "utf8");
  const hiding = hidingOpacityStates(source, ctx);

  assert.equal(hiding.length, 1, "import fadeVariants from ./imported-variants must resolve default");
  assert.ok(
    hidingHits(hiding[0].text).includes("scale"),
    "default export payload must not collide with the named cardVariants export"
  );
  assert.deepEqual(findHidingOffenders(source, ctx).filter((o) => o.includes("unresolved")), []);
});

test("@/ alias imports resolve through the tsconfig paths mapping", () => {
  const file = fixture("uses-alias-import.tsx");
  const ctx = { filePath: file };
  const source = readFileSync(file, "utf8");

  // The specifier must be one the mapping actually has to rewrite. A `..` that
  // climbs back out of the mapped segment resolves the same no matter what
  // `@/*` points at, which would make this test decorative.
  const spec = /from "(@\/[^"]+)"/.exec(source)?.[1];
  assert.ok(spec, "the alias fixture must import through @/");
  assert.ok(
    !spec.includes(".."),
    `${spec} escapes the mapped segment, so repointing @/* would not break it`
  );
  assert.equal(
    resolveModuleFile(spec, file),
    resolve(CWD, "src/lib/__fixtures__/motion-variants.ts"),
    "@/lib/... must land under src/ via the tsconfig paths mapping"
  );
  assert.equal(
    hidingOpacityStates(source, ctx).length,
    1,
    "a broken paths mapping would resolve nothing and this hiding variant would vanish"
  );
  assert.deepEqual(findHidingOffenders(source, ctx).filter((o) => o.includes("unresolved")), []);
});

test("a component that does not parse is an offender, not a pass", () => {
  // ts.createSourceFile error-recovers, so a broken file otherwise scans as
  // clean and its hiding initial ships unnoticed.
  const offenders = scanFile(fixture("broken-syntax.tsx.txt"), "broken-syntax.tsx");
  assert.match(
    offenders[0] ?? "",
    /^broken-syntax\.tsx: line \d+: does not parse/,
    "an unparseable component must be reported before anything the broken tree happens to show"
  );
});

test("an unresolvable import fails closed", () => {
  const file = fixture("uses-import.tsx");
  const source = `
    import { cardVariants } from "@/does/not/exist";
    <motion.div initial="hidden" variants={cardVariants} />
  `;
  assert.deepEqual(
    findHidingOffenders(source, { filePath: file }).map((o) => o.replace(/^line \d+: /, "")),
    ["unresolved variants={cardVariants}"]
  );
});

// ---------------------------------------------------------------------------
// Variant inheritance (#59)
// ---------------------------------------------------------------------------

test("stagger children inherit a parent's named initial", () => {
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
    hiding[0].exempt,
    false,
    "Hero/ClientLogos-style children have no initial= of their own and are always rendered"
  );
});

test("a stagger child under AnimatePresence keys its exemption off the child", () => {
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
  assert.equal(hiding[0].exempt, true);
});

test("sibling variants= objects are not stagger children", () => {
  const source = `
    const leftover = { hidden: { opacity: 0 } };
    const containerVariants = { hidden: {} };
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="hidden">
      <motion.div variants={childVariants} />
    </motion.div>
    <motion.div variants={leftover} />
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1, "the stagger child is an offender; the later sibling is not");
});

test("initial={false} and inherit={false} on the element opt it out", () => {
  for (const optOut of ["initial={false}", "inherit={false}"]) {
    const source = `
      const containerVariants = { hidden: {} };
      const childVariants = { hidden: { opacity: 0 } };
      <motion.div variants={containerVariants} initial="hidden">
        <motion.div variants={childVariants} ${optOut} />
      </motion.div>
    `;
    assert.equal(hidingOpacityStates(source).length, 0, optOut);
  }
});

test("inherit={false} gates inherited state only, never the element's own initial=", () => {
  // framer-motion 13.1.1 checks `props.inherit !== false` for *inherited*
  // state. renderToStaticMarkup on the shape below really does emit
  // <section style="opacity:0"> around real content.
  const own = `
    const fade = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    <motion.section inherit={false} initial="hidden" animate="visible" variants={fade}>
      <p>real content</p>
    </motion.section>
  `;
  assert.equal(
    hidingOpacityStates(own).length,
    1,
    "inherit={false} does not cancel this element's own initial=\"hidden\""
  );

  const underParent = `
    const containerVariants = { hidden: {}, visible: {} };
    const fade = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    <motion.div variants={containerVariants} initial="visible">
      <motion.section inherit={false} initial="hidden" variants={fade}>
        <p>real content</p>
      </motion.section>
    </motion.div>
  `;
  assert.equal(hidingOpacityStates(underParent).length, 1);

  // ...and such an element becomes a new root: its own name propagates down.
  const reroots = `
    const containerVariants = { hidden: {}, visible: {} };
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="visible">
      <motion.section inherit={false} initial="hidden" variants={containerVariants}>
        <motion.div variants={childVariants} />
      </motion.section>
    </motion.div>
  `;
  assert.equal(
    hidingOpacityStates(reroots).length,
    1,
    "the inherit={false} element re-roots the chain at its own hidden"
  );

  // The opt-out only bites when the element supplies no name of its own.
  const noOwnInitial = `
    const containerVariants = { hidden: {} };
    const fade = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="hidden">
      <motion.section inherit={false} variants={fade}>
        <p>real content</p>
      </motion.section>
    </motion.div>
  `;
  assert.equal(hidingOpacityStates(noOwnInitial).length, 0);
});

test("an intermediate inherit={false} stops the chain but initial={false} does not", () => {
  const nested = (wrapper: string) => `
    const containerVariants = { hidden: {} };
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="hidden">
      <motion.div ${wrapper}>
        <motion.div variants={childVariants} />
      </motion.div>
    </motion.div>
  `;

  assert.equal(
    hidingOpacityStates(nested("inherit={false}")).length,
    0,
    "inherit={false} cuts the variant chain for the whole subtree"
  );
  // Checked against framer-motion 13.1.1 with renderToStaticMarkup: the
  // grandchild below really does ship style="opacity:0". An intermediate
  // initial={false} only silences the wrapper itself.
  assert.equal(
    hidingOpacityStates(nested("initial={false}")).length,
    1,
    "initial={false} on a wrapper does not stop descendants from inheriting hidden"
  );
  assert.equal(
    hidingOpacityStates(nested("")).length,
    1,
    "a plain wrapper is transparent to variant inheritance"
  );
});

test("the nearest ancestor naming a variant wins", () => {
  const source = `
    const containerVariants = { hidden: {}, visible: {} };
    const childVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    <motion.div variants={containerVariants} initial="hidden">
      <motion.div variants={containerVariants} initial="visible">
        <motion.div variants={childVariants} />
      </motion.div>
    </motion.div>
  `;
  assert.equal(
    hidingOpacityStates(source).length,
    0,
    'the wrapper re-roots the chain at "visible"; the grandchild is never hidden'
  );
});

test("an initial= the scanner cannot name does not shield an inherited variant", () => {
  const source = `
    const containerVariants = { hidden: {} };
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={containerVariants} initial="hidden">
      <motion.div variants={childVariants} initial={props.state} />
    </motion.div>
  `;
  assert.equal(
    hidingOpacityStates(source).length,
    1,
    "initial={props.state} may be undefined at runtime; keep inheriting instead of passing"
  );
});

test("variants= with no initial anywhere resolves nothing", () => {
  const source = `
    const childVariants = { hidden: { opacity: 0 } };
    <motion.div variants={childVariants} animate="visible" />
  `;
  assert.equal(collectInitialStates(source).length, 0);
});

// ---------------------------------------------------------------------------
// Conditional mounts
// ---------------------------------------------------------------------------

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
  assert.equal(always.conditionallyMounted, false);
  assert.equal(always.exempt, false);
  assert.equal(conditional.conditionallyMounted, true);
  assert.equal(conditional.exempt, true);
});

test("a conditional mount without AnimatePresence is not exempt", () => {
  const source = `
    {mobileMenuOpen && (
      <motion.div initial={{ opacity: 0 }} />
    )}
  `;
  const states = collectInitialStates(source);
  assert.equal(states.length, 1);
  assert.equal(states[0].conditionallyMounted, true);
  assert.equal(states[0].underAnimatePresence, false);
  assert.equal(states[0].exempt, false);
});

test("&& and both ternary branches are conditional mounts", () => {
  const mounts = [
    "{mobileMenuOpen && <motion.div initial={{ opacity: 0 }} />}",
    "{mobileMenuOpen && (<motion.div initial={{ opacity: 0 }} />)}",
    "{isOpen ? (<motion.div initial={{ opacity: 0 }} />) : null}",
    "{isOpen ? null : <motion.div initial={{ opacity: 0 }} />}",
    "{isOpen && <section><motion.div initial={{ opacity: 0 }} /></section>}",
    // Non-JSX branches: when the condition is false the list never renders, so
    // these are mounts too. The old index-range scanner only recognised a
    // branch that started with `(` or `<`.
    "{isOpen && items.map((i) => <motion.div key={i} initial={{ opacity: 0 }} />)}",
    "{isOpen ? items.map((i) => <motion.div key={i} initial={{ opacity: 0 }} />) : null}",
  ];

  for (const mount of mounts) {
    const bare = collectInitialStates(mount);
    assert.equal(bare.length, 1, mount);
    assert.equal(bare[0].conditionallyMounted, true, mount);
    assert.equal(bare[0].exempt, false, mount);

    const wrapped = collectInitialStates(`<AnimatePresence>${mount}</AnimatePresence>`);
    assert.equal(wrapped.length, 1, mount);
    assert.equal(wrapped[0].exempt, true, mount);
  }
});

test("collection checks under AnimatePresence are not exempt", () => {
  const mounts = [
    "{items.length && (<motion.div initial={{ opacity: 0 }} />)}",
    "{items.length && <motion.div initial={{ opacity: 0 }} />}",
    "{items.length ? (<motion.div initial={{ opacity: 0 }} />) : null}",
    "{Object.keys(items).length && (<motion.div initial={{ opacity: 0 }} />)}",
    "{items.size && (<motion.div initial={{ opacity: 0 }} />)}",
    "{Array.isArray(items) && (<motion.div initial={{ opacity: 0 }} />)}",
    "{open && items.length > 0 && (<motion.div initial={{ opacity: 0 }} />)}",
  ];

  for (const mount of mounts) {
    const states = collectInitialStates(`<AnimatePresence>${mount}</AnimatePresence>`);
    assert.equal(states.length, 1, mount);
    assert.equal(states[0].conditionallyMounted, true, mount);
    assert.equal(states[0].underAnimatePresence, true, mount);
    assert.equal(
      states[0].exempt,
      false,
      `${mount} can be true during SSR; AnimatePresence does not hide it`
    );
  }
});

test("inline variants={{}} follow the element's own initial= usage", () => {
  const source = `
    <AnimatePresence>
      {open && <motion.div initial="hidden" variants={{ hidden: { opacity: 0 } }} />}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.length, 1);
  assert.equal(hiding[0].exempt, true);
});

test("always-rendered and conditional usages of one variants object are keyed separately", () => {
  const source = `
    const variants = { hidden: { opacity: 0 } };
    <motion.div initial="hidden" variants={variants} />
    <AnimatePresence>
      {open && <motion.div initial="hidden" variants={variants} />}
    </AnimatePresence>
  `;
  const hiding = hidingOpacityStates(source);
  assert.equal(hiding.filter((state) => state.exempt).length, 1);
  assert.equal(hiding.filter((state) => !state.exempt).length, 1);
});

// ---------------------------------------------------------------------------
// Site contracts
// ---------------------------------------------------------------------------

test("no component ships an SSR initial state that hides its content", () => {
  const offenders: string[] = [];

  for (const file of listTsxFiles(COMPONENTS_DIR)) {
    offenders.push(...scanFile(file, relative(COMPONENTS_DIR, file)));
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
    const file = join(COMPONENTS_DIR, key);
    const hiding = hidingStates(readFileSync(file, "utf8"), { filePath: file });

    assert.ok(hiding.length > 0, `${key} should still have a detectable hiding initial`);
    for (const state of hiding) {
      assert.ok(
        state.exempt,
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
