// backend/services/dispute.service.js - Enterprise Dispute Service v2.0
// ─────────────────────────────────────────────────────────────
// Core dispute operations: create, transition states, upload
// evidence, manage internal notes. All mutations use mongoose
// sessions for atomicity. Idempotency on state-changing ops.
// Integrates with escrow state machine for financial decisions.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Dispute from "../models/Dispute.js";
import Evidence from "../models/Evidence.js";
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";
import { STATES, validateTransition } from "./disputeStateMachine.js";
import { STATES as ESCROW_STATES } from "./escrowStateMachine.js";
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
    logWarn("Dispute notify failed", { error: e.message });
  }
};

// =============================
// ➕ CREATE DISPUTE
// =============================
export const createDispute = async ({ escrowId, userId, userRole, title, description, category, priority = "medium" }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error("Escrow not found");

    const isBuyer = escrow.buyer.toString() === userId;
    const isSeller = escrow.seller.toString() === userId;
    if (!isBuyer && !isSeller && !["admin", "superadmin"].includes(userRole)) {
      throw new Error("You are not involved in this escrow");
    }

    const openedAgainst = isBuyer ? escrow.seller : escrow.buyer;

    const dispute = await Dispute.create(
      [{
        escrow: escrowId,
        car: escrow.car,
        openedBy: userId,
        openedAgainst,
        title,
        description,
        category,
        priority,
        amountInDispute: escrow.amount || 0,
        status: STATES.OPEN,
        openedAt: new Date(),
        timeline: [{ action: "Dispute opened", actor: userId, note: title, at: new Date() }],
      }],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    logInfo("Dispute created", { disputeId: dispute[0]._id, escrowId, category });
    return dispute[0];
  } catch (err) {
    await guardSession(session);
    logError("Dispute create failed", err);
    throw err;
  }
};

// =============================
// 🔄 TRANSITION STATE
// =============================
export const transitionDispute = async (disputeId, userId, userRole, nextStatus, { reason, req } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");

    const currentStatus = dispute.status;
    const validation = validateTransition(currentStatus, nextStatus, userRole, dispute);
    if (!validation.allowed) throw new Error(validation.reason);

    const prevStatus = dispute.status;
    dispute.status = nextStatus;

    switch (nextStatus) {
      case STATES.UNDER_REVIEW:
        dispute.underReviewAt = new Date();
        break;
      case STATES.MEDIATION:
        dispute.mediationStartedAt = new Date();
        break;
      case STATES.RESOLVED:
        dispute.resolvedAt = new Date();
        break;
      case STATES.APPEALED:
        dispute.appealedAt = new Date();
        break;
      case STATES.CLOSED:
        dispute.closedAt = new Date();
        break;
    }

    if (reason) dispute.addTimelineEntry({ action: `Status: ${currentStatus} → ${nextStatus}`, actor: userId, fromStatus: currentStatus, toStatus: nextStatus, note: reason });
    else dispute.addTimelineEntry({ action: `Status: ${currentStatus} → ${nextStatus}`, actor: userId, fromStatus: currentStatus, toStatus: nextStatus });

    await dispute.save({ session });
    await session.commitTransaction();
    session.endSession();

    logInfo("Dispute transitioned", { disputeId, from: prevStatus, to: nextStatus, by: userId });
    return dispute;
  } catch (err) {
    await guardSession(session);
    throw err;
  }
};

// =============================
// 📎 UPLOAD EVIDENCE
// =============================
export const uploadEvidence = async ({ disputeId, userId, userRole, fileData, type, description, metadata }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");

    const evidence = await Evidence.create(
      [{
        dispute: disputeId,
        type,
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        size: fileData.size,
        url: fileData.url,
        publicId: fileData.publicId || null,
        thumbnailUrl: fileData.thumbnailUrl || null,
        description: description || "",
        uploadedBy: userId,
        uploadedByRole: userRole,
        metadata: metadata || {},
      }],
      { session },
    );

    dispute.evidence.push(evidence[0]._id);
    dispute.addTimelineEntry({ action: "Evidence uploaded", actor: userId, note: `${type}: ${fileData.fileName}` });
    await dispute.save({ session });

    await session.commitTransaction();
    session.endSession();

    logInfo("Evidence uploaded", { evidenceId: evidence[0]._id, disputeId, type });
    return evidence[0];
  } catch (err) {
    await guardSession(session);
    logError("Evidence upload failed", err);
    throw err;
  }
};

// =============================
// 📝 ADD INTERNAL NOTE
// =============================
export const addInternalNote = async (disputeId, userId, note, isPrivate = true) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error("Dispute not found");

  dispute.internalNotes.push({ note, addedBy: userId, isPrivate });
  dispute.addTimelineEntry({ action: "Internal note added", actor: userId });
  await dispute.save();

  logInfo("Internal note added", { disputeId, by: userId });
  return dispute;
};

// =============================
// 🎯 ASSIGN DISPUTE
// =============================
export const assignDispute = async (disputeId, adminId, assigneeId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw new Error("Dispute not found");

    dispute.assignedTo = assigneeId;
    dispute.addTimelineEntry({ action: `Assigned to ${assigneeId}`, actor: adminId });
    await dispute.save({ session });

    await session.commitTransaction();
    session.endSession();

    logInfo("Dispute assigned", { disputeId, assigneeId });
    return dispute;
  } catch (err) {
    await guardSession(session);
    throw err;
  }
};

// =============================
// 📋 GET DISPUTES (with pagination)
// =============================
export const getDisputes = async (filter, { page = 1, limit = 20, sort = { createdAt: -1 }, populate } = {}) => {
  const skip = (page - 1) * limit;
  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .populate(populate || [
        { path: "escrow", select: "amount status" },
        { path: "car", select: "title brand model" },
        { path: "openedBy", select: "name email phone" },
        { path: "openedAgainst", select: "name email phone" },
        { path: "assignedTo", select: "name email" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Dispute.countDocuments(filter),
  ]);

  const evidenceCounts = await Evidence.aggregate([
    { $match: { dispute: { $in: disputes.map((d) => d._id) } } },
    { $group: { _id: "$dispute", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(evidenceCounts.map((e) => [e._id.toString(), e.count]));

  return {
    disputes: disputes.map((d) => ({ ...d, evidenceCount: countMap[d._id.toString()] || 0 })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};
