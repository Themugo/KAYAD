/**
 * @typedef {import('mongoose').Document} Document
 * @typedef {import('mongoose').Model} Model
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { logError } from "../utils/logger.js";

/**
 * @typedef {Object} UserDocument
 * @property {boolean} isDemo
 * @property {Date|null} deactivatedAt
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {string} role
 * @property {boolean} isBanned
 * @property {boolean} emailVerified
 * @property {number} tokenVersion
 * @property {boolean} mustChangePassword
 * @property {Function} matchPassword
 */

const userSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 BASIC INFO
    // =============================
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    deactivatedAt: {
      type: Date,
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // 🔥 IMPORTANT
    },

    role: {
      type: String,
      enum: [
        "user",
        "dealer",
        "admin",
        "superadmin",
        "escrow_officer",
        "ad_manager",
        "moderator",
        "ghost_checker",
        "individual_seller",
        "marketing",
        "technical_support",
        "hr",
        "accounts",
      ],
      default: "user",
      index: true,
    },

    // ─── Assignable permissions (granted/revoked by superadmin) ───
    // Effective permissions = role defaults ∪ grantedPermissions − revokedPermissions.
    // Superadmin & webhoist always have full access regardless of these.
    grantedPermissions: { type: [String], default: [] },
    revokedPermissions: { type: [String], default: [] },
    permissionsUpdatedAt: { type: Date },
    permissionsUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending",
      index: true,
    },
    dealerDocuments: {
      businessLicenseUrl: { type: String, default: "" },
      showroomPhotoUrl: { type: String, default: "" },
      kraPinUrl: { type: String, default: "" },
    },

    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Verified Buyer — bank pre-approval certificate
    verifiedBuyer: { type: Boolean, default: false, index: true },
    bankPreApproval: {
      documentUrl: { type: String, default: "" },
      bankName: { type: String, default: "" },
      approvedAmount: { type: Number, default: 0 },
      expiresAt: Date,
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // =============================
    // 📞 CONTACT
    // =============================
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    phoneOTP: {
      type: String,
      select: false,
    },
    phoneOTPExpire: {
      type: Date,
      select: false,
    },

    avatar: {
      type: String,
      default: "",
    },

    // =============================
    // 🏪 DEALER PROFILE
    // =============================
    businessName: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    // =============================
    // 💳 PAYMENT SETTINGS
    // =============================
    // @deprecated Use paymentDetails object instead for new implementations
    mpesaBusiness: { type: String, trim: true, default: "" },
    mpesaBusinessName: { type: String, trim: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
    bankAccount: { type: String, trim: true, default: "" },
    bankBranch: { type: String, trim: true, default: "" },

    dealerRating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },

    // =============================
    // 💼 PAYMENT DETAILS (DEALER ONBOARDING)
    // =============================
    paymentDetails: {
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      paybillNumber: { type: String, default: "" },
      mpesaPhone: { type: String, default: "" },
    },
    onboardingComplete: { type: Boolean, default: false },
    subscriptionStatus: { type: String, enum: ["active", "past_due", "none"], default: "none" },

    // =============================
    // 📦 DEALER LISTING PACKAGE
    // =============================
    trialStartedAt: { type: Date, default: null }, // when they first got a free trial plan
    trialListingsUsed: { type: Number, default: 0 }, // listings created during trial window
    firstVehicleUsed: { type: Boolean, default: false }, // for sellers: 1 free vehicle claimed

    dealerPackage: {
      type: String,
      default: "none",
    },
    packageExpiresAt: { type: Date, default: null },
    packageListingMax: { type: Number, default: 0 }, // 0 = unlimited for enterprise
    packageFeatures: [String], // e.g. ["featured_homepage","priority_search"]
    packageAutoRenew: { type: Boolean, default: false },

    // =============================
    // 💼 SELLER FINANCIAL SETTINGS
    // =============================
    commission: { type: Number, default: 5, min: 0, max: 50 },
    waiver: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },

    totalSales: { type: Number, default: 0 },
    listingCount: { type: Number, default: 0 },
    commissionBalance: { type: Number, default: 0 },
    listingsLocked: { type: Boolean, default: false },

    // =============================
    // 👁 DEALER VISIBILITY
    // =============================
    visibility: {
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: true },
      chatEnabled: { type: Boolean, default: true },
      autoApproveReviews: { type: Boolean, default: false },
    },

    // =============================
    // 🧠 PERSONALIZATION (FUTURE AI)
    // =============================
    preferences: {
      brands: [String],
      priceRange: {
        min: Number,
        max: Number,
      },
      bodyType: [String],
    },

    // =============================
    // 🌐 USER SETTINGS
    // =============================
    language: { type: String, default: "en" },
    currency: { type: String, default: "KES" },
    timezone: { type: String, default: "Africa/Nairobi" },

    // =============================
    // 🔗 REFERRAL SYSTEM
    // =============================
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    credits: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },

    // =============================
    // 🔔 NOTIFICATION PREFERENCES
    // =============================
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },

    // =============================
    // 🔍 GHOST CHECKER PROFILE
    // =============================
    isInspector: { type: Boolean, default: false },
    inspectionSpecialty: [String],
    locationCity: String,
    averageRating: { type: Number, default: 5 },
    completedChecks: { type: Number, default: 0 },

    // =============================
    // 🔐 SECURITY
    // =============================
    lastLogin: Date,
    lastLoginAt: { type: Date, default: null, index: true },
    lastActive: { type: Date, default: null, index: true },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    resetToken: String,
    resetTokenExpire: Date,

    // =============================
    // 📧 EMAIL VERIFICATION
    // =============================
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerifyToken: {
      type: String,
      select: false,
    },
    emailVerifyExpire: {
      type: Date,
      select: false,
    },

    // =============================
    // 🔐 TOKEN VERSIONING (for logout-all / forced re-login)
    // =============================
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },

    // =============================
    // 🔒 FORCE PASSWORD CHANGE (demo / seeded accounts)
    // =============================
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// =============================
// 🔐 PRE-SAVE (SAFE HASH)
// =============================
userSchema.pre("save", async function (next) {
  try {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }

    // Auto-generate referral code for new users
    if (!this.referralCode) {
      const prefix = (this.name || "user")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 6)
        .toUpperCase();
      const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      this.referralCode = `${prefix}${suffix}`;
    }

    // 🔥 ONLY hash if changed
    if (!this.isModified("password")) return next();

    // 🔥 prevent double hash — check if it's already a bcrypt hash
    // bcrypt hashes are always 60 chars and match $2[aby]$
    if (/^\$2[aby]\$\d{1,2}\$.{53}$/.test(this.password)) return next();

    this.password = await bcrypt.hash(this.password, 12);

    next();
  } catch (err) {
    next(err);
  }
});

