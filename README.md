# 🚗 Gari Motors — Production Deployment Guide

Kenya's Premium Car Marketplace — Live Auctions · M-Pesa · Escrow

---

## Architecture Overview

```
Browser ──HTTPS──► Nginx ─┬──► /api/*         → Node.js Backend (PM2 cluster)
                           ├──► /socket.io/*   → Socket.io (WebSocket)
                           └──► /*             → React SPA (static dist/)

Node.js ──► MongoDB Atlas
        ──► Safaricom Daraja API (M-Pesa)
        ──► Cloudinary (car images)
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Backend + frontend build |
| npm | ≥ 9 | Package manager |
| MongoDB | Atlas M0+ | Database |
| Nginx | Latest | Reverse proxy |
| PM2 | `npm i -g pm2` | Process manager |
| Certbot | Latest | SSL/HTTPS |

---

## 1. Clone & Structure

```bash
git clone https://github.com/your-org/gari-motors.git /var/www/gari-motors
cd /var/www/gari-motors
```

Expected structure after clone:
```
/var/www/gari-motors/
  ├── backend/          # Express API (your existing backend)
  ├── frontend/         # This React project
  ├── ecosystem.config.cjs
  └── nginx.conf
```

---

## 2. Backend Setup

```bash
cd /var/www/gari-motors/backend
npm install
```

Create `/var/www/gari-motors/backend/.env`:

```env
# Server
NODE_ENV=production
PORT=5000

# MongoDB — use Atlas connection string
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/gari-motors?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another-secret-for-refresh-tokens

# M-Pesa Daraja API (Safaricom)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_lipa_na_mpesa_passkey
MPESA_SHORTCODE=your_business_shortcode
MPESA_CALLBACK_URL=https://garimotors.co.ke/api/payments/mpesa-callback
MPESA_ENV=production            # or sandbox for testing

# Cloudinary (car images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
FRONTEND_URL=https://garimotors.co.ke

# Admin setup
ADMIN_EMAIL=admin@garimotors.co.ke
ADMIN_PASSWORD=strong-admin-password-here

# Escrow / Dealer payout config
ESCROW_RELEASE_DAYS=3            # Days before auto-release
LISTING_FEE_KES=500              # Fee per listing
```

---

## 3. Frontend Build

```bash
cd /var/www/gari-motors/frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=https://garimotors.co.ke
VITE_SOCKET_URL=https://garimotors.co.ke
```

Build for production:
```bash
npm run build
# Output: frontend/dist/
```

---

## 4. Nginx Configuration

```bash
# Copy nginx config
sudo cp /var/www/gari-motors/nginx.conf /etc/nginx/sites-available/gari-motors

# Edit domain name in the config
sudo nano /etc/nginx/sites-available/gari-motors
# Replace 'garimotors.co.ke' with your actual domain

# Enable site
sudo ln -sf /etc/nginx/sites-available/gari-motors /etc/nginx/sites-enabled/

# Remove default
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 5. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y

sudo certbot --nginx -d garimotors.co.ke -d www.garimotors.co.ke

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 6. Start Backend with PM2

```bash
cd /var/www/gari-motors

# Create log directory
sudo mkdir -p /var/log/gari
sudo chown $USER:$USER /var/log/gari

# Start app in cluster mode
pm2 start ecosystem.config.cjs

# Save PM2 config (survives reboots)
pm2 save

# Auto-start PM2 on server boot
pm2 startup
# Follow the command it prints

# Monitor
pm2 status
pm2 logs gari-backend --lines 50
```

---

## 7. MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a cluster (M0 free tier works for dev)
3. **Database Access** → Add user with `readWrite` role
4. **Network Access** → Add your server IP (or `0.0.0.0/0` temporarily)
5. Copy connection string → paste into backend `.env` as `MONGO_URI`

**Recommended indexes** (run in MongoDB Compass or Atlas):
```js
// Cars collection
db.cars.createIndex({ auctionStatus: 1, auctionEnd: 1 })
db.cars.createIndex({ dealer: 1, createdAt: -1 })
db.cars.createIndex({ brand: 1, price: 1 })
db.cars.createIndex({ "location.city": 1 })
db.cars.createIndex({ title: "text", brand: "text", model: "text" })

// Bids collection
db.bids.createIndex({ car: 1, amount: -1 })
db.bids.createIndex({ user: 1, createdAt: -1 })

// Payments
db.payments.createIndex({ checkoutRequestID: 1 }, { unique: true })
db.payments.createIndex({ user: 1, status: 1 })

// Escrow
db.escrows.createIndex({ buyer: 1, status: 1 })
db.escrows.createIndex({ seller: 1, status: 1 })
```

