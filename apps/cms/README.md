# CMS App (`apps/cms`)

Strapi 5 backend that powers site content and contact submissions.

## Commands

- `pnpm --filter=cms dev`
- `pnpm --filter=cms build`
- `pnpm --filter=cms start`

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
- `R2_*` variables for Cloudflare R2 uploads (see `R2_SETUP.md`)

## Security Notes

- Env validation runs at startup from `config/env-validation.ts`.
- CORS and CSP directives are configured in `config/middlewares.ts`.
- `contact-submission` API route is restricted to `create` only and payload is validated in controller code.
