# CMS App (`apps/cms`)

Strapi 5 backend that powers site content and contact submissions.

## Commands

- `pnpm --filter=cms dev`
- `pnpm --filter=cms build`
- `pnpm --filter=cms start`
- `task docker:build:cms` (image build from the repo root)

## Docker / Corepack pnpm pin

The CMS Dockerfile does **not** hardcode a pnpm version. Both stages copy `package.json` and run `scripts/corepack-prepare-pnpm.mjs`, which activates `package.json#packageManager`.

`packageManager` integrity **must be hex SHA-512** (`pnpm@<version>+sha512.<hex>`), not npm's base64 form (`sha512-...`). Corepack splits that field on `+`, so a base64 hash that contains `+` is rejected. `node --test scripts/*.test.mjs` (via root `pnpm test`) fails the build if the Dockerfile pin drifts or the hash is not hex.

To bump pnpm: change `packageManager` in the root `package.json` (hex integrity) and rebuild. Do not edit `pnpm@…` inside `apps/cms/Dockerfile`.

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
