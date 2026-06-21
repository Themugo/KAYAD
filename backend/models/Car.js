import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    // =============================
    // 🧾 BASIC INFO
    // =============================
    title: { type: String, required: true, trim: true },
    brand: { type: String, index: true },
    model: { type: String },
    year: { type: Number, index: true },
    price: { type: Number },

    // =============================
    // 📍 LOCATION
    // =============================
    location: {
      city: { type: String },
      address: String,
      coordinates: {
        type: { type: String },
        coordinates: [Number], // [lng, lat]
      },
    },

    // =============================
    // 🚗 SPECS
    // =============================
    fuel: { type: String, index: true, enum: ["Petrol", "Diesel", "Electric", "Hybrid", "LPG", "CNG"] },
    transmission: { type: String, enum: ["Automatic", "Manual", "CVT", "DCT", "Semi-Automatic"] },
    mileage: Number,
    bodyType: {
      type: String,
      enum: [
        "SUV",
        "Sedan",
        "Hatchback",
        "Pickup",
        "Wagon",
        "Coupe",
        "Convertible",
        "Van",
        "Truck",
        "Bus",
        "Motorcycle",
        "Other",
      ],
    },
    color: {
      type: String,
      enum: [
        "White",
        "Black",
        "Silver",
        "Grey",
        "Blue",
        "Red",
        "Green",
        "Brown",
        "Beige",
        "Gold",
        "Orange",
        "Purple",
        "Yellow",
        "Maroon",
        "Navy",
        "Other",
      ],
    },
    condition: {
      type: String,
      enum: ["New", "Used", "Pre-owned", "Foreign Used", "Locally Used", "Reconditioned", "Damaged"],
    },
    description: String,
    features: [String],

    // =============================
    // 🖼 IMAGES (CLOUDINARY)
    // =============================
    images: [
      {
        url: String,
        thumb: String,
        public_id: String,
      },
    ],
    coverImage: { type: Number, default: 0 },

    // =============================
    // 👤 DEALER
    // =============================
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    demoEditedAt: Date,
    demoEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dealerPhone: String,
    isVerifiedDealer: { type: Boolean, default: false },

    // =============================
    // 🔥 MARKETPLACE FEATURES
    // =============================
    status: { type: String, enum: ["active", "sold", "pending", "rejected"], default: "active", index: true },
    allowBuy: { type: Boolean, default: true },
    allowBid: { type: Boolean, default: false },
    escrowEnabled: { type: Boolean, default: true },

    // =============================
    // 🔥 AUCTION
    // =============================
    currentBid: { type: Number, default: 0 },
    bidsCount: { type: Number, default: 0 },
    auctionStatus: {
      type: String,
      enum: ["draft", "live", "ended"],
      default: "draft",
      index: true,
    },
    auctionStartTime: Date,
    auctionEnd: Date,
    startingBid: { type: Number, default: 0 },
    reservePrice: { type: Number, default: null },
    reserveMet: { type: Boolean, default: false },
    reserveMode: {
      type: String,
      enum: ["none", "hidden", "visible"],
      default: "none",
    },
    extensionCount: { type: Number, default: 0 },

    bids: [
      {
        user: mongoose.Schema.Types.ObjectId,
        amount: Number,
        phone: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // =============================
    // 📊 ANALYTICS
    // =============================
    views: { type: Number, default: 0, index: true },
    clicks: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },

    // =============================
    // 🇰🇪 KENYA TRUST LAYER
    // =============================
    ntsaVerified: { type: Boolean, default: false },
    dutyStatus: {
      type: String,
      enum: ["duty_paid", "duty_unpaid", "awaiting_clearance", "unknown"],
      default: "unknown",
    },
    logbookVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // =============================
    // 💰 PROMOTION
    // =============================
    isPromoted: { type: Boolean, default: false },
    promotionExpiresAt: Date,

    // =============================
    // 🧠 AI / FRAUD
    // =============================
    fraudScore: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100 },

    // =============================
    // 🚗 VEHICLE IDENTIFICATION (Duplicate Detection)
    // =============================
    vin: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    chassisNumber: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    // =============================
    // 🔍 DUPLICATE DETECTION
    // =============================
    isFlaggedDuplicate: {
      type: Boolean,
      default: false,
      index: true,
    },
    duplicateStatus: {
      type: String,
      enum: ["none", "flagged", "under_review", "confirmed_duplicate", "false_positive"],
      default: "none",
      index: true,
    },
    duplicateLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DuplicateVehicleLog",
    },
    originalListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
    },
    duplicateListings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car",
      },
    ],

    // =============================
    // 🏆 AUCTION / SALE STATE
    // =============================
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    winner: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      amount: Number,
    },
    paymentStatus: { type: String, enum: ["pending", "paid", "released", "refunded"] },
    isPaid: { type: Boolean, default: false },

    // =============================
    // 📈 PRICE HISTORY
    // =============================
    priceHistory: [
      {
        price: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],

    // =============================
    // 💵 PRICE INTELLIGENCE
    // =============================
    avgMarketPrice: Number,
    dealRating: {
      type: String,
      enum: ["great", "good", "fair", "overpriced"],
    },

    // =============================
    // 📅 META
    // =============================
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

// =============================
// 🗑️ SOFT DELETE
// =============================
carSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Override delete to soft-delete
carSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

// Soft-delete filter — exclude deleted cars by default
carSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

carSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

carSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// =============================
// 🔥 INDEXES (OPTIMIZED - Phase 1 Database Audit)
// =============================

// Single-field indexes
carSchema.index({ price: 1 });
carSchema.index({ createdAt: -1 });
carSchema.index({ views: -1 });
carSchema.index({ deletedAt: 1 });

// Compound indexes for common filter combinations
// REMOVED REDUNDANT INDEXES: { status: 1, createdAt: -1 }, { status: 1, price: 1 }, { status: 1, year: -1 }, { status: 1, views: -1 }, { brand: 1, price: 1 }
// These are covered by the comprehensive compound index below
carSchema.index({ status: 1, brand: 1, "location.city": 1, price: 1 });
carSchema.index({ dealer: 1, createdAt: -1 });
carSchema.index({ "location.city": 1 });
carSchema.index({ allowBid: 1, auctionStatus: 1 });
carSchema.index({ status: 1, auctionStatus: 1, allowBid: 1 });
carSchema.index({ isDemo: 1, createdAt: -1 });

// Auction-specific indexes
carSchema.index({ auctionStatus: 1, auctionEnd: -1 });
carSchema.index({ auctionStatus: 1, currentBid: -1 });
carSchema.index({ auctionStatus: 1, allowBid: 1, auctionEnd: -1 });
carSchema.index({ status: 1, auctionStatus: 1, price: 1 });
carSchema.index({ status: 1, auctionStatus: 1, year: 1 });
carSchema.index({ status: 1, auctionStatus: 1, brand: 1 });

// Text index for keyword search
carSchema.index({
  title: "text",
  brand: "text",
  model: "text",
});

// GEO SEARCH
carSchema.index({ "location.coordinates": "2dsphere" });

// DUPLICATE DETECTION INDEXES - Changed to unique constraints (Phase 1)
carSchema.index({ vin: 1 }, { unique: true, sparse: true });
carSchema.index({ chassisNumber: 1 }, { unique: true, sparse: true });
carSchema.index({ registrationNumber: 1 }, { unique: true, sparse: true });
carSchema.index({ isFlaggedDuplicate: 1, duplicateStatus: 1 });
carSchema.index({ dealer: 1, isFlaggedDuplicate: 1 });

// =============================
// 🔗 CASCADE DELETE LOGIC (Phase 2 Database Audit)
// =============================

// Cascade delete: When car is deleted, soft-delete all related records
carSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  try {
    const Bid = mongoose.model("Bid");
    const Escrow = mongoose.model("Escrow");
    const Favorite = mongoose.model("Favorite");
    const Review = mongoose.model("Review");
    const Chat = mongoose.model("Chat");

    // Soft-delete car's bids
    await Bid.updateMany({ carId: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc.dealer } });

    // Soft-delete car's escrows
    await Escrow.updateMany({ car: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc.dealer } });

    // Soft-delete car's favorites
    await Favorite.updateMany({ car: doc._id }, { $set: { deletedAt: new Date() } });

    // Soft-delete car's reviews
    await Review.updateMany({ car: doc._id }, { $set: { deletedAt: new Date() } });

    // Soft-delete car's chats
    await Chat.updateMany({ car: doc._id }, { $set: { deletedAt: new Date(), deletedBy: doc.dealer } });
  } catch (err) {
    console.error("❌ CASCADE DELETE ERROR FOR CAR:", err);
  }
});

export default mongoose.model("Car", carSchema);
