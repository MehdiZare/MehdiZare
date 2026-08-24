#!/usr/bin/env node
/**
 * Enable Corepack and activate the pnpm version from package.json#packageManager.
 *
 * Integrity must be hex SHA-512 (`sha512.<hex>`). npm base64 hashes contain `+`,
 * and Corepack splits the packageManager field on `+`.
 *
 * Usage:
 *   node scripts/corepack-prepare-pnpm.mjs          # corepack enable + prepare
 *   node scripts/corepack-prepare-pnpm.mjs --check  # validate only
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePackageManagerField } from "./package-manager.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const parsed = parsePackageManagerField(pkg.packageManager);

if (process.argv.includes("--check")) {
  console.log(`packageManager ok: ${parsed.spec}`);
  process.exit(0);
}

const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" };

const enable = spawnSync("corepack", ["enable"], { stdio: "inherit", env });
if (enable.status !== 0) {
  process.exit(enable.status ?? 1);
}

const prepare = spawnSync(
  "corepack",
  ["prepare", parsed.spec, "--activate"],
  { stdio: "inherit", env },
);
process.exit(prepare.status ?? 1);
