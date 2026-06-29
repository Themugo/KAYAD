import mongoose from "mongoose";

// =============================
// 🧾 BID SUBDOCUMENT
// =============================
const bidSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    bid: {
      type: Number,
      required: true,
    },
    time: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// =============================
// 🏆 WINNER SUBDOCUMENT
// =============================
const winnerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
    },
    bid: Number,
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    attempt: {
      type: Number,
      default: 1,
    },
  },
  { _id: false },
);

// =============================
// 🚗 MAIN AUCTION SCHEMA
// =============================
const auctionSchema = new mongoose.Schema(
  {
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true, // ✅ OK (only defined once)
    },

    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // =============================
    // 📊 STATE
    // =============================
    status: {
      type: String,
      enum: ["active", "ended", "pending_payment", "completed", "cancelled"],
      default: "active",
    },

    // =============================
    // 💰 PRICING
    // =============================
    startingBid: {
      type: Number,
      default: 0,
    },

    highestBid: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🏆 WINNER
    // =============================
    winner: winnerSchema,

    // =============================
    // 📜 BID HISTORY
    // =============================
    bidHistory: {
      type: [bidSchema],
      default: [],
    },

    // =============================
    // ⏱ TIME
    // =============================
    startTime: {
      type: Date,
      default: Date.now,
    },

    endTime: {
      type: Date,
      required: true,
    },

    extendedCount: {
      type: Number,
      default: 0,
    },

    // =============================
    // 💳 PAYMENT
    // =============================
    paymentDeadline: {
      type: Date,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending",
    },

    paymentAttempts: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🔁 REASSIGNMENT
    // =============================
    reassignmentCount: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🔐 BID SECURITY (SOVEREIGN V3)
    // =============================
    bidSecurityAmount: { type: Number, default: 0 },
    paymentRecipient: {
      type: String,
      enum: ["KAYAD_ESCROW", "DEALER_DIRECT"],
      default: "KAYAD_ESCROW",
    },
    dealerMpesaShortcode: { type: String, default: "" },
    commissionRate: { type: Number, default: 2 },
    commissionOwed: { type: Number, default: 0 },

    // =============================
    // 🚫 MODERATION
    // =============================
    cancelledReason: String,

    isFraudFlagged: {
      type: Boolean,
      default: false,
    },

    // =============================
    // 🧠 META
    // =============================
    createdBy: String,
    notes: String,
  },
  {
    timestamps: true,
  },
);

// =============================
// ⚡ INDEXES (ONLY HERE 🔥)
// =============================
auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ "winner.userId": 1 });
auctionSchema.index({ paymentDeadline: 1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// 🔥 Get next highest bidder
auctionSchema.methods.getNextBidder = function () {
  if (!this.bidHistory.length) return null;

  const sorted = [...this.bidHistory].sort((a, b) => a.bid - b.bid);

  const filtered = sorted.filter((b) => b.userId !== this.winner?.userId);

  return filtered.pop() || null;
};

// 🔥 Assign winner
auctionSchema.methods.assignWinner = function (bidder) {
  this.winner = {
    userId: bidder.userId,
    bid: bidder.bid,
    assignedAt: new Date(),
    attempt: this.reassignmentCount + 1,
  };

  this.highestBid = bidder.bid;
  this.paymentDeadline = new Date(Date.now() + 10 * 60 * 1000);
  this.status = "pending_payment";
  this.reassignmentCount += 1;

  return this;
};

// =============================
// 🔐 STATIC METHODS
// =============================

auctionSchema.statics.findEndingSoon = function () {
  return this.find({
    status: "active",
    endTime: { $lte: new Date(Date.now() + 60000) },
  });
};

auctionSchema.statics.findExpiredPayments = function () {
  return this.find({
    status: "pending_payment",
    paymentDeadline: { $lt: new Date() },
  });
};

auctionSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

auctionSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

auctionSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

auctionSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

auctionSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

// =============================
// 🚀 EXPORT
// =============================
export default mongoose.models.Auction || mongoose.model("Auction", auctionSchema);
