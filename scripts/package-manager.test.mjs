import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePackageManagerField } from "./package-manager.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HEX_128 = "a".repeat(128);
const HEX_SPEC = `pnpm@11.23.0+sha512.${HEX_128}`;

function dockerStages(text) {
  const stages = {};
  for (const part of text.split(/^FROM /m).slice(1)) {
    const name = part.match(/AS (\S+)/)?.[1];
    stages[name] = `FROM ${part}`;
  }
  return stages;
}

test("parsePackageManagerField accepts pnpm version with hex SHA-512 integrity", () => {
  const parsed = parsePackageManagerField(HEX_SPEC);
  assert.equal(parsed.name, "pnpm");
  assert.equal(parsed.version, "11.23.0");
  assert.equal(parsed.spec, HEX_SPEC);
  assert.match(parsed.integrity, /^sha512\.[0-9a-f]{128}$/i);
});

test("parsePackageManagerField rejects npm base64 integrity that contains +", () => {
  assert.throws(
    () => parsePackageManagerField("pnpm@11.23.0+sha512-Ab+Cd/ef+base64plus"),
    /hex SHA-512/,
  );
});

test("parsePackageManagerField rejects npm SRI base64 without an extra +", () => {
  assert.throws(
    () => parsePackageManagerField("pnpm@11.23.0+sha512-AbCdEfGhij="),
    /hex SHA-512/,
  );
});

test("parsePackageManagerField rejects short hex integrity", () => {
  assert.throws(
    () => parsePackageManagerField("pnpm@11.23.0+sha512.aa"),
    /hex SHA-512/,
  );
});

test("parsePackageManagerField rejects missing integrity", () => {
  assert.throws(
    () => parsePackageManagerField("pnpm@11.23.0"),
    /integrity/,
  );
});

test("parsePackageManagerField rejects missing or blank packageManager", () => {
  assert.throws(() => parsePackageManagerField(undefined), /missing/);
  assert.throws(() => parsePackageManagerField(""), /missing/);
  assert.throws(() => parsePackageManagerField("   "), /missing/);
});

test("parsePackageManagerField rejects non-pnpm package managers", () => {
  assert.throws(
    () => parsePackageManagerField(`npm@10.0.0+sha512.${HEX_128}`),
    /pnpm/,
  );
});

test("root package.json packageManager is Corepack-safe hex SHA-512", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.match(
    pkg.packageManager,
    /^pnpm@[^+]+\+sha512\.[0-9a-f]{128}$/i,
  );
  const parsed = parsePackageManagerField(pkg.packageManager);
  assert.equal(parsed.spec, pkg.packageManager);
});

test("root pnpm test still runs repo script tests", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.match(pkg.scripts.test, /node --test ['"]scripts\/\*\.test\.mjs['"]/);
});

test("corepack-prepare-pnpm --check accepts the repo packageManager field without corepack", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/corepack-prepare-pnpm.mjs"), "--check"],
    { encoding: "utf8", env: { ...process.env, PATH: "" } },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    `packageManager ok: ${pkg.packageManager}`,
  );
});

test("each CMS Docker stage copies package.json and runs the Corepack helper", () => {
  const dockerfile = readFileSync(resolve(root, "apps/cms/Dockerfile"), "utf8");
  const stages = dockerStages(dockerfile);
  for (const name of ["base", "production"]) {
    const stage = stages[name];
    assert.ok(stage, `missing stage ${name}`);
    assert.match(stage, /COPY package\.json \.\//);
    assert.match(stage, /package-manager\.mjs/);
    assert.match(stage, /corepack-prepare-pnpm\.mjs/);
    assert.match(stage, /RUN node scripts\/corepack-prepare-pnpm\.mjs/);
    assert.doesNotMatch(
      stage,
      /corepack prepare pnpm@\d/,
      `${name} must not hardcode corepack prepare pnpm@version`,
    );
  }
});
