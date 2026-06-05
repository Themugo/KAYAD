# KAYAD — Go-Live Runbook

A checklist to take the platform from demo-mode to a live backend serving real
data. Follow top to bottom. The app keeps working in demo/preview mode the
whole time — nothing breaks while you set this up.

> **Minimum to go live:** a MongoDB connection string + three secrets. M-Pesa,
> SMS, email and image hosting are optional and can be added later — the app
> degrades gracefully without them.

---

## Step 1 — Database (MongoDB Atlas, free tier)

1. Create a free account at mongodb.com/cloud/atlas.
2. Create a cluster (the free **M0** tier is fine to launch).
3. **Database Access** → add a user (username + strong password). Save these.
4. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Render's IPs are dynamic).
5. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/kayad?retryWrites=true&w=majority
   ```
   Replace `USER`/`PASSWORD`, and add `/kayad` before the `?` to name the DB.

## Step 2 — Generate secrets

Run this locally (or use any random 64-char hex generator) — you need two:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # REFRESH_TOKEN_SECRET
```

## Step 3 — Deploy the backend (Render)

The repo already contains `render.yaml`. On render.com:

1. **New** → **Blueprint** → connect the `Themugo/KAYAD` repo. Render reads `render.yaml`.
2. When prompted, fill the env vars marked `sync: false`. **Minimum set:**

   | Key | Value |
   |---|---|
   | `MONGO_URI` | the Atlas string from Step 1 |
   | `JWT_SECRET` | first secret from Step 2 |
   | `REFRESH_TOKEN_SECRET` | second secret from Step 2 |
   | `FRONTEND_URL` | `https://www.kayad.space` |
    | `WEBHOIST_EMAIL` | `owner@kayad.space,webhost@kayad.space` (comma-separated — both become immutable owners) |
    | `SEED_ADMIN_EMAIL` | the primary owner email the seed creates (e.g. `owner@kayad.space`) |
   | `SEED_ADMIN_PASSWORD` | a strong password for first login |
   | `SEED_WEBHOST_PW` | password for the second (kayad-domain) owner |

3. Deploy. Watch the logs for `DB connected` and `Server listening`.
4. Your backend is now at something like `https://kayad-backend.onrender.com`.

## Step 4 — Point the domain

The frontend (`vercel.json`) proxies `/api/*` and `/socket.io/*` to
`https://api.kayad.space`. Two options:

- **A (recommended):** add a custom domain `api.kayad.space` in Render →
  Settings → Custom Domains, and a CNAME in your DNS pointing there.
- **B (quick test):** change the two `destination` URLs in `vercel.json` to your
  `onrender.com` URL, and the `connect-src` in the CSP header to match, then redeploy Vercel.

## Step 5 — Seed the platform

Once the backend is live, seed the owner + starter accounts. In Render →
your service → **Shell**:
```bash
npm run seed
```
This creates your webhost owner (from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`)
plus seed staff/dealer accounts. Log in with the owner account and **change the
password immediately** (the seed sets `mustChangePassword`).

## Step 6 — Verify

- Visit `https://api.kayad.space/health` → should return `200 OK`.
- Load `https://www.kayad.space` → the "Preview Mode" pill should disappear; the
  gallery now shows real (empty until you add cars) data, not demo cars.
- Log in as the webhost → create an admin via the staff page.
- Add a real car listing → confirm it appears with **no** DEMO sticker.

---

## Optional integrations (add when ready — each is independent)

| Feature | Env vars | Where to get them |
|---|---|---|
| **M-Pesa** (STK push, escrow) | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, `MPESA_ENV=production` | Safaricom Daraja portal (developer.safaricom.co.ke) |
| **Email** (verification, alerts) | `SENDGRID_API_KEY`, `EMAIL_FROM` — then set `REQUIRE_EMAIL_VERIFICATION=true` | SendGrid |
| **Image uploads** (real storage) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | cloudinary.com |
| **SMS bidding** | `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID` | Africa's Talking |
| **Error tracking** | `SENTRY_DSN` | sentry.io |

Until M-Pesa is configured, payment buttons no-op; until Cloudinary is set,
uploads fall back to the demo's local handling. Nothing crashes.

---

## Social previews (fast-follow, after backend is live)

When a listing link is shared on WhatsApp/Facebook, the preview currently shows
the generic site card, because those crawlers don't run JavaScript and so never
see the per-listing tags `usePageMeta` sets client-side.

To fix, add a crawler-facing prerender for `/cars/:id`: a small Vercel Edge
Function that detects bot user-agents, fetches the car from
`https://api.kayad.space/api/cars/:id`, and returns minimal HTML containing the
real `og:title`, `og:description` and `og:image`. This needs the live backend,
which is why it's a fast-follow rather than a launch blocker. The client-side
meta tags are already in place (see `src/hooks/usePageMeta.js`) for any client
that does render JS.

---

## Owner / admin model (who can do what)

**Platform owners (webhosts)** are defined by the `WEBHOIST_EMAIL` env list —
identity is by email, never a database flag, so an owner can't be created or
removed by editing the database. Configured owners:

- `jimmythemugo@gmail.com` — **primary owner** (most protected; can never be
  suspended, deactivated, deleted, re-roled, or have its email changed).
- `webhost@kayad.space` — a second owner identity on the kayad domain with the
  same full powers, so the owner can operate day-to-day under a branded email.

Both bypass every permission check and can do everything an admin can, plus
create/manage admins and staff.

**Admins** are created by an owner via the staff page. They can run the
platform, but:
- They **cannot** edit, delete, re-role, suspend, or deactivate any owner
  account (the API returns 403 — enforced by `middleware/protectAccount.js`).
- They cannot promote anyone to owner (owner status is env-only, not assignable
  in the app).

So the owner accounts are immutable to everyone but the owners themselves, and
even an owner cannot change an owner account's email or role through the admin
routes. To add or remove an owner, you change `WEBHOIST_EMAIL` and redeploy.
