#!/bin/sh
set -e
# Prisma CLI (devDependency at build time; copied into the slim runner)
node ./node_modules/prisma/build/index.js migrate deploy
# Seed is best-effort; ignore failures on restart
node ./prisma/seed.cjs || true
exec node server.js
