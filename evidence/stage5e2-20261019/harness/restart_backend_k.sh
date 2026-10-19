#!/usr/bin/env bash
# disposable stack only. Restart the backend from the tree in $KAYAD_ROOT. If WEBHOIST_EMAIL_K is SET (even empty) it overrides the designated list.
export PATH=/home/claude/s5a/node22/package/bin:$PATH
S=/home/claude/s5c/stack
if [ -f $S/backend.pid ]; then kill "$(cat $S/backend.pid)" 2>/dev/null; sleep 1; fi
cd "${KAYAD_ROOT:?}/backend"; set -a; . $S/backend.env; set +a
if [ "${WEBHOIST_EMAIL_K+set}" = set ]; then export WEBHOIST_EMAIL="$WEBHOIST_EMAIL_K"; fi
nohup node --import $S/brevo-capture.mjs bootstrap.js > $S/backend.log 2>&1 &
echo $! > $S/backend.pid
for i in $(seq 1 60); do curl -sf http://127.0.0.1:5050/health/live >/dev/null && { echo up; exit 0; }; sleep 0.5; done; echo "backend did not start"; tail -20 $S/backend.log; exit 1
