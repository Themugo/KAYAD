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
    fuel: { type: String, index: true },
    transmission: { type: String },
    mileage: Number,
    bodyType: String,
    color: String,
    condition: String,
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
    priceHistory: [{
      price: { type: Number, required: true },
      date: { type: Date, default: Date.now },
    }],

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
  { timestamps: true }
);

// =============================
// 🗑️ SOFT DELETE
// =============================
carSchema.add({
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Override delete to soft-delete
carSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } }
  );
};

// Use query middleware instead of overriding statics (avoids Mongoose init race)
function autoFilterDeleted() {
  const filter = this.getFilter();
  if (filter.deletedAt === undefined) {
    filter.deletedAt = null;
  }
}

carSchema.pre("find", autoFilterDeleted);
carSchema.pre("findOne", autoFilterDeleted);
carSchema.pre("findOneAndUpdate", autoFilterDeleted);
carSchema.pre("findOneAndDelete", autoFilterDeleted);
carSchema.pre("countDocuments", autoFilterDeleted);
carSchema.pre("updateMany", autoFilterDeleted);
carSchema.pre("deleteMany", function () {
  // Don't auto-filter deleteMany — admin may want to purge
});

// Override findById to exclude soft-deleted
carSchema.statics.findById = function (id, ...rest) {
  return this.findOne({ _id: id, deletedAt: null }, ...rest);
};

// =============================
// 🔥 INDEXES (CRITICAL)
// =============================
carSchema.index({ price: 1 });
carSchema.index({ brand: 1, price: 1 });
carSchema.index({ "location.city": 1 });
carSchema.index({ createdAt: -1 });
carSchema.index({ views: -1 });
carSchema.index({ allowBid: 1, auctionStatus: 1 });

carSchema.index({
  title: "text",
  brand: "text",
  model: "text",
});

// GEO SEARCH
carSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("Car", carSchema);
