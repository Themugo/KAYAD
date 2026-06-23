---
title: DEPLOYMENT_CHECKLIST
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# KAYAD Deployment Checklist

**Date:** May 23, 2026  
**Project:** KAYAD - Kenya's Premium Car Marketplace  
**Version:** 2.0.0  
**Live Site:** www.kayad.space  
**API:** api.kayad.space

---

## Pre-Deployment Checklist

### Code Verification
- [x] Project rating: 10/10 (COMPREHENSIVE_AUDIT_REPORT.md)
- [x] Security audit: 9.5/10 (SECURITY_AUDIT_REPORT.md)
- [x] All changes committed to GitHub (commit 87327bd)
- [x] Deployment guide created (DEPLOYMENT_GUIDE.md)
- [x] Deployment script verified (backend/scripts/deploy.sh)
- [x] PM2 ecosystem config verified (backend/ecosystem.config.cjs)
- [x] Environment variables documented (backend/.env.example)

### Configuration Verification
- [x] Vercel configuration (vercel.json)
  - [x] Framework: Vite
  - [x] Build command: npm run build
  - [x] Output directory: dist
  - [x] API rewrites to api.kayad.space
  - [x] WebSocket rewrites to api.kayad.space
  - [x] Security headers configured
  - [x] CSP configured
  - [x] Asset caching configured

- [x] Backend configuration
  - [x] PM2 ecosystem config (ecosystem.config.cjs)
  - [x] Deployment script (deploy.sh) - Fixed branch to master
  - [x] Backup script (backup.sh)
  - [x] Environment variables documented (.env.example)

---

## Frontend Deployment (Vercel - www.kayad.space)

### Pre-Deployment
- [ ] Check Vercel dashboard for current deployment status
- [ ] Verify domain www.kayad.space is connected to Vercel
- [ ] Verify environment variables in Vercel:
  - [ ] VITE_API_URL=https://api.kayad.space
  - [ ] VITE_SOCKET_URL=wss://api.kayad.space
  - [ ] VITE_ENABLE_MOCK=false

### Deployment Options

#### Option A: Automatic Deployment (Recommended)
- [ ] Verify GitHub repository is connected to Vercel
- [ ] Verify latest commit (87327bd) is pushed to GitHub
- [ ] Check Vercel dashboard for automatic deployment status
- [ ] Wait for deployment to complete
- [ ] Verify deployment succeeded

#### Option B: Manual Deployment via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```
- [ ] Install Vercel CLI
- [ ] Login to Vercel
- [ ] Run vercel --prod
- [ ] Verify deployment succeeded

#### Option C: Redeploy via Dashboard
- [ ] Go to Vercel Dashboard → KAYAD project
- [ ] Go to Deployments tab
- [ ] Find commit 87327bd
- [ ] Click "Redeploy"
- [ ] Wait for deployment to complete
- [ ] Verify deployment succeeded

### Post-Deployment Verification
- [ ] Visit https://www.kayad.space
- [ ] Check page loads without errors
- [ ] Open browser DevTools Console
- [ ] Verify no JavaScript errors
- [ ] Test API calls (check Network tab)
- [ ] Verify API calls to https://api.kayad.space work
- [ ] Test WebSocket connection (check Console)
- [ ] Verify authentication works
- [ ] Test user login
- [ ] Test auction bidding flow
- [ ] Test escrow flow
- [ ] Check mobile responsiveness
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Verify PWA works (if applicable)

---

## Backend Deployment (Production Server - api.kayad.space)

### Pre-Deployment
- [ ] SSH access to production server
- [ ] Verify Node.js 18+ is installed on server
- [ ] Verify PM2 is installed globally
- [ ] Verify MongoDB Atlas connection string
- [ ] Verify all environment variables are set
- [ ] Verify Git access on server
- [ ] Verify backup script is accessible

### Deployment Steps

#### Step 1: SSH into Production Server
```bash
ssh user@api.kayad.space
```
- [ ] SSH into production server

#### Step 2: Navigate to Backend Directory
```bash
cd /path/to/kayad/backend
```
- [ ] Navigate to backend directory

#### Step 3: Pull Latest Changes
```bash
git pull origin master
```
- [ ] Pull latest changes from GitHub
- [ ] Verify commit 87327bd is pulled

