# Gari Motors — Zero-Code Integrations Guide
## Every integration below activates with ENV vars or DNS changes only.
## No code changes needed. Just set the variable and restart.

---

## 1. Sentry — Error Tracking & Monitoring

**What it does:** Captures every crash, slow request, and frontend error. Sends Slack/email alerts. Shows stack traces with source maps.

**Setup (10 minutes, free tier available):**

```bash
# 1. Go to https://sentry.io → New Project → Node.js (for backend)
# 2. Copy the DSN from the project settings
# 3. Add to backend/.env:
SENTRY_DSN=https://xxxxxxxxxxxx@o000000.ingest.sentry.io/0000000

# 4. Install the SDK:
cd backend && npm install @sentry/node @sentry/profiling-node

# 5. Restart backend:
pm2 restart kayad-backend

# Frontend Sentry:
# 1. Sentry → New Project → React
# 2. Add to frontend/.env:
VITE_SENTRY_DSN=https://xxxxxxxxxxxx@o000000.ingest.sentry.io/0000001

# 3. Install:
cd frontend && npm install @sentry/react

# 4. Rebuild:
npm run build
```

**Result:** All errors, performance issues, and crashes automatically appear in Sentry dashboard with full stack traces and user context.

---

## 2. UptimeRobot — Uptime Monitoring & Alerts

**What it does:** Pings your site every 5 minutes. Sends email/SMS/Slack when down.

**Setup (5 minutes, completely free):**

```
1. Go to https://uptimerobot.com → Create Free Account
2. Add New Monitor:
   - Monitor Type: HTTP(s)
   - Friendly Name: Gari Motors API
   - URL: https://kayad.space/health
   - Monitoring Interval: 5 minutes

3. Add another monitor:
   - URL: https://kayad.space
   - Name: Gari Motors Frontend

4. Add alert contacts: your email, phone (SMS), and Slack webhook
```

**The /health endpoint already exists** — it returns:
```json
{ "status": "ok", "uptime": 3600, "env": "production" }
```

**Deep health check:** `https://kayad.space/health/deep` — shows MongoDB, Redis, Sentry, and memory status.

---

## 3. Cloudflare — CDN, DDoS Protection & DNS

**What it does:** Global CDN, DDoS protection, free SSL, automatic caching of static assets, bot protection.

**Setup (15 minutes, free plan available):**

```
1. Go to https://cloudflare.com → Add Site → Enter: kayad.space

2. Select Free plan

3. Cloudflare shows your current DNS records — review and confirm

4. Change nameservers at your domain registrar to:
   ns1.cloudflare.com
   ns2.cloudflare.com

5. Wait 10-30 minutes for propagation

6. In Cloudflare dashboard:
   - SSL/TLS → Full (Strict)
   - Speed → Optimization → Enable Auto Minify (CSS, JS, HTML)
   - Caching → Configuration → Caching Level: Standard
   - Security → Settings → Security Level: Medium
```

**Page Rules (add these in Cloudflare):**

| URL Pattern | Setting | Value |
|---|---|---|
| `kayad.space/api/*` | Cache Level | Bypass |
| `kayad.space/socket.io/*` | Cache Level | Bypass |
| `kayad.space/health*` | Cache Level | Bypass |
| `kayad.space/*.js` | Cache Level | Cache Everything |
| `kayad.space/*.css` | Cache Level | Cache Everything |

**Result:** Static assets served from 200+ global data centers. DDoS attacks absorbed automatically. SSL auto-renewed.

---

## 4. Redis Cache — Upstash (Serverless Redis)

**What it does:** Caches car listings, search results. Reduces MongoDB load by 60-80%.

**Setup (5 minutes, free tier: 10,000 commands/day):**

```
1. Go to https://upstash.com → Create Database
   - Name: kayad
   - Region: eu-west-1 (closest to Nairobi)
   - Type: Regional

2. Copy the Redis URL from dashboard

3. Add to backend/.env:
REDIS_URL=rediss://:your-password@your-endpoint.upstash.io:6379

4. Restart backend:
pm2 restart kayad-backend
```

**Verification:** Backend startup log shows `✅ Redis connected` instead of `in-memory fallback`.

---

## 5. Email — Resend (Recommended)

**What it does:** Transactional emails for bid confirmations, escrow releases, auction wins, etc.

**Setup (10 minutes, free: 3,000 emails/month):**

```
1. Go to https://resend.com → Create Account
2. Add Domain → Follow DNS verification steps for kayad.space
3. Create API Key

4. Add to backend/.env:
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=465
EMAIL_USER=resend
EMAIL_PASS=re_your_api_key_here
EMAIL_FROM=noreply@kayad.space

5. Restart backend:
pm2 restart kayad-backend
```

