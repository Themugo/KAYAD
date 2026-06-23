#!/bin/bash
# scripts/backup-database.sh
# MongoDB backup script for KAYAD

set -e

# Configuration
BACKUP_DIR="./backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="kayad_backup_${TIMESTAMP}"
RETENTION_DAYS=7

# Load environment variables
if [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting MongoDB backup..."
echo "Backup name: $BACKUP_NAME"
echo "Timestamp: $TIMESTAMP"
echo ""

# Extract MongoDB connection details
if [ -z "$MONGO_URI" ]; then
    echo "❌ ERROR: MONGO_URI not set in backend/.env"
    exit 1
fi

# Perform backup using mongodump
mongodump \
    --uri="$MONGO_URI" \
    --out="$BACKUP_DIR/$BACKUP_NAME" \
    --gzip

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: $BACKUP_DIR/$BACKUP_NAME"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
else
    echo "❌ Backup failed"
    exit 1
fi

# Clean up old backups (keep last N days)
echo ""
echo "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# List remaining backups
echo ""
echo "📋 Current backups:"
ls -lh "$BACKUP_DIR" | tail -n +2

echo ""
echo "✅ Backup process completed"
