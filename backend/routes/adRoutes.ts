import express from "express";
import Ad from "../models/Ad.ts";
import asyncHandler from "../middleware/asyncHandler.ts";

const router = express.Router();

// Public: list active ads (optionally filtered by placement)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = { isActive: true };
    if (req.query.placement) filter.placement = req.query.placement;
    const ads = await Ad.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, ads });
  }),
);

// Public: track ad click
router.post(
  "/:id/click",
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $inc: { clickCount: 1 } }, { new: false });
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true });
  }),
);

export default router;
