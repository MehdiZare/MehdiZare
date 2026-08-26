# Agent Instructions

`AGENTS.md` is the single source of truth for agent guidance in this repository.

## Policy

1. Keep all agent/project instructions in this file.
2. Do not duplicate instruction content in `CLAUDE.md`.
3. If instructions change, update `AGENTS.md` only.

## Typecheck

Run `pnpm typecheck` (Turbo) or `pnpm --filter=<pkg> typecheck`. Never `pnpm --filter=* exec tsc` — in this repo that can re-run install, prune `packages/shared/*`, and rewrite `pnpm-lock.yaml`. Do not add `typescript` as a root devDependency; each package that typechecks already has it.
