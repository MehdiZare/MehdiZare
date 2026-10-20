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

This exception ends when a published upstream fix replaces the patch. At that
point remove the patch, verification manifest and advisory-specific gate logic,
and restore the unmodified high-severity audit command after validation.

## Strapi webpack adapter

`@strapi__strapi@5.58.0.patch` replaces the hand-written response shim in both
published watch entrypoints with `webpack-dev-middleware.koaWrapper()`. The
underlying `devMiddleware` remains available for readiness, the admin HTML
fallback and cleanup. This allows the pinned middleware 8.5.0 to use its
supported Koa response, status and streaming APIs. Without the patch, both
7.4.6 and 8.5.0 fail at `res.removeHeader` during asset requests.
The two changed files no longer advertise their now-stale generated source maps.

The integration regression invokes Strapi's actual CommonJS `watch()` (the CLI
entrypoint), its public webpack configuration hook, a real compiler and Koa,
and loopback HTTP requests. It covers assets, HEAD, byte ranges, missing routes,
admin HTML fallback, encoded traversal and shutdown, without a CMS database.
The separate middleware regression covers the missing-publicPath-slash traversal.

Strapi's standalone ESM webpack config has a pre-existing named-export error
with both webpack 5.109.2 and 5.112.0 on Node 24.12.0. That entrypoint is not
covered by the CLI regression; this patch does not claim to fix it. The CMS
production build uses the default Vite path.

Remove this patch and the override when a supported Strapi release ships the
middleware upgrade and Koa integration; rerun the adapter regression first.
