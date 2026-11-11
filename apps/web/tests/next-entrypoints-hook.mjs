// `next` ships its entry points as `next/<name>.js` with no exports map, so a
// bare `next/navigation` or `next/link` import does not resolve under plain
// Node ESM. resolve-ts-hook.mjs handles `next/server` and stubs `next/cache`;
// this covers the rest for tests that load a page module directly.
// Registered per test file (see taxonomy-empty-robots.test.ts), and runs
// before resolve-ts-hook.mjs because the last registered hook runs first.
export async function resolve(specifier, context, nextResolve) {
  if (/^next\/[a-z-]+$/.test(specifier) && specifier !== "next/cache" && specifier !== "next/server") {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
}
