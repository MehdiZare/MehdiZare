# Web App (`apps/web`)

Next.js App Router frontend for the public portfolio.

## Commands

- `pnpm --filter=web dev`
- `pnpm --filter=web lint`
- `pnpm --filter=web exec tsc --noEmit`
- `pnpm --filter=web test`
- `pnpm --filter=web build`

## Required Environment Variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_STRAPI_URL`
- `STRAPI_API_TOKEN` (required only when private Strapi endpoints are used)

## Optional Environment Variables

- `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS` (comma-separated hostnames)
- `REQUIRE_STRAPI_API_TOKEN` (`true` to hard-fail startup when token is missing)
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_BEEHIIV_EMBED_URL`
- `NEXT_PUBLIC_CALENDLY_URL`

## Security Notes

- Security headers and CSP are configured in `next.config.ts`.
- Contact submissions are validated server-side and rate limited in `src/app/contact/actions.ts`.
- Public and server env validation is centralized in `src/lib/public-env.ts` and `src/lib/server-env.ts`.
