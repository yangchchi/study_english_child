# syntax=docker/dockerfile:1

# --- deps: cached unless package*.json changes ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV npm_config_registry=https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# --- voices: ~120MB; only rebuilds when download script changes ---
FROM node:22-bookworm-slim AS voices
WORKDIR /app
COPY scripts/download-piper-voices.mjs ./scripts/download-piper-voices.mjs
RUN node scripts/download-piper-voices.mjs

# --- builder: source changes do NOT re-download voices ---
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_registry=https://registry.npmmirror.com
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# onnx is dockerignored; restore from the cached voices stage
COPY --from=voices /app/public/piper-voices ./public/piper-voices
# package.json "build" already runs prisma generate
RUN npm run build

# --- runner: openssl for Prisma, apt via Aliyun ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_registry=https://registry.npmmirror.com

RUN set -eux; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources; \
    fi; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list; \
    fi; \
    apt-get update -y; \
    apt-get install -y --no-install-recommends openssl ca-certificates; \
    rm -rf /var/lib/apt/lists/*

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