**Alternative providers:**
- **Mailgun:** `EMAIL_HOST=smtp.mailgun.org` — 5,000 free emails/month
- **SendGrid:** `EMAIL_HOST=smtp.sendgrid.net` — 100 free emails/day
- **Gmail (dev only):** `EMAIL_HOST=smtp.gmail.com` — use App Password

**Test:**
```bash
curl -X POST https://kayad.space/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"you@email.com","password":"test123"}'
# → Welcome email should arrive within 30 seconds
```

---

## 6. Google Analytics 4

**What it does:** Page views, user journeys, conversion tracking, device breakdown.

**Setup (5 minutes, free):**

```
1. Go to https://analytics.google.com → Create Property
2. Select Web → Enter: kayad.space
3. Copy Measurement ID (format: G-XXXXXXXXXX)

4. Add to frontend/.env:
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

5. Add to frontend/index.html (inside <head>):
```

```html
<!-- Google Analytics — paste inside <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

```
6. Rebuild frontend:
npm run build && pm2 restart kayad-backend
```

**Key events to track manually later (optional):**
- `bid_placed` — when user places a bid
- `payment_initiated` — when M-Pesa STK push sent
- `car_viewed` — when car detail page opens
- `favorite_added` — when car is saved

---

## 7. MongoDB Atlas — Automated Backup

**What it does:** Daily automated backups, point-in-time restore, cross-region replication.

**Free tier (M0):** No automated backup — use the cron script.

**Paid tier (M2+ — $9/month):**
```
1. Atlas Dashboard → Your Cluster → Backup
2. Enable Backup → Select: Continuous Backup or Daily Snapshot
3. Set retention: 7 days
4. Done — no code changes needed
```

**M0 free tier backup (cron already set up):**
```bash
# This cron was configured by setup-cron.sh:
# 0 2 * * * bash /var/www/kayad/backend/scripts/backup.sh

# Manual backup anytime:
cd /var/www/kayad/backend
bash scripts/backup.sh
# → Saves to /var/backups/kayad/kayad-YYYY-MM-DD_HH-MM.gz

# To also upload to S3, add to backend/.env:
AWS_S3_BUCKET=kayad-backups
# Then install: apt install awscli && aws configure
```

---

## 8. Africa's Talking — SMS Notifications

**What it does:** Sends SMS when M-Pesa push fails, bid wins, auction ending.

**Setup (10 minutes, free sandbox):**

```
1. Go to https://africastalking.com → Create Account
2. Create App → Get API Key
3. Add to backend/.env:
AT_API_KEY=your_api_key
AT_USERNAME=your_username
AT_SENDER_ID=GariMotors

4. Restart backend:
pm2 restart kayad-backend
```

**SMS is already integrated** in `backend/utils/sms.js` — it reads these env vars automatically.

---

## 9. Cloudinary — Image Optimization (Already Integrated)

Cloudinary is already fully integrated for car image uploads. Ensure these are set:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Optimization settings to enable in Cloudinary dashboard:**
- Auto Format: ON (serves WebP to modern browsers, JPEG to others)
- Auto Quality: ON (reduces file size 30-60% automatically)
- Lazy Load: handled by `loading="lazy"` already in frontend

---

## 10. WhatsApp Business API (Optional)

**What it does:** Send bid win notifications and escrow updates via WhatsApp.

**Setup via Twilio (15 minutes):**

```
1. twilio.com → Create Account → Messaging → WhatsApp Senders
2. Add to backend/.env:
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

3. In sms.service.js, the Twilio fallback is already structured.
```

---

## Integration Status Dashboard

Run this to check which integrations are active:

```bash
curl https://kayad.space/health/deep | python3 -m json.tool
```

Expected output when all integrations active:
```json
{
  "status": "ok",
  "checks": {
    "mongodb": { "status": "ok", "state": "connected" },
    "redis":   { "status": "ok" },
    "sentry":  { "status": "ok" }
  }
}
```

---

## Quick Reference — All Env Variables

| Variable | Service | Required |
|---|---|---|
| `MONGO_URI` | MongoDB | ✅ Yes |
| `JWT_SECRET` | Auth | ✅ Yes |
| `MPESA_*` | M-Pesa | ✅ Yes |
| `CLOUDINARY_*` | Images | ✅ Yes |
| `SENTRY_DSN` | Error tracking | Optional |
| `REDIS_URL` | Caching | Optional |
| `EMAIL_HOST` | Email | Optional |
| `AT_API_KEY` | SMS | Optional |
| `AWS_S3_BUCKET` | Backup | Optional |
