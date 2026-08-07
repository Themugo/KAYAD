// backend/services/escrowCron.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Runs hourly. Auto-releases funded escrows after N days if
// buyer hasn't confirmed vehicle and seller hasn't confirmed
// delivery. Sends warnings at N-2 days and notifications to
// both parties. Uses escrow.transitionTo() for atomic state
// machine transitions.
//
// ENV:
//   ESCROW_AUTO_RELEASE_DAYS=7   (default: 7)
//   ESCROW_CRON_ENABLED=true     (default: true)
// ─────────────────────────────────────────────────────────────

import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { addNotificationJob } from "../queues/notificationQueue.js";
import { STATES } from "./escrowStateMachine.js";
import { findAll, create } from "../db/index.js";
import { autoReleaseEscrow } from "./escrow.service.js";
import { isSupabaseConnected } from "../utils/supabase.js";

const RELEASE_DAYS = parseInt(process.env.ESCROW_AUTO_RELEASE_DAYS || "7");
const ENABLED = process.env.ESCROW_CRON_ENABLED !== "false";
const QUEUE_MODE = process.env.QUEUE_MODE === "true";

const notify = async (userId, title, message, type = "escrow") => {
  try {
    if (QUEUE_MODE) {
      await addNotificationJob({ userId, title, message, type, channels: ["push"] });
      return;
    }
    const notif = await create("notifications", { user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    logError("Notify failed", e);
  }
};

// Batch-fetches the cars, sellers, and buyers referenced by a set of
// escrows in 2 queries total instead of up to 3 per escrow. Both
// runAutoRelease and runDisputeWarnings used to call findOne("cars", ...)
// and findOne("users", ...) individually inside their per-escrow loop -
// harmless at the small scale this has run at so far, but real N+1
// query fan-out that would slow this hourly cron (and add unnecessary
// database load) as escrow volume grows. Returns { carsById, usersById }
// Maps for O(1) lookup inside the loop.
const batchFetchRelated = async (escrows) => {
  const carIds = [...new Set(escrows.map((e) => e.car).filter(Boolean))];
  const userIds = [...new Set(escrows.flatMap((e) => [e.seller, e.buyer]).filter(Boolean))];

  const [cars, users] = await Promise.all([
    carIds.length ? findAll("cars", { filters: { id: { $in: carIds } } }) : Promise.resolve([]),
    userIds.length ? findAll("users", { filters: { id: { $in: userIds } } }) : Promise.resolve([]),
  ]);

  return {
    carsById: new Map(cars.map((c) => [c.id, c])),
    usersById: new Map(users.map((u) => [u.id, u])),
  };
};

// ── AUTO-RELEASE ────────────────────────────────────────────
const runAutoRelease = async () => {
  const cutoff = new Date(Date.now() - RELEASE_DAYS * 86_400_000).toISOString();
  const deliverCutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const funded = await findAll("escrows", {
    filters: { status: [STATES.FUNDED, STATES.VEHICLE_CONFIRMED], createdAt: { $lte: cutoff } },
  });
  const delivered = await findAll("escrows", {
    filters: { status: STATES.DELIVERED, deliveryConfirmedAt: { $lte: deliverCutoff } },
  });
  const stale = [...funded, ...delivered];

  if (stale.length === 0) return;

  logInfo("EscrowCron: stale escrows", { count: stale.length, days: RELEASE_DAYS });

  const { carsById, usersById } = await batchFetchRelated(stale);

  for (const escrow of stale) {
    try {
      // Auto-release logic: transition to released if possible
      if (escrow.status !== STATES.FUNDED && escrow.status !== STATES.VEHICLE_CONFIRMED && escrow.status !== STATES.DELIVERED) continue;
      const car = escrow.car ? carsById.get(escrow.car) : null;
      const carTitle = car?.title || "the vehicle";

      const seller = escrow.seller ? usersById.get(escrow.seller) : null;
      const buyer = escrow.buyer ? usersById.get(escrow.buyer) : null;

      await autoReleaseEscrow(escrow.id);

      if (seller) {
        await notify(seller.id, "💰 Escrow Released",
          `Payment for ${carTitle} has been automatically released to your account after ${RELEASE_DAYS} days.`);
      }
      if (buyer) {
        await notify(buyer.id, "✅ Escrow Closed",
          `Your escrow for ${carTitle} was automatically released after ${RELEASE_DAYS} days. Deal complete.`);
      }

      getIO()?.emit("escrowReleased", { escrowId: escrow.id, amount: escrow.amount, autoReleased: true });
      logInfo("Auto-released escrow", { escrowId: escrow.id, amount: escrow.amount });
    } catch (err) {
      logError("Auto-release failed", err, { escrowId: escrow.id });
    }
  }
};

// ── DISPUTE WARNINGS ────────────────────────────────────────
const runDisputeWarnings = async () => {
  const warningDate = new Date(Date.now() - (RELEASE_DAYS - 2) * 86_400_000).toISOString();
  const deliverWarningDate = new Date(Date.now() - 1 * 86_400_000).toISOString();

  const funded = await findAll("escrows", {
    filters: { status: [STATES.FUNDED, STATES.VEHICLE_CONFIRMED], createdAt: { $lte: warningDate }, warningSent: { $ne: true } },
  });
  const delivered = await findAll("escrows", {
    filters: { status: STATES.DELIVERED, deliveryConfirmedAt: { $lte: deliverWarningDate }, warningSent: { $ne: true } },
  });
  const approaching = [...funded, ...delivered];

  const { carsById, usersById } = await batchFetchRelated(approaching);

  for (const escrow of approaching) {
    try {
      await update("escrows", escrow.id, { warningSent: true });
      const car = escrow.car ? carsById.get(escrow.car) : null;
      const carTitle = car?.title || "a vehicle";
      const buyer = escrow.buyer ? usersById.get(escrow.buyer) : null;
      const seller = escrow.seller ? usersById.get(escrow.seller) : null;

      if (escrow.status === STATES.DELIVERED) {
        if (buyer) {
          await notify(buyer.id, "⚠️ Escrow Auto-Release Tomorrow",
            `Delivery for ${carTitle} was confirmed. Funds will auto-release tomorrow unless you raise a dispute.`);
        }
        if (seller) {
          await notify(seller.id, "⚠️ Escrow Auto-Release Tomorrow",
            `Funds for ${carTitle} will auto-release tomorrow.`);
        }
        getIO()?.to("admins").emit("notification", {
          title: "Escrow Approaching Auto-Release (DELIVERED)",
          message: `Escrow #${escrow.id.toString().slice(-8)} for ${carTitle} (KES ${escrow.amount}) was delivered and will auto-release tomorrow.`,
          type: "escrow",
        });
      } else {
        if (buyer) {
          await notify(buyer.id, "⚠️ Escrow Expiring Soon",
            `Your escrow for ${carTitle} will auto-release in 2 days. Have you inspected the vehicle? Contact admin if you have an issue.`);
        }
        if (seller) {
          await notify(seller.id, "⚠️ Escrow Expiring Soon",
            `Escrow for ${carTitle} will auto-release in 2 days. Ensure delivery is confirmed.`);
        }
        getIO()?.to("admins").emit("notification", {
          title: "Escrow Approaching Auto-Release",
          message: `Escrow #${escrow.id.toString().slice(-8)} for ${carTitle} (KES ${escrow.amount}) releases in 2 days.`,
          type: "escrow",
        });
      }

      logInfo("Warning sent", { escrowId: escrow.id });
    } catch (err) {
      logError("Warning failed", err, { escrowId: escrow.id });
    }
  }
};

// ── START ───────────────────────────────────────────────────
let _cronHandle = null;

export const startEscrowCron = () => {
  if (!ENABLED) {
    logWarn("EscrowCron disabled (ESCROW_CRON_ENABLED=false)");
    return;
  }

  if (!isSupabaseConnected()) {
    logWarn("EscrowCron skipped: Supabase not connected");
    return;
  }

  const INTERVAL_MS = 60 * 60 * 1000;

  const run = async () => {
    try {
      await runDisputeWarnings();
      await runAutoRelease();
    } catch (err) {
      logError("EscrowCron failed", err);
    }
  };

  run();
  _cronHandle = setInterval(run, INTERVAL_MS);
  logInfo("EscrowCron started", { autoReleaseDays: RELEASE_DAYS });
  return _cronHandle;
};

export const stopEscrowCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
