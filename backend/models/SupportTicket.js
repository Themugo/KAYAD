import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 PARTICIPANTS
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =============================
    // 🎫 TICKET DETAILS
    // =============================
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["payments", "escrow", "inspection", "auction", "account", "other"],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent", "critical"],
      default: "medium",
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },

    // =============================
    // 📊 STATUS
    // =============================
    status: {
      type: String,
      enum: ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "resolved", "closed", "escalated"],
      default: "open",
      index: true,
    },

    // =============================
    // 🔗 RELATED ENTITIES
    // =============================
    relatedEscrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
    },
    relatedCar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
    },
    relatedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    // =============================
    // 💬 MESSAGES
    // =============================
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        senderRole: {
          type: String,
          enum: ["user", "agent", "supervisor", "admin"],
        },
        content: {
          type: String,
          required: true,
        },
        isInternal: {
          type: Boolean,
          default: false,
        },
        attachments: [
          {
            url: String,
            type: String,
            name: String,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =============================
    // 📈 SLA TRACKING
    // =============================
    sla: {
      firstResponseTarget: Date,
      firstResponseActual: Date,
      resolutionTarget: Date,
      resolutionActual: Date,
      firstResponseMet: Boolean,
      resolutionMet: Boolean,
    },

    // =============================
    // 📊 METADATA
    // =============================
    source: {
      type: String,
      enum: ["web", "email", "chat", "phone", "system"],
      default: "web",
    },
    tags: [String],
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    resolutionNotes: String,
    closedAt: Date,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ priority: 1, status: 1 });
supportTicketSchema.index({ category: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ user: 1, createdAt: -1 });

// Generate ticket number before save
supportTicketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const count = await SupportTicket.countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

supportTicketSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

supportTicketSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

supportTicketSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

supportTicketSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

supportTicketSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

const SupportTicket = mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
