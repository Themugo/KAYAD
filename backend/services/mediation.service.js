// backend/services/mediation.service.js - Mediation workflow
// ─────────────────────────────────────────────────────────────
// Handles mediation scheduling, outcome recording, and
// transition from UNDER_REVIEW → MEDIATION → RESOLVED.
// Mediation is optional — can be skipped from UNDER_REVIEW
// directly to RESOLVED.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Dispute from "../models/Dispute.js";
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
    logWarn("Mediation notify failed", { error: e.message });
  }
};

// =============================
// ▶️ START MEDIATION
// =============================
export const startMediation = async (disputeId, adminId, mediatorId, scheduledAt) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");

    const validation = validateTransition(dispute.status, STATES.MEDIATION, "admin", dispute);
    if (!validation.allowed) throw new Error(validation.reason);

    dispute.status = STATES.MEDIATION;
    dispute.mediationStartedAt = new Date();
    dispute.mediation = {
      scheduledAt,
      mediatorId: mediatorId || adminId,
    };
    dispute.addTimelineEntry({
      action: `Mediation started — scheduled ${scheduledAt ? new Date(scheduledAt).toISOString() : "TBD"}`,
      actor: adminId,
      fromStatus: STATES.UNDER_REVIEW,
      toStatus: STATES.MEDIATION,
    });

    await dispute.save({ session });
    await session.commitTransaction();
    session.endSession();

    await notify(dispute.openedBy, "Mediation Scheduled", `A mediation session has been scheduled for your dispute "${dispute.title}".`);
    await notify(dispute.openedAgainst, "Mediation Scheduled", `A mediation session has been scheduled for dispute "${dispute.title}".`);

    logInfo("Mediation started", { disputeId, mediatorId: mediatorId || adminId });
    return dispute;
  } catch (err) {
    await guardSession(session);
    logError("Mediation start failed", err);
    throw err;
  }
};

// =============================
// ✅ COMPLETE MEDIATION
// =============================
export const completeMediation = async (disputeId, adminId, { outcome, mediatorNotes, buyerSatisfied, sellerSatisfied }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== STATES.MEDIATION) throw new Error("Dispute is not in mediation");

    dispute.mediation.completedAt = new Date();
    dispute.mediation.mediatorNotes = mediatorNotes || "";
    dispute.mediation.outcome = outcome || "impasse";
    dispute.mediation.resolvedByMediation = outcome !== "impasse";
    dispute.mediation.buyerSatisfied = buyerSatisfied || false;
    dispute.mediation.sellerSatisfied = sellerSatisfied || false;

    dispute.addTimelineEntry({
      action: `Mediation completed — outcome: ${outcome || "impasse"}`,
      actor: adminId,
      note: mediatorNotes,
    });

    await dispute.save({ session });
    await session.commitTransaction();
    session.endSession();

    logInfo("Mediation completed", { disputeId, outcome });
    return dispute;
  } catch (err) {
    await guardSession(session);
    logError("Mediation complete failed", err);
    throw err;
  }
};

// =============================
// 📋 GET MEDIATION STATUS
// =============================
export const getMediationStatus = async (disputeId) => {
  const dispute = await Dispute.findById(disputeId)
    .select("status mediation timeline")
    .populate("mediation.mediatorId", "name email");
  if (!dispute) throw new Error("Dispute not found");
  return dispute;
};
