import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/User.js";
import Referral from "../models/Referral.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

router.get(
  "/stats",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [user, referralCount, totalEarned, recentReferrals] = await Promise.all([
      User.findById(userId).select("referralCode credits referralEarnings referralCount").lean(),
      Referral.countDocuments({ referrer: userId, status: "credited" }),
      Transaction.aggregate([
        { $match: { user: userId, type: "referral_bonus", status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Referral.find({ referrer: userId })
        .populate("referee", "name email createdAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.json({
      success: true,
      stats: {
        referralCode: user?.referralCode || "",
        credits: user?.credits || 0,
        referralEarnings: user?.referralEarnings || 0,
        referralCount: user?.referralCount || 0,
        totalBonus: totalEarned[0]?.total || 0,
        recentReferrals: recentReferrals.map((r) => ({
          _id: r._id,
          name: r.referee?.name || "User",
          joined: r.referee?.createdAt,
          status: r.status,
          bonusAmount: r.bonusAmount,
          createdAt: r.createdAt,
        })),
      },
    });
  }),
);

router.get(
  "/code",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("referralCode");
    res.json({ success: true, referralCode: user?.referralCode || "" });
  }),
);

export default router;
