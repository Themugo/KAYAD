import { Router } from "express";
import { authLimiter } from "../middleware/rateLimiter.js";

import authRoutes from "./authRoutes.js";
import carRoutes from "./carRoutes.js";
import bidRoutes from "./bidRoutes.js";
import dealerRoutes from "./dealerRoutes.js";
import adminRoutes from "./adminRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import escrowRoutes from "./escrowRoutes.js";
import chatRoutes from "./chatRoutes.js";
import favoriteRoutes from "./favoriteRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import auctionRoutes from "./auctionRoutes.js";
import auctionAdminRoutes from "./auctionAdminRoutes.js";
import adRoutes from "./adRoutes.js";
import userRoutes from "./userRoutes.js";
import savedSearchRoutes from "./savedSearchRoutes.js";
import ntsaVerificationRoutes from "./ntsaVerificationRoutes.js";
import inspectionRoutes from "./inspectionRoutes.js";
import escrowVaultRoutes from "./escrowVaultRoutes.js";
import securityLogRoutes from "./securityLogRoutes.js";
import smsBiddingRoutes from "./smsBiddingRoutes.js";
import inspectorApplicationRoutes from "./inspectorApplicationRoutes.js";
import referralRoutes from "./referralRoutes.js";
import contactRoutes from "./contactRoutes.js";
import marketRoutes from "./marketRoutes.js";
import biddingSecurityRoutes from "./biddingSecurityRoutes.js";
import bidLogRoutes from "./bidLogRoutes.js";
import transactionLedgerRoutes from "./transactionLedgerRoutes.js";
import localizationRoutes from "./localizationRoutes.js";
import userPreferenceRoutes from "./userPreferenceRoutes.js";

const router = Router();

router.use("/auth", authLimiter, authRoutes);
router.use("/cars", carRoutes);
router.use("/bids", bidRoutes);
router.use("/dealer", dealerRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);
router.use("/escrow", escrowRoutes);
router.use("/chat", chatRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reviews", reviewRoutes);
router.use("/transactions", transactionRoutes);
router.use("/auction-admin", auctionAdminRoutes);
router.use("/auctions", auctionRoutes);
router.use("/ads", adRoutes);
router.use("/users", userRoutes);
router.use("/saved-searches", savedSearchRoutes);
router.use("/ntsa-verification", ntsaVerificationRoutes);
router.use("/inspections", inspectionRoutes);
router.use("/escrow-vault", escrowVaultRoutes);
router.use("/security-logs", securityLogRoutes);
router.use("/sms-bidding", smsBiddingRoutes);
router.use("/inspector-applications", inspectorApplicationRoutes);
router.use("/referral", referralRoutes);
router.use("/contact", contactRoutes);
router.use("/market", marketRoutes);

// Bidding Security & Deposits
router.use("/bidding-security", biddingSecurityRoutes);

// Bid Logs
router.use("/bid-logs", bidLogRoutes);

// Transaction Ledger (Immutable)
router.use("/ledger", transactionLedgerRoutes);

// Localization / i18n
router.use("/localization", localizationRoutes);

// User Preferences (Dark Mode, etc.)
router.use("/preferences", userPreferenceRoutes);

export default router;
