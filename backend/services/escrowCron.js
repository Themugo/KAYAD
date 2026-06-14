// backend/services/escrowCron.js
// ─────────────────────────────────────────────────────────────
// Runs daily. Auto-releases funded escrows after N days if
// admin hasn't acted. Sends notifications to both parties.
//
// ENV VARS:
//   ESCROW_AUTO_RELEASE_DAYS=7   (default: 7)
//   ESCROW_CRON_ENABLED=true     (default: true)
// ─────────────────────────────────────────────────────────────

import Escrow from "../models/Escrow.js";
import Notification from "../models/Notification.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

const RELEASE_DAYS = parseInt(process.env.ESCROW_AUTO_RELEASE_DAYS || "7");
const ENABLED = process.env.ESCROW_CRON_ENABLED !== "false";

// ── NOTIFY HELPER ─────────────────────────────────────────────
const notify = async (userId, title, message, type = "escrow") => {
  try {
    const notif = await Notification.create({ user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    logError("Notify failed", e);
  }
};

// ── MAIN RELEASE JOB ──────────────────────────────────────────
const runAutoRelease = async () => {
  const cutoff = new Date(Date.now() - RELEASE_DAYS * 86_400_000);

  const stale = await Escrow.find({
    status: "held",
    createdAt: { $lte: cutoff },
  }).populate("buyer seller car");

  if (stale.length === 0) return;

  logInfo("EscrowCron: escrows past threshold", { count: stale.length, days: RELEASE_DAYS });

  for (const escrow of stale) {
    try {
      // Mark as released
      escrow.status = "released";
      escrow.releasedAt = new Date();
      escrow.autoReleased = true;
      await escrow.save();

      const carTitle = escrow.car?.title || "the vehicle";

      // Notify seller
      if (escrow.seller?._id) {
        await notify(
          escrow.seller._id,
          "💰 Escrow Released",
          `Payment for ${carTitle} has been automatically released to your account after ${RELEASE_DAYS} days.`,
          "escrow",
        );
      }

      // Notify buyer
      if (escrow.buyer?._id) {
        await notify(
          escrow.buyer._id,
          "✅ Escrow Closed",
          `Your escrow for ${carTitle} was automatically released after ${RELEASE_DAYS} days. Deal complete.`,
          "escrow",
        );
      }

      // Socket notification
      getIO()?.emit("escrowReleased", {
        escrowId: escrow._id,
        amount: escrow.amount,
        autoReleased: true,
      });

      logInfo("Released escrow", { escrowId: escrow._id, amount: escrow.amount });
    } catch (err) {
      logError("Failed to auto-release escrow", err, { escrowId: escrow._id });
    }
  }
};

// ── DISPUTE WARNING JOB ───────────────────────────────────────
// Warns admin of escrows approaching cutoff
const runDisputeWarnings = async () => {
  const warningDate = new Date(Date.now() - (RELEASE_DAYS - 2) * 86_400_000);

  const approaching = await Escrow.find({
    status: "held",
    createdAt: { $lte: warningDate },
    warningSent: { $ne: true },
  }).populate("buyer seller car");

  for (const escrow of approaching) {
    try {
      // Mark warning sent so it doesn't repeat
      await Escrow.findByIdAndUpdate(escrow._id, { warningSent: true });

      const carTitle = escrow.car?.title || "a vehicle";

      // Notify buyer — prompt them to confirm receipt
      if (escrow.buyer?._id) {
        await notify(
          escrow.buyer._id,
          "⚠️ Escrow Expiring Soon",
          `Your escrow for ${carTitle} will auto-release in 2 days. Have you received the car? Contact admin if you have an issue.`,
          "escrow",
        );
      }

      // Notify admin via admin room
      getIO()
        ?.to("admins")
        .emit("notification", {
          title: "Escrow Approaching Auto-Release",
          message: `Escrow #${escrow._id.toString().slice(-8)} for ${carTitle} (${escrow.amount} KES) releases in 2 days.`,
          type: "escrow",
        });

      logInfo("Warning sent for escrow", { escrowId: escrow._id });
    } catch (err) {
      logError("Warning failed for escrow", err, { escrowId: escrow._id });
    }
  }
};

// ── START ─────────────────────────────────────────────────────
let _cronHandle = null;

export const startEscrowCron = () => {
  if (!ENABLED) {
    logWarn("EscrowCron disabled (ESCROW_CRON_ENABLED=false)");
    return;
  }

  const INTERVAL_MS = 60 * 60 * 1000; // every 1 hour

  const run = async () => {
    try {
      await runDisputeWarnings();
      await runAutoRelease();
    } catch (err) {
      logError("EscrowCron failed", err);
    }
  };

  // Run immediately on startup, then every hour
  run();
  _cronHandle = setInterval(run, INTERVAL_MS);

  logInfo("EscrowCron started", { autoReleaseDays: RELEASE_DAYS });
  return _cronHandle;
};

export const stopEscrowCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
