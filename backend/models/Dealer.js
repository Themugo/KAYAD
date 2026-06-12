/**
 * @deprecated AUDIT FIX-05 (June 2026)
 *
 * This model is NOT imported or used anywhere in the codebase.
 * All dealer data (businessName, approved, rating, totalSales, isSuspended, etc.)
 * is currently stored directly on the User model.
 *
 * Two options going forward — pick one and commit:
 *
 * OPTION A — Delete this file:
 *   Accept the User model as the single source of dealer data.
 *   Remove this file and update the models/ index if one exists.
 *
 * OPTION B — Migrate to this model properly:
 *   1. Write a one-time migration script that creates a Dealer document
 *      for every User with role='dealer'|'broker'|'individual_seller'.
 *   2. Import and use Dealer in all routes/controllers that currently
 *      read/write dealer fields from the User model.
 *   3. Remove the duplicated dealer fields from userSchema.
 *
 * Until the migration is complete, DO NOT add new imports of this model.
 */
import mongoose from "mongoose";

const dealerSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 LINKED USER
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one dealer profile per user
      index: true,
    },

    // =============================
    // 🏢 BUSINESS INFO
    // =============================
    businessName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    location: {
      type: String,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    // =============================
    // ✅ VERIFICATION SYSTEM
    // =============================
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },

    verifiedAt: Date,

    // =============================
    // ⭐ TRUST / RATING
    // =============================
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // =============================
    // 📊 PERFORMANCE METRICS
    // =============================
    totalSales: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },

    totalListings: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🚫 ACCOUNT CONTROL
    // =============================
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    suspensionReason: String,
  },
  {
    timestamps: true,
  },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
dealerSchema.index({ approved: 1, rating: -1 });
dealerSchema.index({ location: 1, approved: 1 });
dealerSchema.index({ totalSales: -1 });
dealerSchema.index({ createdAt: -1 });

// =============================
// ⚡ METHOD: UPDATE RATING
// =============================
dealerSchema.methods.updateRating = function (newRating) {
  const totalScore = this.rating * this.totalReviews;

  this.totalReviews += 1;
  this.rating = (totalScore + newRating) / this.totalReviews;

  return this.save();
};

// =============================
// ⚡ METHOD: RECORD SALE
// =============================
dealerSchema.methods.recordSale = function (amount) {
  this.totalSales += 1;
  this.totalRevenue += amount;

  return this.save();
};

// =============================
// ⚡ METHOD: APPROVE DEALER
// =============================
dealerSchema.methods.approveDealer = function () {
  this.approved = true;
  this.verifiedAt = new Date();

  return this.save();
};

// =============================
// ⚡ METHOD: SUSPEND DEALER
// =============================
dealerSchema.methods.suspendDealer = function (reason) {
  this.isSuspended = true;
  this.suspensionReason = reason;

  return this.save();
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Dealer = mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);

export default Dealer;
