// backend/services/escrowCron.js
// ─────────────────────────────────────────────────────────────
// Runs daily. Manages escrow lifecycle safely:
//
// 1. WARNING (at RELEASE_DAYS - 2 days): Notify buyer to confirm
//    receipt or raise a dispute.
// 2. AUTO-DISPUTE (at RELEASE_DAYS): If buyer has NOT confirmed
//    delivery AND has NOT raised a dispute, the escrow moves to
//    "pending_review" status — NOT auto-released. An admin must
//    manually review and release or refund.
//
// This prevents the dangerous scenario where a buyer loses money
// because they never received the car.
//
// ENV VARS:
//   ESCROW_AUTO_RELEASE_DAYS=7   (default: 7)
//   ESCROW_CRON_ENABLED=true     (default: true)
// ─────────────────────────────────────────────────────────────

import Escrow       from "../models/Escrow.js";
import Notification from "../models/Notification.js";

const RELEASE_DAYS = parseInt(process.env.ESCROW_AUTO_RELEASE_DAYS || "7");
const ENABLED      = process.env.ESCROW_CRON_ENABLED !== "false";

// ── NOTIFY HELPER ─────────────────────────────────────────────
const notify = async (userId, title, message, type = "escrow") => {
  try {
    const notif = await Notification.create({ user: userId, title, message, type });
    global.io?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    console.error("❌ Notify failed:", e.message);
  }
};

// ── WARNING JOB (2 days before threshold) ─────────────────────
const runDisputeWarnings = async () => {
  const warningDate = new Date(Date.now() - (RELEASE_DAYS - 2) * 86_400_000);

  const approaching = await Escrow.find({
    status:       "held",
    createdAt:    { $lte: warningDate },
    warningSent:  { $ne: true },
  }).populate("buyer seller car");

  if (approaching.length === 0) return;

  console.log(`⚠️ EscrowCron: ${approaching.length} escrow(s) approaching deadline`);

  for (const escrow of approaching) {
    try {
      await Escrow.findByIdAndUpdate(escrow._id, { warningSent: true });

      const carTitle = escrow.car?.title || "the vehicle";

      // Notify buyer — prompt them to confirm receipt
      if (escrow.buyer?._id) {
        await notify(
          escrow.buyer._id,
          "⚠️ Action Required: Escrow Expiring",
          `Your escrow for ${carTitle} will be flagged for admin review in 2 days. If you have received the car, please confirm delivery. If there is an issue, contact support immediately.`,
          "escrow"
        );
      }

      // Notify seller
      if (escrow.seller?._id) {
        await notify(
          escrow.seller._id,
          "⏳ Escrow Expiring Soon",
          `The escrow for ${carTitle} will be reviewed in 2 days. Ensure the buyer has received the vehicle.`,
          "escrow"
        );
      }

      // Notify admin
      global.io?.to("admins").emit("notification", {
        title:   "Escrow Approaching Deadline",
        message: `Escrow #${escrow._id.toString().slice(-8)} for ${carTitle} (${escrow.amount.toLocaleString()} KES) needs buyer confirmation in 2 days.`,
        type:    "escrow",
      });

      console.log(`  ⚠️ Warning sent for escrow ${escrow._id}`);
    } catch (err) {
      console.error(`  ❌ Warning failed for ${escrow._id}:`, err.message);
    }
  }
};

// ── AUTO-DISPUTE JOB (at threshold) ───────────────────────────
// Instead of auto-releasing, move to "pending_review" so an
// admin must manually decide to release or refund.
const runAutoDispute = async () => {
  const cutoff = new Date(Date.now() - RELEASE_DAYS * 86_400_000);

  const stale = await Escrow.find({
    status:    "held",
    createdAt: { $lte: cutoff },
  }).populate("buyer seller car");

  if (stale.length === 0) return;

  console.log(`🔒 EscrowCron: ${stale.length} escrow(s) moved to pending_review`);

  for (const escrow of stale) {
    try {
      // Move to pending_review — NOT released
      escrow.status       = "pending_review";
      escrow.reviewReason = `Auto-flagged: ${RELEASE_DAYS} days passed without buyer confirmation or dispute.`;
      escrow.reviewFlaggedAt = new Date();
      await escrow.save();

      const carTitle = escrow.car?.title || "the vehicle";

      // Notify buyer
      if (escrow.buyer?._id) {
        await notify(
          escrow.buyer._id,
          "🔒 Escrow Under Review",
          `Your escrow for ${carTitle} has been flagged for admin review because ${RELEASE_DAYS} days passed without delivery confirmation. Contact support if you have not received the vehicle.`,
          "escrow"
        );
      }

      // Notify seller
      if (escrow.seller?._id) {
        await notify(
          escrow.seller._id,
          "🔒 Escrow Under Review",
          `The escrow for ${carTitle} is under admin review. Funds will be released once the buyer confirms delivery or an admin resolves the case.`,
          "escrow"
        );
      }

      // Notify admin room
      global.io?.to("admins").emit("notification", {
        title:   "🔒 Escrow Requires Manual Review",
        message: `Escrow #${escrow._id.toString().slice(-8)} for ${carTitle} (${escrow.amount.toLocaleString()} KES) has been auto-flagged. Review and release or refund.`,
        type:    "escrow",
      });

      console.log(`  🔒 Flagged escrow ${escrow._id} (${escrow.amount.toLocaleString()} KES) for review`);
    } catch (err) {
      console.error(`  ❌ Failed to flag escrow ${escrow._id}:`, err.message);
    }
  }
};

// ── START ─────────────────────────────────────────────────────
let _cronHandle = null;

export const startEscrowCron = () => {
  if (!ENABLED) {
    console.log("⏸  EscrowCron disabled (ESCROW_CRON_ENABLED=false)");
    return;
  }

  const INTERVAL_MS = 60 * 60 * 1000; // every 1 hour

  const run = async () => {
    try {
      await runDisputeWarnings();
      await runAutoDispute();
    } catch (err) {
      console.error("❌ EscrowCron failed:", err.message);
    }
  };

  // Run immediately on startup, then every hour
  run();
  _cronHandle = setInterval(run, INTERVAL_MS);

  console.log(`⏰ EscrowCron started — auto-review after ${RELEASE_DAYS} days (NO auto-release)`);
  return _cronHandle;
};

export const stopEscrowCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
