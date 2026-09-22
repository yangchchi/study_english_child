# syntax=docker/dockerfile:1

# --- deps: cached unless package*.json changes ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV npm_config_registry=https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# --- openssl-base: Prisma needs libssl3 (slim 不含). 直拉 .deb，跳过 apt-get update ---
# builder + runner 共用，保持稳定以便缓存
FROM node:22-bookworm-slim AS openssl-base
COPY scripts/install-runtime-libs.mjs /tmp/install-runtime-libs.mjs
RUN node /tmp/install-runtime-libs.mjs && rm -f /tmp/install-runtime-libs.mjs

# --- builder: needs openssl so prisma generate picks openssl-3.0.x engines ---
FROM openssl-base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_registry=https://registry.npmmirror.com
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# package.json "build" already runs prisma generate
RUN npm run build

# --- runner: app layers only ---
FROM openssl-base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_registry=https://registry.npmmirror.com

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data ./data
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
