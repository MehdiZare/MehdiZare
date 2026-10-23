# Cloudflare R2 Media Setup (Strapi)

`config/plugins.ts` switches Strapi's upload plugin to the official S3 provider
(`@strapi/provider-upload-aws-s3`, pinned with Strapi) pointed at Cloudflare R2
when any of `R2_BUCKET`, `R2_ACCESS_KEY_ID` or `R2_SECRET_ACCESS_KEY` is set.
In production the cms-platform app (MehdiZare/cms-platform) provides them.

## Environment variables

Required once R2 is on (a partial set fails the boot, so uploads never land on
the container disk that a redeploy wipes):

- `R2_BUCKET`
- `R2_ACCESS_KEY_ID` (bucket-scoped R2 API token, Object Read & Write)
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_URL` (public custom domain for file URLs, `https://media.mehdi-zare.com`)
- `R2_ACCOUNT_ID`, or `R2_ENDPOINT`

Optional:

- `R2_ENDPOINT` (defaults to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`; also used for the CSP in `config/middlewares.ts`)
- `R2_REGION` (default `auto`)
- `R2_ROOT_PATH` (key prefix inside the bucket; production uses `media`)

## R2 specifics

- No ACLs: R2 has no object ACLs, so the config sends none (the provider would
  otherwise default every upload to `public-read`). Public access comes from the
  bucket's custom domain.
- Path-style addressing (`forcePathStyle`) and checksums only where S3 requires
  them (`WHEN_REQUIRED`), for AWS SDK versions that add CRC checksums by default.

## Fallback behavior

With none of the trigger variables set (local dev, CI), Strapi uses the default
local upload provider (`public/uploads`).
