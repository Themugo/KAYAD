import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  getHeroSlides,
  getAllHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} from "../controllers/heroSlideController.js";

const router = express.Router();

// Public - every real visitor sees only currently-visible hero slides.
router.get("/", asyncHandler(getHeroSlides));

// Admin-only - the hero editor's own reads/writes, including hidden slides.
router.get("/all", protect, adminOnly, asyncHandler(getAllHeroSlides));
router.post("/", protect, adminOnly, asyncHandler(createHeroSlide));
router.put("/:id", protect, adminOnly, validateObjectId, asyncHandler(updateHeroSlide));
router.delete("/:id", protect, adminOnly, validateObjectId, asyncHandler(deleteHeroSlide));

export default router;
