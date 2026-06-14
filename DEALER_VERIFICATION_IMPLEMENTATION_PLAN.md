# Dealer Verification System - Implementation Plan

**Phase:** Phase 2 - Production Hardening  
**Engineer:** Senior Marketplace Security Engineer  
**Date:** June 14, 2026  
**Scope:** Implement production-grade dealer verification system

---

## 📋 AUDIT FINDINGS

### Current Architecture

**User Model (`backend/models/User.js`):**
- `status` field: enum ["pending", "approved", "suspended", "rejected"]
- `dealerDocuments`: { businessLicenseUrl, showroomPhotoUrl, kraPinUrl }
- `onboardingComplete`: boolean
- Basic dealer profile fields (businessName, location, bio)

**Dealer Model (`backend/models/Dealer.js`):**
- `approved`: boolean (simple flag, not status enum)
- `verifiedAt`: Date
- `isSuspended`: boolean
- Methods: `approveDealer()`, `suspendDealer()`
- No document tracking or verification workflow

**Dealer Routes (`backend/routes/dealerRoutes.js`):**
- Protected by `protect` and `dealerOnly` middleware
- **NO verification checks** before:
  - Listing creation
  - Auction start
  - Escrow initiation
- Direct access to all dealer operations

**Gaps Identified:**
1. No dedicated verification model with document tracking
2. No verification state machine (pending → under_review → approved/rejected/suspended)
3. No middleware to enforce verification requirements
4. No phone verification integration
5. No government ID validation
6. No physical address verification
7. No audit trail for verification decisions
8. Dealers can create listings/auctions without verification

---

## 🎯 REQUIREMENTS

### Verification States
- `pending` - Initial state, documents submitted
- `under_review` - Admin actively reviewing
- `approved` - Verification complete, full access
- `rejected` - Verification failed, can reapply
- `suspended` - Approved but temporarily suspended

### Required Documents
- Government ID (National ID, Passport)
- KRA PIN (Tax registration)
- Business Registration Certificate
- Physical Address (with proof)
- Phone Verification (OTP verification)

### Restrictions (Unless Approved)
- ❌ Create car listings
- ❌ Start auctions
- ❌ Initiate escrow transactions
- ❌ Access premium features

### Backwards Compatibility
- Existing `approved` boolean must continue working
- Existing dealer operations must not break
- Graceful migration of existing dealers

---

## 📐 ARCHITECTURE DESIGN

### New Model: DealerVerification

```javascript
{
  user: ObjectId (ref: User),
  dealer: ObjectId (ref: Dealer),
  
  // Verification Status
  verificationStatus: enum ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
  
  // Documents
  documents: {
    governmentId: {
      type: enum ['national_id', 'passport', 'driving_license'],
      documentUrl: String,
      documentNumber: String,
      issuedDate: Date,
      expiryDate: Date,
      verified: Boolean,
      verifiedAt: Date,
      verifiedBy: ObjectId (ref: User),
      rejectionReason: String
    },
    kraPin: {
      pinNumber: String,
      documentUrl: String,
      verified: Boolean,
      verifiedAt: Date,
      verifiedBy: ObjectId (ref: User),
      rejectionReason: String
    },
    businessRegistration: {
      registrationNumber: String,
      documentUrl: String,
      businessName: String,
      registeredDate: Date,
      verified: Boolean,
      verifiedAt: Date,
      verifiedBy: ObjectId (ref: User),
      rejectionReason: String
    },
    physicalAddress: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
      proofUrl: String, // Utility bill, lease agreement
      verified: Boolean,
      verifiedAt: Date,
      verifiedBy: ObjectId (ref: User),
      rejectionReason: String
    },
    phoneVerification: {
      phoneNumber: String,
      verified: Boolean,
      verifiedAt: Date,
      otpCode: String,
      otpExpiresAt: Date,
      attempts: Number
    }
  },
  
  // Audit Trail
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: ObjectId (ref: User),
  rejectionReason: String,
  suspensionReason: String,
  suspensionExpiresAt: Date,
  
  // Notes
  adminNotes: String,
  rejectionDetails: Object,
  
  timestamps: true
}
```

### Middleware: requireDealerVerification

```javascript
// Checks if dealer is verified before allowing protected operations
// Applied to: listing creation, auction start, escrow initiation
const requireDealerVerification = async (req, res, next) => {
  const dealer = await Dealer.findOne({ user: req.user.id });
  const verification = await DealerVerification.findOne({ user: req.user.id });
  
  // Check verification status
  if (!verification || verification.verificationStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Dealer verification required',
      verificationStatus: verification?.verificationStatus || 'none',
      requiresAction: getRequiredAction(verification?.verificationStatus)
    });
  }
  
  // Check if suspended
  if (verification.verificationStatus === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Dealer account suspended',
      suspensionReason: verification.suspensionReason,
      suspensionExpiresAt: verification.suspensionExpiresAt
    });
  }
  
  next();
};
```

### Route Protection Strategy

