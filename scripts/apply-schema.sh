#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI is required. Install it before deploying."; exit 1; }
[ -d "supabase/migrations" ] || { echo "❌ supabase/migrations is missing."; exit 1; }
echo "🚀 KAYAD versioned migration deployment"
echo "Schema source of truth: supabase/migrations/"
supabase db push
