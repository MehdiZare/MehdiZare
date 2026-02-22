# Mehdi Zare Personal Website

Monorepo for a personal site powered by Strapi CMS and Next.js.

## Stack

- Frontend: Next.js (`apps/web`)
- Backend CMS: Strapi 5 (`apps/cms`)
- Workspace tooling: pnpm + Turborepo + Taskfile
- Deployment target:
  - Frontend -> Vercel
  - CMS -> Railway (Postgres)

## Repository Layout

- `apps/web`: public website (React/Next.js)
- `apps/cms`: Strapi content API and admin panel
- `packages/shared`: shared types/helpers used across apps

## Design System Direction

We will use licensed UI assets with this rule:

- Base components and structure: Untitled UI Pro
- Advanced motion/visual sections: Aceternity UI
- Integration pattern: wrap imported vendor components behind local components before using them in pages

Recommended implementation locations:

- Base primitives and section building blocks: `apps/web/src/components/shared`
- Brand tokens (colors, spacing, typography): `apps/web/src/app/globals.css`
- Page-specific compositions: `apps/web/src/components/*`

## Local Development

1. Install dependencies:

```bash
task install
```

2. Configure CMS env:

```bash
cp apps/cms/.env.example apps/cms/.env
```

3. Configure frontend env:

```bash
cp apps/web/.env.example apps/web/.env.local
```

4. Start both apps:

```bash
task dev
```

Useful commands:

- `task dev:web`: run Next.js only
- `task dev:cms`: run Strapi only
- `task build`: build all apps/packages
- `task lint`: run workspace lint

## Environment Variables

### Frontend (`apps/web/.env.local`)

- `NEXT_PUBLIC_STRAPI_URL`: Strapi base URL (local: `http://localhost:1337`)
- `STRAPI_API_TOKEN`: Strapi API token used by server-side requests

### CMS (`apps/cms/.env`)

- `HOST`, `PORT`
- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- Database vars for production (`DATABASE_CLIENT=postgres`, `DATABASE_URL`)
- Cloudflare R2 vars for media uploads (`R2_*`; see `apps/cms/R2_SETUP.md`)

## Deployment

### Frontend on Vercel

- Set project root to `apps/web`
- Build command: `pnpm turbo build --filter=web`
- Add env vars:
  - `NEXT_PUBLIC_STRAPI_URL` -> Railway CMS public URL
  - `STRAPI_API_TOKEN` -> Strapi API token

### CMS on Railway

- `apps/cms/railway.yaml` is already configured for Docker deployment
- Provision Postgres and keep `DATABASE_URL` connected
- Set Strapi secrets (`APP_KEYS`, `ADMIN_JWT_SECRET`, etc.)
- Expose service on port `1337`

## Next Implementation Step

Set up a dedicated design-system layer in `apps/web` so Untitled UI Pro and Aceternity are imported once, wrapped, and reused consistently across pages.
