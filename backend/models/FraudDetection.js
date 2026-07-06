import mongoose from "mongoose";

const fraudDetectionSchema = new mongoose.Schema(
  {
    // =============================
    // 🎯 TARGET
    // =============================
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["User", "Car", "Auction", "Escrow"],
      required: true,
    },

    // =============================
    // 🚨 FRAUD TYPE
    // =============================
    fraudType: {
      type: String,
      enum: [
        // User fraud
        "multiple_accounts",
        "duplicate_phone",
        "duplicate_email",
        "suspicious_registration",

        // Auction fraud
        "self_bidding",
        "bid_ring",
        "suspicious_bid_spike",
        "shill_bidding",

        // Escrow fraud
        "repeated_disputes",
        "chargeback",
        "refund_abuse",

        // Dealer fraud
        "duplicate_listing",
        "vin_reuse",
        "stolen_photos",
        "fake_listing",
      ],
      required: true,
      index: true,
    },

    // =============================
    // 📊 SEVERITY
    // =============================
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    // =============================
    // 📋 STATUS
    // =============================
    status: {
      type: String,
      enum: ["detected", "under_review", "confirmed", "dismissed", "action_taken"],
      default: "detected",
      index: true,
    },

    // =============================
    // 📝 EVIDENCE
    // =============================
    evidence: {
      type: Object,
      default: {},
    },
    relatedEntities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "targetType",
      },
    ],

    // =============================
    // ⚖️ ACTION TAKEN
    // =============================
    actionTaken: {
      type: String,
      enum: ["none", "warning", "suspended", "banned", "listing_removed", "funds_frozen"],
      default: "none",
    },
    actionTakenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionTakenAt: Date,
    actionNotes: String,

    // =============================
    // 📊 METADATA
    // =============================
    detectionMethod: String,
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    falsePositive: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: String,
  },
  { timestamps: true },
);

// Indexes for efficient queries
fraudDetectionSchema.index({ target: 1, fraudType: 1 });
fraudDetectionSchema.index({ status: 1, createdAt: -1 });
fraudDetectionSchema.index({ severity: 1, status: 1 });
fraudDetectionSchema.index({ fraudType: 1, createdAt: -1 });

export default mongoose.models.FraudDetection || mongoose.model("FraudDetection", fraudDetectionSchema);
