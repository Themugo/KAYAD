#!/bin/bash
# backend/scripts/setup-cron.sh
# ─────────────────────────────────────────────────────────────
# Sets up all production cron jobs automatically.
# Run ONCE on the server: bash scripts/setup-cron.sh
# ─────────────────────────────────────────────────────────────

APP_DIR="/var/www/gari-motors/backend"
LOG_DIR="/var/log/gari"

mkdir -p "$LOG_DIR"

# Get current crontab
CURRENT=$(crontab -l 2>/dev/null || echo "")

# Only add if not already present
add_cron() {
  local job="$1"
  if echo "$CURRENT" | grep -qF "$job"; then
    echo "  ⏭  Already exists: $job"
  else
    CURRENT="$CURRENT"$'\n'"$job"
    echo "  ✅ Added: $job"
  fi
}

echo "Setting up Gari Motors cron jobs..."

# MongoDB backup — daily at 2:00 AM
add_cron "0 2 * * * bash $APP_DIR/scripts/backup.sh >> $LOG_DIR/backup.log 2>&1"

# SSL cert renewal check — daily at 3:00 AM (Certbot auto-renews when needed)
add_cron "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx' >> $LOG_DIR/certbot.log 2>&1"

# Log rotation — weekly on Sunday at 4:00 AM
add_cron "0 4 * * 0 find $LOG_DIR -name '*.log' -size +50M -exec truncate -s 0 {} \; >> $LOG_DIR/maintenance.log 2>&1"

# Health check ping (fallback if UptimeRobot isn't set up yet)
# add_cron "*/5 * * * * curl -sf http://localhost:5000/health > /dev/null || pm2 restart gari-backend"

# Write updated crontab
echo "$CURRENT" | crontab -

echo ""
echo "✅ Cron jobs configured:"
crontab -l
echo ""
echo "Monitor logs: tail -f $LOG_DIR/backup.log"
