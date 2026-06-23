// backend/models/DealerVerification.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Dealer verification system with document tracking
// Supports verification states: pending, under_review, approved, rejected, suspended
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const dealerVerificationSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 LINKED USER & DEALER
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      unique: true,
      index: true,
    },

    // =============================
    // ✅ VERIFICATION STATUS
    // =============================
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },

    // =============================
    // 📄 DOCUMENTS
    // =============================
    documents: {
      // Government ID (National ID, Passport, Driving License)
      governmentId: {
        type: {
          type: {
            type: String,
            enum: ["national_id", "passport", "driving_license"],
            required: true,
          },
          documentUrl: {
            type: String,
            required: true,
          },
          documentNumber: {
            type: String,
            required: true,
            trim: true,
          },
          issuedDate: {
            type: Date,
            required: true,
          },
          expiryDate: {
            type: Date,
          },
          verified: {
            type: Boolean,
            default: false,
          },
          verifiedAt: Date,
          verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rejectionReason: String,
        },
      },

      // KRA PIN (Tax Registration)
      kraPin: {
        type: {
          pinNumber: {
            type: String,
            required: true,
            trim: true,
            validate: {
              validator: function (v) {
                // KRA PIN format: A00 000000A 000 (11 characters)
                return /^[A-Z]\d{2}\s\d{7}[A-Z]\s\d{3}$/.test(v);
              },
              message: "Invalid KRA PIN format",
            },
          },
          documentUrl: {
            type: String,
            required: true,
          },
          verified: {
            type: Boolean,
            default: false,
          },
          verifiedAt: Date,
          verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rejectionReason: String,
        },
      },

      // Business Registration Certificate
      businessRegistration: {
        type: {
          registrationNumber: {
            type: String,
            required: true,
            trim: true,
          },
          documentUrl: {
            type: String,
            required: true,
          },
          businessName: {
            type: String,
            required: true,
            trim: true,
          },
          registeredDate: {
            type: Date,
            required: true,
          },
          verified: {
            type: Boolean,
            default: false,
          },
          verifiedAt: Date,
          verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rejectionReason: String,
        },
      },

      // Physical Address with Proof
      physicalAddress: {
        type: {
          street: {
            type: String,
            required: true,
            trim: true,
          },
          city: {
            type: String,
            required: true,
            trim: true,
          },
          postalCode: {
            type: String,
            trim: true,
          },
          country: {
            type: String,
            default: "Kenya",
            trim: true,
          },
          proofUrl: {
            type: String,
            required: true,
          },
          proofType: {
            type: String,
            enum: ["utility_bill", "lease_agreement", "bank_statement", "other"],
            default: "utility_bill",
          },
          verified: {
            type: Boolean,
            default: false,
          },
          verifiedAt: Date,
          verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rejectionReason: String,
        },
      },

      // Phone Verification (OTP)
      phoneVerification: {
        type: {
          phoneNumber: {
            type: String,
            required: true,
            trim: true,
            validate: {
              validator: function (v) {
                // Kenyan phone format: +2547XXXXXXXX or 07XXXXXXXX
                return /^(\+254|0)?7\d{8}$/.test(v);
              },
              message: "Invalid Kenyan phone number",
            },
          },
          verified: {
            type: Boolean,
            default: false,
          },
          verifiedAt: Date,
          otpCode: {
            type: String,
            select: false, // Never return OTP in queries
          },
          otpExpiresAt: Date,
          attempts: {
            type: Number,
            default: 0,
          },
          lastAttemptAt: Date,
        },
      },
    },

    // =============================
    // 📋 AUDIT TRAIL
    // =============================
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    reviewedAt: Date,

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectionReason: String,

    rejectionDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    suspensionReason: String,

    suspensionExpiresAt: Date,

    // =============================
    // 📝 ADMIN NOTES
    // =============================
    adminNotes: String,

    // Legacy migration flag
    isLegacyMigration: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
dealerVerificationSchema.index({ verificationStatus: 1, submittedAt: -1 });
dealerVerificationSchema.index({ user: 1, verificationStatus: 1 });
dealerVerificationSchema.index({ dealer: 1, verificationStatus: 1 });
dealerVerificationSchema.index({ reviewedAt: -1 });
dealerVerificationSchema.index({ "documents.phoneVerification.verified": 1 });

