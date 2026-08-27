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
