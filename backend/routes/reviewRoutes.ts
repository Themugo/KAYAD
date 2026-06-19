import express from "express";
import { protect } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { validate, validateObjectId } from "../middleware/validate.ts";
import { reviewLimiter } from "../middleware/rateLimiter.ts";
import { createReviewSchema } from "../validation/platform.schema.ts";
import { createReview, getDealerReviews, getMyReviews, deleteReview } from "../controllers/reviewController.ts";

const router = express.Router();

router.post("/", protect, reviewLimiter, validate(createReviewSchema), asyncHandler(createReview));
router.get("/my", protect, asyncHandler(getMyReviews));
router.get("/dealer/:dealerId", asyncHandler(getDealerReviews));
router.delete("/:id", protect, asyncHandler(deleteReview));

export default router;
