// backend/controllers/verificationController.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Dealer verification controller for managing verification workflow
// Handles document submission, OTP verification, admin review
// ─────────────────────────────────────────────────────────────

import Dealer from "../models/Dealer.js";
import DealerVerification from "../models/DealerVerification.js";
import User from "../models/User.js";
import { sendSMS } from "../utils/sms.js";
import { sendNotification } from "../services/notification.service.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { logDealerVerificationSubmitted, logDealerVerificationApproved } from "../services/auditService.js";

// =============================
// 📤 SUBMIT VERIFICATION
// =============================
export const submitVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { documents } = req.body;

    // Check if dealer profile exists
    const dealer = await Dealer.findOne({ user: userId });
    if (!dealer) {
      return res.status(400).json({
        success: false,
        message: "Dealer profile required before verification",
      });
    }

    // Check if verification already exists
    let verification = await DealerVerification.findOne({ user: userId });

    if (verification) {
      // If rejected, allow resubmission
      if (verification.verificationStatus === "rejected") {
        verification.verificationStatus = "pending";
        verification.rejectionReason = null;
        verification.rejectionDetails = {};
        verification.reviewedAt = null;
        verification.reviewedBy = null;
      } else if (verification.verificationStatus !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Verification already ${verification.verificationStatus}`,
          verificationStatus: verification.verificationStatus,
        });
      }
    } else {
      verification = new DealerVerification({
        user: userId,
        dealer: dealer._id,
        verificationStatus: "pending",
      });
    }

    // Update documents
    if (documents.governmentId) {
      verification.documents.governmentId = {
        ...documents.governmentId,
        verified: false,
      };
    }

    if (documents.kraPin) {
      verification.documents.kraPin = {
        ...documents.kraPin,
        verified: false,
      };
    }

    if (documents.businessRegistration) {
      verification.documents.businessRegistration = {
        ...documents.businessRegistration,
        verified: false,
      };
    }

    if (documents.physicalAddress) {
      verification.documents.physicalAddress = {
        ...documents.physicalAddress,
        verified: false,
      };
    }

    if (documents.phoneVerification) {
      verification.documents.phoneVerification = {
        phoneNumber: documents.phoneVerification.phoneNumber,
        verified: false,
      };
    }

    verification.submittedAt = new Date();
    await verification.save();

    logInfo("Verification submitted", { userId, dealerId: dealer._id });

    // Log dealer verification submission to audit trail
    await logDealerVerificationSubmitted(verification, req.user, req);

    res.json({
      success: true,
      message: "Verification submitted successfully",
      verification,
    });
  } catch (err) {
    logError("Submit verification error", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit verification",
    });
  }
};

// =============================
// 📋 GET VERIFICATION STATUS
// =============================
export const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const verification = await DealerVerification.findOne({ user: userId }).populate("reviewedBy", "name email").lean();

    if (!verification) {
      return res.json({
        success: true,
        verificationStatus: "none",
        message: "No verification submitted",
      });
    }

    const progress = verification.getVerificationProgress ? verification.getVerificationProgress() : null;

    res.json({
      success: true,
      verification,
      progress,
    });
  } catch (err) {
    logError("Get verification status error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get verification status",
    });
  }
};

// =============================
// 📱 REQUEST PHONE VERIFICATION OTP
// =============================
export const requestPhoneVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number required",
      });
    }

    // Validate phone format
    if (!/^(\+254|0)?7\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Kenyan phone number format",
      });
    }

    let verification = await DealerVerification.findOne({ user: userId });

    if (!verification) {
      const dealer = await Dealer.findOne({ user: userId });
      if (!dealer) {
        return res.status(400).json({
          success: false,
          message: "Dealer profile required",
        });
      }

      verification = new DealerVerification({
        user: userId,
        dealer: dealer._id,
        verificationStatus: "pending",
      });
    }

    // Initialize phone verification if not exists
    if (!verification.documents.phoneVerification) {
      verification.documents.phoneVerification = {};
    }

    verification.documents.phoneVerification.phoneNumber = phoneNumber;
    verification.documents.phoneVerification.verified = false;

    // Generate OTP
    const otp = await verification.generateOTP();

    // Send OTP via SMS
    try {
      await sendSMS(phoneNumber, `Your Kayad verification code is: ${otp}. Valid for 10 minutes.`);
      logInfo("OTP sent", { userId, phoneNumber });
    } catch (smsErr) {
      logError("Failed to send OTP", smsErr, { userId, phoneNumber });
      return res.status(500).json({
        success: false,
        message: "Failed to send verification code",
      });
    }

    await verification.save();

    res.json({
      success: true,
      message: "Verification code sent",
      phoneNumber: phoneNumber.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"), // Masked
    });
  } catch (err) {
    logError("Request phone verification error", err);
    res.status(500).json({
      success: false,
      message: "Failed to request phone verification",
    });
  }
};

// =============================
// 🔐 VERIFY OTP
// =============================
export const verifyOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP required",
      });
    }

    const verification = await DealerVerification.findOne({ user: userId });

    if (!verification || !verification.documents.phoneVerification) {
      return res.status(400).json({
        success: false,
        message: "Phone verification not initiated",
      });
    }

    const isValid = await verification.verifyOTP(otp);

    if (isValid) {
      logInfo("Phone verified successfully", { userId });
      res.json({
        success: true,
        message: "Phone verified successfully",
      });
    } else {
      const attempts = verification.documents.phoneVerification.attempts;
      const remaining = 3 - attempts;

      logWarn("OTP verification failed", { userId, attempts });

      res.status(400).json({
        success: false,
        message: "Invalid verification code",
        remainingAttempts: remaining,
      });
    }
  } catch (err) {
    logError("Verify OTP error", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to verify OTP",
    });
  }
};

// =============================
// 👮 ADMIN: GET ALL VERIFICATIONS
// =============================
export const getAllVerifications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) {
      filter.verificationStatus = status;
    }

    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      DealerVerification.find(filter)
        .populate("user", "name email phone")
        .populate("dealer", "businessName location")
        .populate("reviewedBy", "name email")
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DealerVerification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      verifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all verifications error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get verifications",
    });
  }
};

// =============================
// 👮 ADMIN: GET VERIFICATION BY ID
// =============================
export const getVerificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await DealerVerification.findById(id)
      .populate("user", "name email phone")
      .populate("dealer", "businessName location")
      .populate("reviewedBy", "name email")
      .lean();

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    const progress = verification.getVerificationProgress ? verification.getVerificationProgress() : null;

    res.json({
      success: true,
      verification,
      progress,
    });
  } catch (err) {
    logError("Get verification by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get verification",
    });
  }
};

// =============================
// 👮 ADMIN: APPROVE VERIFICATION
// =============================
export const approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const verification = await DealerVerification.findById(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    // Transition status
    await verification.transitionStatus("approved", {
      reviewedBy: req.user.id,
    });

    // Update dealer approval
    const dealer = await Dealer.findById(verification.dealer);
    if (dealer) {
      dealer.approved = true;
      dealer.verifiedAt = new Date();
      await dealer.save();
    }

    // Update user status
    const user = await User.findById(verification.user);
    if (user) {
      user.status = "approved";
      await user.save();
    }

    if (adminNotes) {
      verification.adminNotes = adminNotes;
      await verification.save();
    }

    // Send notification to dealer
    await sendNotification({
      userId: verification.user,
      title: "Verification Approved",
      message: "Your dealer verification has been approved. You can now create listings and start auctions.",
      type: "verification",
    });

    logInfo("Verification approved", { verificationId: id, userId: verification.user, adminId: req.user.id });

    // Log dealer verification approval to audit trail
    await logDealerVerificationApproved(verification, req.user, req);

    res.json({
      success: true,
      message: "Verification approved successfully",
      verification,
    });
  } catch (err) {
    logError("Approve verification error", err);
    res.status(500).json({
      success: false,
      message: "Failed to approve verification",
    });
  }
};

// =============================
// 👮 ADMIN: REJECT VERIFICATION
// =============================
export const rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, rejectionDetails, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason required",
      });
    }

    const verification = await DealerVerification.findById(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    // Transition status
    await verification.transitionStatus("rejected", {
      reviewedBy: req.user.id,
      rejectionReason,
      rejectionDetails: rejectionDetails || {},
    });

    if (adminNotes) {
      verification.adminNotes = adminNotes;
      await verification.save();
    }

    // Update user status
    const user = await User.findById(verification.user);
    if (user) {
      user.status = "rejected";
      await user.save();
    }

    // Send notification to dealer
    await sendNotification({
      userId: verification.user,
      title: "Verification Rejected",
      message: `Your dealer verification was rejected: ${rejectionReason}. Please update your documents and resubmit.`,
      type: "verification",
    });

    logInfo("Verification rejected", {
      verificationId: id,
      userId: verification.user,
      adminId: req.user.id,
      reason: rejectionReason,
    });

    res.json({
      success: true,
      message: "Verification rejected",
      verification,
    });
  } catch (err) {
    logError("Reject verification error", err);
    res.status(500).json({
      success: false,
      message: "Failed to reject verification",
    });
  }
};

// =============================
// 👮 ADMIN: SUSPEND DEALER
// =============================
export const suspendDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspensionReason, suspensionDays = 30, adminNotes } = req.body;

    if (!suspensionReason) {
      return res.status(400).json({
        success: false,
        message: "Suspension reason required",
      });
    }

    const verification = await DealerVerification.findById(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    const suspensionExpiresAt = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);

    // Transition status
    await verification.transitionStatus("suspended", {
      suspensionReason,
      suspensionExpiresAt,
    });

    if (adminNotes) {
      verification.adminNotes = adminNotes;
      await verification.save();
    }

    // Update dealer
    const dealer = await Dealer.findById(verification.dealer);
    if (dealer) {
      dealer.isSuspended = true;
      dealer.suspensionReason = suspensionReason;
      await dealer.save();
    }

    // Update user status
    const user = await User.findById(verification.user);
    if (user) {
      user.status = "suspended";
      await user.save();
    }

    // Send notification to dealer
    await sendNotification({
      userId: verification.user,
      title: "Account Suspended",
      message: `Your dealer account has been suspended: ${suspensionReason}. Suspension expires: ${suspensionExpiresAt.toLocaleDateString()}`,
      type: "verification",
    });

    logInfo("Dealer suspended", {
      verificationId: id,
      userId: verification.user,
      adminId: req.user.id,
      reason: suspensionReason,
      expiresAt: suspensionExpiresAt,
    });

    res.json({
      success: true,
      message: "Dealer suspended successfully",
      verification,
    });
  } catch (err) {
    logError("Suspend dealer error", err);
    res.status(500).json({
      success: false,
      message: "Failed to suspend dealer",
    });
  }
};

// =============================
// 👮 ADMIN: REINSTATE DEALER
// =============================
export const reinstateDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const verification = await DealerVerification.findById(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    // Transition status back to approved
    await verification.transitionStatus("approved", {
      reviewedBy: req.user.id,
    });

    verification.suspensionReason = null;
    verification.suspensionExpiresAt = null;

    if (adminNotes) {
      verification.adminNotes = adminNotes;
    }

    await verification.save();

    // Update dealer
    const dealer = await Dealer.findById(verification.dealer);
    if (dealer) {
      dealer.isSuspended = false;
      dealer.suspensionReason = null;
      await dealer.save();
    }

    // Update user status
    const user = await User.findById(verification.user);
    if (user) {
      user.status = "approved";
      await user.save();
    }

    // Send notification to dealer
    await sendNotification({
      userId: verification.user,
      title: "Account Reinstated",
      message: "Your dealer account has been reinstated. You can resume normal operations.",
      type: "verification",
    });

    logInfo("Dealer reinstated", { verificationId: id, userId: verification.user, adminId: req.user.id });

    res.json({
      success: true,
      message: "Dealer reinstated successfully",
      verification,
    });
  } catch (err) {
    logError("Reinstate dealer error", err);
    res.status(500).json({
      success: false,
      message: "Failed to reinstate dealer",
    });
  }
};
