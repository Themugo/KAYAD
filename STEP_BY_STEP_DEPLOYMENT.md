---
title: STEP_BY_STEP_DEPLOYMENT
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Step-by-Step Deployment Guide for Windows

**Date:** May 23, 2026  
**Project:** KAYAD - Kenya's Premium Car Marketplace  
**Frontend:** www.kayad.space (Vercel)  
**Backend:** api.kayad.space (Production Server)  
**Latest Commit:** df07969  
**OS:** Windows 10/11

---

## Overview

This guide will take you through deploying both the frontend and backend of KAYAD to production.

**Deployment Architecture:**
- **Frontend:** Deployed to Vercel (www.kayad.space)
- **Backend:** Deployed to production server via SSH (api.kayad.space)

**Terminal Types:**
- **PowerShell:** Recommended for most Windows commands
- **Command Prompt (cmd):** Alternative for some commands
- **SSH Terminal:** For backend deployment to production server

---

## Part 1: Frontend Deployment (Vercel)

### Step 1: Open PowerShell

**How to open PowerShell:**
1. Press `Windows + R`
2. Type `powershell`
3. Press Enter

OR

1. Press `Windows + X`
2. Select "Windows PowerShell" or "Terminal"

### Step 2: Navigate to Project Directory

```powershell
cd C:\Users\Kamaa\Desktop\KAYAD-main
```

### Step 3: Verify Current Branch

```powershell
git branch
```

You should see `* master` (the asterisk indicates current branch)

### Step 4: Verify Latest Commit

```powershell
git log --oneline -5
```

You should see commit `df07969` in the list

### Step 5: Option A - Redeploy via Vercel Dashboard (Easiest)

1. Open your web browser
2. Go to: https://vercel.com/themugos-projects/kayad-motors
3. Login if not already logged in
4. Click on "Deployments" tab
5. Find the latest deployment (commit df07969)
6. Click the "Redeploy" button
7. Wait 1-3 minutes for deployment to complete
8. Visit https://www.kayad.space to verify

**Skip to Part 2 (Backend Deployment) after this completes.**

### Step 6: Option B - Redeploy via Vercel CLI (Alternative)

If you prefer command-line deployment:

```powershell
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Redeploy to production
vercel --prod --yes
```

**Skip to Part 2 (Backend Deployment) after this completes.**

---

## Part 2: Backend Deployment (Production Server)

### Step 1: Open PowerShell or Command Prompt

**PowerShell (Recommended):**
1. Press `Windows + R`
2. Type `powershell`
3. Press Enter

**Command Prompt (Alternative):**
1. Press `Windows + R`
2. Type `cmd`
3. Press Enter

### Step 2: SSH into Production Server

**Replace `user` with your actual username:**

```powershell
ssh user@api.kayad.space
```

**Example:**
```powershell
ssh ubuntu@api.kayad.space
```

**If SSH is not installed on Windows:**
1. Open PowerShell as Administrator
2. Run: `Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'`
3. Run: `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0`
4. Then try the SSH command again

### Step 3: Navigate to Backend Directory

**Replace `/path/to/kayad/backend` with your actual path:**

```bash
cd /path/to/kayad/backend
```

**Common paths:**
```bash
cd /var/www/kayad/backend
cd /home/ubuntu/kayad/backend
cd /root/kayad/backend
```

### Step 4: Check Current Status

```bash
# Check git status
git status

# Check current branch
git branch

# Check PM2 status
pm2 status
```

### Step 5: Pull Latest Changes

```bash
git pull origin master
```

**Expected output:**
```
From https://github.com/Themugo/KAYAD
 * branch            master     -> FETCH_HEAD
Updating ff08e55..df07969
Fast-forward
 ...
```

### Step 6: Verify Latest Commit

```bash
git log --oneline -5
```

You should see commit `df07969` at the top

### Step 7: Install Dependencies

```bash
npm ci --omit=dev
```

This installs production dependencies only. This may take 1-2 minutes.

### Step 8: Run Pre-Deployment Backup

```bash
bash scripts/backup.sh
```

This backs up the MongoDB database before deployment.

**Expected output:**
```
🚀 Deploying Kayad...
📦 Running pre-deploy backup...
[2026-05-23_10-30] Starting MongoDB backup...
[2026-05-23_10-30] ✅ Backup saved: /var/backups/kayad/kayad-2026-05-23_10-30.gz
```

### Step 9: Zero-Downtime Restart with PM2

```bash
pm2 reload ecosystem.config.cjs --update-env
```

This restarts the application without downtime.

**Expected output:**
```
[PM2] Reloading process kayad-api
[PM2] kayad-api restarted
```

### Step 10: Check PM2 Status

```bash
pm2 status
```

**Expected output:**
```
┌─────┬──────────┬──────┬─────────┬─────────┬─────────┬────────┐
│ id  │ name     │ mode │ status │ cpu     │ memory  │       │
├─────┼──────────┼──────┼─────────┼─────────┼─────────┼────────┤
│ 0   │ kayad-api│ fork │ online  │ 0%      │ 150MB   │       │
└─────┴──────────┴──────┴─────────┴─────────┴─────────┴────────┘
```

### Step 11: Check PM2 Logs

```bash
pm2 logs kayad-api --lines 50
```

