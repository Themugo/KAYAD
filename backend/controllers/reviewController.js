// backend/controllers/reviewController.js
import mongoose from "mongoose";
import Review from "../models/Review.js";
import User from "../models/User.js";

// POST /api/reviews (Phase 2 Transaction Support)
export const createReview = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { dealer, rating, comment, carId } = req.body;

    if (!dealer || !rating || !comment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "dealer, rating and comment are required" });
    }

    const existing = await Review.findOne({ user: req.user.id, dealer }).session(session);
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "You have already reviewed this dealer" });
    }

    const review = await Review.create([{
      user: req.user.id,
      dealer,
      car: carId || undefined,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment.trim(),
    }], { session });

    // Update dealer average rating
    const reviews = await Review.find({ dealer }).session(session);
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await User.findByIdAndUpdate(dealer, { dealerRating: Math.round(avg * 10) / 10, reviewCount: reviews.length }).session(session);

    await session.commitTransaction();
    session.endSession();

    await review[0].populate("user", "name");

    res.status(201).json({ success: true, review: review[0] });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ createReview error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create review" });
  }
};

// GET /api/reviews/dealer/:dealerId
export const getDealerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ dealer: req.params.dealerId }).populate("user", "name").sort({ createdAt: -1 });

    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    res.json({ success: true, reviews, averageRating: Math.round(avg * 10) / 10, total: reviews.length });
  } catch (err) {
    console.error("❌ getDealerReviews error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// GET /api/reviews/my
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate("dealer", "name businessName")
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("❌ getMyReviews error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// DELETE /api/reviews/:id
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const isOwner = review.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const dealerId = review.dealer;
    await review.deleteOne();

    // Recalculate dealer rating
    const remaining = await Review.find({ dealer: dealerId });
    if (remaining.length > 0) {
      const avg = remaining.reduce((s, r) => s + r.rating, 0) / remaining.length;
      await User.findByIdAndUpdate(dealerId, {
        dealerRating: Math.round(avg * 10) / 10,
        reviewCount: remaining.length,
      });
    } else {
      await User.findByIdAndUpdate(dealerId, { dealerRating: 0, reviewCount: 0 });
    }

    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    console.error("❌ deleteReview error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};
