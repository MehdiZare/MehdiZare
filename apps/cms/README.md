# CMS App (`apps/cms`)

Strapi 5 backend that powers site content and contact submissions.

## Commands

- `pnpm --filter=cms dev`
- `pnpm --filter=cms build`
- `pnpm --filter=cms start`
- `task docker:build:cms` (image build from the repo root)

## Docker / Corepack pnpm pin

The CMS Dockerfile does **not** hardcode a pnpm version. Both stages copy `package.json`, `scripts/package-manager.mjs`, and `scripts/corepack-prepare-pnpm.mjs`, then run the prepare script so Corepack activates `package.json#packageManager`.

`packageManager` integrity **must be hex SHA-512** (`pnpm@<version>+sha512.<128 hex chars>`), not npm's SRI form (`sha512-...`). Corepack treats `+…` as semver build metadata and compares a hex digest, so base64 hashes are rejected.

Root `pnpm test` runs `node --test 'scripts/*.test.mjs'` and fails CI if a Docker stage stops using the helper or the hash is not hex.

To bump pnpm: run `corepack use pnpm@<version>` at the repo root (writes hex integrity) and rebuild the image. Do not edit `pnpm@…` inside `apps/cms/Dockerfile`.

## Required Environment Variables (Production)

- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

## Optional Environment Variables

- `DATABASE_CLIENT` (defaults to `sqlite`)
- `DATABASE_FILENAME` (defaults to `/data/cms.db` in production, `.tmp/data.db` in development)
- Postgres/MySQL credentials (`DATABASE_URL` or host/user/password vars) when `DATABASE_CLIENT` is not `sqlite`
- `CORS_ORIGINS` (comma-separated origins, defaults to `https://www.mehdi-zare.com,https://mehdi-zare.com` in production and `http://localhost:3000` in development)
- Admin session lifespan overrides (all optional; defaults are set in `config/admin.ts`):
  - `ADMIN_AUTH_ACCESS_TOKEN_LIFESPAN` (default `1800` seconds)
  - `ADMIN_AUTH_MAX_REFRESH_TOKEN_LIFESPAN` (default `2592000` seconds)
  - `ADMIN_AUTH_IDLE_REFRESH_TOKEN_LIFESPAN` (default `1209600` seconds)
  - `ADMIN_AUTH_MAX_SESSION_LIFESPAN` (default `2592000` seconds)
  - `ADMIN_AUTH_IDLE_SESSION_LIFESPAN` (default `7200` seconds)
- `R2_*` variables for Cloudflare R2 uploads (see `R2_SETUP.md`)

## Security Notes

- Env validation runs at startup from `config/env-validation.ts`.
- CORS and CSP directives are configured in `config/middlewares.ts`.
- `contact-submission` API route is restricted to `create` only and payload is validated in controller code.