#### Step 4: Install Dependencies
```bash
npm ci --omit=dev
```
- [ ] Install production dependencies
- [ ] Verify no errors during installation

#### Step 5: Run Pre-Deployment Backup
```bash
bash scripts/backup.sh
```
- [ ] Run backup script
- [ ] Verify backup completed successfully
- [ ] Check backup file exists

#### Step 6: Zero-Downtime Restart with PM2
```bash
pm2 reload ecosystem.config.cjs --update-env
```
- [ ] Reload PM2 with zero downtime
- [ ] Verify PM2 reload succeeded

#### Step 7: Check PM2 Status
```bash
pm2 status
```
- [ ] Check PM2 status
- [ ] Verify kayad-api is running
- [ ] Verify no errors in status

#### Step 8: Check PM2 Logs
```bash
pm2 logs kayad-api
```
- [ ] Check recent logs
- [ ] Verify no critical errors
- [ ] Verify server started successfully

### Alternative: Using Deployment Script
```bash
bash scripts/deploy.sh
```
- [ ] Run deployment script
- [ ] Verify all steps completed
- [ ] Check PM2 status after deployment

### Post-Deployment Verification

#### Health Checks
- [ ] Check health endpoint: `curl https://api.kayad.space/health`
- [ ] Check deep health: `curl https://api.kayad.space/health/deep`
- [ ] Check metrics: `curl https://api.kayad.space/metrics`
- [ ] Verify all health checks pass

#### PM2 Verification
- [ ] Check PM2 status: `pm2 status`
- [ ] Check PM2 logs: `pm2 logs kayad-api`
- [ ] Verify kayad-api is online
- [ ] Verify memory usage is normal
- [ ] Verify CPU usage is normal

#### API Verification
- [ ] Test GET /api/cars
- [ ] Test authentication endpoint
- [ ] Test WebSocket connection
- [ ] Verify database connectivity
- [ ] Check MongoDB connection logs
- [ ] Verify Redis connection (if configured)

#### Integration Verification
- [ ] Test M-Pesa integration
- [ ] Verify M-Pesa credentials
- [ ] Check M-Pesa callback URL
- [ ] Test email sending (if configured)
- [ ] Test SMS sending (if configured)
- [ ] Verify Cloudinary integration
- [ ] Test image upload

#### Monitoring Verification
- [ ] Check Sentry error tracking
- [ ] Verify no new critical errors
- [ ] Check PM2 monitoring: `pm2 monit`
- [ ] Verify metrics endpoint is accessible

---

## Environment Variables Checklist

### Frontend (Vercel)
- [ ] VITE_API_URL=https://api.kayad.space
- [ ] VITE_SOCKET_URL=wss://api.kayad.space
- [ ] VITE_ENABLE_MOCK=false

### Backend (Production Server)
#### Required
- [ ] NODE_ENV=production
- [ ] PORT=5000
- [ ] MONGO_URI=mongodb+srv://...
- [ ] JWT_SECRET=your-secret-key
- [ ] FRONTEND_URL=https://www.kayad.space

#### Optional but Recommended
- [ ] SENTRY_DSN=your-sentry-dsn
- [ ] REDIS_URL=your-redis-url
- [ ] EMAIL_HOST=smtp-host
- [ ] EMAIL_PORT=587
- [ ] EMAIL_USER=smtp-user
- [ ] EMAIL_PASS=smtp-password
- [ ] SENDGRID_API_KEY=your-sendgrid-key

#### M-Pesa Integration
- [ ] MPESA_CONSUMER_KEY=your-key
- [ ] MPESA_CONSUMER_SECRET=your-secret
- [ ] MPESA_SHORTCODE=your-shortcode
- [ ] MPESA_PASSKEY=your-passkey
- [ ] MPESA_CALLBACK_URL=https://api.kayad.space/api/payments/callback
- [ ] MPESA_ENV=production
- [ ] MPESA_SKIP_IP_CHECK=false

#### Cloudinary
- [ ] CLOUDINARY_CLOUD_NAME=your-cloud-name
- [ ] CLOUDINARY_API_KEY=your-api-key
- [ ] CLOUDINARY_API_SECRET=your-api-secret

#### SMS Integration
- [ ] AT_API_KEY=your-api-key
- [ ] AT_USERNAME=your-username
- [ ] AT_SENDER_ID=KAYAD
- [ ] SMS_PROVIDER=mock

