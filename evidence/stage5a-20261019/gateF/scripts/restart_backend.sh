#!/usr/bin/env bash
export PATH=/home/claude/s5a/node22/package/bin:$PATH
if [ -f /home/claude/s5a/stack/backend.pid ]; then kill "$(cat /home/claude/s5a/stack/backend.pid)" 2>/dev/null; sleep 1; fi
cd /home/claude/s5a/work/backend; set -a; . /home/claude/s5a/stack/backend.env; set +a
nohup node --import /home/claude/s5a/stack/brevo-capture.mjs bootstrap.js > /home/claude/s5a/stack/backend.log 2>&1 &
echo $! > /home/claude/s5a/stack/backend.pid
for i in $(seq 1 60); do curl -sf http://127.0.0.1:5050/health/live >/dev/null && { echo up; exit 0; }; sleep 0.5; done; echo "backend did not start"; tail -20 /home/claude/s5a/stack/backend.log; exit 1
