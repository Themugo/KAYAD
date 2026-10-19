#!/bin/bash
# Usage: run_all.sh <project_root> <log_dir>   (offline suites; same set on working tree and on the extracted ZIP)
ROOT="$1"; LOG="$2"; mkdir -p "$LOG"; cd "$ROOT"
run() { name="$1"; shift; s=$(date +%s); "$@" > "$LOG/$name.log" 2>&1; ec=$?; e=$(date +%s); echo "$name | exit=$ec | $((e-s))s | $*" | tee -a "$LOG/summary.txt"; }
: > "$LOG/summary.txt"
echo "node $(node -v) npm $(npm -v)" | tee -a "$LOG/summary.txt"
run tsc npx tsc --noEmit
run build npm run build
run front_vitest npx vitest run
(cd backend && run back_jest npm run test:jest)
(cd backend && run back_vitest npm run test:vitest)
(cd backend && run back_node timeout 300 npm run test:node)
(cd backend && grep -q "exit=124\|exit=143" "$LOG/summary.txt" && echo "NOTE: node:test hit the 300s guard (known intermittent keep-alive hang); rerunning once" | tee -a "$LOG/summary.txt" && run back_node_rerun timeout 300 npm run test:node)
bash "$ROOT/evidence/stage5a-20261019/gateG/run_validators.sh" "$ROOT" "$(cd "$LOG" && pwd)/validators_results.txt"
