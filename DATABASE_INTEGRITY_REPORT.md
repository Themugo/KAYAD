# Database Integrity Report

Generated: 2026-06-29
Scope: All 76 Mongoose models in `backend/models/` + `backend/migrations/Migration.js`

---

## Risk Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH     | 3 |
| MEDIUM   | 4 |
| LOW      | 5 |

---

## 🔴 CRITICAL

### C1 — Cascade delete gaps: 15 child models orphaned when parent User/Car/Payment is deleted

**Files:** `backend/models/User.js:476` `backend/models/Car.js:372` `backend/models/Payment.js:210`

The cascade hooks only cover **9 models** on User deletion (Car, Bid, Escrow, Payment, Chat, Notification, Favorite, Review, RefreshToken) and **5 models** on Car deletion (Bid, Escrow, Favorite, Review, Chat). Many other models with `ref: "User"` or `ref: "Car"` have **zero cascade coverage**, leaving orphaned records:

**Not cascaded on User delete:**
- `Lead` — refs `buyer` + `dealer`
- `LeadActivity` — refs `Lead` (no cascade from Lead either)
- `AuctionIntegrityFlag` — refs `flaggedBy`, `reviewedBy`
- `AuctionRiskProfile` — refs `user`
- `EscrowAnomaly` — refs `flaggedBy`, `reviewedBy`
- `EscrowRiskScore` — refs `user`
- `EscrowVault` — refs `buyer`, `seller`
- `Dispute` — refs `openedBy`, `openedAgainst`, `assignedTo`
- `Evidence` — refs `uploadedBy`, `reviewedBy`
- `ReconciliationRecord` — refs `user`, `resolvedBy`
- `ReconciliationReport` — refs `generatedByUser`
- `IdempotencyAuditLog` — refs `user`
- `Referral` — refs user (verify)
- `SavedSearch` — refs user (verify)
- `SupportTicket` — refs reporter/assignee (verify)

**Not cascaded on Car delete:**
- `Lead` — refs `vehicle`
- `Dispute` — refs `car`
- `Auction` — refs `carId`
- `VehicleValuation` — refs `car`
- `VehicleMarketAnalytics` — refs `car`
- `EscrowVault` — refs `car`
- `ReconciliationRecord` — refs `car`

**Impact:** Soft-deleting a User or Car leaves referentially-invalid records. Queries that do not filter by `deletedAt` will load dangling ObjectId references that point to soft-deleted parents.

**Fix:** Extend cascade hooks in `User.post("findOneAndDelete")` and `Car.post("findOneAndDelete")` to cover all child models. For immutable/compliance models (e.g., `EscrowAudit`, `SecurityLog`), set `flaggedAsOrphan: true` instead of deleting.

---

### C2 — EscrowVault has no cascade delete and no soft-delete support

**File:** `backend/models/EscrowVault.js:1-49`

`EscrowVault` lacks a `deletedAt`/`deletedBy` field, soft-delete pre-hooks, and is not included in any cascade hook. When a User or Car is deleted, the vault remains active in the database with dangling ObjectId references.

**Impact:** Vault records can reference non-existent users or cars, causing `.populate()` to return `null` and breaking downstream logic (release, refund, OTP flow).

**Fix:** Add soft-delete fields, soft-delete pre-hooks, and include in User + Car cascade hooks.

---

## 🟠 HIGH

### H1 — Duplicate indexes causing wasted storage and write overhead

**Files:**
- `backend/models/User.js:98,469` — `phone` indexed inline AND via `userSchema.index({ phone: 1 }, { unique: true, sparse: true })`
- `backend/models/Car.js:102,361` — `vin` indexed inline AND via `carSchema.index({ vin: 1 }, { unique: true, sparse: true })`
- `backend/models/Car.js:108,362` — `chassisNumber` indexed inline AND via `carSchema.index({ chassisNumber: 1 }, { unique: true, sparse: true })`
- `backend/models/Car.js:113,363` — `registrationNumber` indexed inline AND via `carSchema.index({ registrationNumber: 1 }, { unique: true, sparse: true })`

