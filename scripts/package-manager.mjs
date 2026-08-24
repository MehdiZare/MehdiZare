/**
 * Parse and validate package.json#packageManager for Corepack.
 *
 * Corepack treats `+…` as semver build metadata (`name@version+integrity`)
 * and compares a hex digest. npm's SRI form (`sha512-<base64>`) can contain
 * `+` or `/`, so it is rejected. Use `sha512.` plus 128 hex characters.
 */

const HEX_SHA512 = /^sha512\.[0-9a-f]{128}$/i;

export function parsePackageManagerField(packageManager) {
  const value = typeof packageManager === "string" ? packageManager.trim() : "";
  if (value === "") {
    throw new Error("package.json packageManager is missing");
  }

  const match = value.match(/^(pnpm)@([^+]+)(?:\+(.+))?$/);
  if (!match) {
    throw new Error(
      `packageManager must be pnpm@version+sha512.<128 hex chars>, got: ${packageManager}`,
    );
  }

  const [, name, version, integrity] = match;
  if (!integrity || !HEX_SHA512.test(integrity)) {
    throw new Error(
      "packageManager integrity must be hex SHA-512 (sha512.<128 hex chars>), not npm base64. Corepack treats + as semver build metadata, so base64 SRI is rejected.",
    );
  }

  return {
    name,
    version,
    integrity,
    spec: `${name}@${version}+${integrity}`,
  };
}
