import asyncHandler from "../middleware/asyncHandler.js";
import BidderDeposit from "../models/BidderDeposit.js";
import BidLog from "../models/BidLog.js";
import Escrow from "../models/Escrow.js";
import User from "../models/User.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import crypto from "crypto";

// =============================
// 🔐 BIDDER VERIFICATION STATUS
// =============================
export const getBidderStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [deposits, user] = await Promise.all([
    BidderDeposit.find({ user: userId }).sort({ createdAt: -1 }),
    User.findById(userId).select("email phone kycStatus verificationStatus"),
  ]);

  const activeDeposit = deposits.find((d) => d.isActive);
  const latestDeposit = deposits[0];

  const hasVerifiedDeposit = !!activeDeposit;
  const kycLevel = activeDeposit?.kycLevel || 0;
  const tier = activeDeposit?.tier || "none";
  const biometricVerified = activeDeposit?.biometricVerified || false;

  // Determine bidding permissions
  const permissions = {
    canBid: hasVerifiedDeposit,
    canAutoBid: hasVerifiedDeposit && tier === "premium",
    canProxyBid: hasVerifiedDeposit,
    maxBidAmount: hasVerifiedDeposit ? getMaxBidAmount(kycLevel, tier) : 0,
    minDepositRequired: hasVerifiedDeposit ? 0 : getRequiredDeposit(tier),
  };

  res.json({
    success: true,
    data: {
      verified: hasVerifiedDeposit,
      tier,
      kycLevel,
      biometricVerified,
      permissions,
      activeDeposit: activeDeposit
        ? {
            id: activeDeposit._id,
            amount: activeDeposit.amount,
            currency: activeDeposit.currency,
            tier: activeDeposit.tier,
            expiresAt: activeDeposit.expiresAt,
            verifiedAt: activeDeposit.verifiedAt,
          }
        : null,
      depositsCount: deposits.length,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        kycStatus: user.kycStatus,
        verificationStatus: user.verificationStatus,
      },
    },
  });
});

// =============================
// 💰 CREATE DEPOSIT REQUEST
// =============================
export const createDeposit = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount, paymentMethod, tier = "basic" } = req.body;

  // Validate amount
  const requiredAmount = getRequiredDeposit(tier);
  if (amount < requiredAmount) {
    return res.status(400).json({
      success: false,
      message: `Minimum deposit for ${tier} tier is KES ${requiredAmount.toLocaleString()}`,
    });
  }

  // Check for existing pending deposit
  const existingPending = await BidderDeposit.findOne({
    user: userId,
    status: "pending",
  });

  if (existingPending) {
    return res.status(400).json({
      success: false,
      message: "You already have a pending deposit. Please wait for it to process.",
      depositId: existingPending._id,
    });
  }

  const deposit = await BidderDeposit.create({
    user: userId,
    amount,
    tier,
    paymentMethod,
    status: "pending",
  });

  logInfo("Deposit request created", {
    userId,
    depositId: deposit._id,
    amount,
    tier,
    paymentMethod,
  });

  res.status(201).json({
    success: true,
    message: "Deposit request created. Please complete payment.",
    data: {
      depositId: deposit._id,
      reference: deposit.paymentReference,
      amount,
      currency: "KES",
      paymentMethod,
      expiresAt: deposit.expiresAt,
      paymentInstructions: getPaymentInstructions(paymentMethod),
    },
  });
});

// =============================
// 📋 VERIFY DEPOSIT PAYMENT
// =============================
export const verifyDeposit = asyncHandler(async (req, res) => {
  const { depositId } = req.params;
  const { receiptNumber, transactionId } = req.body;

  const deposit = await BidderDeposit.findById(depositId);
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Deposit not found",
    });
  }

  if (deposit.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // Verify payment
  const verified = await verifyPayment(deposit, receiptNumber, transactionId);

  if (verified) {
    deposit.status = "verified";
    deposit.verifiedAt = new Date();
    deposit.verifiedBy = req.user.id;
    deposit.mpesaReceiptNumber = receiptNumber || transactionId;
    await deposit.save();

    logInfo("Deposit verified", {
      depositId: deposit._id,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "Deposit verified successfully",
      data: {
        verified: true,
        tier: deposit.tier,
        kycLevel: deposit.kycLevel,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Payment verification failed",
    });
  }
});

