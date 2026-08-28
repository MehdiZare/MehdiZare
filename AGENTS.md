# Agent Instructions

`AGENTS.md` is the single source of truth for agent guidance in this repository.

## Policy

1. Keep all agent/project instructions in this file.
2. Do not duplicate instruction content in `CLAUDE.md`.
3. If instructions change, update `AGENTS.md` only.

## Typecheck

Run `pnpm typecheck` (Turbo) or `pnpm --filter=<pkg> typecheck`. Never `pnpm --filter=* exec tsc` — in this repo that can re-run install, prune `packages/shared/*`, and rewrite `pnpm-lock.yaml`. Do not add `typescript` as a root devDependency; each package that typechecks already has it.

## Content ownership

The repo and the CMS each own part of the site, and the split is not obvious
from either side.

**The repo owns** static page copy and site identity:
`apps/web/src/content/fallbacks/` and `apps/web/src/lib/site-profile-defaults.ts`.
Editing `home-page`, `about-page`, `consulting-page`, `bina-print-page` or
`site-setting` in the Strapi admin has **no effect on the live site** — those
records are no longer read, and `apps/cms/scripts/seed.ts` no longer writes
them. The Strapi types stay because dropping a single type drops its table.

**The CMS owns** articles, categories, tags, and the Author record.
`/author/[slug]` reads the author raw, with no repo-side fallback, so an
identity change there does need a CMS write — that is what
`apps/cms/scripts/sync-site-identity.ts` is for. Nothing else does.

Before reaching for a production CMS write, check which side owns the value.
