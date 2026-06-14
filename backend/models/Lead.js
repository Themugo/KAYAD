// backend/models/Lead.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Lead model for CRM system
// Tracks buyer inquiries through sales pipeline stages
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 RELATIONSHIPS
    // =============================
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },

    // =============================
    // 📋 LEAD INFO
    // =============================
    stage: {
      type: String,
      enum: ["new", "contacted", "negotiating", "test_drive", "escrow_started", "sold", "lost"],
      default: "new",
      index: true,
    },

    source: {
      type: String,
      enum: ["chat", "auction", "contact_form", "direct_listing", "referral"],
      required: true,
      index: true,
    },

    sourceReference: {
      type: mongoose.Schema.Types.ObjectId, // chatId, auctionId, contactId, etc.
    },

    // =============================
    // 📊 METRICS
    // =============================
    firstResponseTime: {
      type: Number, // in minutes
      default: 0,
    },

    lastResponseTime: {
      type: Number, // in minutes
      default: 0,
    },

    averageResponseTime: {
      type: Number, // in minutes
      default: 0,
    },

    totalMessages: {
      type: Number,
      default: 0,
    },

    lastActivityAt: {
      type: Date,
      index: true,
    },

    // =============================
    // 💰 VALUE
    // =============================
    estimatedValue: {
      type: Number, // vehicle price or bid amount
    },

    actualValue: {
      type: Number, // final sale price
    },

    // =============================
    // 📝 NOTES
    // =============================
    notes: {
      type: String,
      maxlength: 1000,
    },

    tags: [
      {
        type: String,
      },
    ],

    // =============================
    // 🔒 STATUS
    // =============================
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    isHot: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =============================
    // 📈 CONVERSION
    // =============================
    convertedAt: Date,
    lostAt: Date,
    lostReason: {
      type: String,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
leadSchema.index({ buyer: 1, dealer: 1, vehicle: 1 });
leadSchema.index({ dealer: 1, stage: 1, lastActivityAt: -1 });
leadSchema.index({ dealer: 1, source: 1 });
leadSchema.index({ dealer: 1, isArchived: 1, lastActivityAt: -1 });
leadSchema.index({ dealer: 1, isHot: 1, lastActivityAt: -1 });

// =============================
// ⚡ METHOD: UPDATE STAGE
// =============================
leadSchema.methods.updateStage = async function (newStage, actorId) {
  const oldStage = this.stage;
  this.stage = newStage;
  this.lastActivityAt = new Date();

  if (newStage === "sold") {
    this.convertedAt = new Date();
  } else if (newStage === "lost") {
    this.lostAt = new Date();
  }

  await this.save();

  // Add activity
  const LeadActivity = mongoose.model("LeadActivity");
  await LeadActivity.create({
    lead: this._id,
    type: "stage_changed",
    actor: actorId,
    actorType: "dealer",
    description: `Stage changed from ${oldStage} to ${newStage}`,
    metadata: {
      oldStage,
      newStage,
    },
  });

  return this;
};

// =============================
// ⚡ METHOD: ADD ACTIVITY
// =============================
leadSchema.methods.addActivity = async function (type, actorId, actorType, description, metadata = {}) {
  const LeadActivity = mongoose.model("LeadActivity");
  await LeadActivity.create({
    lead: this._id,
    type,
    actor: actorId,
    actorType,
    description,
    metadata,
  });

  this.lastActivityAt = new Date();
  await this.save();

  return this;
};

// =============================
// ⚡ METHOD: CALCULATE RESPONSE TIME
// =============================
leadSchema.methods.calculateResponseTime = function () {
  if (this.firstResponseTime > 0) {
    const totalResponseTime = this.firstResponseTime + this.lastResponseTime;
    this.averageResponseTime = totalResponseTime / 2;
  }
  return this.save();
};

// =============================
// ⚡ METHOD: ARCHIVE
// =============================
leadSchema.methods.archive = async function (actorId) {
  this.isArchived = true;
  this.lastActivityAt = new Date();
  await this.save();

  const LeadActivity = mongoose.model("LeadActivity");
  await LeadActivity.create({
    lead: this._id,
    type: "status_changed",
    actor: actorId,
    actorType: "dealer",
    description: "Lead archived",
  });

  return this;
};

// =============================
// ⚡ METHOD: MARK AS HOT
// =============================
leadSchema.methods.markAsHot = async function (actorId) {
  this.isHot = !this.isHot;
  this.lastActivityAt = new Date();
  await this.save();

  const LeadActivity = mongoose.model("LeadActivity");
  await LeadActivity.create({
    lead: this._id,
    type: "status_changed",
    actor: actorId,
    actorType: "dealer",
    description: this.isHot ? "Lead marked as hot" : "Lead unmarked as hot",
  });

  return this;
};

// =============================
// ⚡ STATIC: GET DEALER LEADS
// =============================
leadSchema.statics.getDealerLeads = function (dealerId, filters = {}) {
  const query = {
    dealer: dealerId,
    isArchived: filters.archived === true ? true : false,
  };

  if (filters.stage) {
    query.stage = filters.stage;
  }

  if (filters.source) {
    query.source = filters.source;
  }

  if (filters.isHot !== undefined) {
    query.isHot = filters.isHot;
  }

  if (filters.vehicle) {
    query.vehicle = filters.vehicle;
  }

  return this.find(query)
    .populate("buyer", "name email phone")
    .populate("dealer", "name email businessName")
    .populate("vehicle", "title brand model year price images")
    .sort({ lastActivityAt: -1 });
};

// =============================
// ⚡ STATIC: GET LEAD PIPELINE
// =============================
leadSchema.statics.getLeadPipeline = async function (dealerId) {
  const pipeline = await this.aggregate([
    {
      $match: {
        dealer: new mongoose.Types.ObjectId(dealerId),
        isArchived: false,
      },
    },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        totalValue: { $sum: "$estimatedValue" },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return pipeline;
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
