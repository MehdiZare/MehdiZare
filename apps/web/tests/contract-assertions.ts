import assert from "node:assert/strict";

// Shared assertions for the source-text contract tests.
//
// Those tests read a file as a string and assert regexes against it, to pin
// *placement* -- that a page routes through a shared helper instead of
// re-implementing it inline. Behavior is tested separately against the helper
// itself. Two mistakes have already been made writing these regexes by hand,
// so the shapes live here rather than at each call site:
//
//   /helperName/     is satisfied by the import statement alone, so a file can
//                    import a helper, re-inline its logic, and still pass (#94)
//   /helperName\(/   is satisfied by a local named `_helperName`, because `\(`
//                    without `\b` anchors nothing on the left (#95)
//
// Passing a helper name through one of these functions applies `\b` and the
// whitespace tolerance uniformly, so the next guard cannot omit them.

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function assertIdentifier(name: string): void {
  assert.match(
    name,
    IDENTIFIER,
    `expected a bare identifier, got ${JSON.stringify(name)} -- these helpers interpolate the name into a RegExp, so a pattern would be silently mis-anchored`
  );
}

/**
 * Asserts that `source` calls `helper`, rather than merely importing it.
 *
 * `subject` names what is being checked and leads the failure message; pass a
 * file path when the assertion runs in a loop, so the message says which one
 * broke. `contract` cites the issues that established the rule.
 */
export function assertCallsHelper(
  source: string,
  helper: string,
  contract: string,
  subject = "page"
): void {
  assertIdentifier(helper);
  assert.match(
    source,
    new RegExp(`\\b${helper}\\s*\\(`),
    `${subject} must call ${helper}(), not merely import it (${contract})`
  );
}

/**
 * Asserts that `source` renders `component` as JSX, rather than merely
 * importing it. The component equivalent of `assertCallsHelper` -- a component
 * that is imported but swapped for a plain element loses whatever the wrapper
 * provided (analytics, canonical hrefs) while the import keeps a bare-name
 * match green.
 */
export function assertRendersComponent(
  source: string,
  component: string,
  contract: string,
  subject = "page"
): void {
  assertIdentifier(component);
  assert.match(
    source,
    new RegExp(`<${component}[\\s/>]`),
    `${subject} must render <${component}>, not merely import it (${contract})`
  );
}

/** Escapes a literal so it can be matched exactly inside a RegExp. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts that a shared layout component reads an identity string from Site
 * Profile instead of hardcoding it.
 *
 * Two assertions, and both matter (#96):
 *
 *   - the source must not contain `value`, the *canonical* string taken from
 *     `DEFAULT_SITE_PROFILE` at call time. Pinning a remembered literal
 *     instead ("Let's Talk") only guards the one string that was once wrong:
 *     it goes quiet the moment the canonical value changes, and it never fired
 *     for a *different* hardcoded string in the first place.
 *   - the source must render `{field}`. A bare `/field/` match is satisfied by
 *     the props-interface line alone (`siteName: string;`), so a component can
 *     declare the prop, drop the destructure, hardcode the string, and still
 *     pass -- the object-field analogue of the import-only weakness #94 closed
 *     for functions.
 */
export function assertConsumesProfileValue(
  source: string,
  options: { field: string; value: string; contract: string; subject?: string }
): void {
  const { field, value, contract, subject = "component" } = options;
  assertIdentifier(field);
  assert.ok(
    value.trim(),
    `${subject}: the canonical value for ${field} is blank, so the hardcoding guard would match everything (${contract})`
  );

  assert.doesNotMatch(
    source,
    new RegExp(escapeForRegExp(value)),
    `${subject} must not hardcode ${JSON.stringify(value)} -- it is the current value of ${field} in Site Profile, so hardcoding it silently freezes the page at today's copy (${contract})`
  );
  assert.match(
    source,
    new RegExp(`\\{\\s*${field}\\s*\\}`),
    `${subject} must render {${field}}, not merely declare it as a prop -- a props-interface line alone satisfies a bare name match (${contract})`
  );
}