Mongoose warning on startup confirms:
```
[MONGOOSE] Warning: Duplicate schema index on {"phone":1} found.
[MONGOOSE] Warning: Duplicate schema index on {"vin":1} found.
[MONGOOSE] Warning: Duplicate schema index on {"chassisNumber":1} found.
[MONGOOSE] Warning: Duplicate schema index on {"registrationNumber":1} found.
```

Each duplicate index consumes disk space and slows writes by ~2x for those fields.

**Fix:** Remove the redundant inline `index: true` from `phone`, `vin`, `chassisNumber`, `registrationNumber`. The `unique: true, sparse: true` compound fully covers query needs.

---

### H2 — Payment.user is nullable (no `required: true`)

**File:** `backend/models/Payment.js:10-14`

```js
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  index: true,
  // MISSING: required: true
},
```

Every payment should belong to a user. All code paths that create payments provide a `userId`. Without `required: true`, a bug or direct DB write could create an orphan payment.

**Fix:** Add `required: true` to the `user` field.

---

### H3 — Car.dealer is nullable (no `required: true`)

**File:** `backend/models/Car.js:94-98`

```js
dealer: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  index: true,
  // MISSING: required: true
},
```

Every car must have a dealer. The UI enforces this, but the model doesn't.

**Fix:** Add `required: true` to the `dealer` field.

---

## 🟡 MEDIUM

### M1 — Inconsistent payment status enums across models

Four different enums for payment-related status:

| Model | Field | Values |
|-------|-------|--------|
| `Payment` | `status` | `pending`, `success`, `failed`, `cancelled` |
| `Bid` | `status` | `pending`, `paid`, `failed`, `accepted`, `rejected` |
| `Auction` | `paymentStatus` | `pending`, `paid`, `failed`, `expired` |
| `Car` | `paymentStatus` | `pending`, `paid`, `released`, `refunded` |

**Issues:**
- Bid uses `"paid"` where Payment uses `"success"` — same concept, different value
- Auction uses `"expired"` where Payment uses `"cancelled"` — same concept, different value
- Car uses `"released"` and `"refunded"` which don't exist in Payment — incomplete state mapping

**Fix:** Create a shared `PAYMENT_STATUSES` constant or add mapping documentation.

---

### M2 — SecurityLog missing `timestamps: true`

**File:** `backend/models/SecurityLog.js:18`

```js
{ timestamps: false }
```

This is the only model in the entire codebase with `timestamps: false`. It has its own `timestamp` field, but lacks `createdAt`/`updatedAt` fields that every other model has. This causes inconsistent serialization and query patterns.

**Fix:** Remove `timestamps: false` (defaults to `true`). The existing `timestamp` field can remain as an indexed query field.

---

### M3 — EscrowVault missing `lastActionKey` index

**File:** `backend/models/EscrowVault.js:41`

Added in C1 of the escrow audit, but the field `lastActionKey` has no index. The idempotency lookup `vault.lastActionKey === idempotencyKey` performs a full collection scan.

**Fix:** Add `index: true` to `lastActionKey`.

---

### M4 — Cascade gap: Auction not covered by Car cascade

**File:** `backend/models/Car.js:372-398`

Car cascade covers Bid, Escrow, Favorite, Review, Chat — but NOT `Auction`. The `Auction` model has `carId: { ref: "Car" }`. When a Car is soft-deleted, its Auction record remains, referencing a deleted car.

**Fix:** Add Auction to the Car cascade hook.

---

## 🟢 LOW

### L1 — Nullable `disputeResolvedAt`/`disputeResolvedBy` in Escrow model have no constraint

**File:** `backend/models/Escrow.js:67-69`

```js
disputeResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
disputeResolvedAt: Date,
```

These fields are set only when a dispute is resolved, which is correct. But the `ref` relationship is unenforced — any ObjectId could be stored.

