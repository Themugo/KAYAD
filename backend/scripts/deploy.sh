#!/bin/bash
# backend/scripts/deploy.sh — Zero-downtime deploy script
# Usage: bash scripts/deploy.sh
set -e

echo "🚀 Deploying Gari Motors..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --omit=dev

# 3. Run backup before deploy
echo "📦 Running pre-deploy backup..."
bash scripts/backup.sh || echo "⚠️ Backup failed but continuing deploy"

# 4. Zero-downtime restart with PM2
pm2 reload ecosystem.config.cjs --update-env

# 5. Build frontend
cd ../frontend
npm ci
npm run build
cd ../backend

# 6. Show status
pm2 status
echo "✅ Deploy complete!"
