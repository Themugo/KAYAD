// backend/middleware/dealerVerification.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Dealer verification middleware to enforce verification requirements
// Protects listing creation, auction start, escrow initiation
// ─────────────────────────────────────────────────────────────

import Dealer from "../models/Dealer.js";
import DealerVerification from "../models/DealerVerification.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Referral from "../models/Referral.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { getOnboardingPolicy } from "../services/onboardingPolicy.service.js"; // STAGE 5

// Inside a mounted Express router req.path is relative to the mount point
// (POST /api/cars arrives as "/"), so comparing it to "/cars" never matched and
// progressive access was unreachable. Use the full mounted path instead.
export const isListingCreationRequest = (req) => {
  if (req.method !== "POST") return false;
  const full = String(`${req.baseUrl || ""}${req.path || ""}` || req.originalUrl || "")
    .split("?")[0]
    .replace(/\/+$/, "");
  return /\/(cars|add-car|inventory)$/.test(full);
};

// =============================
// 🔒 REQUIRE DEALER VERIFICATION
// =============================
// Checks if dealer is verified before allowing protected operations
// Applied to: listing creation, auction start, escrow initiation
export const requireDealerVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user is a dealer
    let dealer = await Dealer.findOne({ user: userId });

    // PHASE 13D (DI-4): a private seller (individual_seller) listing their own vehicle is NOT a dealership. This
    // middleware used to INSERT an `approved: true` Dealer row for any individual_seller that reached it, whatever
    // their users.status, which silently created (and auto-approved) a dealership identity from a personal listing.
    // It no longer creates anything: a private seller with no Dealer row is let through to the listing handler (which
    // keeps its own seller email-verification / publication-review rules) with `req.dealer = null`, exactly the
    // authorization outcome the old auto-created row produced, minus the dealership record. Dealer rows that already
    // exist are neither modified nor removed here. Legitimate dealer onboarding (role `dealer`, trigger-created row,
    // verification workflow) is unchanged.
    // 13E: a personal account (role user) with an APPROVED private-seller capability (set by sellerListingAccess) is also a private seller.
    const isPrivateSeller = req.user.role === "individual_seller" || (req.user.role === "user" && req.sellerCapability?.status === "approved");

    if (!dealer && !isPrivateSeller) {
      return res.status(403).json({
        success: false,
        message: "Dealer profile not found",
        requiresAction: "create_dealer_profile",
      });
    }

    // A legacy approved flag must never override a current suspension or rejection.
    // Resolve the verification record before applying backward-compatible approval.
    const verification = await DealerVerification.findOne({ user: userId });

    if (verification?.verificationStatus === "suspended") {
      return res.status(403).json({
        success: false,
        code: "DEALER_ACCOUNT_SUSPENDED",
        message: "Dealer account is suspended and requires an explicit admin reinstatement.",
        verificationStatus: "suspended",
        suspensionReason: verification.suspensionReason || dealer?.suspensionReason || null,
        suspensionExpiresAt: verification.suspensionExpiresAt || null,
      });
    }

    if (verification?.verificationStatus === "rejected") {
      return res.status(403).json({
        success: false,
        code: "DEALER_VERIFICATION_REJECTED",
        message: "Dealer verification was rejected. Update the application and resubmit it.",
        verificationStatus: "rejected",
        requiresAction: "resubmit_verification",
        rejectionReason: verification.rejectionReason || null,
      });
    }

    // PHASE 13D: private seller without a Dealer row -> no dealership identity, listing flow continues.
    if (!dealer) {
      req.dealer = null;
      req.verification = verification || null;
      return next();
    }

    // Backward compatibility applies only when there is no newer blocking decision.
    if (dealer.approved === true && (!verification || verification.verificationStatus === "approved")) {
      req.dealer = dealer;
      req.verification = verification || null;
      return next();
    }

    if (!verification) {
      return res.status(403).json({
        success: false,
        message: "Dealer verification required",
        verificationStatus: "none",
        requiresAction: "submit_verification",
        verificationUrl: "/api/verification/submit",
      });
    }

    // Check verification status — progressive access for pending/under_review
    if (verification.verificationStatus !== "approved") {
      // STAGE 5: progressive (pre-approval) listing access exists ONLY in the owner's
      // `self_onboarding` mode. In `approval_required`/`closed` — and whenever the policy
      // cannot be trusted — an unapproved dealer cannot create listings at all.
      let progressiveAllowed = false;
      if (["pending", "under_review"].includes(verification.verificationStatus) && isListingCreationRequest(req)) {
        const onboarding = await getOnboardingPolicy();
        progressiveAllowed =
          (onboarding.source === "default" || onboarding.source === "database") &&
          onboarding.policy.dealerOnboardingMode === "self_onboarding";
      }
      // Progressive verification: allow listing creation if < 3 cars and not rejected
      if (progressiveAllowed) {
        const carCount = await Car.countDocuments({ dealer: userId });
        if (carCount < 3) {
          req.dealer = dealer;
          req.verification = verification;
          req.progressiveAccess = true;
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: getVerificationMessage(verification.verificationStatus),
        code: ["pending", "under_review"].includes(verification.verificationStatus) ? "DEALER_APPROVAL_PENDING" : undefined,
        verificationStatus: verification.verificationStatus,
        requiresAction: getRequiredAction(verification.verificationStatus),
        verificationUrl: "/api/verification/status",
        rejectionReason: verification.rejectionReason,
        progressiveLimit: 3,
        progressiveUsed: verification.verificationStatus === "pending" || verification.verificationStatus === "under_review",
      });
    }

    // Verification passed
    req.dealer = dealer;
    req.verification = verification;
    next();
  } catch (err) {
    logError("Dealer verification middleware error", err);
    return res.status(500).json({
      success: false,
      message: "Verification check failed",
    });
  }
};

