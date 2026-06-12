# KAYAD — Where Kenya Drives

> East Africa's most sophisticated automotive marketplace.  
> Live auctions · Verified dealers · M-Pesa secured escrow · Ghost Check

---

## Project Structure

```
KAYAD/
├── backend/                   Node.js / Express / MongoDB API
├── frontend/                  TanStack Start / React 19 / Tailwind v4 / Supabase
├── setup-windows.bat          One-click Windows setup (run this first)
├── start-all.bat              Start both backend + frontend on Windows
├── start-backend.bat          Start backend only
├── start-frontend.bat         Start frontend only
└── CHANGES.md                 16 security & architecture audit fixes
```

---

## Quick Start — Windows (CMD / PowerShell)

### Step 1 — Run the setup script (once)
```
setup-windows.bat
```
This copies `.env.development` → `.env` in both `backend/` and `frontend/`,
then runs `npm install` in both folders.

### Step 2 — Configure MongoDB (backend)

Open `backend\.env` in Notepad and set `MONGO_URI`:

**Option A — You have MongoDB installed locally:**
```
MONGO_URI=mongodb://127.0.0.1:27017/kayad
```

**Option B — You want MongoDB Atlas (cloud, free tier):**
1. Go to https://cloud.mongodb.com → create free cluster
2. Click Connect → Drivers → copy the connection string
3. Replace `<password>` with your DB user password
```
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/kayad?retryWrites=true&w=majority
```

**Don't have MongoDB at all?** Install it:
→ https://www.mongodb.com/try/download/community  (Community Server, Windows msi)

### Step 3 — Configure Supabase (frontend)

Open `frontend\.env` in Notepad and set:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: https://supabase.com → your project → Settings → API

### Step 4 — Start the app

**Both at once (opens two CMD windows):**
```
start-all.bat
```

**Or separately in two CMD windows:**
```
Window 1:   start-backend.bat
Window 2:   start-frontend.bat
```

**Or manually:**
```cmd
:: Window 1 — Backend
cd backend
npm run dev

:: Window 2 — Frontend
cd frontend
npm run dev
```

The app will be at:
- Frontend → http://localhost:3000
- Backend API → http://localhost:5000/api
- API Health → http://localhost:5000/health

---

## Quick Start — Mac / Linux (bash)

```bash
# One-time setup
cd backend  && cp .env.development .env  && npm install && cd ..
cd frontend && cp .env.development .env  && npm install && cd ..

# Edit backend/.env — set MONGO_URI
# Edit frontend/.env — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Run both (requires concurrently: npm install -g concurrently)
npm run dev

# Or separately
cd backend  && npm run dev   # terminal 1
cd frontend && npm run dev   # terminal 2
```

---

## Environment Variables

### backend/.env (most important)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ Yes | MongoDB connection string |
| `JWT_SECRET` | ✅ Yes | Secret for access tokens (32+ chars) |
| `REFRESH_TOKEN_SECRET` | ✅ Yes | Secret for refresh tokens (32+ chars) |
| `WEBHOIST_EMAIL` | ✅ Yes | Your email — becomes permanent superadmin |
| `FRONTEND_URL` | ✅ Yes | Frontend origin for CORS |
| `MPESA_CONSUMER_KEY` | Optional | M-Pesa Daraja API key |
| `CLOUDINARY_CLOUD_NAME` | Optional | For car image uploads |
| `EMAIL_HOST` | Optional | SMTP — leave blank to disable email |
| `REDIS_URL` | Optional | Leave blank for in-memory fallback |

### frontend/.env

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Your Supabase anon/public key |

---

## Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| Node.js 20+ | Runtime |
| Express 4 | API framework |
| MongoDB + Mongoose | Primary database |
| Socket.io | Real-time auction engine |
| Redis (optional) | Cache + pub/sub |
| JWT | Auth tokens |
| Cloudinary | Image storage |
| M-Pesa Daraja | Mobile payments |

### Frontend
| Tool | Purpose |
|------|---------|
| React 19 | UI framework |
| TanStack Router + Start | File-based routing + SSR |
| Tailwind CSS v4 | Styling (oklch design tokens) |
| shadcn/ui + Radix | 35 component library |
| Supabase | Auth + Postgres |
| Sonner | Toast notifications |
| Zod | Schema validation |

---

## Routes

| URL | Page |
|-----|------|
| `/` | Landing page |
| `/gallery` | Browse all vehicles |
| `/auctions` | Live + upcoming auctions |
| `/ghost-check` | Vehicle history reports |
| `/how-it-works` | 4-step process guide |
| `/about` | About KAYAD |
| `/auth` | Sign in / Register |
| `/dashboard` | User dashboard |
| `/dealer-application` | Dealer verification |

---

## Common Issues

**`'cp' is not recognized`** — Use `setup-windows.bat` instead of bash commands on Windows.

**MongoDB ETIMEOUT** — Your `MONGO_URI` points to a cloud cluster that isn't reachable.  
Set it to `mongodb://127.0.0.1:27017/kayad` for local MongoDB.

**Port already in use** — Another app is on port 5000 or 3000.  
Change `PORT=5001` in `backend/.env` or `npm run dev -- --port 3001` for frontend.

**`npm warn workspaces ... no workspace folder`** — Run `npm install` inside `backend/` directly, not from the root.

---

© 2025 KAYAD Limited. Made for Kenya 🇰🇪
