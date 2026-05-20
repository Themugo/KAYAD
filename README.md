# 🚗 Kayad — Production Deployment Guide

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

> NOTE: This repository is branded as "Kayad" and the canonical domain is `kayad.space` (and `www.kayad.space`). Update your environment variables to match your deployment domain.

(remaining README unchanged — other sections still valid)
