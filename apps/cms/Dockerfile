# Node >= 24.22.1 for CVE-2026-111497 (Strapi decompresses Brotli bodies before auth); re-pin on Node security releases.
FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS pnpm

# Corepack is unbundled from Node 25+. Install it here so this stage
# still works when the CMS image leaves Node 24.
RUN npm install -g corepack

WORKDIR /app

# pnpm from package.json#packageManager (Corepack-safe hex integrity).
COPY package.json ./
# Both install stages need the source patches referenced by the workspace.
COPY patches/ ./patches/
COPY scripts/package-manager.mjs scripts/corepack-prepare-pnpm.mjs ./scripts/
RUN node scripts/corepack-prepare-pnpm.mjs

FROM pnpm AS base

RUN apk add --no-cache build-base gcc autoconf automake libtool zlib-dev libpng-dev vips-dev

# Remaining root workspace manifests (lockfile + pnpm-workspace).
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy cms package.json for dependency resolution
COPY apps/cms/package.json ./apps/cms/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy cms source code
COPY apps/cms/ ./apps/cms/

# Build Strapi admin panel
RUN pnpm --filter cms build

# --- Production stage ---
FROM pnpm AS production

RUN apk add --no-cache vips-dev

# Remaining root workspace manifests (lockfile + pnpm-workspace).
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy cms package.json
COPY apps/cms/package.json ./apps/cms/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built Strapi from build stage
COPY --from=base /app/apps/cms/dist ./apps/cms/dist
COPY --from=base /app/apps/cms/src ./apps/cms/src
COPY --from=base /app/apps/cms/config ./apps/cms/config
# Strapi reads (and would otherwise mkdir) database/migrations at boot.
COPY --from=base /app/apps/cms/database ./apps/cms/database
COPY --from=base /app/apps/cms/tsconfig.json ./apps/cms/tsconfig.json
# The node user owns public/ only: the local upload provider (no R2 env)
# writes public/uploads. Code and dependencies stay root-owned, read-only.
COPY --from=base --chown=node:node /app/apps/cms/public ./apps/cms/public

# Media goes to Cloudflare R2 (config/plugins.ts) and the database to
# Postgres (config/database.ts); the image needs no volume.
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

EXPOSE 1337

WORKDIR /app/apps/cms

USER node

# Strapi's CLI directly: Corepack's pnpm lives in root's cache, so `pnpm start`
# as the node user would download pnpm at boot.
CMD ["node", "node_modules/@strapi/strapi/bin/strapi.js", "start"]
