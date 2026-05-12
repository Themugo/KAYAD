# 🚀 Gari Motors — Production Deployment
## Ubuntu 22.04 LTS · Node.js 20 · MongoDB Atlas · Nginx · PM2

---

## Prerequisites

A fresh Ubuntu 22.04 VPS (minimum 2 vCPU, 4GB RAM — DigitalOcean, AWS EC2, Hetzner all work).

Domain pointed to your server IP in your DNS panel.

---

## Step 1 — Server Setup

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y git nginx certbot python3-certbot-nginx mongodump

# Install PM2 globally
sudo npm install -g pm2

# Verify
node --version    # v20.x.x
npm --version     # 10.x.x
nginx -v          # nginx/1.x.x
pm2 --version     # 5.x.x

# Create log directory
sudo mkdir -p /var/log/gari
sudo chown $USER:$USER /var/log/gari

# Create backup directory
sudo mkdir -p /var/backups/gari-motors
sudo chown $USER:$USER /var/backups/gari-motors
```

---

## Step 2 — Clone & Install

```bash
# Clone project
git clone https://github.com/your-org/gari-motors.git /var/www/gari-motors
cd /var/www/gari-motors

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies (at project root)
npm install
```

---

## Step 3 — Configure Environment

```bash
# Backend environment
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in these **required** values (everything else is optional):

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/gari-motors
JWT_SECRET=<run: openssl rand -hex 32>
REFRESH_TOKEN_SECRET=<run: openssl rand -hex 32>
FRONTEND_URL=https://garimotors.co.ke
MPESA_ENV=production
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://garimotors.co.ke/api/payments/callback
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

```bash
# Frontend environment
cp frontend/.env.example frontend/.env
nano frontend/.env
```

```env
VITE_API_BASE_URL=https://garimotors.co.ke
VITE_SOCKET_URL=https://garimotors.co.ke
```

---

## Step 4 — Seed Database (First Time Only)

```bash
cd /var/www/gari-motors/backend
node seed.js
```

Output:
```
✅ SEED COMPLETE
────────────────────────────────
Admin login:
  Email:    admin@garimotors.co.ke
  Password: password123   ← CHANGE THIS IMMEDIATELY
...
```

**Change admin password immediately** after first login via Profile → Security.

---

## Step 5 — Build Frontend

```bash
cd /var/www/gari-motors/frontend
npm run build
# → Output in frontend/dist/
```

---

## Step 6 — Configure Nginx

```bash
# Copy nginx config
sudo cp /var/www/gari-motors/nginx.conf /etc/nginx/sites-available/gari-motors

# Edit domain name
sudo sed -i 's/garimotors.co.ke/YOUR-ACTUAL-DOMAIN.co.ke/g' \
  /etc/nginx/sites-available/gari-motors

# Enable site
sudo ln -sf /etc/nginx/sites-available/gari-motors \
            /etc/nginx/sites-enabled/gari-motors

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t
# → nginx: configuration file /etc/nginx/nginx.conf test is successful

# Start nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 7 — SSL Certificate

```bash
sudo certbot --nginx \
  -d yourdomain.co.ke \
  -d www.yourdomain.co.ke \
  --non-interactive \
  --agree-tos \
  --email your@email.com

# Auto-renewal is set up automatically by certbot
# Test renewal:
sudo certbot renew --dry-run
```

---

## Step 8 — Start Backend with PM2

```bash
cd /var/www/gari-motors

# Start in cluster mode (uses all CPU cores)
pm2 start ecosystem.config.cjs

# Save PM2 config (persists across reboots)
pm2 save

# Set PM2 to start on system boot
pm2 startup
# ↑ Copy and run the command it prints

# Verify
pm2 status
# → gari-backend   online   cluster (N instances)
```

Expected startup logs:
```
🚗 Gari Motors API
├─ URL:      http://localhost:5000
├─ Env:      production
├─ Routes:   13 mounted
├─ Security: mongoSanitize + XSS + IP whitelist + pagination cap
├─ Sentry:   disabled (set SENTRY_DSN to enable)
├─ Redis:    in-memory fallback
└─ Socket:   ready

