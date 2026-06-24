// backend/services/appeal.service.js - Appeal workflow
// ─────────────────────────────────────────────────────────────
// Handles appeal submission by disputing parties (buyer/seller)
// after a RESOLVED state, and admin review of the appeal.
// Appeals can be approved (re-opens to UNDER_REVIEW), rejected
// (stays RESOLVED → can CLOSED), or the resolution can be
// modified.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Dispute from "../models/Dispute.js";
import Evidence from "../models/Evidence.js";
import { STATES, validateTransition } from "./disputeStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import Notification from "../models/Notification.js";
import { getIO } from "../utils/io.js";

const guardSession = async (session) => {
  if (!session) return;
  try { await session.abortTransaction(); } catch {}
  try { session.endSession(); } catch {}
};

const notify = async (userId, title, message, type = "dispute") => {
  try {
    const notif = await Notification.create({ user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    logWarn("Appeal notify failed", { error: e.message });
  }
};

// =============================
// 🔄 SUBMIT APPEAL
// =============================
export const submitAppeal = async (disputeId, userId, userRole, { reason, additionalDetails }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");

    const validation = validateTransition(dispute.status, STATES.APPEALED, userRole, dispute);
    if (!validation.allowed) throw new Error(validation.reason);

    dispute.status = STATES.APPEALED;
    dispute.appealedAt = new Date();
    dispute.appeal = {
      reason,
      additionalDetails: additionalDetails || "",
      appealedBy: userId,
      appealedAt: new Date(),
      status: "pending",
    };
    dispute.addTimelineEntry({
      action: "Appeal submitted",
      actor: userId,
      fromStatus: STATES.RESOLVED,
      toStatus: STATES.APPEALED,
      note: reason,
    });

    await dispute.save({ session });
    await session.commitTransaction();
    session.endSession();

    logInfo("Appeal submitted", { disputeId, by: userId });
    return dispute;
  } catch (err) {
    await guardSession(session);
    logError("Appeal submit failed", err);
    throw err;
  }
};

// =============================
// 📎 UPLOAD APPEAL EVIDENCE
// =============================
export const uploadAppealEvidence = async ({ disputeId, userId, userRole, fileData, type, description }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== STATES.APPEALED) throw new Error("Can only add evidence during active appeal");

    const evidence = await Evidence.create(
      [{
        dispute: disputeId,
        appeal: disputeId,
        type,
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        size: fileData.size,
        url: fileData.url,
        publicId: fileData.publicId || null,
        description: description || "",
        uploadedBy: userId,
        uploadedByRole: userRole,
      }],
      { session },
    );

    dispute.evidence.push(evidence[0]._id);
    dispute.addTimelineEntry({ action: "Appeal evidence uploaded", actor: userId, note: `${type}: ${fileData.fileName}` });
    await dispute.save({ session });

    await session.commitTransaction();
    session.endSession();

    logInfo("Appeal evidence uploaded", { evidenceId: evidence[0]._id, disputeId });
    return evidence[0];
  } catch (err) {
    await guardSession(session);
    logError("Appeal evidence upload failed", err);
    throw err;
  }
};

// =============================
// ✅ REVIEW APPEAL (admin decision)
// =============================
export const reviewAppeal = async (disputeId, adminId, { decision, reviewNotes }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== STATES.APPEALED) throw new Error("Dispute is not in appealed state");
    if (!dispute.appeal || dispute.appeal.status !== "pending") throw new Error("No pending appeal to review");

    dispute.appeal.reviewedBy = adminId;
    dispute.appeal.reviewedAt = new Date();
    dispute.appeal.reviewNotes = reviewNotes || "";

    switch (decision) {
      case "approve":
        dispute.appeal.status = "approved";
        dispute.appeal.appealDecision = "overturn_resolution";
        dispute.status = STATES.UNDER_REVIEW;
        dispute.underReviewAt = new Date();
        dispute.addTimelineEntry({
          action: "Appeal approved — re-opened for review",
          actor: adminId,
          fromStatus: STATES.APPEALED,
          toStatus: STATES.UNDER_REVIEW,
          note: reviewNotes,
        });
        break;

      case "reject":
        dispute.appeal.status = "rejected";
        dispute.appeal.appealDecision = "uphold_resolution";
        dispute.status = STATES.RESOLVED;
        dispute.resolvedAt = new Date();
        dispute.addTimelineEntry({
          action: "Appeal rejected — resolution upheld",
          actor: adminId,
          fromStatus: STATES.APPEALED,
          toStatus: STATES.RESOLVED,
          note: reviewNotes,
        });
        break;

      case "modify":
        dispute.appeal.status = "approved";
        dispute.appeal.appealDecision = "modify_resolution";
        dispute.addTimelineEntry({
          action: "Appeal partially approved — resolution to be modified",
          actor: adminId,
          fromStatus: STATES.APPEALED,
          note: reviewNotes,
        });
        break;

      default:
        throw new Error(`Unknown appeal decision: ${decision}`);
    }

    await dispute.save({ session });
    await session.commitTransaction();
    session.endSession();

    await notify(dispute.openedBy, `Appeal ${decision === "approve" ? "Approved" : "Rejected"}`, `Your appeal for "${dispute.title}" has been ${decision === "approve" ? "approved and the case re-opened for review." : "rejected."}`);

    logInfo("Appeal reviewed", { disputeId, decision, by: adminId });
    return dispute;
  } catch (err) {
    await guardSession(session);
    logError("Appeal review failed", err);
    throw err;
  }
};
