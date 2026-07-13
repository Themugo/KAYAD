# Supabase Setup Guide for KAYAD

Complete guide to set up Supabase for the KAYAD automotive marketplace.

---

## Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- Node.js 18+ installed
- Basic familiarity with PostgreSQL

---

## Step 1: Create a Supabase Project

### 1.1 Create New Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in the details:
   - **Organization**: Your organization or personal
   - **Name**: `kayad` (or your preferred name)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users (`EU West` recommended for Kenya)
4. Click **Create new project**
5. Wait 2-3 minutes for provisioning

### 1.2 Save Your Project Credentials

Once created, go to **Settings → API** and save:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: For frontend
- **service_role key**: For backend (keep this secret!)

---

## Step 2: Configure Environment Variables

### 2.1 Frontend (.env)

Update your frontend `.env` file:

```env
# From Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# API URLs
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 2.2 Backend (backend/.env)

Update `backend/.env` with your Supabase credentials:

```env
# From Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET=kayad-images
```

---

## Step 3: Apply Database Schema

### 3.1 Apply via Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Open `backend/db/schema.sql` in your code editor
4. Copy the entire contents
5. Paste into the Supabase SQL Editor
6. Click **Run** or press `Ctrl+Enter`

### 3.2 What the Schema Creates

The schema creates these main tables:

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles (user, dealer, admin, superadmin) |
| `cars` | Vehicle listings with images, features, auction status |
| `auctions` | Auction sessions with bid tracking |
| `bids` | Individual bids with auto-bid support |
| `escrows` | Secure payment escrow records |
| `payments` | M-Pesa and other payment transactions |
| `chats` / `messages` | In-app messaging |
| `notifications` | User notifications |
| 40+ more tables | Full platform functionality |

### 3.3 Verify Schema Applied

After running the SQL, verify in **Table Editor**:
- You should see all tables listed
- Click on `users` table - should have columns like `id`, `email`, `role`, etc.

---

## Step 4: Apply Migrations

The `supabase/migrations/` folder contains incremental updates:

### 4.1 Migration Files

| File | Purpose |
|------|---------|
| `20260710043238_*_full_schema.sql.sql` | Core schema (already in schema.sql) |
| `20260710043248_*_seed_system_settings.sql.sql` | System configuration data |
| `20260710043558_*_update_car_bid_stats.sql.sql` | Additional car/bid statistics |
| `20260710044329_*_seed_demo_vehicles.sql.sql` | Demo vehicle data |

### 4.2 Apply Migrations in Order

1. Go to **SQL Editor** in Supabase dashboard
2. For each migration file (in order):
   - Open the file
   - Copy contents
   - Paste and run in SQL Editor
3. Verify each migration completed successfully

---

## Step 5: Set Up Storage

### 5.1 Create Storage Bucket

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **New Bucket**
3. Configure:
   - **Name**: `kayad-images`
   - ✅ Check **Public bucket**
4. Click **Create bucket**

### 5.2 Set Storage Policies

For public read access to images:

1. Click on the `kayad-images` bucket
2. Go to **Policies** tab
3. Click **New Policy**

**Policy 1: Public Read Access**
```
Name: Public Read Access
Allowed operation: SELECT
Target roles: anon, authenticated
```

**Policy 2: Authenticated Uploads**
```
Name: Authenticated Uploads
Allowed operation: INSERT
Target roles: authenticated
```

**Policy 3: Owner Update/Delete**
```
Name: Owner can update/delete
Allowed operations: UPDATE, DELETE
Target roles: authenticated
Condition: auth.uid() = owner_id
```

---

## Step 6: Configure Row Level Security (RLS)

### 6.1 Enable RLS on Tables

For each critical table, enable RLS:

1. Go to **Table Editor**
2. Select a table (e.g., `users`)
3. Click **RLS** toggle to enable
4. Add appropriate policies

### 6.2 Recommended RLS Policies

**users table:**
- Users can read their own profile
- Admins can read all profiles
- Users can update their own profile

**cars table:**
- Anyone can read published cars
- Dealers can create/update/delete their own cars
- Admins can manage all cars

**escrows table:**
- Participants (buyer/seller) can read their escrows
- Admins can manage all escrows

---

## Step 7: Set Up Authentication

### 7.1 Configure Auth Settings

1. Go to **Authentication** in Supabase dashboard
2. Click **Settings**

Recommended settings:
- **Site URL**: `http://localhost:3000` (for dev)
- **Redirect URLs**: Add your production URL later
- **Email confirmations**: Enabled
- **Password minimum length**: 8 characters

### 7.2 Auth Providers (Optional)

Enable additional auth methods in **Authentication → Providers**:
- ✅ Email/Password (enabled by default)
- ⬜ Google OAuth (optional)
- ⬜ Phone (optional - for Kenya, use Africa's Talking instead)

---

## Step 8: Run Backend Seed (Optional)

To populate initial data:

```bash
cd backend
npm install
npm run seed
```

This creates:
- Admin user (based on `SEED_ADMIN_EMAIL`)
- Demo users for testing
- Sample car listings (if demo data included)

---

## Step 9: Verify Setup

### 9.1 Check Database Connection

```bash
cd backend
npm install
npm run dev
```

Look for: `✅ Supabase client initialized`

### 9.2 Test API

Start the backend:
```bash
cd backend
npm run dev
```

Test an endpoint:
```bash
curl http://localhost:5000/api/health
```

### 9.3 Test Frontend

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Troubleshooting

### "Storage not configured" Error

1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
2. Ensure bucket `kayad-images` exists and is public
3. Check storage policies are configured

### "Access denied" Error

1. Verify RLS policies allow your operation
2. Check you're authenticated if required
3. For admin operations, use the backend with service role key

### Migration Failed

1. Check for syntax errors in SQL
2. Ensure tables don't already exist with conflicting definitions
3. Some migrations use `IF NOT EXISTS` - that's fine

### Connection Timeout

1. Check your internet connection
2. Verify Supabase project is not paused (free tier pauses after 7 days of inactivity)
3. Check Supabase status page for outages

---

## Production Checklist

Before going live:

- [ ] Replace all placeholder keys with real credentials
- [ ] Enable HTTPS on all domains
- [ ] Configure production redirect URLs in Supabase Auth
- [ ] Set up proper CORS origins in backend
- [ ] Enable email template customization in Supabase
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting
- [ ] Test payment flows in sandbox first

---

## Next Steps

After Supabase is configured:

1. **M-Pesa Setup**: Configure Safaricom developer account
2. **SMS Setup**: Configure Africa's Talking
3. **Email Setup**: Configure SendGrid
4. **Deploy Backend**: Deploy to Render, Railway, or similar
5. **Deploy Frontend**: Deploy to Vercel or Netlify

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for all service configurations.

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SQL Reference](https://supabase.com/docs/guides/database/postgres)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
