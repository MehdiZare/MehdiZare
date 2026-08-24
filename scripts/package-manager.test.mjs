import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { parsePackageManagerField } = await import("./package-manager.mjs");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("parsePackageManagerField accepts pnpm version with hex SHA-512 integrity", () => {
  const parsed = parsePackageManagerField(
    "pnpm@11.23.0+sha512.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(parsed.name, "pnpm");
  assert.equal(parsed.version, "11.23.0");
  assert.equal(parsed.corepackSpec, parsed.spec);
  assert.match(parsed.integrity, /^sha512\.[0-9a-f]+$/i);
});

test("parsePackageManagerField rejects npm base64 integrity that contains +", () => {
  assert.throws(
    () =>
      parsePackageManagerField(
        "pnpm@11.23.0+sha512-Ab+Cd/ef+base64plus",
      ),
    /hex SHA-512/,
  );
});

test("parsePackageManagerField rejects missing integrity", () => {
  assert.throws(
    () => parsePackageManagerField("pnpm@11.23.0"),
    /integrity/,
  );
});

test("parsePackageManagerField rejects non-pnpm package managers", () => {
  assert.throws(
    () =>
      parsePackageManagerField(
        "npm@10.0.0+sha512.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    /pnpm/,
  );
});

test("root package.json packageManager is Corepack-safe hex SHA-512", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const parsed = parsePackageManagerField(pkg.packageManager);
  assert.equal(parsed.version, pkg.packageManager.split("+")[0].replace("pnpm@", ""));
});

test("corepack-prepare-pnpm --check accepts the repo packageManager field", () => {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/corepack-prepare-pnpm.mjs"), "--check"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /packageManager ok: pnpm@/);
});

test("CMS Dockerfile derives pnpm from package.json instead of a hardcoded version", () => {
  const dockerfile = readFileSync(resolve(root, "apps/cms/Dockerfile"), "utf8");
  assert.match(dockerfile, /corepack-prepare-pnpm\.mjs/);
  assert.doesNotMatch(
    dockerfile,
    /corepack prepare pnpm@\d/,
    "Dockerfile must not hardcode corepack prepare pnpm@version",
  );
  const prepareCopies = dockerfile.match(
    /COPY scripts\/package-manager\.mjs scripts\/corepack-prepare-pnpm\.mjs \.\/scripts\//g,
  );
  assert.equal(prepareCopies?.length, 2, "both Docker stages must copy the prepare scripts");
});
