import mongoose from "mongoose";

const conversionFunnelSchema = new mongoose.Schema(
  {
    // =============================
    // 🚗 CAR & DEALER
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // =============================
    // 👤 USER (BUYER)
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // =============================
    // 📊 FUNNEL STAGES
    // =============================
    // Each stage tracks when the user reached that point
    viewCount: { type: Number, default: 0 },
    lastViewedAt: Date,

    favorited: { type: Boolean, default: false },
    favoritedAt: Date,

    chatInitiated: { type: Boolean, default: false },
    chatInitiatedAt: Date,
    messageCount: { type: Number, default: 0 },

    offerMade: { type: Boolean, default: false },
    offerMadeAt: Date,
    offerAmount: Number,

    escrowInitiated: { type: Boolean, default: false },
    escrowInitiatedAt: Date,

    sold: { type: Boolean, default: false },
    soldAt: Date,
    saleAmount: Number,

    // =============================
    // 📈 CONVERSION METRICS
    // =============================
    // Track the current stage in the funnel
    currentStage: {
      type: String,
      enum: ["viewed", "favorited", "chatted", "offered", "escrow", "sold"],
      default: "viewed",
    },

    // Time spent at each stage (in hours)
    timeToFavorite: Number,
    timeToChat: Number,
    timeToOffer: Number,
    timeToEscrow: Number,
    timeToSale: Number,
  },
  {
    timestamps: true,
  },
);

// Index for efficient funnel queries
conversionFunnelSchema.index({ car: 1, user: 1 }, { unique: true });
conversionFunnelSchema.index({ dealer: 1, currentStage: 1 });
conversionFunnelSchema.index({ car: 1, currentStage: 1 });

export default mongoose.model("ConversionFunnel", conversionFunnelSchema);
