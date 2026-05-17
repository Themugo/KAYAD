# KAYAD — Test Accounts & Login Guide
> All accounts are seeded by running: `cd backend && node seed.js`
> Run the backend first: `cd backend && npm install && npm start`
> Frontend: `npm install && npm run dev` (http://localhost:3000)

---

## 🔴 SUPERADMIN (Platform Owner)
> Set in `backend/.env` as `WEBHOIST_EMAIL` and `SEED_ADMIN_PASSWORD`

| Field    | Value |
|----------|-------|
| Email    | _(value of `WEBHOIST_EMAIL` in your `.env`)_ |
| Password | _(value of `SEED_ADMIN_PASSWORD` in your `.env`)_ |
| Access   | Everything — staff CRUD, config, packages, panic room |

**Pages to check:**
- `/admin` — Control Centre dashboard with 5 stat boxes
- `/admin/staff` — Full org chart, create/edit/delete all staff
- `/admin/users` — All platform users, ban/unban
- `/admin/sellers` — Approve dealers, assign packages
- `/admin/settings` → **Packages tab** — Edit prices, toggle free/paid, waive any package
- `/admin/settings` → **General tab** — Platform name, trial days
- `/admin/transactions` — All payments
- `/admin/escrows` — Escrow ledger
- `/admin/panic-room` — Emergency kill-switch

---

## ⚙️ ADMIN STAFF HIERARCHY
> All seeded by `node seed.js` · All can log in immediately

| Role              | Email                      | Password             | What they can see |
|-------------------|----------------------------|----------------------|-------------------|
| **Admin**         | admin@kayad.space          | Admin@Kayad2026!     | Users, Cars, Auctions, Ads |
| **HR Manager**    | hr@kayad.space             | Hr@Kayad2026!        | Dealer approvals only |
| **Accounts**      | accounts@kayad.space       | Acc@Kayad2026!       | Payments, Escrow |
| **Escrow Officer**| escrow@kayad.space         | Escrow@Kayad2026!    | Escrow ledger, Transactions |
| **Marketing**     | marketing@kayad.space      | Market@Kayad2026!    | Ad campaigns, Homepage content |
| **Ad Manager**    | ads@kayad.space            | Ads@Kayad2026!       | Sponsored ads only |
| **Tech Support**  | support@kayad.space        | Support@Kayad2026!   | User accounts, Car listings |
| **Moderator**     | mod@kayad.space            | Mod@Kayad2026!       | Content review, Listings |

**Pages to check for HR:**
- `/admin` → see only Dealer Approvals module
- `/admin/sellers` → Approve Pending Dealer, assign package (starter/growth/elite/enterprise)

**Pages to check for Accounts:**
- `/admin` → see Transactions + Escrow modules
- `/admin/transactions` — Payment records
- `/admin/escrows` — Release/refund controls

---

## 🏪 DEALER ACCOUNTS

### Approved Dealer (Starter trial — FREE)
| Field         | Value |
|---------------|-------|
| Email         | dealer@kayad.space |
| Password      | Dealer@Kayad2026! |
| Package       | Starter (free 30-day trial, 3 listings) |
| Status        | ✅ Approved |

**Pages to check:**
- `/dealer` → Overview tab: stats, recent listings
- `/dealer` → Listings tab: add/edit/delete cars
- `/dealer` → Earnings tab
- `/dealer` → Package tab: shows current plan + upgrade options
- `/dealer` → Team tab: invite staff, assign roles
- `/dealer/add-car` → List a new car (trial allows 3, then blocked)
- `/dealer/settings` → Profile, Business, Privacy, Security tabs

### Elite Dealer (Paid)
| Field         | Value |
|---------------|-------|
| Email         | elite@kayad.space |
| Password      | Elite@Kayad2026! |
| Package       | Elite (100 listings, homepage featured) |
| Status        | ✅ Approved |

### Pending Dealer (Waiting for approval)
| Field         | Value |
|---------------|-------|
| Email         | pending@kayad.space |
| Password      | Pending@Kayad2026! |
| Status        | ⏳ Pending approval |

**What to check:** Log in → redirected to Waiting Room. Shows progress tracker (Application submitted → Under review → Approved). Then log into `hr@kayad.space` → `/admin/sellers` → approve this dealer.

---

## 🤝 PRIVATE SELLER (Broker)

| Field         | Value |
|---------------|-------|
| Email         | seller@kayad.space |
| Password      | Seller@Kayad2026! |
| Package       | Basic Seller (1st vehicle FREE) |
| Status        | ✅ Approved |

**Pages to check:**
- `/dealer` → Dealer Hub (sellers share same dashboard)
- `/dealer/add-car` → First listing is free, second requires paid plan
- The free-first-vehicle flag (`firstVehicleUsed`) is set after first car is created

---

## 👤 BUYER ACCOUNT

| Field    | Value |
|----------|-------|
| Email    | buyer@kayad.space |
| Password | Buyer@Kayad2026! |
| Role     | user |

**Pages to check:**
- `/` → Homepage with live gallery
- `/showroom` → Gallery with filter sidebar
- `/dashboard` → Buyer dashboard (stats, saved cars, escrow)
- `/favorites` → Saved cars
- Any car detail → Buy via Escrow / Message Dealer / Save buttons

---

## 📋 REGISTRATION FLOW TESTING

### Test new dealer registration:
1. Go to `/register` (or click "For Dealers" in navbar → "Become a Dealer →")
2. Choose **Car Dealer**
3. Package selection appears — **Starter is FREE (30-day trial)**
4. Fill in name, email, phone, password, business name, city
5. After submit → **Waiting Room** appears with progress tracker
6. Log in as `hr@kayad.space` → `/admin/sellers` → Approve the new dealer
7. New dealer logs back in → `/dealer` dashboard now accessible

### Test new seller registration:
1. Go to `/register`
2. Choose **Private Seller**
3. Package shows **Basic — first vehicle FREE**
4. Fill details → submit → Waiting Room
5. Approve via HR → seller can now list 1 free vehicle

### Test new buyer registration:
1. Go to `/register`
2. Choose **Car Buyer**
3. Goes directly to details form (no package step)
4. After register → redirected to `/dashboard` immediately (no approval needed)

---

## 🔄 HOW TRIAL/FREE LIMITS WORK

| Account type    | Rule                                                                 |
|-----------------|----------------------------------------------------------------------|
| Dealer Starter  | 3 listings free for 30 days → then blocked with upgrade prompt      |
| Dealer Growth+  | Paid plan required, enforced at listing creation                    |
| Private Seller  | 1st vehicle always free → 2nd requires Pro plan (KES 1,500/mo)      |
| Admin waiver    | Admin can toggle `isFree: true` on any package in Settings → Packages |

---

## ⚡ QUICK START — running locally

```bash
# Terminal 1 — Backend
cd KAYAD-main/backend
cp .env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, REFRESH_TOKEN_SECRET, WEBHOIST_EMAIL, SEED_ADMIN_PASSWORD
npm install
node seed.js          # seeds all accounts above
npm start             # runs on :5000

# Terminal 2 — Frontend
cd KAYAD-main
npm install
npm run dev           # runs on :3000
```

Then visit: **http://localhost:3000**
