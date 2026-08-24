/**
 * Parse and validate package.json#packageManager for Corepack.
 *
 * Corepack splits `name@version+integrity` on `+`. npm's base64 SHA-512
 * integrity (`sha512-...`) can contain `+`, so Corepack rejects it. Use hex
 * (`sha512.<hex>`) until Corepack stops splitting on `+`.
 */

export function parsePackageManagerField(packageManager) {
  if (typeof packageManager !== "string" || packageManager.trim() === "") {
    throw new Error("package.json packageManager is missing");
  }

  const match = packageManager.trim().match(/^(pnpm)@([^+]+)(?:\+(.+))?$/);
  if (!match) {
    throw new Error(
      `packageManager must be pnpm@version+sha512.<hex>, got: ${packageManager}`,
    );
  }

  const [, name, version, integrity] = match;
  if (!integrity || !/^sha512\.[0-9a-f]+$/i.test(integrity)) {
    throw new Error(
      "packageManager integrity must be hex SHA-512 (sha512.<hex>), not npm base64. Corepack splits the field on +, so base64 hashes that contain + are rejected.",
    );
  }

  return {
    name,
    version,
    integrity,
    spec: `${name}@${version}+${integrity}`,
    corepackSpec: `${name}@${version}+${integrity}`,
  };
}