Look for any errors in the recent logs. You should see:
```
[kayad-api] ✅ MongoDB: cluster0.xxxxx.mongodb.net
[kayad-api] 🚗 Kayad API
[kayad-api] ├─ URL:      http://localhost:5000
[kayad-api] ├─ Env:      production
[kayad-api] └─ Socket:   ready
```

### Step 12: Verify Health Endpoint

```bash
curl https://api.kayad.space/health
```

**Expected response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-05-23T10:30:00.000Z",
  "uptime": 123456
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

**Expected response:**
```json
{
  "uptime": 123456,
  "totalRequests": 1000,
  "redis": "connected",
  "env": "production",
  "memory": {...},
  "ts": "2026-05-23T10:30:00.000Z"
}
```

### Step 15: Exit SSH Session

```bash
exit
```

This returns you to your local PowerShell/Command Prompt.

---

## Part 3: Post-Deployment Verification (Local Machine)

### Step 1: Open PowerShell

```powershell
# Press Windows + R, type powershell, press Enter
```

### Step 2: Test Frontend

```powershell
# Open in browser
Start-Process "https://www.kayad.space"
```

**Manual verification:**
1. Check if page loads
2. Open browser DevTools (F12)
3. Check Console for errors
4. Test navigation
5. Test login functionality

### Step 3: Test Backend API

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://api.kayad.space/health" | Select-Object -ExpandProperty Content

# Test cars endpoint
Invoke-WebRequest -Uri "https://api.kayad.space/api/cars" | Select-Object -ExpandProperty Content
```

### Step 4: Test WebSocket Connection

1. Open https://www.kayad.space in browser
2. Open DevTools (F12)
3. Go to Console tab
4. Look for WebSocket connection messages
5. You should see connection successful messages

---

## Troubleshooting

### Frontend Deployment Issues

**Vercel Dashboard Won't Load:**
- Clear browser cache
- Try incognito mode
- Check internet connection

**Redeploy Button Not Working:**
- Refresh the page
- Try Vercel CLI option
- Check if GitHub is connected

**Build Fails:**
- Check build logs in Vercel Dashboard
- Verify package.json is correct
- Check for missing dependencies

### Backend Deployment Issues

**SSH Connection Fails:**
```powershell
# Test SSH connection
ssh -v user@api.kayad.space

# Check if SSH is installed
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
```

**Git Pull Fails:**
```bash
# Check git remote
git remote -v

# Fetch latest
git fetch origin

# Pull with specific branch
git pull origin master
```

**PM2 Won't Start:**
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

**Database Connection Fails:**
```bash
# Verify MONGO_URI
cat .env | grep MONGO_URI

# Check MongoDB Atlas whitelist
# Ensure server IP is whitelisted in MongoDB Atlas
```

**Deployment Script Fails:**
```bash
# Check script permissions
ls -l scripts/deploy.sh

# Make executable
chmod +x scripts/deploy.sh

# Run with bash explicitly
bash scripts/deploy.sh
```

---

## Quick Reference

### Frontend Deployment (PowerShell)
```powershell
cd C:\Users\Kamaa\Desktop\KAYAD-main
git log --oneline -5
# Then go to https://vercel.com/themugos-projects/kayad-motors and click Redeploy
```

### Backend Deployment (SSH)
```bash
ssh user@api.kayad.space
cd /path/to/kayad/backend
git pull origin master
npm ci --omit=dev
bash scripts/backup.sh
pm2 reload ecosystem.config.cjs --update-env
pm2 status
pm2 logs kayad-api --lines 50
curl https://api.kayad.space/health
exit
```

### Verification (PowerShell)
```powershell
Start-Process "https://www.kayad.space"
Invoke-WebRequest -Uri "https://api.kayad.space/health" | Select-Object -ExpandProperty Content
```

---

## Terminal Types Summary

| Task | Recommended Terminal | Notes |
|------|---------------------|-------|
| Frontend Deployment | PowerShell or Browser | Use Vercel Dashboard (easiest) |
| Backend Deployment | SSH Terminal | After SSH connection, use bash commands |
| Verification | PowerShell or Browser | Test from local machine |

**PowerShell vs Command Prompt:**
- **PowerShell:** More powerful, recommended for Windows
- **Command Prompt:** Basic, works for simple commands
- **SSH Terminal:** Linux/Unix commands after SSH connection

**After SSH connection:** You'll be in a Linux environment, so use bash commands (not PowerShell).

---

## Deployment Checklist

### Frontend (Vercel)
- [ ] Open PowerShell
- [ ] Navigate to project directory
- [ ] Verify latest commit (df07969)
- [ ] Go to Vercel Dashboard
- [ ] Click Redeploy
- [ ] Wait for deployment to complete
- [ ] Visit www.kayad.space
- [ ] Verify site loads correctly

### Backend (Production Server)
- [ ] Open PowerShell or Command Prompt
- [ ] SSH into production server
- [ ] Navigate to backend directory
- [ ] Pull latest changes
- [ ] Install dependencies
- [ ] Run backup
- [ ] Restart PM2
- [ ] Check PM2 status
- [ ] Check PM2 logs
- [ ] Verify health endpoint
- [ ] Exit SSH session

### Verification
- [ ] Test frontend loads
- [ ] Test backend health
- [ ] Test API endpoints
- [ ] Test WebSocket connection
- [ ] Check for errors

---

**Last Updated:** May 23, 2026  
**Version:** 2.0.0  
**Status:** Ready for Step-by-Step Deployment
