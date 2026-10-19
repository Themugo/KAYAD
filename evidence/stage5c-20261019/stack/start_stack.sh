#!/usr/bin/env bash
# DISPOSABLE LOCAL STACK ONLY. PG 54339 (already running) -> PostgREST 54340 -> prefix proxy 54341 -> backend 5050 -> Vite 5173
export PATH=/home/claude/s5a/node22/package/bin:$PATH
S=/home/claude/s5c/stack
stop() { [ -f "$S/$1.pid" ] && kill "$(cat $S/$1.pid)" 2>/dev/null; rm -f "$S/$1.pid"; }
for n in postgrest proxy; do stop $n; done
nohup /home/claude/s5a/tools/postgrest $S/postgrest.conf > $S/postgrest.log 2>&1 & echo $! > $S/postgrest.pid
nohup node $S/rest-prefix-proxy.mjs > $S/proxy.log 2>&1 & echo $! > $S/proxy.pid
for i in $(seq 1 40); do curl -sf http://127.0.0.1:54340/ >/dev/null && break; sleep 0.5; done
bash $S/restart_backend.sh
if [ ! -f $S/vite.pid ] || ! kill -0 "$(cat $S/vite.pid)" 2>/dev/null; then
  cd /home/claude/s5c/work && VITE_DEV_API_TARGET=http://127.0.0.1:5050 nohup npx vite --host 127.0.0.1 --port 5173 --strictPort > $S/vite.log 2>&1 & echo $! > $S/vite.pid
fi
for i in $(seq 1 60); do curl -sf http://127.0.0.1:5173/ >/dev/null && { echo "stack up"; exit 0; }; sleep 0.5; done; echo "vite did not start"; tail -5 $S/vite.log; exit 1
