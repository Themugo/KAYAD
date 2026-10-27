#!/bin/bash
# usage: reset_db.sh legacy|owner   -> recreates kayad_t from the repo-built template (+ owner governance + owner MFA candidates in owner mode), reloads PostgREST
MODE=${1:-legacy}; P="psql -h 127.0.0.1 -p 54329 -U postgres -q"
$P -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='kayad_t'" >/dev/null 2>&1
$P -d postgres -c "drop database if exists kayad_t" -c "create database kayad_t template kayad_16b_base" >/dev/null 2>&1
if [ "$MODE" = owner ]; then
  $P -d kayad_t -v ON_ERROR_STOP=1 -f $(cat /home/claude/p16c/ws.path)/runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql >/dev/null 2>/home/claude/p16c/ev/owner_mig.err || echo "owner governance candidate FAILED"
  $P -d kayad_t -v ON_ERROR_STOP=1 -f $(cat /home/claude/p16c/ws.path)/runbooks/phase16-20261026/migration-candidate/20261026120000_phase16_owner_mfa_CANDIDATE.sql >/dev/null 2>>/home/claude/p16c/ev/owner_mig.err || echo "owner mfa candidate FAILED"
fi
pkill -USR1 -x postgrest 2>/dev/null; pkill -USR2 -x postgrest 2>/dev/null; sleep 1; echo "db mode=$MODE ready"