#### Admin
- [ ] WEBHOIST_EMAIL=owner@kayad.space
- [ ] ADMIN_EMAIL=admin@kayad.space
- [ ] ADMIN_PHONE=+2547...

---

## Rollback Plan

### Frontend Rollback
- [ ] Go to Vercel Dashboard → KAYAD project
- [ ] Go to Deployments tab
- [ ] Find previous stable deployment
- [ ] Click "Promote to Production"
- [ ] Wait for rollback to complete
- [ ] Verify rollback succeeded

### Backend Rollback
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
- [ ] SSH into production server
- [ ] Navigate to backend directory
- [ ] View recent commits
- [ ] Checkout previous stable commit
- [ ] Restart PM2
- [ ] Verify rollback succeeded

---

## Post-Deployment Monitoring

### Immediate (First 30 Minutes)
- [ ] Monitor PM2 logs: `pm2 logs kayad-api`
- [ ] Check Sentry for new errors
- [ ] Monitor server CPU usage
- [ ] Monitor server memory usage
- [ ] Check response times
- [ ] Monitor error rates

### Short-term (First 24 Hours)
- [ ] Monitor PM2 logs periodically
- [ ] Check Sentry for exceptions
- [ ] Monitor database performance
- [ ] Check API response times
- [ ] Monitor WebSocket connections
- [ ] Review user feedback
- [ ] Check for any reported issues

### Long-term (First Week)
- [ ] Monitor PM2 performance
- [ ] Review Sentry error trends
- [ ] Check database query performance
- [ ] Monitor API usage patterns
- [ ] Review security logs
- [ ] Check backup completion
- [ ] Monitor resource usage

---

## Troubleshooting

### Frontend Issues

#### Build Fails on Vercel
- [ ] Check Vercel build logs
- [ ] Verify all dependencies in package.json
- [ ] Check Node version compatibility
- [ ] Verify environment variables
- [ ] Check for TypeScript errors

#### API Calls Failing
- [ ] Verify CORS configuration
- [ ] Check API accessibility
- [ ] Verify environment variables
- [ ] Check browser console for errors
- [ ] Test API directly with curl

#### WebSocket Connection Fails
- [ ] Verify Socket.io URL
- [ ] Check backend WebSocket status
- [ ] Verify CORS for WebSocket
- [ ] Check firewall rules
- [ ] Test WebSocket connection directly

### Backend Issues

#### PM2 Won't Start
- [ ] Check logs: `pm2 logs kayad-api`
- [ ] Verify environment variables
- [ ] Check port availability
- [ ] Verify MongoDB connection
- [ ] Check Node.js version

#### Database Connection Fails
- [ ] Verify MONGO_URI
- [ ] Check MongoDB Atlas whitelist
- [ ] Verify network connectivity
- [ ] Check MongoDB Atlas status
- [ ] Test connection manually

#### M-Pesa Integration Fails
- [ ] Verify credentials
- [ ] Check IP whitelist
- [ ] Verify callback URL
- [ ] Check Safaricom API status
- [ ] Test with sandbox environment

---

## Final Verification

### Frontend
- [ ] www.kayad.space loads successfully
- [ ] All pages load without errors
- [ ] API calls work correctly
- [ ] WebSocket connection established
- [ ] Authentication works
- [ ] All features functional
- [ ] Mobile responsive
- [ ] No console errors

### Backend
- [ ] api.kayad.space responds
- [ ] Health checks pass
- [ ] PM2 status healthy
- [ ] No critical errors in logs
- [ ] Database connected
- [ ] WebSocket running
- [ ] All API endpoints working
- [ ] Integrations functional

### Overall
- [ ] Frontend and backend communicating
- [ ] All critical features working
- [ ] No security issues detected
- [ ] Performance acceptable
- [ ] Monitoring active
- [ ] Backups running
- [ ] Documentation updated

---

## Deployment Summary

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Frontend Commit:** 87327bd  
**Backend Commit:** 87327bd  
**Frontend Status:** _______________  
**Backend Status:** _______________  
**Issues Encountered:** _______________  
**Rollback Required:** Yes/No  
**Notes:** _______________

---

**Last Updated:** May 23, 2026  
**Version:** 2.0.0  
**Status:** Ready for Deployment
