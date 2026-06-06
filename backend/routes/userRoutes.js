import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import User from "../models/User.js";

const router = express.Router();

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q, role, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { businessName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select("name email avatar businessName role location dealerRating")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await User.countDocuments(filter);

    res.json({ success: true, users, total });
  }),
);

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  }),
);

router.put(
  "/settings",
  protect,
  asyncHandler(async (req, res) => {
    const allowed = ["notifications", "visibility", "language", "currency", "timezone"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "notifications" && typeof req.body[key] === "object") {
          for (const sub of ["email", "sms", "inApp"]) {
            if (req.body[key][sub] !== undefined) {
              updates[`notifications.${sub}`] = req.body[key][sub];
            }
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid settings provided" });
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password").lean();
    res.json({ success: true, user });
  }),
);

router.get(
  "/:id",
  validateObjectId,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select("name email avatar businessName location phone role dealerRating bio createdAt verifiedBuyer")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  }),
);

// =============================
// ✅ BANK PRE-APPROVAL (VERIFIED BUYER BADGE)
// =============================
router.post(
  "/bank-pre-approval",
  protect,
  asyncHandler(async (req, res) => {
    const { documentUrl, bankName, approvedAmount } = req.body;
    if (!documentUrl || !bankName || !approvedAmount) {
      return res.status(400).json({ success: false, message: "Document URL, bank name, and approved amount required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        verifiedBuyer: false,
        "bankPreApproval.documentUrl": documentUrl,
        "bankPreApproval.bankName": bankName,
        "bankPreApproval.approvedAmount": Number(approvedAmount),
        "bankPreApproval.expiresAt": null,
        "bankPreApproval.verifiedAt": null,
        "bankPreApproval.verifiedBy": null,
      },
      { new: true },
    ).select("-password");
    res.json({ success: true, message: "Pre-approval documents submitted for admin verification", user });
  }),
);

// =============================
// 🔄 REMOVE BANK PRE-APPROVAL
// =============================
router.delete(
  "/bank-pre-approval",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        verifiedBuyer: false,
        bankPreApproval: { documentUrl: "", bankName: "", approvedAmount: 0, expiresAt: null },
      },
      { new: true },
    ).select("-password");
    res.json({ success: true, user });
  }),
);

router.use((req, res) => {
  res.status(404).json({ success: false, message: "User route not found" });
});

export default router;