⏰ EscrowCron: auto-release after 7 days
⚡ AuctionEngine: running
```

---

## Step 9 — Set Up Cron Jobs

```bash
cd /var/www/gari-motors/backend
bash scripts/setup-cron.sh
```

This configures:
- Daily MongoDB backup at 2:00 AM
- SSL cert renewal check at 3:00 AM
- Log rotation on Sundays

---

## Step 10 — Verify Everything Works

```bash
# Health check
curl https://yourdomain.co.ke/health
# → {"status":"ok","uptime":42,"env":"production"}

# Deep health (DB + services)
curl https://yourdomain.co.ke/health/deep

# Test login
curl -X POST https://yourdomain.co.ke/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@garimotors.co.ke","password":"password123"}'
# → {"success":true,"token":"..."}

# Test car listing
curl https://yourdomain.co.ke/api/cars?limit=3
# → {"success":true,"cars":[...],"pagination":{...}}
```

---

## Step 11 — Optional: Enable Integrations

Each integration activates by setting an env var and restarting:

```bash
# Sentry error tracking (sentry.io — free tier)
echo "SENTRY_DSN=https://xxx@sentry.io/xxx" >> backend/.env
cd backend && npm install @sentry/node
cd ../frontend && npm install @sentry/react && npm run build

# Redis caching (upstash.com — free tier)
echo "REDIS_URL=rediss://:password@endpoint.upstash.io:6379" >> backend/.env

# Email notifications (resend.com — 3,000 free/month)
cat >> backend/.env << 'EOF'
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=465
EMAIL_USER=resend
EMAIL_PASS=re_your_api_key
EMAIL_FROM=noreply@garimotors.co.ke
EOF

# Restart to activate
pm2 restart gari-backend
```

See `MONITORING.md` for full setup guides for all integrations.

---

## Firewall Setup

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw deny 5000     # Block direct backend access (nginx proxies it)
sudo ufw enable
sudo ufw status
```

---

## Updating the App

```bash
cd /var/www/gari-motors
bash backend/scripts/deploy.sh
```

This script: pulls latest code → runs backup → restarts backend → rebuilds frontend.

---

## Monitoring Commands

```bash
# Live PM2 logs
pm2 logs gari-backend --lines 100

# CPU + memory usage
pm2 monit

# Backend errors only
pm2 logs gari-backend --err --lines 50

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Backup log
tail -f /var/log/gari/backup.log

# Restart backend
pm2 restart gari-backend

# Zero-downtime reload
pm2 reload gari-backend
```

---

## Troubleshooting

| Problem | Check |
|---|---|
| 502 Bad Gateway | `pm2 status` — is backend running? `pm2 logs` for errors |
| M-Pesa callback fails | Check `MPESA_CALLBACK_URL` is HTTPS. Check Daraja portal. |
| Socket.io not connecting | Check nginx `/socket.io/` proxy config. Check `VITE_SOCKET_URL` |
| Login fails | Check `JWT_SECRET` is set. Check MongoDB connection. |
| Images not uploading | Check Cloudinary credentials. Check `uploads/` folder permissions. |
| SSL certificate error | Run `sudo certbot renew`. Check domain DNS points to server IP. |

---

## Production Checklist

- [ ] Admin password changed from seed default
- [ ] `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are random 32+ char strings
- [ ] `NODE_ENV=production` in backend `.env`
- [ ] `MPESA_ENV=production` (not sandbox)
- [ ] `MPESA_SKIP_IP_CHECK=false` (never true in production)
- [ ] Firewall enabled (ports 22, 80, 443 only)
- [ ] SSL certificate installed and auto-renews
- [ ] PM2 startup script running (`pm2 startup`)
- [ ] Backup cron configured (`bash scripts/setup-cron.sh`)
- [ ] UptimeRobot monitoring `/health` (see `MONITORING.md`)
- [ ] Sentry DSN configured for error tracking
