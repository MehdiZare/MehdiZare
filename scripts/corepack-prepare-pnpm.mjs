#!/usr/bin/env node
/**
 * Enable Corepack and activate the pnpm version from package.json#packageManager.
 *
 * Integrity must be hex SHA-512 (`sha512.` plus 128 hex chars). npm SRI
 * (`sha512-…`) can contain `+`/`/`, and Corepack treats `+` as semver
 * build metadata.
 *
 * Usage:
 *   node scripts/corepack-prepare-pnpm.mjs          # corepack enable + prepare
 *   node scripts/corepack-prepare-pnpm.mjs --check  # validate packageManager shape only
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

// Disable Corepack's TTY download prompt so Docker/CI cannot hang.
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" };

function runCorepack(args) {
  const result = spawnSync("corepack", args, {
    stdio: "inherit",
    env,
    cwd: root,
  });
  const command = `corepack ${args.join(" ")}`;
  if (result.error) {
    console.error(`${command} failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`${command} killed by ${result.signal}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runCorepack(["enable"]);
runCorepack(["prepare", parsed.spec, "--activate"]);