---

## 8. M-Pesa Daraja API Setup

### Get Credentials
1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app → get Consumer Key & Secret
3. Go Live: submit KYC to move from sandbox to production

### Callback URL
The backend exposes: `POST /api/payments/mpesa-callback`

In Daraja portal, set:
- **STK Push Callback**: `https://garimotors.co.ke/api/payments/mpesa-callback`

### Test Numbers (Sandbox)
- Phone: `254708374149` — always succeeds
- Phone: `254700000000` — always fails

---

## 9. Cloudinary Setup (Car Images)

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier: 25 GB)
2. Dashboard → Copy Cloud Name, API Key, API Secret
3. Paste into backend `.env`

The backend uploads using `multer-storage-cloudinary`. Images are stored in the `gari-motors/cars/` folder.

---

## 10. Create First Admin

After deploying, seed the admin account:

```bash
cd /var/www/gari-motors/backend

# Option A: via API call
curl -X POST https://garimotors.co.ke/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@garimotors.co.ke","password":"YourPassword","role":"admin"}'

# Option B: directly in MongoDB (Atlas Shell)
db.users.insertOne({
  name: "Gari Admin",
  email: "admin@garimotors.co.ke",
  password: "<bcrypt hash>",
  role: "admin",
  approved: true,
  createdAt: new Date()
})
```

---

## 11. Platform Revenue Model

| Revenue Source | Amount | Notes |
|---|---|---|
| Dealer listing fee | KES 500/listing | Charged before publishing |
| Featured/promoted listing | KES 2,000/week | Pinned in search results |
| Auction listing fee | KES 1,000/auction | Paid by dealer |
| Escrow platform fee | 1.5% of sale | Deducted on release |
| Bid commitment (5%) | → goes to dealer | Not platform revenue |

---

## 12. Monitoring & Maintenance

```bash
# View real-time logs
pm2 logs gari-backend

# Restart after code update
cd /var/www/gari-motors/backend && git pull && pm2 restart gari-backend

# Rebuild frontend after updates
cd /var/www/gari-motors/frontend && git pull && npm run build

# Check Nginx errors
sudo tail -f /var/log/nginx/error.log

# Check disk space (for uploads)
df -h /var/www/gari-motors

# MongoDB backup via Atlas
# Automated daily backups included on M2+ tier
# For M0: use mongodump manually
mongodump --uri="$MONGO_URI" --out=/backup/$(date +%Y-%m-%d)
```

---

## 13. Scaling (When You Grow)

| Traffic Level | Recommended Setup |
|---|---|
| < 1,000 users/day | VPS 2vCPU 4GB RAM (current) |
| 1,000–10,000 | VPS 4vCPU 8GB RAM + Redis cache |
| 10,000+ | Load balancer + multiple app servers + MongoDB Atlas M10 |
| High scale | Kubernetes + managed MongoDB + CDN for images |

**Redis caching** (add when ready):
```bash
# Install Redis
sudo apt install redis-server -y
# Add to backend: REDIS_URL=redis://localhost:6379
# Cache: car listings, search results, user sessions
```

---

## 14. Security Checklist

- [ ] JWT secrets are strong (≥ 32 random chars)
- [ ] MongoDB user has least-privilege access
- [ ] Nginx blocks direct backend port access (firewall)
- [ ] M-Pesa callback URL validates Safaricom IP
- [ ] Rate limiting on auth routes (`/api/auth/login`)
- [ ] Admin routes protected by role middleware
- [ ] File uploads validated (images only, max 5MB)
- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] Environment variables never committed to git
- [ ] `.gitignore` includes `.env`, `node_modules`, `dist/`

---

## Quick Deploy Commands (Summary)

```bash
# First deploy
git clone <repo> /var/www/gari-motors
cd /var/www/gari-motors/backend  && npm install
cd /var/www/gari-motors/frontend && npm install && npm run build
pm2 start ecosystem.config.cjs && pm2 save
sudo nginx -t && sudo systemctl reload nginx

# Update deploy
git pull
cd frontend && npm run build     # if frontend changed
pm2 restart gari-backend         # if backend changed
```

---

**Built with ❤️ for the Kenyan market.**  
*Gari Motors — outcompeting Jiji, OLX, and every dealer's WhatsApp group.*
