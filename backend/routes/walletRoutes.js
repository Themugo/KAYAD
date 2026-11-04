import express from "express";
import { protect, adminOnly, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getWallet, refundHold, withdraw } from "../services/auctionWallet.service.js";
import { saveDealerPaymentAccount, getDealerPaymentAccount, reviewDealerPaymentAccount, listDealerPaymentAccounts } from "../services/dealerPaymentAccount.service.js";

const router = express.Router();

router.get("/", protect, asyncHandler(async (req, res) => res.json({ success: true, wallet: await getWallet(req.user.id) })));

// Loser chooses: keep the refunded commitment in the wallet, or have it sent to their own M-Pesa number.
router.post("/refunds/:holdId", protect, asyncHandler(async (req, res) => {
  const result = await refundHold({ holdId: req.params.holdId, userId: req.user.id, destination: req.body?.destination || "wallet" });
  res.json({ success: true, refund: result });
}));

router.post("/withdraw", protect, asyncHandler(async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(422).json({ success: false, message: "Enter a valid amount" });
  const key = typeof req.body?.idempotencyKey === "string" ? `wd:${req.user.id}:${req.body.idempotencyKey.slice(0, 64)}` : null;
  res.json({ success: true, withdrawal: await withdraw({ userId: req.user.id, amount, key }) });
}));

// Dealer's own collection account (paybill/till). Never returns credentials.
router.get("/dealer-account", protect, allowRoles("dealer"), asyncHandler(async (req, res) => res.json({ success: true, account: await getDealerPaymentAccount(req.user.id) })));
router.put("/dealer-account", protect, allowRoles("dealer"), asyncHandler(async (req, res) => res.json({ success: true, account: await saveDealerPaymentAccount({ user: req.user, body: req.body || {} }) })));
router.get("/dealer-accounts", protect, adminOnly, asyncHandler(async (req, res) => res.json({ success: true, accounts: await listDealerPaymentAccounts({ status: req.query.status || "pending" }) })));
router.post("/dealer-account/:id/review", protect, adminOnly, asyncHandler(async (req, res) =>
  res.json({ success: true, account: await reviewDealerPaymentAccount({ accountId: req.params.id, adminId: req.user.id, decision: req.body?.decision }) })));

export default router;
