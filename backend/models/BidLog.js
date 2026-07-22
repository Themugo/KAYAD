import mongoose from "mongoose";

const bidLogSchema = new mongoose.Schema(
  {
    bid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      required: true,
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Pseudonym for privacy
    bidderPseudonym: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "KES",
    },
    previousAmount: {
      type: Number,
    },
    increment: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "outbid", "won", "lost", "cancelled"],
      default: "active",
      index: true,
    },
    isAutoBid: {
      type: Boolean,
      default: false,
    },
    isProxyBid: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["web", "mobile", "sms", "api"],
      default: "web",
    },
    ipAddress: {
      type: String,
      select: false,
    },
    userAgent: {
      type: String,
      select: false,
    },
    location: {
      country: String,
      city: String,
      region: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // For real-time display
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
bidLogSchema.index({ car: 1, createdAt: -1 });
bidLogSchema.index({ user: 1, createdAt: -1 });
bidLogSchema.index({ auction: 1, status: 1 });
bidLogSchema.index({ displayOrder: -1 });

// Compound index for user's bid history on a car
bidLogSchema.index({ car: 1, user: 1, createdAt: -1 });

// TTL index for log retention (optional, keeps logs for 90 days)
// bidLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Virtual for formatted amount
bidLogSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: this.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(this.amount);
});

// Static method to get recent bids for a car
bidLogSchema.statics.getRecentBids = async function (carId, limit = 20) {
  return this.find({ car: carId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name email");
};

// Static method to get user's bid history
bidLogSchema.statics.getUserBidHistory = async function (userId, options = {}) {
  const { carId, page = 1, limit = 20 } = options;
  const query = { user: userId };
  if (carId) query.car = carId;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("car", "title images price currentBid");
};

const BidLog = mongoose.model("BidLog", bidLogSchema);

export default BidLog;
