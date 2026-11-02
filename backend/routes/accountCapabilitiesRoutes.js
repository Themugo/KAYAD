// GET /api/account/capabilities - the signed-in person's capabilities on their ONE account (read-only; nothing can be self-granted here).
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getAccountCapabilities } from "../services/accountCapabilities.service.js";

const router = express.Router();
router.get("/capabilities", protect, asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ success: true, data: await getAccountCapabilities(req.user) });
}));
export default router;
