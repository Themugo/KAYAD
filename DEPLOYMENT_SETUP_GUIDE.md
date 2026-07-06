# Deployment Setup Guide

This guide provides step-by-step instructions for setting up the deployment infrastructure for KAYAD on Render and Vercel.

---

## Prerequisites

- Render account (https://render.com)
- Vercel account (https://vercel.com)
- GitHub account with access to https://github.com/Themugo/KAYAD
- MongoDB Atlas account (for production database)
- Cloudinary account (for image storage)

---

## Step 1: Deploy Redis Instance on Render

### Why Redis is Needed
Redis is required for:
- Distributed rate limiting across multiple instances
- Session storage
- Queue management (BullMQ)
- Caching

### Steps to Deploy Redis

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com
   - Sign in with your account

2. **Create New Redis Instance**
   - Click "New +" button
   - Select "Redis"
   - Name: `kayad-redis`
   - Database Name: `kayad_redis`
   - User: `kayad`
   - Region: Oregon (same as backend)
   - Plan: Standard (recommended for production)
   - Click "Create Redis Instance"

3. **Get Connection String**
   - After deployment, click on the Redis instance
   - Copy the "Internal Connection String"
   - Format: `redis://default:password@host:port`

4. **Update Environment Variables**
   - The `render.yaml` already references this Redis instance
   - No manual environment variable setup needed
   - Render automatically injects `REDIS_URL`

---

## Step 2: Create Staging Services on Render

### Why Staging Environment
Staging environment allows:
- Testing changes before production
- MPESA sandbox integration
- Separate database to avoid data contamination
- Safe environment for debugging

### Steps to Create Staging Services

1. **Create Staging Backend Service**
   - Go to Render Dashboard
   - Click "New +"
   - Select "Web Service"
   - Connect to GitHub repository: `Themugo/KAYAD`
   - Name: `kayad-backend-staging`
   - Root Directory: Leave empty
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
   - **Important:** Select "Advanced" → "Existing Configuration File"
   - Select `render-staging.yaml` from the dropdown
   - Click "Create Web Service"

2. **Create Staging Worker Service**
   - Click "New +"
   - Select "Worker"
   - Connect to same GitHub repository
   - Name: `kayad-worker-staging`
   - **Important:** Select "Advanced" → "Existing Configuration File"
   - Select `render-staging.yaml` from the dropdown
   - Click "Create Worker"

3. **Create Staging Redis Instance**
   - Click "New +"
   - Select "Redis"
   - Name: `kayad-redis-staging`
   - Database Name: `kayad_redis_staging`
   - User: `kayad_staging`
   - Region: Oregon
   - Plan: Starter (for staging)
   - Click "Create Redis Instance"

4. **Configure Environment Variables**
   - The `render-staging.yaml` defines most variables
   - You need to manually set these sensitive variables in the dashboard:
     - `MONGO_URI` (staging MongoDB connection string)
     - `JWT_SECRET` (generate new secret for staging)
     - `REFRESH_TOKEN_SECRET` (generate new secret for staging)
     - `MPESA_CONSUMER_KEY` (sandbox key)
     - `MPESA_CONSUMER_SECRET` (sandbox secret)
     - `MPESA_SHORTCODE` (sandbox shortcode)
     - `MPESA_PASSKEY` (sandbox passkey)
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `SENDGRID_API_KEY`
     - `AT_API_KEY`
     - `AT_USERNAME`
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_WHATSAPP_NUMBER`
     - `SENTRY_DSN` (optional, for staging error tracking)

5. **Update Service Links**
   - Go to `kayad-backend-staging` service
   - Scroll to "Environment" section
   - Verify that Redis is linked correctly
   - The `REDIS_URL` should automatically reference `kayad-redis-staging`

6. **Verify Staging Deployment**
   - Check the deployment logs
   - Visit the health check: `https://kayad-backend-staging.onrender.com/health/live`
   - Should return `{"status":"ok"}`

---

## Step 3: Configure Deployment Webhook for Alerts

### Why Webhook Alerts
Webhook alerts enable:
- Real-time deployment notifications
- Integration with Slack, Discord, or other systems
- Automated incident response
- Team awareness of deployment status

### Steps to Configure Webhook

1. **Create Webhook Endpoint**
   - You can use:
     - Slack Incoming Webhook
     - Discord Webhook
     - Custom webhook server
     - Services like Zapier, IFTTT

2. **Get Webhook URL**
   - For Slack: Create Incoming Webhook in Slack App settings
   - For Discord: Server Settings → Integrations → Webhooks
   - Copy the webhook URL

3. **Add Environment Variable**
   - Go to `kayad-backend` service on Render
   - Scroll to "Environment" section
   - Click "Add Environment Variable"
   - Key: `DEPLOYMENT_WEBHOOK_URL`
   - Value: Your webhook URL
   - Click "Save Changes"

4. **Add to Staging**
   - Repeat for `kayad-backend-staging` service
   - Use same or different webhook URL for staging

5. **Test Webhook**
   - Run: `npm run notify-deployment success` locally (with webhook URL set)
   - Or trigger a deployment on Render
   - Verify webhook receives notification

---

## Step 4: Set Up Staging Vercel Project

### Why Staging Frontend
Staging frontend allows:
- Testing UI changes before production
- Verifying API integration with staging backend
- Safe environment for feature testing
- Separate analytics tracking

### Steps to Create Staging Vercel Project

1. **Create New Vercel Project**
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import repository: `Themugo/KAYAD`
   - Project Name: `kayad-motors-staging`
   - Framework Preset: Other
   - Root Directory: Leave empty

2. **Configure Build Settings**
   - **Important:** Select "Advanced" → "Override Existing Configuration"
   - Select `vercel-staging.json` from the dropdown
   - This will use the staging configuration

3. **Configure Environment Variables**
   - The `vercel-staging.json` defines most variables
   - Add any additional variables needed:
     - `VITE_POSTHOG_API_KEY` (staging PostHog key, if different)
     - `VITE_GA_MEASUREMENT_ID` (staging GA ID, if different)
     - `VITE_GOOGLE_MAPS_KEY` (staging Maps key, if different)
     - `VITE_SENTRY_DSN` (staging Sentry DSN, if different)

4. **Configure Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add custom domain: `staging.kayad.space`
   - Update DNS records as instructed by Vercel

5. **Deploy Staging Frontend**
   - Click "Deploy"
   - Wait for deployment to complete
   - Staging URL will be: `https://kayad-motors-staging.vercel.app`

6. **Verify Staging Frontend**
   - Visit staging URL
   - Check that API calls go to staging backend
   - Verify all features work correctly

---

## Step 5: Update Production Services (If Needed)

### Update Production Render Services

1. **Update Production Redis**
   - The `render.yaml` already references `kayad-redis`
   - If Redis instance name differs, update `render.yaml`

2. **Add Production Worker**
   - The `render.yaml` already includes worker service
   - If not yet deployed, create new worker service
   - Select `render.yaml` as configuration file

3. **Update Production Environment Variables**
   - Ensure all sensitive variables are set in production
   - Use production values (not sandbox)
   - Verify `MPESA_ENV` is set to `production`

### Update Production Vercel

1. **Update Production Configuration**
   - The `vercel.json` is already configured
   - Ensure environment variables match production needs

2. **Add Webhook URL**
   - Add `DEPLOYMENT_WEBHOOK_URL` to Vercel environment variables
   - This enables deployment notifications for frontend

---

## Step 6: Verify Full Deployment

### Production Verification

1. **Backend Health Check**
   ```bash
   curl https://api.kayad.space/health/live
   ```
   Should return: `{"status":"ok"}`

2. **Frontend Loading**
   - Visit https://kayad.space
   - Verify page loads correctly
   - Check browser console for errors

3. **API Connectivity**
   - Try logging in
   - Try browsing cars
   - Verify WebSocket connections work

### Staging Verification

1. **Staging Backend Health Check**
   ```bash
   curl https://kayad-backend-staging.onrender.com/health/live
   ```
   Should return: `{"status":"ok"}`

2. **Staging Frontend Loading**
   - Visit https://kayad-motors-staging.vercel.app
   - Verify page loads correctly
   - Check that API calls go to staging backend

3. **Staging Features**
   - Test MPESA sandbox integration
   - Test email sending (use staging email)
   - Test SMS sending (use staging number)

---

## Troubleshooting

### Redis Connection Issues

**Problem:** Backend cannot connect to Redis

**Solutions:**
- Verify Redis instance is running
- Check that `REDIS_URL` is set correctly
- Ensure Redis and backend are in same region
- Check Render service logs for connection errors

### Worker Service Issues

**Problem:** Worker service not processing jobs

**Solutions:**
- Check worker service logs
- Verify Redis connection
- Ensure environment variables are linked correctly
- Check that `scripts/startWorkers.js` runs without errors

### Staging API Issues

**Problem:** Staging frontend cannot connect to staging backend

**Solutions:**
- Verify `VITE_SOCKET_URL` in staging config
- Check CORS configuration in staging backend
- Ensure staging backend is running
- Check Render service logs for CORS errors

### Webhook Not Receiving Alerts

**Problem:** Deployment webhook not sending notifications

**Solutions:**
- Verify `DEPLOYMENT_WEBHOOK_URL` is set correctly
- Test webhook URL manually
- Check service logs for webhook errors
- Ensure webhook endpoint is accessible

---

## Monitoring Setup

### Enable Monitoring Scripts

1. **Add Monitoring to Startup**
   - Add monitoring startup to `server.js` if desired
   - Or run monitoring as separate service

2. **Set Up Health Check Cron**
   - Use Render Cron Jobs to run health checks
   - Schedule: Every 5 minutes
   - Command: `cd backend && npm run health-check`

3. **Configure Alert Thresholds**
   - Edit `backend/config/monitoring.js`
   - Adjust thresholds based on your needs
   - Set appropriate webhook URLs

---

## Security Considerations

1. **Separate Secrets**
   - Use different secrets for staging and production
   - Never share secrets between environments

2. **Access Control**
   - Limit access to staging environment
   - Use authentication for staging if needed

3. **Data Isolation**
   - Use separate databases for staging and production
   - Never use production data in staging

4. **API Keys**
   - Use sandbox/test keys for staging
   - Use production keys only in production

---

## Cost Estimates

### Render Costs (Monthly)

- **Production Backend (Standard):** ~$25
- **Production Worker (Standard):** ~$25
- **Production Redis (Standard):** ~$15
- **Staging Backend (Starter):** ~$7
- **Staging Worker (Starter):** ~$7
- **Staging Redis (Starter):** ~$5
- **Total:** ~$84/month

### Vercel Costs

- **Pro Plan:** $20/month (includes custom domains)
- **Bandwidth:** Included in Pro plan
- **Total:** ~$20/month

### Total Monthly Cost: ~$104

---

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Check deployment logs for errors
   - Verify health checks are passing
   - Review monitoring alerts

2. **Monthly**
   - Review Redis memory usage
   - Check worker queue backlogs
   - Update dependencies if needed

3. **Quarterly**
   - Review and update secrets
   - Audit access controls
   - Review cost optimization

### Emergency Contacts

- Render Support: https://render.com/support
- Vercel Support: https://vercel.com/support
- MongoDB Atlas Support: https://www.mongodb.com/cloud/atlas/support

---

## Next Steps

After completing this setup:

1. **Test Full Workflow**
   - Deploy to staging
   - Test all features
   - Verify integrations work

2. **Deploy to Production**
   - Merge changes to main branch
   - Monitor production deployment
   - Verify production health

3. **Set Up CI/CD Pipeline**
   - Configure GitHub Actions for automated testing
   - Add automated deployment on merge
   - Set up environment-specific deployments

4. **Document Team Processes**
   - Create runbooks for common issues
   - Document deployment procedures
   - Train team on monitoring tools

---

**Last Updated:** June 29, 2026
**Version:** 1.0
