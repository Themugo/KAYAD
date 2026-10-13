#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI is required. Install it before deploying."; exit 1; }
[ -d "supabase/migrations" ] || { echo "❌ supabase/migrations is missing."; exit 1; }
echo "🚀 KAYAD versioned migration deployment"
echo "Schema source of truth: supabase/migrations/"
# Stage 3 (2026-10-13) fail-closed guard. Production migration history has drifted from this repository (38 production-only
# records, 6 renumbered pairs whose real DDL sits under a version production does not record, 2 files edited after they were
# applied — see KAYAD_PRESTAGING_SECURITY_AND_MIGRATION_DRIFT_20261013.md §7–§9). An unguarded `supabase db push` would re-run
# already-applied DDL. Refuse unless the operator states that drift has been reconciled and the push is authorized.
if [ "${KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED:-}" != "reconciled-and-authorized" ]; then
  echo "❌ Refusing 'supabase db push': migration history drift is unresolved (see KAYAD_PRESTAGING_SECURITY_AND_MIGRATION_DRIFT_20261013.md)."
  echo "   Only after the drift is reconciled and the push is authorized in writing, re-run with"
  echo "   KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized"
  exit 3
fi
supabase db push
