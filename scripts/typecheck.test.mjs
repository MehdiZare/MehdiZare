import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("root typecheck runs turbo typecheck, not pnpm exec tsc", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.typecheck, "turbo typecheck");
  assert.doesNotMatch(pkg.scripts.typecheck, /exec tsc/);
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

test("Taskfile typecheck and pre-push do not use pnpm exec tsc", () => {
  const taskfile = read("Taskfile.yml");
  assert.doesNotMatch(taskfile, /exec tsc/);
  assert.match(taskfile, /^  typecheck:\n(?:.*\n)*?    cmd: pnpm typecheck/m);
});

test("docs do not tell agents to pnpm exec tsc", () => {
  assert.doesNotMatch(read("apps/web/README.md"), /exec tsc/);
  assert.doesNotMatch(read("AGENTS.md"), /exec tsc --noEmit/);
  assert.match(read("AGENTS.md"), /Never `pnpm --filter=\* exec tsc`/);
});
