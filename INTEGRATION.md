# Kayad — Backend Integration Guide
## Exact files to replace/add in your backend folder

---

## 🔴 CRITICAL — Replace These Files First

These files fix breaking bugs that prevent the app from working:

### 1. `backend/server.js` ← `backend-server.js`
**What was wrong:** Only 6/13 routes were mounted. Socket event names mismatched.  
**What's fixed:** All 13 routes mounted. `joinAuction` event wired. Payment URL corrected.

```bash
cp backend-server.js backend/server.js
```

### 2. `backend/services/paymentService.js` ← `backend-paymentService.js`
**What was wrong:** M-Pesa callback never emitted `paymentSuccess`/`paymentFailed` to frontend.  
**What's fixed:** Socket events fire on confirm/fail to user's personal room AND auction room.

```bash
cp backend-paymentService.js backend/services/paymentService.js
```

### 3. `backend/controllers/favoriteController.js` ← `backend-favoriteController.js`
**What was wrong:** Used `User.favorites` array (doesn't exist). The backend has a `Favorite` model.  
**What's fixed:** Uses `Favorite` collection with toggle, add, remove, list.

```bash
cp backend-favoriteController.js backend/controllers/favoriteController.js
```

---

## 🟡 NEW FILES — Add These to Backend

These routes/controllers/models were completely missing:

### New Controllers
```bash
cp backend-notificationController.js backend/controllers/notificationController.js
cp backend-reviewController.js       backend/controllers/reviewController.js
```

### New Models
```bash
cp backend-Notification.js backend/models/Notification.js
```

### New/Fixed Routes (replace existing stubs)
```bash
cp backend-favoriteRoutes.js    backend/routes/favoriteRoutes.js
cp backend-notificationRoutes.js backend/routes/notificationRoutes.js
cp backend-reviewRoutes.js      backend/routes/reviewRoutes.js
cp backend-transactionRoutes.js backend/routes/transactionRoutes.js
```

---

## 🟢 AUTH CONTROLLER — Add Two Functions

Add these to the END of `backend/controllers/authController.js`:

```js
// PUT /api/auth/profile — update own profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, businessName, bio } = req.body;
    const updates = {};
    if (name)         updates.name = name.trim();
    if (phone)        updates.phone = phone.trim();
    if (location)     updates.location = location.trim();
    if (businessName) updates.businessName = businessName.trim();
    if (bio !== undefined) updates.bio = bio.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true })
      .select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both passwords required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Min 6 characters" });

    const user = await User.findById(req.user.id).select("+password");
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: "Current password incorrect" });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
```

Then add these two routes to `backend/routes/authRoutes.js` (before `export default router`):

```js
import { updateProfile, changePassword } from '../controllers/authController.js';

router.put('/profile',         protect, asyncHandler(updateProfile));
router.put('/change-password', protect, asyncHandler(changePassword));
```

---

## 🗃️ MongoDB Indexes to Create

Run these in MongoDB Atlas Shell or Compass:

```js
// Notifications
db.notifications.createIndex({ user: 1, createdAt: -1 })
db.notifications.createIndex({ user: 1, read: 1 })

// Reviews  
db.reviews.createIndex({ dealer: 1, createdAt: -1 })
db.reviews.createIndex({ user: 1, dealer: 1, car: 1 }, { unique: true })

// Favorites
db.favorites.createIndex({ user: 1, car: 1 }, { unique: true })
db.favorites.createIndex({ user: 1, createdAt: -1 })

// Cars (if not already)
db.cars.createIndex({ auctionStatus: 1, auctionEnd: 1 })
db.cars.createIndex({ title: "text", brand: "text", model: "text" })
```

---

## 🧪 Test the Integration

```bash
# 1. Copy backend .env
cp backend-.env.example backend/.env
# Edit backend/.env with your real values

# 2. Seed test data
cd backend && node seed.js

# 3. Start backend
node server.js
# Expected output:
# ✅ MongoDB: cluster.mongodb.net
# 🚀 Gari Motors API → http://localhost:5000
# 📡 Socket.io ready
# 📦 Routes mounted: 13

# 4. Test all routes
curl http://localhost:5000/
# → {"status":"OK","routes":13,...}

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kayad.space","password":"password123"}'
# → {"success":true,"token":"...","user":{...}}

# 5. Start frontend
cd ../frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Socket Events Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `joinAuction(carId)` | Client→Server | `carId` string | Join auction room |
| `joinAdmin()` | Client→Server | — | Join admin broadcast |
| `newBid` | Server→Client | `{carId, amount, user}` | New bid placed |
| `auctionEnded` | Server→Client | `{carId, winner}` | Auction closed |
| `paymentSuccess` | Server→Client | `{checkoutID, receipt}` | M-Pesa confirmed |
| `paymentFailed` | Server→Client | `{checkoutID, reason}` | M-Pesa failed |
| `escrowReleased` | Server→Client | `{escrowId, amount}` | Funds released |
| `escrowRefunded` | Server→Client | `{escrowId, amount}` | Funds refunded |
| `notification` | Server→Client | `{title, message, type}` | Push notification |

---

## Environment Variables Checklist

Before going live:

- [ ] `JWT_SECRET` — minimum 32 random characters
- [ ] `REFRESH_TOKEN_SECRET` — different from JWT_SECRET
- [ ] `MONGO_URI` — Atlas connection string with password
- [ ] `MPESA_ENV=production` — not sandbox
- [ ] `MPESA_CALLBACK_URL` — must be HTTPS (Safaricom requirement)
- [ ] `CLOUDINARY_*` — all three values filled in
- [ ] `FRONTEND_URL` — exact production domain (no trailing slash)
- [ ] `NODE_ENV=production` — enables PM2 cluster, disables verbose logging
