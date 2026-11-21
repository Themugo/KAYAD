#!/bin/bash
PID=$(pgrep -f "^node bootstrap.js" | head -1); [ -n "$PID" ] && kill "$PID" && sleep 2
cd /home/claude/p16b/ws/KAYAD-PHASE16A-PRIMARY-OWNER-SECOND-OWNER-TEST-DEALER-PRESERVATION-20261026/backend
SR=$(cat /home/claude/pgrest/service_role.jwt)
env CLOUDINARY_CLOUD_NAME=disposable-local-placeholder CLOUDINARY_API_KEY=placeholder CLOUDINARY_API_SECRET=placeholder AUTH_RATE_LIMIT_MAX=100000 RATE_LIMIT_MAX=1000000 ADMIN_RATE_LIMIT_MAX=1000000 VERIFICATION_RATE_LIMIT_MAX=100000 REGISTRATION_RATE_LIMIT_MAX=100000 NODE_ENV=development PORT=5055 JWT_SECRET=local-16b-backend-jwt-secret-abcdef0123456789 SUPABASE_URL=http://127.0.0.1:54331 SUPABASE_SERVICE_ROLE_KEY=$SR REDIS_URL=redis://127.0.0.1:6390 $EXTRA_ENV nohup node bootstrap.js > /home/claude/p16b/backend.log 2>&1 &
for i in $(seq 1 40); do sleep 1; curl -s -m 2 http://127.0.0.1:5055/api/health | grep -q '"status":"ok"' && echo backend-up && exit 0; done
echo backend-failed; tail -n 20 /home/claude/p16b/backend.log; exit 1
