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
    price: { type: Number, index: true },

    // =============================
    // 📍 LOCATION
    // =============================
    location: {
      city: { type: String, index: true },
      address: String,
      coordinates: {
        type: { type: String, default: "Point" },
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

    // =============================
    // 👤 DEALER
    // =============================
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    dealerPhone: String,
    isVerifiedDealer: { type: Boolean, default: false },

    // =============================
    // 🔥 MARKETPLACE FEATURES
    // =============================
    status: { type: String, enum: ["active", "sold", "pending"], default: "active", index: true },
    allowBuy: { type: Boolean, default: true },
    allowBid: { type: Boolean, default: false },

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
    auctionEnd: Date,

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