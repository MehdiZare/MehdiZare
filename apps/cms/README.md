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
- `DATABASE_CLIENT` (`postgres`)
- Database credentials (`DATABASE_URL` or host/user/password set)

## Optional Environment Variables

- `CORS_ORIGINS` (comma-separated origins, defaults to `http://localhost:3000`)
- `R2_*` variables for Cloudflare R2 uploads (see `R2_SETUP.md`)

## Security Notes

- Env validation runs at startup from `config/env-validation.ts`.
- CORS and CSP directives are configured in `config/middlewares.ts`.
- `contact-submission` API route is restricted to `create` only and payload is validated in controller code.
