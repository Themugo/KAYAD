# KAYAD Integration Guide

Complete step-by-step guide to configure all services for KAYAD. Follow each step in order.

---

## STEP 1: SUPABASE (Database, Auth, Storage)

**Purpose**: Main database, user authentication, and file storage.

### 1.1 Create Supabase Project

1. Go to: **https://supabase.com/dashboard**
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Your organization or create one
   - **Name**: `kayad`
   - **Database Password**: Generate strong password (SAVE IT!)
   - **Region**: Choose closest to Kenya (`EU West` recommended)
4. Click **Create new project**
5. Wait 2-3 minutes for setup

### 1.2 Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:

```
SUPABASE_URL = https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY = eyJhbGc...  (service_role secret)
```

### 1.3 Create Storage Bucket

1. Go to **Storage** in left sidebar
2. Click **New Bucket**
3. Configure:
   - **Name**: `kayad-images`
   - ✅ Check **Public bucket**
4. Click **Create bucket**

### 1.4 Set Storage Policies (for public access)

1. Select `kayad-images` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Choose **"Create a policy from scratch"**
5. Name it: `Public Read Access`
6. For all roles, allow: `SELECT`
7. Save

### 1.5 Get Frontend Keys

1. Go to **Settings** → **API**
2. Under "Project API keys", copy:
   - `anon public` key for VITE_SUPABASE_ANON_KEY
   - `service_role` secret for SUPABASE_SERVICE_KEY

### 📋 Values for .env

```env
# Backend (backend/.env)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_BUCKET=kayad-images

# Frontend (.env)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## STEP 2: MPESA (Payments - Kenya)

**Purpose**: Accept mobile money payments from Kenyan users.

### 2.1 Create Safaricom Developer Account

1. Go to: **https://developer.safaricom.co.ke/**
2. Click **Sign Up**
3. Fill in your details
4. Verify your email

### 2.2 Create an App

1. Go to **My Apps** → **Create an App**
2. Fill in:
   - **App Name**: `KAYAD Production`
   - **Description**: `KAYAD payment integration`
3. Click **Create App**

### 2.3 Get Consumer Credentials

1. Open your app
2. Copy:
   - **Consumer Key**
   - **Consumer Secret**

### 2.4 Register C2B URL (for receiving payments)

1. Go to **API Portfolio** → **M-Pesa Express (STK Push)**
2. Click **Try it** or go to **Test Credentials**
3. For sandbox testing, you'll use test shortcode

### 2.5 Get Lipa Na M-Pesa Online Credentials

1. Go to **Safaricom Developer Portal** → **Lipa Na M-Pesa**
2. Register your:
   - **Shortcode** (Paybill or Till number)
   - **Passkey** (from your portal account)

### 2.6 Set Up Callback URL

Your backend should handle: `https://your-domain.com/api/payments/callback`

For local development, use **ngrok** (see STEP 10).

### 📋 Values for .env

```env
# Backend (backend/.env)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode_or_paybill
MPESA_PASSKEY=your_lipa_na_mpesa_passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/callback
MPESA_ENV=sandbox  # Change to 'production' when live
```

---

## STEP 3: AFRICA'S TALKING (SMS - Kenya)

**Purpose**: Send SMS notifications and OTP codes.

### 3.1 Create Africa's Talking Account

1. Go to: **https://africastalking.com/**
2. Click **Sign Up**
3. Choose **Kenya** as country
4. Complete registration

### 3.2 Get API Key

1. Go to **Settings** → **API Key**
2. Copy your **API Key**

### 3.3 Get Username

1. Your username is shown at the top of the dashboard
2. It's usually your account name or company name

### 3.4 Register Sender ID

1. Go to **SMS** → **Sender IDs**
2. Request a sender ID (e.g., `KAYAD`)
3. Approval takes 24-48 hours

### 📋 Values for .env

```env
# Backend (backend/.env)
AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=your_africas_talking_username
AT_SENDER_ID=KAYAD  # Your approved sender ID
SMS_PROVIDER=africastalking  # or 'mock' for testing
```

---

## STEP 4: SENDGRID (Email)

**Purpose**: Send transactional emails (password reset, notifications).

### 4.1 Create SendGrid Account

1. Go to: **https://signup.sendgrid.com/**
2. Choose **Free Plan** (100 emails/day)
3. Complete registration

### 4.2 Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in:
   - **From Email**: `noreply@your-domain.com`
   - **From Name**: KAYAD
   - **Reply To**: `support@your-domain.com`
4. Check email and click verification link

### 4.3 Create API Key

1. Go to **Settings** → **API Key**
2. Click **Create API Key**
3. Choose **Full Access** or **Restricted Access** with:
   - ✅ Mail Send
   - ✅ Template Management
4. Copy the API key (only shown once!)

### 📋 Values for .env

```env
# Backend (backend/.env)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@your-domain.com
```

---

## STEP 5: TWILIO (WhatsApp)

