#!/bin/bash
# scripts/cleanup-logs.sh
# Log cleanup script for KAYAD

set -e

# Configuration
LOG_DIR="./logs"
RETENTION_DAYS=30
MAX_LOG_SIZE_MB=100

echo "🧹 Log Cleanup Script for KAYAD"
echo "================================"
echo ""

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "Cleaning up logs older than $RETENTION_DAYS days..."
find "$LOG_DIR" -type f -name "*.log" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

echo "Removing log files larger than ${MAX_LOG_SIZE_MB}MB..."
find "$LOG_DIR" -type f -name "*.log" -size +${MAX_LOG_SIZE_MB}M -delete 2>/dev/null || true

echo "Compressing old logs..."
find "$LOG_DIR" -type f -name "*.log" -mtime +7 -not -name "*.gz" -exec gzip {} \; 2>/dev/null || true

echo ""
echo "📋 Current log files:"
ls -lh "$LOG_DIR" 2>/dev/null || echo "No log files found"

echo ""
echo "✅ Log cleanup completed"
