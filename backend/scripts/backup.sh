#!/bin/bash
# backend/scripts/backup.sh
# ─────────────────────────────────────────────────────────────
# MongoDB backup to local + optional S3/GCS upload
# Usage: bash scripts/backup.sh
# Cron: 0 2 * * * /var/www/gari-motors/backend/scripts/backup.sh >> /var/log/gari/backup.log 2>&1
# ─────────────────────────────────────────────────────────────

set -e
source "$(dirname "$0")/../.env" 2>/dev/null || true

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gari-motors}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

OUTFILE="$BACKUP_DIR/gari-$DATE.gz"

echo "[$DATE] Starting MongoDB backup..."

# Dump and compress
mongodump \
  --uri="$MONGO_URI" \
  --archive="$OUTFILE" \
  --gzip \
  --quiet

SIZE=$(du -sh "$OUTFILE" | cut -f1)
echo "[$DATE] ✅ Backup saved: $OUTFILE ($SIZE)"

# Optional: Upload to S3
if [ -n "$AWS_S3_BUCKET" ]; then
  aws s3 cp "$OUTFILE" "s3://$AWS_S3_BUCKET/backups/gari-$DATE.gz" --quiet
  echo "[$DATE] ✅ Uploaded to S3: s3://$AWS_S3_BUCKET/backups/"
fi

# Optional: Upload to GCS
if [ -n "$GCS_BUCKET" ]; then
  gsutil cp "$OUTFILE" "gs://$GCS_BUCKET/backups/gari-$DATE.gz" -q
  echo "[$DATE] ✅ Uploaded to GCS: gs://$GCS_BUCKET/backups/"
fi

# Delete local backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "gari-*.gz" -mtime +"$KEEP_DAYS" -delete
echo "[$DATE] 🧹 Old backups pruned (kept last $KEEP_DAYS days)"

echo "[$DATE] Backup complete."