// =============================
// ⚡ METHOD: CHECK IF ALL DOCUMENTS SUBMITTED
// =============================
dealerVerificationSchema.methods.allDocumentsSubmitted = function () {
  const docs = this.documents;
  return (
    docs.governmentId && docs.kraPin && docs.businessRegistration && docs.physicalAddress && docs.phoneVerification
  );
};

// =============================
// ⚡ METHOD: CHECK IF ALL DOCUMENTS VERIFIED
// =============================
dealerVerificationSchema.methods.allDocumentsVerified = function () {
  const docs = this.documents;
  return (
    docs.governmentId?.verified &&
    docs.kraPin?.verified &&
    docs.businessRegistration?.verified &&
    docs.physicalAddress?.verified &&
    docs.phoneVerification?.verified
  );
};

// =============================
// ⚡ METHOD: GET VERIFICATION PROGRESS
// =============================
dealerVerificationSchema.methods.getVerificationProgress = function () {
  const docs = this.documents;
  const required = ["governmentId", "kraPin", "businessRegistration", "physicalAddress", "phoneVerification"];

  let submitted = 0;
  let verified = 0;

  for (const key of required) {
    if (docs[key]) submitted++;
    if (docs[key]?.verified) verified++;
  }

  return {
    submitted,
    verified,
    total: required.length,
    submittedPercentage: (submitted / required.length) * 100,
    verifiedPercentage: (verified / required.length) * 100,
  };
};

// =============================
// ⚡ METHOD: TRANSITION STATUS
// =============================
dealerVerificationSchema.methods.transitionStatus = function (newStatus, options = {}) {
  const validTransitions = {
    pending: ["under_review", "rejected"],
    under_review: ["approved", "rejected", "suspended"],
    approved: ["suspended"],
    rejected: ["pending", "under_review"],
    suspended: ["approved"],
  };

  const allowed = validTransitions[this.verificationStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${this.verificationStatus} to ${newStatus}. Allowed: ${allowed.join(", ")}`,
    );
  }

  this.verificationStatus = newStatus;

  if (newStatus === "under_review") {
    this.reviewedAt = new Date();
    if (options.reviewedBy) this.reviewedBy = options.reviewedBy;
  }

  if (newStatus === "approved") {
    this.reviewedAt = new Date();
    if (options.reviewedBy) this.reviewedBy = options.reviewedBy;
  }

  if (newStatus === "rejected") {
    this.reviewedAt = new Date();
    if (options.reviewedBy) this.reviewedBy = options.reviewedBy;
    if (options.rejectionReason) this.rejectionReason = options.rejectionReason;
    if (options.rejectionDetails) this.rejectionDetails = options.rejectionDetails;
  }

  if (newStatus === "suspended") {
    if (options.suspensionReason) this.suspensionReason = options.suspensionReason;
    if (options.suspensionExpiresAt) this.suspensionExpiresAt = options.suspensionExpiresAt;
  }

  return this.save();
};

// =============================
// ⚡ METHOD: GENERATE OTP
// =============================
dealerVerificationSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (!this.documents.phoneVerification) {
    this.documents.phoneVerification = {};
  }

  this.documents.phoneVerification.otpCode = otp;
  this.documents.phoneVerification.otpExpiresAt = expiresAt;
  this.documents.phoneVerification.attempts = 0;
  this.documents.phoneVerification.lastAttemptAt = null;

  return this.save().then(() => otp);
};

// =============================
// ⚡ METHOD: VERIFY OTP
// =============================
dealerVerificationSchema.methods.verifyOTP = function (otp) {
  if (!this.documents.phoneVerification) {
    throw new Error("Phone verification not initiated");
  }

  const phoneData = this.documents.phoneVerification;

  // Check if expired
  if (phoneData.otpExpiresAt && new Date() > phoneData.otpExpiresAt) {
    throw new Error("OTP expired");
  }

  // Check attempts
  if (phoneData.attempts >= 3) {
    throw new Error("Maximum OTP attempts exceeded");
  }

  // Increment attempts
  phoneData.attempts += 1;
  phoneData.lastAttemptAt = new Date();

  // Verify OTP
  if (otp === phoneData.otpCode) {
    phoneData.verified = true;
    phoneData.verifiedAt = new Date();
    phoneData.otpCode = null; // Clear OTP after successful verification
    phoneData.otpExpiresAt = null;

    return this.save().then(() => true);
  } else {
    return this.save().then(() => false);
  }
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const DealerVerification =
  mongoose.models.DealerVerification || mongoose.model("DealerVerification", dealerVerificationSchema);

export default DealerVerification;
