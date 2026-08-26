import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "node_modules",
]);

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(path);
      continue;
    }

    yield path;
  }
}

test("root typecheck runs turbo typecheck, not pnpm exec tsc", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.typecheck, "turbo typecheck");
});

test("workspace packages expose a typecheck script that is tsc --noEmit", () => {
  for (const relativePath of [
    "apps/web/package.json",
    "apps/cms/package.json",
    "packages/shared/package.json",
  ]) {
    const pkg = JSON.parse(read(relativePath));
    assert.equal(
      pkg.scripts.typecheck,
      "tsc --noEmit",
      `${relativePath} must define typecheck as tsc --noEmit`,
    );
  }
});

test("turbo.json defines a workspace typecheck task", () => {
  const turbo = JSON.parse(read("turbo.json"));
  assert.ok(turbo.tasks.typecheck, "turbo.json must define a typecheck task");
  assert.deepEqual(turbo.tasks.typecheck.dependsOn, ["^typecheck"]);
});

test("Taskfile typecheck cmd is pnpm typecheck", () => {
  assert.match(
    read("Taskfile.yml"),
    /^  typecheck:\n    desc: .*\n    cmd: pnpm typecheck$/m,
  );
});

test("CI and husky invoke pnpm typecheck, not tsc via exec", () => {
  assert.match(read(".github/workflows/ci.yml"), /^\s+run: pnpm typecheck$/m);
  assert.match(read(".husky/pre-push"), /^pnpm typecheck && /);
});

test("docs do not tell agents to pnpm exec tsc", () => {
  assert.doesNotMatch(read("apps/web/README.md"), /exec tsc/);
  assert.doesNotMatch(read("AGENTS.md"), /exec tsc --noEmit/);
  assert.match(read("AGENTS.md"), /Never `pnpm --filter=\* exec tsc`/);
});

test("no workflow, task, or package script invokes tsc via pnpm exec", () => {
  const allowed = new Set([
    resolve(root, "AGENTS.md"),
    resolve(root, "scripts/typecheck.test.mjs"),
  ]);

  for (const file of walkFiles(root)) {
    if (allowed.has(file)) {
      continue;
    }

    if (!/\.(md|yml|yaml|json|mjs|ts|tsx|sh)$/.test(file)) {
      continue;
    }

    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /exec tsc/,
      `${file} must not invoke tsc via pnpm exec`,
    );
  }
});
