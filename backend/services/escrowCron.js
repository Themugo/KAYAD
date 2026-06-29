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

import Escrow from "../models/Escrow.js";
import Notification from "../models/Notification.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { addNotificationJob } from "../queues/notificationQueue.js";
import { STATES } from "./escrowStateMachine.js";

const RELEASE_DAYS = parseInt(process.env.ESCROW_AUTO_RELEASE_DAYS || "7");
const ENABLED = process.env.ESCROW_CRON_ENABLED !== "false";
const QUEUE_MODE = process.env.QUEUE_MODE === "true";

const notify = async (userId, title, message, type = "escrow") => {
  try {
    if (QUEUE_MODE) {
      await addNotificationJob({ userId, title, message, type, channels: ["push"] });
      return;
    }
    const notif = await Notification.create({ user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    logError("Notify failed", e);
  }
};

// ── AUTO-RELEASE ────────────────────────────────────────────
// Finds escrows stuck in funded/vehicle_confirmed beyond the
// auto-release window and transitions them to RELEASED.
// Also handles DELIVERED escrows where buyer hasn't disputed
// within 3 days of delivery confirmation.
const runAutoRelease = async () => {
  const cutoff = new Date(Date.now() - RELEASE_DAYS * 86_400_000);
  const deliverCutoff = new Date(Date.now() - 3 * 86_400_000);

  const stale = await Escrow.find({
    $or: [
      { status: { $in: [STATES.FUNDED, STATES.VEHICLE_CONFIRMED] }, createdAt: { $lte: cutoff } },
      { status: STATES.DELIVERED, deliveryConfirmedAt: { $lte: deliverCutoff } },
    ],
  }).populate("buyer seller car");

  if (stale.length === 0) return;

  logInfo("EscrowCron: stale escrows", { count: stale.length, days: RELEASE_DAYS });

  for (const escrow of stale) {
    try {
      const result = await escrow.autoRelease();
      if (!result) continue;

      const carTitle = escrow.car?.title || "the vehicle";

      if (escrow.seller?._id) {
        await notify(escrow.seller._id, "💰 Escrow Released",
          `Payment for ${carTitle} has been automatically released to your account after ${RELEASE_DAYS} days.`);
      }
      if (escrow.buyer?._id) {
        await notify(escrow.buyer._id, "✅ Escrow Closed",
          `Your escrow for ${carTitle} was automatically released after ${RELEASE_DAYS} days. Deal complete.`);
      }

      getIO()?.emit("escrowReleased", { escrowId: escrow._id, amount: escrow.amount, autoReleased: true });
      logInfo("Auto-released escrow", { escrowId: escrow._id, amount: escrow.amount });
    } catch (err) {
      logError("Auto-release failed", err, { escrowId: escrow._id });
    }
  }
};

// ── DISPUTE WARNINGS ────────────────────────────────────────
// Warns parties when escrow is approaching auto-release.
const runDisputeWarnings = async () => {
  const warningDate = new Date(Date.now() - (RELEASE_DAYS - 2) * 86_400_000);
  const deliverWarningDate = new Date(Date.now() - 1 * 86_400_000);

  const approaching = await Escrow.find({
    $or: [
      { status: { $in: [STATES.FUNDED, STATES.VEHICLE_CONFIRMED] }, createdAt: { $lte: warningDate }, warningSent: { $ne: true } },
      { status: STATES.DELIVERED, deliveryConfirmedAt: { $lte: deliverWarningDate }, warningSent: { $ne: true } },
    ],
  }).populate("buyer seller car");

  for (const escrow of approaching) {
    try {
      await Escrow.findByIdAndUpdate(escrow._id, { warningSent: true });
      const carTitle = escrow.car?.title || "a vehicle";

      if (escrow.status === STATES.DELIVERED) {
        if (escrow.buyer?._id) {
          await notify(escrow.buyer._id, "⚠️ Escrow Auto-Release Tomorrow",
            `Delivery for ${carTitle} was confirmed. Funds will auto-release tomorrow unless you raise a dispute.`);
        }
        if (escrow.seller?._id) {
          await notify(escrow.seller._id, "⚠️ Escrow Auto-Release Tomorrow",
            `Funds for ${carTitle} will auto-release tomorrow.`);
        }
        getIO()?.to("admins").emit("notification", {
          title: "Escrow Approaching Auto-Release (DELIVERED)",
          message: `Escrow #${escrow._id.toString().slice(-8)} for ${carTitle} (KES ${escrow.amount}) was delivered and will auto-release tomorrow.`,
          type: "escrow",
        });
      } else {
        if (escrow.buyer?._id) {
          await notify(escrow.buyer._id, "⚠️ Escrow Expiring Soon",
            `Your escrow for ${carTitle} will auto-release in 2 days. Have you inspected the vehicle? Contact admin if you have an issue.`);
        }
        if (escrow.seller?._id) {
          await notify(escrow.seller._id, "⚠️ Escrow Expiring Soon",
            `Escrow for ${carTitle} will auto-release in 2 days. Ensure delivery is confirmed.`);
        }
        getIO()?.to("admins").emit("notification", {
          title: "Escrow Approaching Auto-Release",
          message: `Escrow #${escrow._id.toString().slice(-8)} for ${carTitle} (KES ${escrow.amount}) releases in 2 days.`,
          type: "escrow",
        });
      }

      logInfo("Warning sent", { escrowId: escrow._id });
    } catch (err) {
      logError("Warning failed", err, { escrowId: escrow._id });
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
