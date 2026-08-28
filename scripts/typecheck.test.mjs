import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Build and dependency output only. Second checkouts of this repo are skipped
// by isNestedCheckout instead, so this set does not have to enumerate every
// path some tool might create a worktree in.
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".cache",
  ".worktrees",
  "dist",
  "node_modules",
]);

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

/**
 * A directory holding a `.git` entry is a separate checkout of this repo, so
 * it carries its own copy of every file the allowlist exempts by root absolute
 * path -- including the AGENTS.md that documents the banned command by name.
 * Scanning one trips this guard on the repo's own prose and blocks every push.
 *
 * `.git` is a directory in a clone and a pointer file in a worktree, so this
 * tests for existence rather than type.
 */
function isNestedCheckout(dir) {
  return existsSync(resolve(dir, ".git"));
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (isNestedCheckout(path)) {
        continue;
      }

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

test("the scanner does not descend into a nested checkout outside .worktrees", () => {
  // The allowlist exempts AGENTS.md by root absolute path, so every second
  // checkout of this repo carries an AGENTS.md that is not exempt -- and
  // AGENTS.md documents the banned command by name. Skipping by directory
  // name only covers the paths we thought to enumerate: #78 added
  // `.worktrees`, and the guard then tripped on Claude Code's own worktrees
  // under `.claude/worktrees`. Skip on the property instead -- a directory
  // holding a `.git` entry is a separate checkout, whatever it is called.
  const fixtureDir = resolve(root, "__nested_checkout_fixture__");
  mkdirSync(fixtureDir, { recursive: true });
  // A worktree's .git is a pointer file, not a directory.
  writeFileSync(resolve(fixtureDir, ".git"), "gitdir: /tmp/nowhere\n");
  writeFileSync(resolve(fixtureDir, "AGENTS.md"), "pnpm --filter=* exec tsc\n");

  try {
    const scanned = [...walkFiles(root)].filter((file) =>
      file.startsWith(`${fixtureDir}/`),
    );

    assert.deepEqual(
      scanned,
      [],
      "walkFiles must skip any directory containing a .git entry",
    );
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("Next.js output is not tracked", () => {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "**/.next", "**/.next/**"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    tracked,
    "",
    "a tracked apps/web/.next symlink to a local machine path makes `next build` fail on Linux with ENOENT mkdir"
  );
});

test("the scanner does not descend into nested worktree checkouts", () => {
  // A git worktree under .worktrees/ is a second checkout of this repo, so it
  // carries its own AGENTS.md. That copy is not the allowlisted root path, and
  // AGENTS.md documents the banned command by name -- scanning it trips the
  // guard on its own prose and blocks every push.
  const fixtureDir = resolve(root, ".worktrees/__scanner_fixture__");
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(resolve(fixtureDir, "AGENTS.md"), "pnpm --filter=* exec tsc\n");

  try {
    const worktreesRoot = resolve(root, ".worktrees");
    const scanned = [...walkFiles(root)].filter((file) =>
      file.startsWith(`${worktreesRoot}/`),
    );

    assert.deepEqual(
      scanned,
      [],
      "walkFiles must skip .worktrees so sibling checkouts are not scanned",
    );
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
