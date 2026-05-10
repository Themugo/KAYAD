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
  }
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
const Dealer =
  mongoose.models.Dealer || mongoose.model("Dealer", dealerSchema);

export default Dealer;