**Purpose**: Send WhatsApp notifications and messages.

### 5.1 Create Twilio Account

1. Go to: **https://www.twilio.com/try-twilio**
2. Sign up with your email
3. Verify your phone number

### 5.2 Get Account Credentials

1. Go to **Console** (main dashboard)
2. Copy:
   - **Account SID**
   - **Auth Token**

### 5.3 Set Up WhatsApp Sandbox

1. Go to **Messaging** → **Try it Out** → **Send a WhatsApp message**
2. Follow instructions to join sandbox
3. Your sandbox number will be: `+14155238886`

### 5.4 Request WhatsApp Business Account (Optional)

For production, you need:
1. A WhatsApp Business Account
2. A Twilio WhatsApp-approved number
3. Facebook Business verification

### 📋 Values for .env

```env
# Backend (backend/.env)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox or your approved number
```

---

## STEP 6: CLOUDINARY (Image Storage)

**Purpose**: Store and optimize car images and videos.

### 6.1 Create Cloudinary Account

1. Go to: **https://cloudinary.com/users/register/free**
2. Sign up with email or Google
3. Choose **Free Plan** (25 credits/month)

### 6.2 Get Cloud Name and API Key

1. Go to **Dashboard**
2. Copy:
   - **Cloud Name**

### 6.3 Get API Secret

1. Go to **Settings** → **API Keys**
2. Copy:
   - **API Key**
   - **API Secret**

### 6.4 Create Upload Preset (Optional)

1. Go to **Settings** → **Upload**
2. Scroll to **Upload presets**
3. Click **Add upload preset**
4. Name it: `kayad-images`
5. Signing Mode: **Unsigned** (for easier uploads)
6. Save

### 📋 Values for .env

```env
# Backend (backend/.env)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## STEP 7: POSTHOG (Analytics)

**Purpose**: Track user behavior and product analytics.

### 7.1 Create PostHog Account

1. Go to: **https://posthog.com/**
2. Click **Get started for free**
3. Sign up with GitHub or email

### 7.2 Create a Project

1. After signup, you'll create a project
2. Name it: `KAYAD`
3. Copy:
   - **Project API Key** (for POSTHOG_API_KEY)
   - **Host** (usually `https://us.i.posthog.com`)

### 7.3 Get API Key

1. Go to **Project Settings** → **Keys & SDKs**
2. Copy **Project API Key**

### 📋 Values for .env

```env
# Backend (backend/.env)
POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com

# Frontend (.env)
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

---

## STEP 8: SENTRY (Error Tracking)

**Purpose**: Monitor and fix production errors.

### 8.1 Create Sentry Account

1. Go to: **https://sentry.io/**
2. Sign up with GitHub or email
3. Create an organization: `KAYAD`

### 8.2 Create a Project

1. Click **Create Project**
2. Choose:
   - **Framework**: Node.js (backend)
   - **Framework**: React (frontend)
3. Name projects:
   - `kayad-backend`
   - `kayad-frontend`

### 8.3 Get DSN

1. Go to **Project Settings** → **Client Keys (DSN)**
2. Copy the DSN URL

### 📋 Values for .env

```env
# Backend (backend/.env)
SENTRY_DSN=https://xxxxxxxx@sentry.io/xxxxxxx

# Frontend (.env)
VITE_SENTRY_DSN=https://xxxxxxxx@sentry.io/xxxxxxx
```

---

## STEP 9: REDIS (Caching - Optional)

**Purpose**: Fast caching and rate limiting.

### 9.1 Option A: Redis Cloud (Easy)

1. Go to: **https://redis.com/**
2. Sign up for free tier
3. Create a database
4. Copy:
   - **Public Endpoint** (for REDIS_URL)
   - **Default User Password**

### 9.2 Option B: Railway (Good Value)

1. Go to: **https://railway.app/**
2. Create account
3. New Project → **Add Redis**
4. Copy connection string

### 9.3 Option C: Upstash (Serverless Friendly)

1. Go to: **https://upstash.com/**
2. Create Redis database
3. Copy:
   - **REST URL**
   - **REST Token**

### 📋 Values for .env

```env
# Backend (backend/.env)
REDIS_URL=redis://default:password@host:port
REDIS_PASSWORD=your_redis_password
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

**For local development only:**
```env
REDIS_URL=
```

---

## STEP 10: NGROK (Local Development)

**Purpose**: Expose local server for webhooks (M-Pesa, etc.)

### 10.1 Create ngrok Account

1. Go to: **https://ngrok.com/**
2. Sign up for free account

### 10.2 Get Authtoken

1. Go to **Getting Started** → **Setup & Installation**
2. Copy your **authtoken**

### 10.3 Install and Configure

```bash
# Install
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Configure (paste your authtoken)
ngrok config add-authtoken YOUR_AUTHTOKEN

# Start tunnel to backend
ngrok http 5000
```

### 10.4 Get Public URL

