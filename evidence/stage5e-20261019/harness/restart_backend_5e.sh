#!/usr/bin/env bash
# disposable stack only: restart the backend from the 5E tree with ONE designated owner (stand-in for the real single-owner activation)
export PATH=/home/claude/s5a/node22/package/bin:$PATH
if [ -f /home/claude/s5c/stack/backend.pid ]; then kill "$(cat /home/claude/s5c/stack/backend.pid)" 2>/dev/null; sleep 1; fi
cd "${KAYAD_ROOT:-/home/claude/s5e/ex}/backend"; set -a; . /home/claude/s5c/stack/backend.env; set +a
export WEBHOIST_EMAIL="${WEBHOIST_EMAIL_5E:-dealer-owner-5e@kayad-test.example}"
nohup node --import /home/claude/s5c/stack/brevo-capture.mjs bootstrap.js > /home/claude/s5c/stack/backend.log 2>&1 &
echo $! > /home/claude/s5c/stack/backend.pid
for i in $(seq 1 60); do curl -sf http://127.0.0.1:5050/health/live >/dev/null && { echo up; exit 0; }; sleep 0.5; done; echo "backend did not start"; tail -20 /home/claude/s5c/stack/backend.log; exit 1
