import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 RELATIONS
    // =============================
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      default: null,
      index: true,
    },

    // =============================
    // ⭐ REVIEW DATA
    // =============================
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // =============================
    // 🔐 TRUST SYSTEM
    // =============================
    isVerified: {
      type: Boolean,
      default: false, // true if buyer actually purchased
      index: true,
    },

    isApproved: {
      type: Boolean,
      default: true, // 🔥 moderation ready
      index: true,
    },

    isFlagged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// =============================
// 🚫 PREVENT DUPLICATES (FIXED 🔥)
// =============================
// user can review dealer once per car
reviewSchema.index({ user: 1, dealer: 1, car: 1 }, { unique: true });

// =============================
// 🔥 INDEXES (PERFORMANCE - Phase 1 Database Audit)
// =============================
reviewSchema.index({ dealer: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
// isVerified already indexed via schema field index:true
// Phase 1: Add compound index for approved reviews sorted by rating
reviewSchema.index({ dealer: 1, isApproved: 1, rating: -1 });

// =============================
// ⚡ STATIC: GET DEALER REVIEWS
// =============================
reviewSchema.statics.getDealerReviews = function (dealerId) {
  return this.find({
    dealer: dealerId,
    isApproved: true,
  })
    .sort({ createdAt: -1 })
    .populate("user", "name");
};

// =============================
// ⚡ STATIC: GET DEALER RATING
// =============================
reviewSchema.statics.getDealerRating = async function (dealerId) {
  const stats = await this.aggregate([
    {
      $match: {
        dealer: new mongoose.Types.ObjectId(dealerId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$dealer",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return {
    avgRating: stats[0]?.avgRating || 0,
    totalReviews: stats[0]?.totalReviews || 0,
  };
};

// =============================
// ⭐ AUTO UPDATE DEALER PROFILE (IMPORTANT 🔥)
// =============================
reviewSchema.post("save", async function () {
  try {
    const Review = this.constructor;
    const User = mongoose.model("User");

    const stats = await Review.aggregate([
      {
        $match: {
          dealer: this.dealer,
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$dealer",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    await User.findByIdAndUpdate(this.dealer, {
      rating: Number(stats[0]?.avgRating?.toFixed(1) || 0),
      totalReviews: stats[0]?.totalReviews || 0,
    });
  } catch (err) {
    console.error("❌ REVIEW HOOK ERROR:", err);
  }
});

// =============================
// 🗑 ALSO UPDATE ON DELETE (CRITICAL 🔥)
// =============================
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  try {
    const Review = mongoose.model("Review");
    const User = mongoose.model("User");

    const stats = await Review.aggregate([
      {
        $match: {
          dealer: doc.dealer,
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$dealer",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    await User.findByIdAndUpdate(doc.dealer, {
      rating: Number(stats[0]?.avgRating?.toFixed(1) || 0),
      totalReviews: stats[0]?.totalReviews || 0,
    });
  } catch (err) {
    console.error("❌ REVIEW DELETE HOOK ERROR:", err);
  }
});

// =============================
// 🚀 SAFE EXPORT
// =============================
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
