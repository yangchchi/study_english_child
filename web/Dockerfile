# syntax=docker/dockerfile:1

# --- deps: cached unless package*.json changes ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund

# --- openssl-base: Prisma needs libssl3 (slim 不含). 直拉 .deb，跳过 apt-get update ---
FROM node:22-bookworm-slim AS openssl-base
COPY scripts/install-runtime-libs.mjs /tmp/install-runtime-libs.mjs
RUN node /tmp/install-runtime-libs.mjs && rm -f /tmp/install-runtime-libs.mjs

# --- builder ---
FROM openssl-base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# package.json "build" = prisma generate && next build (standalone)
RUN npm run build
# Bundle seed so the runner does not need tsx / full node_modules
RUN ./node_modules/.bin/esbuild prisma/seed.ts \
    --bundle \
    --platform=node \
    --target=node22 \
    --format=cjs \
    --outfile=prisma/seed.cjs \
    --external:@prisma/client

# --- runner: standalone only (no full node_modules copy) ---
FROM openssl-base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next standalone server + traced deps
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Prisma migrate + bundled seed
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
