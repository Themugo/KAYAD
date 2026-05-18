import express from "express";
import Ad from "../models/Ad.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = { isActive: true };
    if (req.query.placement) filter.placement = req.query.placement;
    const ads = await Ad.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, ads });
  })
);

export default router;
