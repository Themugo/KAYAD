---
title: VERCEL_REDEPLOY_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Vercel Redeploy Guide for KAYAD

**Project:** KAYAD Motors  
**Vercel URL:** https://vercel.com/themugos-projects/kayad-motors  
**Live Site:** www.kayad.space  
**Latest Commit:** 5b40f7f  
**Status:** Needs Redeploy

---

## Current Status

The project is already connected to Vercel at https://vercel.com/themugos-projects/kayad-motors but is not up to date with the latest upgrades.

**Latest Changes (Commit 5b40f7f):**
- Fixed deployment script branch from 'main' to 'master'
- Added comprehensive deployment checklist
- Added PM2 ecosystem configuration
- Added security audit report (9.5/10)
- Added comprehensive audit report (10/10)
- Added contributing guidelines
- Added CDN configuration documentation
- Added load testing scripts

---

## Redeploy Options

### Option 1: Redeploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/themugos-projects/kayad-motors
   - Login if not already logged in

2. **Navigate to Deployments**
   - Click on "Deployments" tab

3. **Find Latest Commit**
   - Look for commit 5b40f7f
   - If not found, it may need to be triggered

4. **Trigger Redeploy**
   - Click on the "Redeploy" button next to the latest commit
   - Or click "Redeploy" in the deployment details
   - Wait for deployment to complete (usually 1-3 minutes)

5. **Verify Deployment**
   - Check deployment status
   - Visit the deployed URL
   - Verify latest changes are live

### Option 2: Redeploy via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link to existing project
cd C:\Users\Kamaa\Desktop\KAYAD-main
vercel link

# Redeploy to production
vercel --prod --yes

# Or specify the project scope
vercel --prod --yes --scope themugos-projects
```

### Option 3: Force Redeploy via Git Push

Since the project is already connected to Vercel, a new commit should trigger automatic deployment. However, if that's not working:

```bash
# Create a trivial commit to trigger redeploy
cd C:\Users\Kamaa\Desktop\KAYAD-main
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin master
```

### Option 4: Redeploy via Vercel API

If you have a Vercel API token:

```bash
# Get deployment ID from Vercel dashboard
# Then use curl to redeploy
curl -X POST https://api.vercel.com/v1/integrations/deploy \
  -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kayad-motors",
    "project": "themugos-projects"
  }'
```

---

## Verification Steps

After redeployment, verify:

### 1. Check Deployment Status
- [ ] Deployment shows "Ready" in Vercel dashboard
- [ ] No build errors in deployment logs
- [ ] Build time is reasonable (< 5 minutes)

### 2. Test Live Site
- [ ] Visit https://www.kayad.space
- [ ] Page loads without errors
- [ ] Check browser console for errors
- [ ] Test navigation between pages

### 3. Verify New Features
- [ ] Check if SECURITY_AUDIT_REPORT.md is accessible (if public)
- [ ] Verify all pages load correctly
- [ ] Test API calls work
- [ ] Test WebSocket connection

### 4. Check Environment Variables
- [ ] Verify VITE_API_URL=https://api.kayad.space
- [ ] Verify VITE_SOCKET_URL=wss://api.kayad.space
- [ ] Verify VITE_ENABLE_MOCK=false

---

## Troubleshooting

### Deployment Fails

**Check Build Logs:**
- Go to Vercel Dashboard → Deployments
- Click on the failed deployment
- Review build logs for errors

**Common Issues:**
1. **Missing Dependencies**
   - Check package.json
   - Verify all dependencies are listed
   - Run `npm install` locally to test

2. **Build Errors**
   - Check for TypeScript errors
   - Verify Vite configuration
   - Check for missing files

3. **Environment Variables Missing**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Verify all required variables are set
   - Add missing variables

### Deployment Succeeds but Site Not Updated

**Clear Browser Cache:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito/private mode

**Check DNS:**
- Verify DNS propagation
- Check if www.kayad.space points to Vercel
- Use `nslookup www.kayad.space` to verify

**Check Vercel Domains:**
- Go to Vercel Dashboard → Settings → Domains
- Verify www.kayad.space is configured
- Check for any domain errors

---

## Post-Redeploy Monitoring

### Immediate (First 30 Minutes)
- [ ] Monitor Vercel dashboard for errors
- [ ] Check site functionality
- [ ] Test critical features
- [ ] Monitor error rates

### Short-term (First 24 Hours)
- [ ] Monitor Vercel analytics
- [ ] Check for new errors
- [ ] Review user feedback
- [ ] Monitor performance

---

## Quick Reference

**Vercel Dashboard:** https://vercel.com/themugos-projects/kayad-motors  
**Live Site:** https://www.kayad.space  
**Latest Commit:** 5b40f7f  
**GitHub:** https://github.com/Themugo/KAYAD

**Redeploy Commands:**
```bash
# Via CLI
vercel --prod --yes

# Via Git (trigger redeploy)
git commit --allow-empty -m "Trigger redeploy"
git push origin master
```

---

**Last Updated:** May 23, 2026  
**Status:** Ready for Redeploy
