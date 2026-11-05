# Temporary braces mitigation

The owner approved preparing and testing security overrides and a local braces
patch on 2026-10-20. `braces@3.0.3.patch` contains the five runtime source changes
from [upstream PR #87](https://github.com/micromatch/braces/pull/87), commit
`d44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe`, authored by akahungryy.
The upstream package and patch are MIT licensed. No upstream release includes
this fix yet; the installed package still reports version 3.0.3.

The patch bounds brace/parenthesis nesting and recursive AST traversal at 100,
allows callers to lower that bound, and rejects cyclic parent chains during
expansion. Inputs beyond the bound throw controlled validation errors. Callers
must handle errors; this is not a general bound on regular-expression or brace
expansion complexity.

## Written audit exception

Only **GHSA-vfj7-8cjw-p6xm**, only for **braces 3.0.3**, is treated as locally
mitigated by `pnpm audit:security`. The raw `pnpm audit --audit-level high`
continues to report it. CI does not use a global ignore or ignore all unfixable
advisories. The gate enumerates every installed braces copy, verifies the SHA-256
of every runtime JavaScript file against `braces-verification.json`, and runs
bounded subprocess regressions with a restricted stack before accepting this
one finding. Missing packages, changed files, failed probes, unknown audit
responses, other affected versions and any other high/critical advisory fail
the gate. CI installs with `--frozen-lockfile` before this check.

Independent validation of the exact upstream commit: 908 upstream tests passed;
507 ordinary, malformed and escaped compile/expand/stringify responses matched
3.0.3. Additional checks cover 3,000-level patterns, 12,000-level supplied ASTs,
node/parent cycles, option-limit bypass attempts, mixed parentheses/braces,
quoted braces and the 100-level boundary.

One escape-handling mismatch in PR #87's own code (quote detection after an
escaped backslash) is recorded in `braces-upstream-validation.md` for the
maintainer handoff. The patch is kept on the exact upstream commit instead of
diverging locally; update this note when upstream ships a corrected release.

This exception ends when a published upstream fix replaces the patch. At that
point remove the patch, verification manifest and advisory-specific gate logic,
and restore the unmodified high-severity audit command after validation.

## Written audit exception: zod 3

Only **GHSA-mrhx-c7xc-m3w5** (zod can exhaust memory while validating oversized
constrained collections), only for **zod 3.x**, is accepted by
`pnpm audit:security` (owner decision 2026-10-24). zod fixes it only in 4.6.6,
and Strapi 5.61 (`@strapi/types` and koa-body, plus the AI SDK it
bundles) requires the zod 3 API, so neither an upgrade nor an override is
possible: zod 4's root export is a different API. The workspace pin
`zod: "3.25.76"` stays. The finding is a denial-of-service on oversized input
to a zod schema; it is not a code-execution or data-disclosure issue. Any
other zod advisory, any finding on a zod 4 copy and every other high/critical
advisory still fail the gate.

This exception ends when Strapi requires zod 4 (or zod ships a fixed 3.x):
upgrade, then remove `isAcceptedZodAdvisory` and this section.

## Strapi webpack adapter

Strapi 5.61 ships `webpack-dev-middleware.koaWrapper()` in both published watch
entrypoints, so the `@strapi/strapi@5.58.0` patch is gone. The workspace still
pins `webpack-dev-middleware` 8.x so the Koa response, status, and streaming
APIs stay on the supported middleware line.

The integration regression invokes Strapi's actual CommonJS `watch()` (the CLI
entrypoint), its public webpack configuration hook, a real compiler and Koa,
and loopback HTTP requests. It covers assets, HEAD, byte ranges, missing routes,
admin HTML fallback, encoded traversal and shutdown, without a CMS database.
The separate middleware regression covers the missing-publicPath-slash traversal.

Strapi's standalone ESM webpack config has a pre-existing named-export error
on Node 24. That entrypoint is not covered by the CLI regression. The CMS
production build uses the default Vite path.
