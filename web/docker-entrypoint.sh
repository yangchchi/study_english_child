#!/bin/sh
set -e
mkdir -p /app/sqlite
npx prisma migrate deploy
npx tsx prisma/seed.ts || true
exec npx next start -H 0.0.0.0 -p 3000
