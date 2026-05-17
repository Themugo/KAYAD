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
      default: () =>
        `Bidder-${Math.floor(1000 + Math.random() * 9000)}`,
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
      enum: ["pending", "paid", "failed"],
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
  }
);

// =============================
// 🔥 INDEXES (OPTIMIZED)
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

  await this.updateMany(
    { carId: bid.carId },
    { isWinningBid: false }
  );

  return this.findByIdAndUpdate(
    bidId,
    { isWinningBid: true },
    { new: true }
  );
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

    // 🔥 rapid bidding detection (basic anti-bot)
    const recentBids = await mongoose.model("Bid").countDocuments({
      user: this.user,
      createdAt: { $gte: new Date(Date.now() - 5000) }, // last 5 sec
    });

    if (recentBids > 5) {
      this.isSuspicious = true;
      this.suspiciousReason = "Rapid bidding (possible bot)";
    }

    next();
  } catch (err) {
    next(err);
  }
});

// =============================
// 🔒 PREVENT DUPLICATE AUTO-BIDS
// =============================
bidSchema.index(
  { carId: 1, user: 1, maxBid: 1 },
  {
    unique: false, // allow history but control logic at service level
  }
);

const Bid =
  mongoose.models.Bid || mongoose.model("Bid", bidSchema);

export default Bid;