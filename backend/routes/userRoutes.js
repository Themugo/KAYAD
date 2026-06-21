import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import { getPagination } from "../middleware/apiPagination.js";
import { cacheUserData, invalidateCache } from "../middleware/apiCache.js";
import { cacheDealerSearch, invalidateDealerSearchCache } from "../middleware/searchCache.js";
import { trackCarSearch } from "../middleware/searchTracking.js";
import { trackDealerSearchLatency } from "../middleware/searchLatencyTracking.js";
import User from "../models/User.js";

const router = express.Router();

router.get(
  "/search",
  cacheDealerSearch,
  trackDealerSearchLatency,
  trackCarSearch,
  asyncHandler(async (req, res) => {
    const { q, role, page = 1, limit = 20 } = req.query;
    const { page: safePage, limit: safeLimit, skip } = getPagination(req);
    const filter = {};

    if (q) {
      // Use MongoDB text index for better performance
      filter.$text = { $search: q };
    }
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email avatar businessName role location dealerRating")
        .sort({ name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  }),
);

router.get(
  "/me",
  protect,
  cacheUserData,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  }),
);

router.put(
  "/settings",
  protect,
  invalidateCache("user"),
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
  cacheUserData,
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
  invalidateCache("user"),
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
  invalidateCache("user"),
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
