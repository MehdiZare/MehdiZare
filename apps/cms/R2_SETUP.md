# Cloudflare R2 Media Setup (Strapi)

This CMS is configured to use Cloudflare R2 via Strapi's official S3 upload provider (`@strapi/provider-upload-aws-s3`).

## Required environment variables

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL` (public bucket/custom domain URL used for file URLs)

Optional:

- `R2_ENDPOINT` (defaults to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`)
- `R2_REGION` (default: `auto`)
- `R2_ROOT_PATH` (folder prefix inside bucket)
- `R2_SIGNED_URL_EXPIRES` (default: `900`)
- `R2_ACL` (leave empty for R2)

## Important R2 note

Cloudflare R2 does not support ACL operations. Keep `R2_ACL` unset/empty.

## Fallback behavior

If required `R2_*` variables are missing, Strapi falls back to the default local upload provider.
