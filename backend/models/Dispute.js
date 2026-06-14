import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 RELATED ENTITIES
    // =============================
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      required: true,
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    openedAgainst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =============================
    // 📋 DISPUTE DETAILS
    // =============================
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["condition_mismatch", "delivery_issue", "payment_dispute", "fraud", "other"],
      required: true,
    },

    // =============================
    // 📊 DISPUTE STATUS
    // =============================
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "appealed", "closed"],
      default: "open",
      index: true,
    },

    // =============================
    // 📎 EVIDENCE
    // =============================
    evidence: [
      {
        type: {
          type: String,
          enum: ["image", "pdf", "video", "inspection_report", "chat_log", "other"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: String,
        description: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =============================
    // ⚖️ RESOLUTION
    // =============================
    resolution: {
      decision: {
        type: String,
        enum: ["partial_refund", "full_refund", "release_funds", "split_settlement"],
      },
      amount: Number,
      sellerAmount: Number,
      buyerAmount: Number,
      reason: String,
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      decidedAt: Date,
    },

    // =============================
    // 🔄 APPEAL
    // =============================
    appeal: {
      reason: String,
      evidence: [
        {
          type: {
            type: String,
            enum: ["image", "pdf", "video", "inspection_report", "chat_log", "other"],
          },
          url: String,
          publicId: String,
          description: String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      appealedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      appealedAt: Date,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      reviewNotes: String,
    },

    // =============================
    // 📝 ADMIN NOTES
    // =============================
    adminNotes: [
      {
        note: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =============================
    // 📊 TIMELINE
    // =============================
    openedAt: {
      type: Date,
      default: Date.now,
    },
    underReviewAt: Date,
    resolvedAt: Date,
    closedAt: Date,
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
disputeSchema.index({ escrow: 1 });
disputeSchema.index({ openedBy: 1, createdAt: -1 });
disputeSchema.index({ openedAgainst: 1, createdAt: -1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ category: 1 });

export default mongoose.models.Dispute || mongoose.model("Dispute", disputeSchema);
