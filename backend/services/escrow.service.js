// backend/services/escrow.service.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Escrow service with atomic state machine transitions,
// idempotency, ledger integration, and full audit logging.
// ─────────────────────────────────────────────────────────────

import { findById, findOne, create, update } from "../db/index.js";
import { STATES, validateTransition } from "../services/escrowStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { atomicTransitionEscrow } from "../utils/atomicTransactions.js";
import { recordEscrowDeposit, recordEscrowRelease } from "./ledgerService.js";
import { syncPurchaseOutcomeFromEscrow } from "./marketplaceFulfilment.service.js";

const getCommissionRate = async () => {
  try {
    const config = await findOne("platform_config", {});
    if (config?.dealerCommission) return config.dealerCommission / 100;
  } catch {}
  return 0.05;
};

const calculateCommission = async (amount) => {
  const rate = await getCommissionRate();
  const commission = Math.round(amount * rate);
  return { commission, sellerAmount: amount - commission };
};

export const createEscrow = async (data) => {
  try {
    const { commission, sellerAmount } = await calculateCommission(data.amount);

    const escrow = await create("escrows", {
      ...data,
      commission,
      sellerAmount,
      status: STATES.PENDING,
      history: [{ action: "Escrow created", at: new Date() }],
    });

    logInfo("Escrow created", { escrowId: escrow.id, amount: data.amount });
    return escrow;
  } catch (err) {
    logError("Escrow create failed", err);
    throw err;
  }
};

export const fundEscrow = async (escrowId, { idempotencyKey, paymentId } = {}) => {
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.FUNDED, actorId: null, role: "system",
    idempotencyKey,
  });
  const escrow = await findById("escrows", escrowId);
  if (escrow?.status === STATES.FUNDED && Number(escrow.amount) > 0) {
    // Ledger posting is deliberately idempotent by external reference. A
    // retry after a provider/network failure therefore converges on one
    // financial entry rather than creating a duplicate deposit.
    await recordEscrowDeposit({
      payment_id: paymentId || escrowId,
      user_id: escrow.buyer,
      amount: Number(escrow.amount),
    });
  }
  logInfo("Escrow funded atomically", { escrowId, paymentId, amount: escrow?.amount });
  return escrow || result;
};

export const confirmVehicle = async (escrowId, userId, { idempotencyKey } = {}) => {
  await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.VEHICLE_CONFIRMED, actorId: userId, role: "buyer",
    idempotencyKey,
  });
  return findById("escrows", escrowId);
};

export const deliverEscrow = async (escrowId, userId, { idempotencyKey } = {}) => {
  await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.DELIVERED, actorId: userId, role: "seller",
    idempotencyKey,
  });
  return findById("escrows", escrowId);
};

export const releaseEscrow = async (escrowId, adminId, { idempotencyKey } = {}) => {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Escrow not found");
  // Explicitly select the canonical role. The DB function enforces whether
  // this actor may release from the current state.
  const role = "admin";
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.RELEASED, actorId: adminId, role,
    idempotencyKey,
  });
  const released = await findById("escrows", escrowId);
  if (released?.status === STATES.RELEASED) {
    await recordEscrowRelease({
      escrow_id: escrowId,
      user_id: released.buyer,
      amount: Number(released.amount),
      commission: Number(released.commission || 0),
    });
  }
  await syncPurchaseOutcomeFromEscrow(escrowId, "released", { actorId: adminId }).catch((e) => logWarn("Marketplace purchase outcome release sync failed", { error: e.message, escrowId }));
  logInfo("Escrow released atomically", { escrowId, sellerAmount: result?.sellerAmount, commission: result?.commission });
  return released || result;
};

export const autoReleaseEscrow = async (escrowId) => {
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.RELEASED, actorId: null, role: "system",
    idempotencyKey: `auto-release:${escrowId}`,
  });
  const escrow = await findById("escrows", escrowId);
  await syncPurchaseOutcomeFromEscrow(escrowId, "released", { actorId: null, auto: true }).catch((e) => logWarn("Marketplace purchase outcome auto-release sync failed", { error: e.message, escrowId }));
  logInfo("Escrow auto-released atomically", { escrowId, sellerAmount: result?.sellerAmount, commission: result?.commission });
  return escrow || result;
};

export const refundEscrow = async (escrowId, adminId, reason, { idempotencyKey } = {}) => {
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.REFUNDED, actorId: adminId, role: "admin",
    idempotencyKey, reason,
  });
  const escrow = await findById("escrows", escrowId);
  await syncPurchaseOutcomeFromEscrow(escrowId, "refunded", { actorId: adminId, reason }).catch((e) => logWarn("Marketplace purchase outcome refund sync failed", { error: e.message, escrowId }));
  logInfo("Escrow refunded atomically", { escrowId, reason });
  return escrow || result;
};

export const disputeEscrow = async (escrowId, userId, role, reason) => {
  await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.DISPUTED, actorId: userId, role,
    reason,
  });
  await syncPurchaseOutcomeFromEscrow(escrowId, "disputed", { actorId: userId, reason }).catch((e) => logWarn("Marketplace purchase outcome dispute sync failed", { error: e.message, escrowId }));
  return findById("escrows", escrowId);
};

export const closeEscrow = async (escrowId, userId, role, { req, reason = null } = {}) => {
  try {
    const escrow = await findById("escrows", escrowId);
    if (!escrow) throw new Error("Escrow not found");

    const validation = validateTransition(escrow.status, STATES.CLOSED, role, escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    const now = new Date();
    await update("escrows", escrow.id, {
      status: STATES.CLOSED,
      closedAt: now,
      history: [...(escrow.history || []), { action: "Escrow closed", by: userId, at: now, reason: reason || "Administrative closure" }],
    });

    return { ...escrow, status: STATES.CLOSED, closedAt: now };
  } catch (err) {
    throw err;
  }
};
