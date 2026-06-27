import mongoose from "mongoose";

const auctionRiskProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["bidder", "seller"],
      required: true,
    },
    totalBids: { type: Number, default: 0 },
    totalAuctions: { type: Number, default: 0 },
    wonAuctions: { type: Number, default: 0 },

    selfBidCount: { type: Number, default: 0 },
    relatedAccountCount: { type: Number, default: 0 },
    inflationPatternCount: { type: Number, default: 0 },
    velocityAbuseCount: { type: Number, default: 0 },
    lastSecondCount: { type: Number, default: 0 },

    recentBids24h: { type: Number, default: 0 },
    recentBids7d: { type: Number, default: 0 },
    lastSecondBids30d: { type: Number, default: 0 },
    totalBidVolume30d: { type: Number, default: 0 },

    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskTier: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    lastAnomalyAt: Date,
    lastScoreUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

auctionRiskProfileSchema.index({ riskScore: -1 });
auctionRiskProfileSchema.index({ role: 1, riskScore: -1 });
auctionRiskProfileSchema.index({ user: 1, role: 1 }, { unique: true });

export default mongoose.models.AuctionRiskProfile ||
  mongoose.model("AuctionRiskProfile", auctionRiskProfileSchema);
