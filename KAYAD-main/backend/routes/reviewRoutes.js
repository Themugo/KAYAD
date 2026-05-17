// backend/routes/reviewRoutes.js
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  createReview,
  getDealerReviews,
  getMyReviews,
  deleteReview,
} from "../controllers/reviewController.js";

const router = express.Router();

router.post("/",                         protect, asyncHandler(createReview));
router.get("/my",                        protect, asyncHandler(getMyReviews));
router.get("/dealer/:dealerId",                   asyncHandler(getDealerReviews));
router.delete("/:id",                    protect, asyncHandler(deleteReview));

export default router;
