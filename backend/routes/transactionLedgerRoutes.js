import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getUserTransactions,
  getTransactionByHash,
  verifyChain,
  getTransactionChain,
  createDepositTransaction,
  createWithdrawalTransaction,
  createEscrowHold,
  createEscrowRelease,
  getEscrowTransactions,
  getLedgerSummary,
  getAllTransactions,
  verifyTransaction,
} from "../controllers/transactionLedgerController.js";

const router = express.Router();

// =============================
// USER ROUTES
// =============================

// Get user's transactions
router.get("/my", protect, asyncHandler(getUserTransactions));

// Get transaction by hash
router.get("/hash/:hash", protect, asyncHandler(getTransactionByHash));

// Get ledger summary
router.get("/summary", protect, asyncHandler(getLedgerSummary));

// Create deposit transaction (internal use)
router.post("/deposit", protect, asyncHandler(createDepositTransaction));

// Create withdrawal transaction
router.post("/withdraw", protect, asyncHandler(createWithdrawalTransaction));

// Create escrow hold
router.post("/escrow/hold", protect, asyncHandler(createEscrowHold));

// Create escrow release
router.post("/escrow/release", protect, adminOnly, asyncHandler(createEscrowRelease));

// Get escrow transactions
router.get("/escrow/:escrowId", protect, asyncHandler(getEscrowTransactions));

// Get transaction chain
router.get("/chain/:ledgerId", protect, asyncHandler(getTransactionChain));

// =============================
// ADMIN ROUTES
// =============================

// Get all transactions
router.get("/admin/all", protect, adminOnly, asyncHandler(getAllTransactions));

// Verify chain integrity
router.get("/admin/verify", protect, adminOnly, asyncHandler(verifyChain));

// Verify single transaction
router.patch("/:ledgerId/verify", protect, adminOnly, asyncHandler(verifyTransaction));

export default router;
