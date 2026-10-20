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
  deriveDealerOnboardingStage,
} from "../services/dealerVerificationService.js";
import { sendNotification } from "../services/notification.service.js";
import { logInfo, logError } from "../utils/logger.js";

const maskPhone = (phone) => String(phone || "").replace(/(\d{3})\d{6}(\d{2})/, "$1******$2");

export const submitVerification = async (req, res) => {
  try {
    const result = await submitDealerVerification(req.user.id, req.body?.documents || {});
    // STAGE 5: acknowledge the APPLICATION (received ≠ verified email ≠ approved). Best effort: a
    // notification failure never turns a saved application into an error.
    await sendNotification({
      userId: req.user.id,
      title: "Dealer application received",
      message: "We've received your dealer application. It is now waiting for review — you will be notified of the decision. Receiving your application does not mean your dealer account is approved yet.",
      type: "verification",
    }).catch((e) => logError("Dealer application acknowledgement failed", e));
    return res.json({ success: true, message: "Verification submitted successfully", verification: result.verification, progress: result.progress });
  } catch (err) {
    logError("Submit verification error", err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : "Failed to submit verification" });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const verification = await getDealerVerification(req.user.id);
    // STAGE 5: tell the client where the dealer is on the journey in plain, non-overlapping terms.
    const onboardingStage = deriveDealerOnboardingStage({ emailVerified: req.user.emailVerified === true, verification });
    if (!verification) return res.json({ success: true, verificationStatus: "none", onboardingStage, message: "No verification submitted" });
    return res.json({ success: true, verification, onboardingStage, progress: getVerificationProgress(verification) });
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
    if (!/^(?:\+?254|0)?7\d{8}$/.test(phoneNumber))  /* STAGE 5C: registration stores 2547XXXXXXXX (no "+"), which the old pattern rejected for every registered dealer */ return res.status(400).json({ success: false, message: "Invalid Kenyan phone number format" });
    const result = await requestDealerOtp(req.user.id, phoneNumber);
    return res.json({ success: true, message: "Verification code sent", expiresAt: result.expiresAt, phoneNumber: maskPhone(phoneNumber) });
  } catch (err) {
    logError("Request phone verification error", err);
    if (err?.code === "OTP_DELIVERY_UNAVAILABLE") return res.status(503).json({ success: false, message: "We couldn't send a verification code right now. Please try again shortly." });
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
        // Dealer approval and listing approval are separate decisions.
        // Mark the dealer trust attribute, but never publish pending inventory as a side effect
        // of approving the business. Each listing must pass its own moderation/readiness workflow.
        await updateMany("cars", { dealer: targetUserId }, { isVerifiedDealer: true });
      }
    }
    return res.json({ success: true, message: message.success, verification });
  } catch (err) {
    logError(`Verification transition ${status} failed`, err);
    return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : `Failed to ${status} verification` });
  }
};

export const approveVerification = (req, res) => transition(req, res, "approved", {
  success: "Verification approved successfully", title: "Verification Approved", body: () => "Your dealer application has been approved. Your listings are published according to the platform\'s listing review process.",
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
