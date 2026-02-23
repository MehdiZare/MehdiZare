export async function resolve(specifier, context, nextResolve) {
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