// =============================
// 🔐 MATCH PASSWORD (FIXED)
// =============================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// =============================
// 🔑 SAFE JSON OUTPUT
// =============================
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpire;
  delete obj.phoneOTP;
  delete obj.phoneOTPExpire;

  return obj;
};

// =============================
// ⚡ STATIC LOGIN HELPER (IMPORTANT FIX)
// =============================
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

// =============================
// 🗑️ SOFT DELETE
// =============================
userSchema.add({
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

userSchema.statics.softDelete = async function (ids, adminId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: adminId } },
  );
};

// ── SOFT-DELETE QUERY MIDDLEWARE ──────────────────────────────
// Automatically excludes soft-deleted users from all queries
// unless { includeSoftDeleted: true } is set in options.
// Covers: find, findOne, findById, countDocuments, findOneAndUpdate, etc.
const SOFT_DELETE_OPERATIONS = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "countDocuments",
  "count",
  "updateMany",
  "updateOne",
  "deleteOne",
  "deleteMany",
];

for (const op of SOFT_DELETE_OPERATIONS) {
  userSchema.pre(op, function () {
    if (this.getOptions()?.includeSoftDeleted) return;
    const filter = this.getFilter();
    if (filter && filter.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  });
}

// =============================
// 🔥 SEARCH INDEXES (CRITICAL)
// =============================

// Text index for dealer/user search
userSchema.index({
  name: "text",
  businessName: "text",
  email: "text",
});

// Compound indexes for common search queries
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ role: 1, location: 1 });
userSchema.index({ role: 1, dealerRating: -1 });

// Phase 1: Add unique constraint on phone (sparse to allow null values)
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

// =============================
// 🔗 CASCADE DELETE LOGIC (Phase 2 Database Audit)
// =============================

// Cascade delete: When user is deleted, soft-delete all related records
userSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  try {
    const Car = mongoose.model("Car");
    const Bid = mongoose.model("Bid");
    const Escrow = mongoose.model("Escrow");
    const Payment = mongoose.model("Payment");
    const Chat = mongoose.model("Chat");
    const Notification = mongoose.model("Notification");
    const Favorite = mongoose.model("Favorite");
    const Review = mongoose.model("Review");
    const RefreshToken = mongoose.model("RefreshToken");

    // Soft-delete user's cars
    await Car.updateMany({ dealer: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc._id } });

    // Soft-delete user's bids
    await Bid.updateMany({ user: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc._id } });

    // Soft-delete user's escrows (as buyer or seller)
    await Escrow.updateMany(
      { $or: [{ buyer: doc._id }, { seller: doc._id }] },
      { $set: { deletedAt: new Date(), deletedBy: doc._id } },
    );

    // Soft-delete user's payments
    await Payment.updateMany({ user: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc._id } });

    // Soft-delete user's chats
    await Chat.updateMany(
      { participants: doc._id },
      { $set: { deletedAt: new Date(), deletedBy: doc._id } },
    );

    // Soft-delete user's notifications
    await Notification.updateMany({ user: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc._id } });

    // Soft-delete user's favorites
    await Favorite.updateMany({ user: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc._id } });

    // Soft-delete user's reviews (as user or dealer)
    await Review.updateMany(
      { $or: [{ user: doc._id }, { dealer: doc._id }] },
      { $set: { deletedAt: new Date(), deletedBy: doc._id } },
    );

    // Revoke all refresh tokens
    await RefreshToken.updateMany({ user: doc._id }, { $set: { isRevoked: true, revokedAt: new Date() } });
  } catch (err) {
    logError("CASCADE DELETE ERROR FOR USER", { error: err.message });
  }
});

// =============================
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