// =============================
// 📊 GET USER'S DEPOSITS
// =============================
export const getUserDeposits = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { user: userId };
  if (status) query.status = status;

  const [deposits, total] = await Promise.all([
    BidderDeposit.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    BidderDeposit.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: deposits,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// =============================
// 🔑 BIOMETRIC VERIFICATION
// =============================
export const verifyBiometric = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { biometricToken, verificationCode } = req.body;

  // In production, this would integrate with a biometric service
  // For now, we'll simulate verification
  const isValidBiometric = biometricToken && verificationCode;

  if (!isValidBiometric) {
    return res.status(400).json({
      success: false,
      message: "Invalid biometric verification data",
    });
  }

  // Find user's active deposit
  const deposit = await BidderDeposit.findOne({
    user: userId,
    status: "verified",
  });

  if (!deposit) {
    return res.status(400).json({
      success: false,
      message: "No verified deposit found. Please complete deposit first.",
    });
  }

  // Simulate biometric verification
  const verified = await simulateBiometricVerification(biometricToken, verificationCode);

  if (verified) {
    deposit.biometricVerified = true;
    deposit.biometricVerifiedAt = new Date();
    deposit.kycLevel = Math.min(deposit.kycLevel + 1, 5);
    await deposit.save();

    logInfo("Biometric verified", { userId, depositId: deposit._id });

    res.json({
      success: true,
      message: "Biometric verification successful",
      data: {
        verified: true,
        kycLevel: deposit.kycLevel,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Biometric verification failed",
    });
  }
});

// =============================
// 🛡️ CHECK BID AUTHORIZATION
// =============================
export const checkBidAuthorization = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { carId, amount } = req.params;

  const [deposit, escrow, car] = await Promise.all([
    BidderDeposit.findOne({ user: userId, status: "verified" }),
    Escrow.findOne({ user: userId, status: "active" }),
    Car.findById(carId).select("price currentBid reservePrice"),
  ]);

  if (!car) {
    return res.status(404).json({
      success: false,
      message: "Car not found",
    });
  }

  const isAuthorized = !!deposit;
  const hasEscrow = escrow && escrow.balance >= amount;

  let maxBidAmount = 0;
  if (deposit) {
    maxBidAmount = getMaxBidAmount(deposit.kycLevel, deposit.tier);
  }

  res.json({
    success: true,
    data: {
      authorized: isAuthorized,
      hasEscrowBalance: hasEscrow,
      requirements: {
        verifiedDeposit: !deposit ? "Required" : "Met",
        escrowBalance: hasEscrow ? "Sufficient" : "Insufficient",
      },
      limits: {
        maxBidAmount,
        currentPrice: car.currentBid || car.price,
        reserveMet: car.currentBid >= car.reservePrice,
      },
      actions: {
        needsDeposit: !deposit ? { type: "deposit", url: "/deposit" } : null,
        needsEscrow: !hasEscrow ? { type: "escrow", url: "/escrow/deposit" } : null,
      },
    },
  });
});

// =============================
// ADMIN: APPROVE/REJECT DEPOSIT
// =============================
export const manageDeposit = asyncHandler(async (req, res) => {
  const { depositId } = req.params;
  const { action, rejectionReason } = req.body;

  const deposit = await BidderDeposit.findById(depositId);
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Deposit not found",
    });
  }

  if (action === "approve") {
    deposit.status = "verified";
    deposit.verifiedAt = new Date();
    deposit.verifiedBy = req.user.id;
  } else if (action === "reject") {
    deposit.status = "rejected";
    deposit.rejectionReason = rejectionReason;
    deposit.verifiedBy = req.user.id;
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid action. Use 'approve' or 'reject'",
    });
  }

  await deposit.save();

  logInfo("Deposit managed", {
    depositId: deposit._id,
    action,
    adminId: req.user.id,
  });

  res.json({
    success: true,
    message: `Deposit ${action}d successfully`,
    data: deposit,
  });
});

// =============================
// ADMIN: GET ALL DEPOSITS
// =============================
export const getAllDeposits = asyncHandler(async (req, res) => {
  const { status, tier, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (tier) query.tier = tier;

  const [deposits, total] = await Promise.all([
    BidderDeposit.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    BidderDeposit.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: deposits,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// =============================
// HELPER FUNCTIONS
// =============================

function getRequiredDeposit(tier) {
  return tier === "premium" ? 50000 : 10000;
}

function getMaxBidAmount(kycLevel, tier) {
  const baseLimits = {
    basic: 500000,
    premium: 2000000,
  };
  const multiplier = 1 + (kycLevel - 1) * 0.25;
  return Math.floor(baseLimits[tier] * multiplier);
}

function getPaymentInstructions(method) {
  const instructions = {
    mpesa: {
      title: "M-Pesa Payment",
      steps: [
        "Go to M-Pesa menu on your phone",
        "Select Lipa na M-Pesa",
        "Choose Pay Bill",
        "Enter Business Number: 123456",
        "Enter Account Number: Your payment reference",
        "Enter Amount",
        "Confirm and enter your PIN",
      ],
    },
    bank_wire: {
      title: "Bank Transfer",
      accountName: "KAYAD Motors Limited",
      accountNumber: "1234567890",
      bankName: "Equity Bank Kenya",
      branchCode: "001",
    },
    card: {
      title: "Card Payment",
      redirectUrl: "/payment/card",
    },
  };
  return instructions[method] || {};
}

async function verifyPayment(deposit, receiptNumber, transactionId) {
  // In production, this would verify with M-Pesa or bank API
  // For simulation, we'll accept any receipt number with 10+ digits
  if (receiptNumber && receiptNumber.length >= 10) {
    return true;
  }
  if (transactionId && transactionId.length >= 10) {
    return true;
  }
  return false;
}

async function simulateBiometricVerification(token, code) {
  // In production, this would call biometric service API
  // Simulate successful verification
  return token && code && code.length >= 4;
}
