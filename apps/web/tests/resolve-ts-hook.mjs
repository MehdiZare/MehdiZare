const SRC_BASE = new URL("../src/", import.meta.url);
const SERVER_ONLY_STUB = new URL("./server-only-stub.mjs", import.meta.url);
const TAXONOMY_STUB = new URL("./taxonomy-stub.mjs", import.meta.url);

async function tryResolveAlias(specifier, context, nextResolve) {
  const target = new URL(specifier.slice(2), SRC_BASE);
  const base = target.href.replace(/\/$/, "");
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.mjs`,
  ];

  for (const candidate of candidates) {
    try {
      return await nextResolve(candidate, context);
    } catch {
      // Continue trying candidates.
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }

  if (specifier === "server-only") {
    return {
      url: SERVER_ONLY_STUB.href,
      shortCircuit: true,
    };
  }

  if (
    specifier === "../../../../data/taxonomy.json" ||
    specifier.endsWith("/data/taxonomy.json")
  ) {
    return {
      url: TAXONOMY_STUB.href,
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    const aliasResolution = await tryResolveAlias(specifier, context, nextResolve);
    if (aliasResolution) {
      return aliasResolution;
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && !specifier.endsWith(".ts")) {
      const tsSpecifier = specifier + ".ts";
      try {
        return await nextResolve(tsSpecifier, context);
      } catch {
        // Fall through to original error.
      }
    }
    throw error;
  }
}
