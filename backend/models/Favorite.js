// models/Favorite.js

import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 USER
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =============================
    // 🚗 CAR
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },

    // =============================
    // ⚡ SNAPSHOT (UI PERFORMANCE)
    // =============================
    carSnapshot: {
      title: String,
      price: Number,
      image: String,
      brand: String,
    },

    // =============================
    // 🔔 USER PREFERENCES
    // =============================
    notifyOnPriceDrop: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// =============================
// 🔥 UNIQUE INDEX (NO DUPLICATES)
// =============================
favoriteSchema.index({ user: 1, car: 1 }, { unique: true });

// =============================
// ⚡ PERFORMANCE INDEXES
// =============================
favoriteSchema.index({ user: 1, createdAt: -1 });
favoriteSchema.index({ car: 1, createdAt: -1 });

// =============================
// ⚡ STATIC: TOGGLE FAVORITE
// =============================
favoriteSchema.statics.toggleFavorite = async function (userId, car) {
  const existing = await this.findOne({
    user: userId,
    car: car._id,
  });

  // ❌ REMOVE
  if (existing) {
    await existing.deleteOne();
    return { removed: true };
  }

  // ✅ ADD
  const favorite = await this.create({
    user: userId,
    car: car._id,
    carSnapshot: {
      title: car.title,
      price: car.price,
      image: car.images?.[0] || null,
      brand: car.brand,
    },
  });

  return { added: true, favorite };
};

// =============================
// ⚡ STATIC: GET USER FAVORITES
// =============================
favoriteSchema.statics.getUserFavorites = function (userId) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "car",
      select: "title price images brand sold currentBid",
    })
    .lean();
};

// =============================
// ⚡ STATIC: COUNT FAVORITES (PER CAR)
// =============================
favoriteSchema.statics.countCarFavorites = function (carId) {
  return this.countDocuments({ car: carId });
};

// =============================
// ⚡ STATIC: IS FAVORITED (FAST CHECK)
// =============================
favoriteSchema.statics.isFavorited = function (userId, carId) {
  return this.exists({
    user: userId,
    car: carId,
  });
};

// =============================
// 🧠 PRE-SAVE: SNAPSHOT FALLBACK
// =============================
favoriteSchema.pre("save", function (next) {
  if (!this.carSnapshot) {
    this.carSnapshot = {};
  }
  next();
});

// =============================
// ✅ SAFE MODEL EXPORT
// =============================
const Favorite = mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);

export default Favorite;
