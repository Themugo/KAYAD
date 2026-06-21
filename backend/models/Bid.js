import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    // =============================
    // 🚗 RELATIONS
    // =============================
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =============================
    // 💰 BID DATA
    // =============================
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // 🔥 AUTO-BID MAX
    maxBid: {
      type: Number,
      default: null,
      min: 1,
      index: true,
    },

    // 🤖 SYSTEM GENERATED BID
    isAuto: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 🔥 BID STEP (AUCTION CONTROL)
    increment: {
      type: Number,
      default: 1000, // configurable per bid if needed
    },

    // =============================
    // 📞 CONTACT SNAPSHOT
    // =============================
    phone: {
      type: String,
      required: true,
    },

    // =============================
    // 🧠 BIDDER TAG
    // =============================
    bidderTag: {
      type: String,
      default: () => `Bidder-${Math.floor(1000 + Math.random() * 9000)}`,
    },

    // =============================
    // 💳 MPESA PAYMENT
    // =============================
    checkoutRequestID: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    mpesaReceipt: {
      type: String,
      unique: true,
      sparse: true,
    },

    // =============================
    // 📊 STATUS
    // =============================
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "accepted", "rejected"],
      default: "pending",
      index: true,
    },

    // =============================
    // 🧠 AUCTION ROLE
    // =============================
    isWinningBid: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =============================
    // ⚠️ FRAUD DETECTION
    // =============================
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },

    suspiciousReason: {
      type: String,
      default: null,
    },

    // =============================
    // 🕒 TIMING
    // =============================
    paidAt: Date,
  },
  {
    timestamps: true,
  },
);

// =============================
// �️ SOFT DELETE (Phase 2 Database Audit)
// =============================
bidSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Override delete to soft-delete
bidSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

// Soft-delete filter — exclude deleted bids by default
bidSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

bidSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

bidSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// =============================
// �🔥 INDEXES (OPTIMIZED)
// =============================

// leaderboard
bidSchema.index({ carId: 1, amount: -1 });

// auto-bid engine
bidSchema.index({ carId: 1, maxBid: -1 });

// user bidding pattern
bidSchema.index({ user: 1, carId: 1, createdAt: -1 });

// =============================
// ⚡ STATIC: HIGHEST BID
// =============================
bidSchema.statics.getHighestBid = async function (carId) {
  return this.findOne({
    carId,
    status: "paid",
  })
    .sort({ amount: -1 })
    .populate("user", "name email")
    .lean();
};

// =============================
// ⚡ STATIC: AUTO-BIDDERS
// =============================
bidSchema.statics.getAutoBidders = async function (carId) {
  return this.find({
    carId,
    status: "paid",
    maxBid: { $gt: 0 },
  })
    .sort({ maxBid: -1, createdAt: 1 }) // 🔥 priority + fairness
    .lean();
};

// =============================
// ⚡ METHOD: MARK AS PAID
// =============================
bidSchema.methods.markAsPaid = function (receipt) {
  this.status = "paid";
  this.mpesaReceipt = receipt;
  this.paidAt = new Date();
  return this.save();
};

// =============================
// ⚡ STATIC: SET WINNER
// =============================
bidSchema.statics.markWinner = async function (bidId) {
  const bid = await this.findById(bidId);
  if (!bid) return null;

  await this.updateMany({ carId: bid.carId }, { isWinningBid: false });

  return this.findByIdAndUpdate(bidId, { isWinningBid: true }, { new: true });
};

// =============================
// ⚡ STATIC: CHECK USER ACTIVE AUTO BID
// =============================
bidSchema.statics.getUserAutoBid = async function (carId, userId) {
  return this.findOne({
    carId,
    user: userId,
    maxBid: { $gt: 0 },
    status: "paid",
  });
};

// =============================
// 🧠 FRAUD + SANITY CHECK
// =============================
bidSchema.pre("save", async function (next) {
  try {
    // 🔥 insane bid detection
    if (this.amount > 100000000) {
      this.isSuspicious = true;
      this.suspiciousReason = "Excessive bid amount";
    }

    // 🔥 auto-bid sanity
    if (this.maxBid && this.maxBid < this.amount) {
      this.maxBid = this.amount;
    }

    // 🔥 rapid bidding detection moved to rate limiting middleware (bidLimiter in bidRoutes.js)
    // This eliminates N+1 query pattern - rate limiting handles anti-bot protection

    next();
  } catch (err) {
    next(err);
  }
});

// =============================
// 🔒 INDEXES
// =============================
bidSchema.index({ carId: 1, user: 1, maxBid: 1 }, { unique: false });
// Auto-bidding engine: sort paid bids by maxBid descending (Issue #4)
bidSchema.index({ carId: 1, status: 1, maxBid: -1 });
// User bid history (admin + buyer dashboard)
bidSchema.index({ user: 1, status: 1, createdAt: -1 });
// Duplicate detection in pre-save hook
bidSchema.index({ carId: 1, user: 1, createdAt: -1 });

const Bid = mongoose.models.Bid || mongoose.model("Bid", bidSchema);

export default Bid;
