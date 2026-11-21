#!/bin/bash
# scripts/backup-database.sh
# Supabase/PostgreSQL backup helper for KAYAD

set -euo pipefail

BACKUP_DIR="./backups/supabase"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="kayad_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: Supabase CLI is required for database backups."
  echo "Install the official Supabase CLI, then retry."
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set."
  echo "Set it only in your local shell/secret store; never commit it."
  exit 1
fi

echo "Starting KAYAD Supabase/PostgreSQL backup..."
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$BACKUP_DIR/$BACKUP_NAME"

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME"

find "$BACKUP_DIR" -type f -name '*.sql' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "Current backups:"
ls -lh "$BACKUP_DIR"