**Fix:** Add `default: null` for clarity (functionally a no-op).

---

### L2 — DuplicateVehicleLog `relatedListings` subdoc refs to "Car" lack required constraint

**File:** `backend/models/DuplicateVehicleLog.js` (multiple lines)

Subdocuments in `relatedListings` array reference Car but allow null entries.

**Fix:** Ensure subdocs validate the ObjectId is non-null.

---

### L3 — Manual Payments processed flag not reset on retry

**File:** `backend/models/Payment.js:97-101`

`processed: { type: Boolean, default: false }` — once set to `true`, there's no mechanism to reset it for retry. If a webhook timeout occurs after `markSuccess()` sets `processed: true` but before the transaction completes, the payment is stuck.

**Fix:** Add a `resetProcessed()` method or a `pendingRetry` status.

---

### L4 — Various enum mismatches between Payment.referenceModel and actual models

**File:** `backend/models/Payment.js:27`

```js
enum: ["Car", "Bid", "Escrow"]
```

Does not include `"Subscription"` or `"InspectionOrder"` even though payment types `"subscription"` and `"inspection"` exist. If a subscription or inspection payment is created, `referenceModel` validation will reject it.

**Fix:** Add `"Subscription"`, `"InspectionOrder"` to the `referenceModel` enum.

---

### L5 — No TTL indexes on expired data

Several collections accumulate data that is never cleaned up:
- `IdempotencyKey` — no TTL; keys survive forever
- `IdempotencyAuditLog` — no TTL; audit logs accumulate
- `SecurityLog` — no TTL
- `NotificationAudit` — no TTL (verify)

**Impact:** Unbounded collection growth over time.

**Fix:** Add TTL indexes on `createdAt` for these collections (e.g., 90-day retention).

---

## Appendix: Cascade Coverage Map

| Parent | Child Models Covered | Missing |
|--------|---------------------|---------|
| **User** | Car, Bid, Escrow, Payment, Chat, Notification, Favorite, Review, RefreshToken | Lead, LeadActivity, AuctionIntegrityFlag, AuctionRiskProfile, EscrowAnomaly, EscrowRiskScore, EscrowVault, Dispute, Evidence, ReconciliationRecord, ReconciliationReport, IdempotencyAuditLog, SupportTicket |
| **Car** | Bid, Escrow, Favorite, Review, Chat | Auction, Lead, Dispute, VehicleValuation, VehicleMarketAnalytics, EscrowVault, ReconciliationRecord |
| **Payment** | Escrow | Dispute (has `paymentId`) |

## Appendix: Duplicate Index Map

| Model | Field | Inline Index | schema.index() | Conflict |
|-------|-------|-------------|----------------|----------|
| User | phone | `index: true` (line 98) | `{ phone: 1 }, { unique, sparse }` (line 469) | Redundant |
| Car | vin | `index: true` (line 102) | `{ vin: 1 }, { unique, sparse }` (line 361) | Redundant |
| Car | chassisNumber | `index: true` (line 108) | `{ chassisNumber: 1 }, { unique, sparse }` (line 362) | Redundant |
| Car | registrationNumber | `index: true` (line 113) | `{ registrationNumber: 1 }, { unique, sparse }` (line 363) | Redundant |

## Fix Priority Order

1. **C1** — Cascade gaps: add child models to User + Car cascade hooks
2. **H1** — Remove duplicate inline indexes (User.phone, Car.vin, Car.chassisNumber, Car.registrationNumber)
3. **C2** — Add soft-delete + cascade to EscrowVault
4. **H2** — Make Payment.user required
5. **H3** — Make Car.dealer required
6. **M4** — Add Auction to Car cascade
7. **M2** — Enable timestamps on SecurityLog
8. **M3** — Index EscrowVault.lastActionKey
9. **M4** — Fix Payment.referenceModel enum
10. **M1** — Document inconsistent payment enums (no code change)
11. **L4-L5** — TTL indexes, minor fixes