1. ngrok will show: `Forwarding https://xxxx.ngrok-free.app -> http://localhost:5000`
2. Use this URL as your callback URL in M-Pesa config

---

## STEP 11: FINAL .ENV CONFIGURATION

### Backend (backend/.env)

```env
# =====================================================================
#  KAYAD BACKEND — Production Environment Configuration
# =====================================================================

# ─── SERVER ───────────────────────────────────────────────────────
NODE_ENV=production
PORT=5000

# ─── SUPABASE ────────────────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_BUCKET=kayad-images

# ─── AUTH TOKENS ─────────────────────────────────────────────────
JWT_SECRET=generate-a-strong-64-char-random-string
REFRESH_TOKEN_SECRET=generate-another-64-char-random-string
SESSION_SECRET=generate-a-third-64-char-random-string
ACCESS_TOKEN_EXPIRE=1h
REFRESH_TOKEN_EXPIRE=7d
ACCESS_COOKIE_MS=3600000

# ─── DOMAINS ─────────────────────────────────────────────────────
FRONTEND_URL=https://kayad.space
BACKEND_URL=https://api.kayad.space

# ─── MPESA ───────────────────────────────────────────────────────
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://api.kayad.space/api/payments/callback
MPESA_ENV=production
MPESA_SKIP_IP_CHECK=false

# ─── SMS ─────────────────────────────────────────────────────────
AT_API_KEY=your_api_key
AT_USERNAME=your_username
AT_SENDER_ID=KAYAD
SMS_PROVIDER=africastalking

# ─── EMAIL ───────────────────────────────────────────────────────
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@kayad.space

# ─── WHATSAPP ────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+2547xxxxxxx

# ─── CLOUDINARY ──────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# ─── ANALYTICS ───────────────────────────────────────────────────
POSTHOG_API_KEY=phc_xxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com

# ─── ERROR TRACKING ──────────────────────────────────────────────
SENTRY_DSN=https://xxxx@sentry.io/xxxxx

# ─── CACHE (Optional) ───────────────────────────────────────────
REDIS_URL=redis://host:port
REDIS_PASSWORD=your_password

# ─── ESCROW ──────────────────────────────────────────────────────
ESCROW_ACCOUNT_NUMBER=your_bank_account
ESCROW_BANK_NAME=Equity Bank Kenya
ESCROW_AUTO_RELEASE_DAYS=7
KAYAD_MASTER_PAYBILL=your_mpesa_paybill

# ─── ADMIN ──────────────────────────────────────────────────────
ADMIN_EMAIL=admin@kayad.space
ADMIN_PHONE=+2547xxxxxxx
SEED_ADMIN_EMAIL=admin@kayad.space
SEED_ADMIN_PASSWORD=set-a-very-strong-password
```

### Frontend (.env)

```env
# ─── SUPABASE ────────────────────────────────────────────────────
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# ─── API ─────────────────────────────────────────────────────────
VITE_API_URL=https://api.kayad.space
VITE_SOCKET_URL=https://api.kayad.space

# ─── FEATURES ────────────────────────────────────────────────────
VITE_ENABLE_CHAT=true
VITE_ENABLE_ESCROW=true
VITE_ENABLE_AUCTIONS=true
VITE_ENABLE_COMPARE=true
VITE_ENABLE_REVIEWS=true

# ─── ANALYTICS ───────────────────────────────────────────────────
VITE_POSTHOG_KEY=phc_xxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com

# ─── ERROR TRACKING ──────────────────────────────────────────────
VITE_SENTRY_DSN=https://xxxx@sentry.io/xxxxx

# ─── APP ─────────────────────────────────────────────────────────
VITE_APP_NAME=KAYAD
VITE_DOMAIN=kayad.space
```

---

## QUICK REFERENCE: Service URLs

| Service | Sign Up URL | Docs |
|---------|-------------|------|
| Supabase | https://supabase.com | https://supabase.com/docs |
| M-Pesa | https://developer.safaricom.co.ke | https://developer.safaricom.co.ke/docs |
| Africa's Talking | https://africastalking.com | https://developers.africastalking.com |
| SendGrid | https://signup.sendgrid.com | https://docs.sendgrid.com |
| Twilio | https://www.twilio.com | https://www.twilio.com/docs |
| Cloudinary | https://cloudinary.com | https://cloudinary.com/documentation |
| PostHog | https://posthog.com | https://posthog.com/docs |
| Sentry | https://sentry.io | https://docs.sentry.io |
| Redis Cloud | https://redis.com | https://redis.io/docs |
| ngrok | https://ngrok.com | https://ngrok.com/docs |

---

## SECURITY CHECKLIST

Before going live:

- [ ] All placeholder values replaced with real keys
- [ ] Secrets stored in environment variables (not in code)
- [ ] SUPABASE_SERVICE_KEY kept server-side only
- [ ] REDIS password set if using production Redis
- [ ] M-Pesa IP whitelist configured for production
- [ ] HTTPS enabled on all domains
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (PostHog) integrated