// =============================
// 🔒 REQUIRE DEALER VERIFICATION (WARN ONLY)
// =============================
// Logs verification status but doesn't block requests
// Used for gradual rollout and monitoring
export const requireDealerVerificationWarn = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const dealer = await Dealer.findOne({ user: userId });
    if (!dealer) {
      logWarn("Dealer profile not found", { userId });
      req.dealer = dealer;
      return next();
    }

    if (dealer.approved === true) {
      req.dealer = dealer;
      return next();
    }

    const verification = await DealerVerification.findOne({ user: userId });

    if (!verification) {
      logWarn("Dealer verification not submitted", { userId, dealerId: dealer._id });
      req.dealer = dealer;
      return next();
    }

    if (verification.verificationStatus !== "approved") {
      logWarn("Dealer not verified", {
        userId,
        dealerId: dealer._id,
        verificationStatus: verification.verificationStatus,
        path: req.path,
      });
    }

    req.dealer = dealer;
    req.verification = verification;
    next();
  } catch (err) {
    logError("Dealer verification warn middleware error", err);
    req.dealer = null;
    next();
  }
};

// =============================
// 📋 GET VERIFICATION MESSAGE
// =============================
const getVerificationMessage = (status) => {
  const messages = {
    pending: "Your verification is pending review",
    under_review: "Your verification is under review",
    approved: "Verification approved",
    rejected: "Your verification was rejected",
    suspended: "Your account has been suspended",
  };
  return messages[status] || "Verification status unknown";
};

// =============================
// 📋 GET REQUIRED ACTION
// =============================
const getRequiredAction = (status) => {
  const actions = {
    none: "submit_verification",
    pending: "wait_for_review",
    under_review: "wait_for_review",
    approved: "none",
    rejected: "resubmit_verification",
    suspended: "contact_support",
  };
  return actions[status] || "contact_support";
};

// =============================
// 🔒 CHECK DEALER VERIFICATION STATUS
// =============================
// Helper function to check verification status without blocking
export const checkDealerVerificationStatus = async (userId) => {
  try {
    const dealer = await Dealer.findOne({ user: userId });
    if (!dealer) return { verified: false, reason: "no_dealer_profile" };

    const verification = await DealerVerification.findOne({ user: userId });

    if (verification?.verificationStatus === "suspended") {
      return { verified: false, reason: "suspended", suspensionReason: verification.suspensionReason || dealer.suspensionReason || null };
    }
    if (verification?.verificationStatus === "rejected") {
      return { verified: false, reason: "rejected", rejectionReason: verification.rejectionReason || null };
    }

    // Legacy approval is only a fallback when no newer blocking decision exists.
    if (dealer.approved === true && (!verification || verification.verificationStatus === "approved")) {
      return { verified: true, reason: verification ? "approved" : "legacy_approval" };
    }

    if (!verification) return { verified: false, reason: "no_verification" };

    if (verification.verificationStatus === "approved") {
      return { verified: true, reason: "approved" };
    }

    return {
      verified: false,
      reason: verification.verificationStatus,
      verificationStatus: verification.verificationStatus,
      rejectionReason: verification.rejectionReason,
    };
  } catch (err) {
    logError("Check dealer verification status error", err, { userId });
    return { verified: false, reason: "error" };
  }
};
