# CMS App (`apps/cms`)

Strapi 5 backend that powers site content and contact submissions.

## Commands

- `pnpm --filter=cms dev`
- `pnpm --filter=cms build`
- `pnpm --filter=cms start`
- `pnpm --filter=cms generate-types` (wipes `dist`, then `strapi ts:generate-types`)
- `task docker:build:cms` (image build from the repo root)

## Docker / Corepack pnpm pin

The CMS Dockerfile does **not** hardcode a pnpm version. A shared `pnpm` stage copies `package.json`, `scripts/package-manager.mjs`, and `scripts/corepack-prepare-pnpm.mjs`, installs Corepack (`npm install -g corepack`), and runs the prepare script so Corepack activates `package.json#packageManager`. `base` and `production` inherit that stage.

`packageManager` integrity **must be hex SHA-512** (`pnpm@<version>+sha512.<128 hex chars>`), not npm's SRI form (`sha512-...`). Corepack treats `+…` as semver build metadata and compares a hex digest, so base64 hashes are rejected.

Root `pnpm test` runs `node --test 'scripts/*.test.mjs'` and fails CI if the shared stage stops using the helper, `base`/`production` stop inheriting it, or the hash is not hex.

To bump pnpm: run `corepack use pnpm@<version>` at the repo root (writes hex integrity) and rebuild the image. Do not edit `pnpm@…` inside `apps/cms/Dockerfile`.

## Hosting

Production runs on the shared CMS platform (MehdiZare/cms-platform):
DigitalOcean App Platform plus DigitalOcean Managed Postgres, product key
`mehdizare`, served at `https://cms.svc.mehdi-zare.com`. The platform owns the
app, database, DNS and every env value below; this repo owns the Strapi code
and the image. `.github/workflows/cms-image.yml` builds `apps/cms/Dockerfile`
and pushes `mehdizare-cms:latest` (and the rollback tag `previous`) to the
platform's registry from the `cms-image` GitHub environment; the app deploys
on push. Health check: Strapi's built-in `GET /_health` (204, no database
query).

## Required Environment Variables (Production)

- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `DATABASE_CLIENT=postgres` and `DATABASE_URL` (or `DATABASE_HOST` + `DATABASE_NAME` + `DATABASE_USERNAME`). SQLite is refused when `NODE_ENV=production`.

## Optional Environment Variables

- Database (`config/database.ts`):
  - `DATABASE_CLIENT` (`sqlite` by default, for local dev and CI; `postgres` in production)
  - `DATABASE_FILENAME` (SQLite only, default `.tmp/data.db`)
  - `DATABASE_URL`: never with `sslmode` or another `ssl*` parameter (the config rejects it: pg-connection-string 2.14+ would replace the TLS settings and drop the CA)
  - `DATABASE_SSL` (`true` for TLS), `DATABASE_SSL_CA` (PEM), `DATABASE_SSL_REJECT_UNAUTHORIZED` (default `true`)
  - `DATABASE_POOL_MAX` (default `10`; the platform sets `3`), `DATABASE_POOL_MIN` (default `2`, capped at the max)
  - `DATABASE_SCHEMA` (default `public`)
- `REQUIRE_EXISTING_ADMIN` (`true` in production): the boot fails when the database has no admin user, so a wrong or empty database never offers first-admin registration (`src/utils/require-existing-admin.ts`)
- `URL`: Strapi's public URL for absolute admin and upload links
- `CORS_ORIGINS` (comma-separated origins, defaults to `https://www.mehdi-zare.com,https://mehdi-zare.com` in production and `http://localhost:3000` in development)
- Admin session lifespan overrides (all optional; defaults are set in `config/admin.ts`):
  - `ADMIN_AUTH_ACCESS_TOKEN_LIFESPAN` (default `1800` seconds)
  - `ADMIN_AUTH_MAX_REFRESH_TOKEN_LIFESPAN` (default `2592000` seconds)
  - `ADMIN_AUTH_IDLE_REFRESH_TOKEN_LIFESPAN` (default `604800` seconds)
  - `ADMIN_AUTH_MAX_SESSION_LIFESPAN` (default `604800` seconds)
  - `ADMIN_AUTH_IDLE_SESSION_LIFESPAN` (default `3600` seconds)
- `R2_*` variables for Cloudflare R2 uploads (see `R2_SETUP.md`); without them uploads use the local provider

## Tests

`pnpm --filter=cms test` (also part of root `pnpm test`) runs `tests/*.test.ts`
with `node --test` through `tsx`: database, upload and server config, and the
admin boot guard.

## Security Notes

- Env validation runs at startup from `config/env-validation.ts`.
- CORS and CSP directives are configured in `config/middlewares.ts`.
- `contact-submission` API route is restricted to `create` only and payload is validated in controller code.
