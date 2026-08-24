FROM node:24-alpine AS base

RUN apk add --no-cache build-base gcc autoconf automake libtool zlib-dev libpng-dev vips-dev

WORKDIR /app

# Activate pnpm from package.json#packageManager (hex SHA-512 required; Corepack splits on +).
COPY package.json ./
COPY scripts/package-manager.mjs scripts/corepack-prepare-pnpm.mjs ./scripts/
RUN node scripts/corepack-prepare-pnpm.mjs

# Copy remaining workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy cms package.json for dependency resolution
COPY apps/cms/package.json ./apps/cms/

# Copy shared package
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy cms source code
COPY apps/cms/ ./apps/cms/

# Copy shared source
COPY packages/shared/ ./packages/shared/

# Build Strapi admin panel
RUN pnpm --filter cms build

# --- Production stage ---
FROM node:24-alpine AS production

RUN apk add --no-cache vips-dev

WORKDIR /app

# Activate pnpm from package.json#packageManager (hex SHA-512 required; Corepack splits on +).
COPY package.json ./
COPY scripts/package-manager.mjs scripts/corepack-prepare-pnpm.mjs ./scripts/
RUN node scripts/corepack-prepare-pnpm.mjs

COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy cms package.json
COPY apps/cms/package.json ./apps/cms/

# Copy shared package
COPY packages/shared/ ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built Strapi from build stage
COPY --from=base /app/apps/cms/dist ./apps/cms/dist
COPY --from=base /app/apps/cms/src ./apps/cms/src
COPY --from=base /app/apps/cms/config ./apps/cms/config
COPY --from=base /app/apps/cms/tsconfig.json ./apps/cms/tsconfig.json
COPY --from=base /app/apps/cms/public ./apps/cms/public

# Symlink uploads to the persistent volume so media survives redeploys
RUN mkdir -p /data/uploads \
 && rm -rf /app/apps/cms/public/uploads \
 && ln -s /data/uploads /app/apps/cms/public/uploads

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337
ENV DATABASE_FILENAME=/data/cms.db

EXPOSE 1337

WORKDIR /app/apps/cms

CMD ["pnpm", "start"]
