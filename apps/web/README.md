# Web App (`apps/web`)

Next.js App Router frontend for the public portfolio.

## Commands

- `pnpm --filter=web dev`
- `pnpm --filter=web lint`
- `pnpm --filter=web exec tsc --noEmit`
- `pnpm --filter=web test`
- `pnpm --filter=web build`
- `pnpm --filter=web posthog:push-dashboard`

## Required Environment Variables

- `NEXT_PUBLIC_SITE_URL` (`https://www.mehdi-zare.com` in production)
- `STRAPI_URL` (`http://localhost:1337` for local dev)
- `STRAPI_API_TOKEN` (required only when private Strapi endpoints are used)

## Optional Environment Variables

- `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS` (comma-separated hostnames)
- `REQUIRE_STRAPI_API_TOKEN` (`true` to hard-fail startup when token is missing)
- `DISABLE_STRAPI_CMS` (defaults to `false`; set to `true` to use fallback content only)
- `ENABLE_BINA_PRINT` (`true` to expose `/bina-print` and related links)
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `STRAPI_FETCH_REVALIDATE_SECONDS` (optional; defaults to `600`)
- `REVALIDATE_SECRET` (optional but recommended if using `/api/revalidate`)
- `POSTHOG_PERSONAL_API_KEY` (required for dashboard sync script)
- `POSTHOG_ENVIRONMENT_ID` (optional, defaults to `@current`)
- `POSTHOG_APP_HOST` (optional, defaults to `https://us.posthog.com`)
- `POSTHOG_DRY_RUN` (optional, `true` to preview API actions)

## CMS Cache Invalidation

To force immediate frontend updates after publishing in Strapi, call:

`POST /api/revalidate?secret=<REVALIDATE_SECRET>`

Recommended Strapi webhook payload shape:

```json
{
  "event": "entry.publish",
  "model": "article",
  "entry": { "slug": "my-post-slug" }
}
```

## Security Notes

- Security headers and CSP are configured in `next.config.ts`.
- Contact submissions are validated server-side and rate limited in `src/app/contact/actions.ts`.
- Public and server env validation is centralized in `src/lib/public-env.ts` and `src/lib/server-env.ts`.
