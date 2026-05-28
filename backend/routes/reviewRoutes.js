import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate, validateObjectId } from "../middleware/validate.js";
import { reviewLimiter } from "../middleware/rateLimiter.js";
import { createReviewSchema } from "../validation/platform.schema.js";
import {
  createReview,
  getDealerReviews,
  getMyReviews,
  deleteReview,
} from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", protect, reviewLimiter, validate(createReviewSchema), asyncHandler(createReview));
router.get("/my", protect, asyncHandler(getMyReviews));
router.get("/dealer/:dealerId", asyncHandler(getDealerReviews));
router.delete("/:id", protect, asyncHandler(deleteReview));

export default router;
