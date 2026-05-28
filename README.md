# Kayad

Kenya's premium car marketplace for live vehicle auctions, dealer listings, M-Pesa payments, escrow workflows, inspections, and admin operations.

## What Kayad Includes

- Buyer marketplace with showroom search, vehicle detail pages, favorites, comparisons, payments, chat, notifications, and buyer dashboard flows.
- Live auction experience with countdowns, bid tracking, winner handling, auction calendar, dealer auction setup, and auction administration.
- Dealer workspace for onboarding, listing management, auction controls, analytics, settlements, team access, and audit logs.
- Admin console for users, dealers, cars, auctions, bids, transactions, reviews, referrals, inspections, NTSA queue, security logs, ads, and platform settings.
- Backend API with Express, MongoDB, Socket.IO, M-Pesa integrations, escrow services, notifications, fraud/abuse controls, and operational monitoring hooks.
- Production deployment assets for Vercel/static frontend, Node backend hosting, Docker, Nginx, PM2, and Render-style environments.

## Tech Stack

- Frontend: React 18, Vite, React Router, Tailwind CSS, lucide-react, framer-motion, Socket.IO client, Vitest.
- Backend: Node.js 20, Express, MongoDB/Mongoose, Socket.IO, Jest, Zod, Helmet, Redis/ioredis, Cloudinary, SendGrid, Twilio, M-Pesa services.
- Quality: ESLint, Vitest, Jest, Playwright critical-flow tests, deployment smoke scripts, production monitoring docs.

## Project Layout

```text
.
├── src/                  # React frontend
├── backend/              # Express API, models, routes, services, tests
├── e2e/                  # Playwright critical flow tests
├── public/               # PWA and static assets
├── dist/                 # Production frontend build output
├── DEPLOY.md             # Deployment runbook
├── GO-LIVE.md            # Launch checklist
├── MONITORING.md         # Observability and incident guidance
└── INTEGRATION.md        # Integration notes
```

## Local Development

Install frontend dependencies from the repo root:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the backend:

```bash
cd backend
npm run dev
```

Copy `.env.example` to `.env` and fill in the required API, database, payment, email, storage, and security values before running connected flows.

## Verification

Frontend:

```bash
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend
npm test
```

End-to-end checks:

```bash
npm run test:e2e
```

## Deployment Notes

Kayad is branded for the canonical domain `kayad.space` and `www.kayad.space`. Keep environment URLs, CORS origins, OAuth/callback URLs, sitemap entries, and deployment host settings aligned with that domain before launch.

See [DEPLOY.md](DEPLOY.md), [GO-LIVE.md](GO-LIVE.md), and [MONITORING.md](MONITORING.md) for production release, smoke testing, and incident-response guidance.
