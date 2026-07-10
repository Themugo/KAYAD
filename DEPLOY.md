# Deployment Guide — Gari Motors Marketplace

## Production Backend: Supabase

This application uses **Supabase** as its sole production backend for:
- PostgreSQL database
- Authentication (email/password)
- Storage (vehicle images, documents, avatars)
- Realtime updates (auction bids, notifications)

## Environment Variables

All Supabase variables are pre-configured in `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

No additional backend services are required.

## Build & Deploy

```bash
npm install
npm run build      # production build to dist/
```

The `dist/` directory contains the static SPA. Deploy to any static host (Vercel, Netlify, Cloudflare Pages).

## Vercel

`vercel.json` is configured for SPA routing. Push to main to deploy.

## Health Checks

- Frontend: `GET /` returns 200 with the SPA
- Database: Supabase dashboard shows connection health
- Auth: Supabase dashboard shows auth health
