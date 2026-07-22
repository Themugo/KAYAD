import mongoose from "mongoose";
import crypto from "crypto";

const transactionLedgerSchema = new mongoose.Schema(
  {
    ledgerId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    transactionHash: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "escrow_hold",
        "escrow_release",
        "escrow_refund",
        "commission",
        "transfer",
        "refund",
        "payment",
        "adjustment",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled", "reversed"],
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "KES",
    },
    fee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
    },
    // Parties involved
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    // Reference to related documents
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
    },
    bid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    // Immutable metadata (cannot be modified after creation)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      set: function (value) {
        // Once set, metadata cannot be changed
        if (this.isNew) return value;
        return this.metadata;
      },
    },
    // Previous hash for chain integrity
    previousHash: {
      type: String,
    },
    // Block number (for ordering)
    blockNumber: {
      type: Number,
      default: 0,
    },
    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Reversal info
    reversedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransactionLedger",
    },
    reversalReason: {
      type: String,
    },
    // Description
    description: {
      type: String,
    },
    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate unique ledger ID and transaction hash
transactionLedgerSchema.pre("save", async function (next) {
  if (this.isNew) {
    // Generate ledger ID
    if (!this.ledgerId) {
      const count = await mongoose.model("TransactionLedger").countDocuments();
      this.ledgerId = `TXN-${String(count + 1).padStart(10, "0")}`;
    }

    // Get previous hash for chain
    const lastEntry = await mongoose
      .model("TransactionLedger")
      .findOne({}, { transactionHash: 1 })
      .sort({ createdAt: -1 });

    this.previousHash = lastEntry?.transactionHash || "GENESIS";

    // Generate transaction hash
    const hashInput = [
      this.ledgerId,
      this.type,
      this.amount,
      this.currency,
      this.from?.toString() || "",
      this.to?.toString() || "",
      this.previousHash,
      Date.now().toString(),
    ].join("|");

    this.transactionHash = crypto.createHash("sha256").update(hashInput).digest("hex");

    // Calculate net amount
    if (this.amount && this.fee) {
      this.netAmount = this.amount - this.fee;
    }
  }
  next();
});

// Ensure immutability after creation
transactionLedgerSchema.pre("updateOne", function (next) {
  // Only allow status changes and verification updates
  const update = this.getUpdate();
  const allowedFields = ["status", "isVerified", "verifiedAt", "verifiedBy"];
  const attemptedFields = Object.keys(update).filter((k) => !allowedFields.includes(k));

  if (attemptedFields.length > 0) {
    return next(new Error(`Immutability violation: Cannot modify ${attemptedFields.join(", ")}`));
  }
  next();
});

// Verify transaction chain integrity
transactionLedgerSchema.statics.verifyChain = async function (startDate = null) {
  const query = startDate ? { createdAt: { $gte: startDate } } : {};
  const entries = await this.find(query).sort({ createdAt: 1 });

  let isValid = true;
  const errors = [];

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].previousHash !== entries[i - 1].transactionHash) {
      isValid = false;
      errors.push({
        ledgerId: entries[i].ledgerId,
        expected: entries[i - 1].transactionHash,
        actual: entries[i].previousHash,
      });
    }
  }

  return { isValid, errors, entriesChecked: entries.length };
};

// Get ledger entry by hash
transactionLedgerSchema.statics.findByHash = async function (hash) {
  return this.findOne({ transactionHash: hash }).populate([
    { path: "from", select: "name email" },
    { path: "to", select: "name email" },
    { path: "escrow" },
    { path: "car", select: "title images" },
  ]);
};

// Get transactions for an escrow
transactionLedgerSchema.statics.getForEscrow = async function (escrowId, options = {}) {
  const { page = 1, limit = 20 } = options;
  return this.find({ escrow: escrowId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

const TransactionLedger = mongoose.model("TransactionLedger", transactionLedgerSchema);

export default TransactionLedger;
