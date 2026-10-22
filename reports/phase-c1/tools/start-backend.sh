#!/bin/bash
# Starts the real KAYAD backend against the disposable local stack (never production).
. /home/claude/c1/bin/env.sh
cd "${BACKEND_DIR:-/home/claude/c1/final/backend}"
NODE_ENV=development PORT=5055 JWT_SECRET="$BACKEND_JWT_SECRET" REFRESH_TOKEN_SECRET="${BACKEND_JWT_SECRET}r" SESSION_SECRET="${BACKEND_JWT_SECRET}s" \
AUTH_RATE_LIMIT_MAX="${AUTH_RATE_LIMIT_MAX:-20}" REDIS_URL=redis://127.0.0.1:6390 FRONTEND_URL=http://127.0.0.1:4173 CLIENT_URL=http://127.0.0.1:4173 CORS_ORIGINS=http://127.0.0.1:4173 \
exec node bootstrap.js