**Protected Routes (require verification):**
- `POST /api/cars` - Create listing
- `POST /api/dealer/cars/:id/auction/start` - Start auction
- `POST /api/escrow` - Initiate escrow

**Unprotected Routes (allowed for all dealers):**
- `GET /api/dealer/*` - View dashboard, analytics
- `PUT /api/dealer/profile` - Update profile
- `POST /api/dealer/verification` - Submit verification

---

## 📁 FILE CHANGES

### New Files
1. `backend/models/DealerVerification.js` - New verification model
2. `backend/middleware/dealerVerification.js` - Verification middleware
3. `backend/controllers/verificationController.js` - Verification CRUD operations
4. `backend/routes/verificationRoutes.js` - Verification API endpoints
5. `backend/migrations/migrate_dealer_verification.js` - Migration script
6. `backend/tests/verification.test.js` - Verification tests

### Modified Files
1. `backend/models/Dealer.js` - Add verificationStatus field (backwards compatible)
2. `backend/routes/carRoutes.js` - Add verification middleware to POST /api/cars
3. `backend/routes/dealerRoutes.js` - Add verification middleware to auction start
4. `backend/routes/escrowRoutes.js` - Add verification middleware to escrow creation
5. `backend/server.js` - Register verification routes

---

## 🔄 MIGRATION STRATEGY

### Phase 1: Schema Migration
1. Add `verificationStatus` field to Dealer model (default: 'pending' for new, 'approved' for existing with approved=true)
2. Create DealerVerification model
3. Backfill existing approved dealers with verification records

### Phase 2: Data Migration
```javascript
// Migrate existing approved dealers
const approvedDealers = await Dealer.find({ approved: true });
for (const dealer of approvedDealers) {
  await DealerVerification.create({
    user: dealer.user,
    dealer: dealer._id,
    verificationStatus: 'approved',
    submittedAt: dealer.verifiedAt || new Date(),
    reviewedAt: dealer.verifiedAt || new Date(),
    documents: {
      // Mark as verified with legacy flag
      governmentId: { verified: true, verifiedAt: dealer.verifiedAt },
      kraPin: { verified: true, verifiedAt: dealer.verifiedAt },
      businessRegistration: { verified: true, verifiedAt: dealer.verifiedAt },
      physicalAddress: { verified: true, verifiedAt: dealer.verifiedAt },
      phoneVerification: { verified: true, verifiedAt: dealer.verifiedAt }
    },
    adminNotes: 'Migrated from legacy approval system'
  });
  
  dealer.verificationStatus = 'approved';
  await dealer.save();
}
```

### Phase 3: Gradual Enforcement
1. Deploy with verification middleware in "warn-only" mode (logs but doesn't block)
2. Monitor for 1 week, address issues
3. Enable enforcement mode

---

## 🧪 TESTING STRATEGY

### Unit Tests
1. DealerVerification model CRUD operations
2. Verification status transitions
3. Document validation
4. Phone verification OTP logic

### Integration Tests
1. Verification submission workflow
2. Admin approval/rejection workflow
3. Middleware enforcement on protected routes
4. Backwards compatibility with existing dealers

### Security Tests
1. Unauthorized access to verification endpoints
2. Document upload validation
3. OTP brute force protection
4. Status transition validation

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Create migration script
- [ ] Test migration on staging
- [ ] Backup production database
- [ ] Review migration rollback plan

### Deployment
- [ ] Deploy schema changes (non-breaking)
- [ ] Deploy new models and routes
- [ ] Run migration script
- [ ] Deploy middleware in warn-only mode
- [ ] Monitor logs for 1 week
- [ ] Enable enforcement mode

### Post-Deployment
- [ ] Verify existing dealers can still operate
- [ ] Monitor verification submission rate
- [ ] Review admin workflow efficiency
- [ ] Update documentation

---

## 📊 SUCCESS METRICS

1. **Verification Rate:** % of dealers submitting verification within 7 days
2. **Approval Rate:** % of submitted verifications approved
3. **Time to Approval:** Average time from submission to approval
4. **Rejection Rate:** % of verifications rejected (target: <10%)
5. **Backwards Compatibility:** 0% disruption to existing dealer operations

---

## ⚠️ RISKS & MITIGATIONS

### Risk: Existing Dealers Disrupted
**Mitigation:** Migration script auto-approves existing dealers with `approved=true`

### Risk: Verification Bottleneck
**Mitigation:** Admin dashboard with bulk approval, SLA of 48 hours

### Risk: Document Forgery
**Mitigation:** Manual review, integration with government APIs (future phase)

### Risk: Phone Verification Abuse
**Mitigation:** OTP rate limiting, cooldown periods, device fingerprinting

---

## 📝 NEXT STEPS

1. ✅ Audit complete
2. ⏳ Create DealerVerification model
3. ⏳ Create verification middleware
4. ⏳ Update routes with verification checks
5. ⏳ Create migration script
6. ⏳ Create verification tests
7. ⏳ Deploy to staging
8. ⏳ Deploy to production
