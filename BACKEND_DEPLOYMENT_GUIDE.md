# Backend Deployment Guide for api.kayad.space

**Date:** May 23, 2026  
**Project:** KAYAD - Kenya's Premium Car Marketplace  
**Backend API:** api.kayad.space  
**Latest Commit:** ff08e55  
**Status:** Ready for Deployment

---

## Prerequisites

### Server Access
- [ ] SSH access to production server
- [ ] SSH credentials (username, host, key/password)
- [ ] Backend directory path on server

### Server Requirements
- [ ] Node.js 18+ installed
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Git installed
- [ ] MongoDB Atlas access
- [ ] Environment variables configured

---

## Deployment Steps

### Step 1: SSH into Production Server

```bash
ssh user@api.kayad.space
```

Replace `user` with your actual username.

### Step 2: Navigate to Backend Directory

```bash
cd /path/to/kayad/backend
```

Replace `/path/to/kayad/backend` with the actual path on your server.

### Step 3: Check Current Status

```bash
# Check git status
git status

# Check current branch
git branch

# Check PM2 status
pm2 status
```

### Step 4: Pull Latest Changes

```bash
git pull origin master
```

Verify that commit ff08e55 is pulled.

### Step 5: Verify Latest Commit

```bash
git log --oneline -5
```

You should see commit ff08e55 in the list.

### Step 6: Install Dependencies

```bash
npm ci --omit=dev
```

This installs production dependencies only.

### Step 7: Run Pre-Deployment Backup

```bash
bash scripts/backup.sh
```

This backs up the MongoDB database before deployment.

### Step 8: Verify Backup

```bash
# Check if backup was created
ls -lh /var/backups/kayad/
```

### Step 9: Zero-Downtime Restart with PM2

```bash
pm2 reload ecosystem.config.cjs --update-env
```

This restarts the application with zero downtime.

### Step 10: Check PM2 Status

```bash
pm2 status
```

Verify that `kayad-api` is running and online.

### Step 11: Check PM2 Logs

```bash
pm2 logs kayad-api --lines 50
```

Check for any errors in the recent logs.

### Step 12: Verify Health Endpoint

```bash
curl https://api.kayad.space/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### Step 13: Verify Deep Health Check

```bash
curl https://api.kayad.space/health/deep
```

This checks database, Redis, and other dependencies.

### Step 14: Verify Metrics Endpoint

```bash
curl https://api.kayad.space/metrics
```

This shows server metrics and uptime.

---

## Alternative: Using Deployment Script

If you prefer to use the deployment script:

```bash
bash scripts/deploy.sh
```

This script performs:
1. Pull latest code
2. Install dependencies
3. Run backup
4. Restart PM2
5. Build frontend (if applicable)
6. Show status

---

## Post-Deployment Verification

### API Endpoints

```bash
# Test cars endpoint
curl https://api.kayad.space/api/cars

# Test health endpoint
curl https://api.kayad.space/health

# Test deep health
curl https://api.kayad.space/health/deep

# Test metrics
curl https://api.kayad.space/metrics
```

### PM2 Monitoring

```bash
# Check status
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs kayad-api

# View error logs
pm2 logs kayad-api --err

# View info
pm2 info kayad-api
```

### Database Verification

```bash
# Check MongoDB connection in logs
pm2 logs kayad-api | grep -i mongodb

# Check for connection errors
pm2 logs kayad-api | grep -i error
```

### WebSocket Verification

```bash
# Check if Socket.io is running
pm2 logs kayad-api | grep -i socket
```

---

## Environment Variables Checklist

Ensure these are set in your `.env` file on the server:

### Required
```bash
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
FRONTEND_URL=https://www.kayad.space
```

### Recommended
```bash
SENTRY_DSN=your-sentry-dsn
REDIS_URL=your-redis-url
EMAIL_HOST=smtp-host
EMAIL_PORT=587
EMAIL_USER=smtp-user
EMAIL_PASS=smtp-password
```

### M-Pesa Integration
```bash
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://api.kayad.space/api/payments/callback
MPESA_ENV=production
```

### Cloudinary
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## Troubleshooting

### PM2 Won't Start

```bash
# Check logs
pm2 logs kayad-api

# Check if port is in use
lsof -i :5000

# Kill process on port 5000
kill -9 $(lsof -t -i:5000)

# Restart PM2
pm2 restart kayad-api
```

### Database Connection Fails

```bash
# Verify MONGO_URI
cat .env | grep MONGO_URI

# Test MongoDB connection manually
mongosh "mongodb+srv://..."

# Check MongoDB Atlas whitelist
# Ensure server IP is whitelisted
```

### Deployment Script Fails

```bash
# Check script permissions
ls -l scripts/deploy.sh

# Make executable if needed
chmod +x scripts/deploy.sh

# Run with bash explicitly
bash scripts/deploy.sh
```

### Git Pull Fails

```bash
# Check git remote
git remote -v

# Fetch latest
git fetch origin

# Pull with specific branch
git pull origin master
```

---

## Rollback Plan

If deployment fails, rollback to previous version:

```bash
# SSH into server
ssh user@api.kayad.space

# Navigate to backend
cd /path/to/kayad/backend

# View recent commits
git log --oneline -5

# Checkout previous commit
git checkout <previous-commit-hash>

# Restart PM2
pm2 reload ecosystem.config.cjs

# Check status
pm2 status
pm2 logs kayad-api
```

---

## Monitoring After Deployment

### Immediate (First 30 Minutes)
```bash
# Monitor logs
pm2 logs kayad-api

# Monitor status
pm2 status

# Monitor resources
pm2 monit
```

### Short-term (First 24 Hours)
- Check PM2 logs periodically
- Monitor Sentry for errors
- Check API response times
- Monitor database performance
- Review error rates

### Long-term (First Week)
- Monitor PM2 performance
- Review Sentry error trends
- Check database query performance
- Monitor API usage patterns
- Review security logs

---

## Quick Reference Commands

```bash
# SSH into server
ssh user@api.kayad.space

# Navigate to backend
cd /path/to/kayad/backend

# Pull latest
git pull origin master

# Install dependencies
npm ci --omit=dev

# Run backup
bash scripts/backup.sh

# Restart PM2
pm2 reload ecosystem.config.cjs --update-env

# Check status
pm2 status

# Check logs
pm2 logs kayad-api

# Verify health
curl https://api.kayad.space/health
```

---

## Deployment Summary

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Commit:** ff08e55  
**Status:** _______________  
**Issues:** _______________  
**Rollback Required:** Yes/No  
**Notes:** _______________

---

**Last Updated:** May 23, 2026  
**Version:** 2.0.0  
**Status:** Ready for Deployment
