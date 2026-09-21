// KAYAD canonical dealer verification controller.
// All persistence goes through dealerVerificationService + db adapter.
import { findById, findAll, updateMany } from "../db/index.js";
import {
  submitDealerVerification,
  getDealerVerification,
  requestDealerOtp,
  verifyDealerOtp,
  listDealerVerifications,
  transitionDealerVerification,
  getVerificationProgress,
} from "../services/dealerVerificationService.js";
import { sendNotification } from "../services/notification.service.js";
import { logInfo, logError } from "../utils/logger.js";

const maskPhone = (phone) => String(phone || "").replace(/(\d{3})\d{6}(\d{2})/, "$1******$2");

export const submitVerification = async (req, res) => {
  try {
    const result = await submitDealerVerification(req.user.id, req.body?.documents || {});
    return res.json({ success: true, message: "Verification submitted successfully", verification: result.verification, progress: result.progress });
  } catch (err) {
    logError("Submit verification error", err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : "Failed to submit verification" });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const verification = await getDealerVerification(req.user.id);
    if (!verification) return res.json({ success: true, verificationStatus: "none", message: "No verification submitted" });
    return res.json({ success: true, verification, progress: getVerificationProgress(verification) });
  } catch (err) {
    logError("Get verification status error", err);
    return res.status(500).json({ success: false, message: "Failed to get verification status" });
  }
};

export const requestPhoneVerification = async (req, res) => {
  try {
    const user = await findById("users", req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const phoneNumber = String(user.phone || req.body?.phoneNumber || "").trim();
    if (!phoneNumber) return res.status(400).json({ success: false, message: "Phone number required" });
    if (!/^(\+254|0)?7\d{8}$/.test(phoneNumber)) return res.status(400).json({ success: false, message: "Invalid Kenyan phone number format" });
    const result = await requestDealerOtp(req.user.id, phoneNumber);
    return res.json({ success: true, message: "Verification code sent", expiresAt: result.expiresAt, phoneNumber: maskPhone(phoneNumber) });
  } catch (err) {
    logError("Request phone verification error", err);
    return res.status(err.statusCode || 502).json({ success: false, message: err.statusCode ? err.message : "Failed to send verification code" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const otp = String(req.body?.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Enter a valid 6-digit code" });
    const result = await verifyDealerOtp(req.user.id, otp);
    if (!result.valid) return res.status(400).json({ success: false, message: "Invalid verification code", remainingAttempts: result.remainingAttempts });
    await updateMany("users", { id: req.user.id }, { phoneVerified: true });
    return res.json({ success: true, message: "Phone verified successfully", verification: result.verification });
  } catch (err) {
    logError("Verify OTP error", err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : "Failed to verify phone" });
  }
};

export const getAllVerifications = async (req, res) => {
  try {
    const result = await listDealerVerifications(req.query || {});
    return res.json({ success: true, verifications: result.items, pagination: result.pagination });
  } catch (err) {
    logError("Get all verifications error", err);
    return res.status(500).json({ success: false, message: "Failed to get verifications" });
  }
};

export const getVerificationById = async (req, res) => {
  try {
    const verification = await findById("dealer_verifications", req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });
    return res.json({ success: true, verification, progress: getVerificationProgress(verification) });
  } catch (err) {
    logError("Get verification by ID error", err);
    return res.status(500).json({ success: false, message: "Failed to get verification" });
  }
};

const transition = async (req, res, status, message) => {
  try {
    const verification = await transitionDealerVerification(req.params.id, status, req.user.id, req.body || {});
    const targetUserId = verification.user;
    if (targetUserId) {
      const userStatus = status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "suspended" ? "suspended" : null;
      if (userStatus) await updateMany("users", { id: targetUserId }, { status: userStatus });
      await sendNotification({ userId: targetUserId, title: message.title, message: message.body(verification), type: "verification" }).catch((e) => logError("Verification notification failed", e));
      if (status === "approved") {
        await updateMany("cars", { dealer: targetUserId, status: "pending" }, { status: "available", isVerifiedDealer: true });
      }
    }
    return res.json({ success: true, message: message.success, verification });
  } catch (err) {
    logError(`Verification transition ${status} failed`, err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : `Failed to ${status} verification` });
  }
};

export const approveVerification = (req, res) => transition(req, res, "approved", {
  success: "Verification approved successfully", title: "Verification Approved", body: () => "Your dealer verification has been approved. Your pending listings are now eligible for publication.",
});
export const rejectVerification = (req, res) => transition(req, res, "rejected", {
  success: "Verification rejected", title: "Verification Rejected", body: (v) => `Your dealer verification was rejected: ${v.rejectionReason || "Please update your documents and resubmit."}`,
});
export const suspendDealer = (req, res) => transition(req, res, "suspended", {
  success: "Dealer suspended successfully", title: "Account Suspended", body: (v) => `Your dealer account has been suspended: ${v.suspensionReason || "See your account for details."}`,
});
export const reinstateDealer = (req, res) => transition(req, res, "approved", {
  success: "Dealer reinstated successfully", title: "Account Reinstated", body: () => "Your dealer account has been reinstated. You can resume normal operations.",
});
