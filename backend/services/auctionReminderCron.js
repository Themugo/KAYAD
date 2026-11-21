// backend/services/auctionReminderCron.js
// ─────────────────────────────────────────────────────────────
// Runs every 5 minutes. Finds auctions ending within configurable
// thresholds and sends reminder emails to active bidders.
//
// ENV VARS:
//   AUCTION_REMINDER_ENABLED=true   (default: true)
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn } from "../utils/logger.js";
import { findAll, findById, update } from "../db/index.js";
import { isSupabaseConnected } from "../utils/supabase.js";
import { evaluateEligibilityBatch } from "./privateSellerAuctionEligibility.service.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";

const ENABLED = process.env.AUCTION_REMINDER_ENABLED !== "false";
// The sweep runs every 5 minutes, so each reminder window must be 5 minutes wide or most auctions fall between two sweeps.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const notify = async (userId, title, message, type = "auction", metadata = {}) => {
  return emitCommunication({
    userId,
    eventType: COMMUNICATION_EVENTS.AUCTION_ENDING_SOON || "auction.ending_soon",
    category: "transactional",
    title,
    message,
    channels: ["in_app", "email", "sms", "whatsapp"],
    metadata: { type, ...metadata },
  });
};

const runReminders = async () => {
  const now = new Date();
  const thresholds = [
    { label: "5", ms: 5 * 60 * 1000, minutes: 5 },
    { label: "15", ms: 15 * 60 * 1000, minutes: 15 },
    { label: "30", ms: 30 * 60 * 1000, minutes: 30 },
    { label: "60", ms: 60 * 60 * 1000, minutes: 60 },
  ];

  for (const threshold of thresholds) {
    const windowStart = new Date(now.getTime() + threshold.ms);
    const windowEnd = new Date(now.getTime() + threshold.ms + SWEEP_INTERVAL_MS);

    const endingAuctions = await findAll("cars", { filters: {
      auctionStatus: "live",
      allowBid: true,
      auctionEnd: { $gte: windowStart, $lte: windowEnd },
      [`reminderSent_${threshold.label}min`]: { $ne: true },
    }, select: "_id title currentBid price auctionEnd" });

    if (endingAuctions.length === 0) continue;

    // Stage 5F.10: never tell bidders "ends in N minutes" about an auction whose bidding is currently blocked by the
    // private-seller gate. Fail-closed: if the gate cannot be evaluated, send nothing this tick.
    let reminderVerdicts;
    try { reminderVerdicts = await evaluateEligibilityBatch(endingAuctions.map((c) => c.id)); } catch { continue; }

    for (const car of endingAuctions.filter((c) => reminderVerdicts.get(String(c.id))?.eligible === true)) {
      try {
        const activeBidders = await findAll("bids", { filters: { carId: car.id, status: { $in: ["active", "paid"] } }, select: "user" });
        const bidderIds = [...new Set(activeBidders.map(b => b.user).filter(Boolean))];
        const minutesLeft = Math.max(1, Math.round((new Date(car.auctionEnd).getTime() - Date.now()) / 60000));
        const amount = `KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}`;

        // Cleared-to-bid registrants and followers also want to know; they get the quieter in-app notice only.
        let audienceIds = [];
        try {
          const regs = await findAll("auction_registrations", { filters: { auctionId: car.id, status: "active" }, select: "bidderId" });
          const follows = await findAll("auction_follows", { filters: { auction_id: car.id }, select: "user_id", limit: 2000 });
          audienceIds = [...new Set([...regs.map((r) => r.bidderId || r.bidder_id), ...(follows || []).map((f) => f.userId || f.user_id)].filter(Boolean))].filter((id) => !bidderIds.includes(id));
        } catch { /* audience reminders are best effort */ }

        if (bidderIds.length === 0 && audienceIds.length === 0) continue;

        for (const userId of bidderIds) {
          await notify(
            userId,
            `Auction ending in ${minutesLeft} min`,
            `The auction for ${car.title || "a vehicle"} ends in about ${minutesLeft} minutes. Current bid: ${amount}.`,
            "auction",
            { carId: car.id, auctionEnd: car.auctionEnd, thresholdMinutes: threshold.minutes },
          );
        }
        for (const userId of audienceIds) {
          await emitCommunication({ userId, eventType: COMMUNICATION_EVENTS.AUCTION_ENDING_SOON || "auction.ending_soon", category: "transactional", title: `Auction ending in ${minutesLeft} min`, message: `${car.title || "A vehicle you are following"} ends in about ${minutesLeft} minutes. Current bid: ${amount}.`, channels: ["in_app"], metadata: { type: "auction", carId: car.id, thresholdMinutes: threshold.minutes } }).catch(() => {});
        }

        await update("cars", car.id, {
          [`reminderSent_${threshold.label}min`]: true,
        });

        logInfo(`Reminder sent (${threshold.minutes}min) for car ${car.id} (${bidderIds.length} bidders, ${audienceIds.length} audience)`);
      } catch (err) {
        console.error(`  ❌ Reminder failed for ${car.id}:`, err.message);
      }
    }
  }
};

// ── START ─────────────────────────────────────────────────────
let _cronHandle = null;

export const startAuctionReminderCron = () => {
  if (!ENABLED) {
    logInfo("AuctionReminderCron disabled (AUCTION_REMINDER_ENABLED=false)");
    return;
  }

  if (!isSupabaseConnected()) {
    logWarn("AuctionReminderCron skipped: Supabase not connected");
    return;
  }

  const INTERVAL_MS = SWEEP_INTERVAL_MS;

  const run = async () => {
    try {
      await runReminders();
    } catch (err) {
      console.error("❌ AuctionReminderCron failed:", err.message);
    }
  };

  run();
  _cronHandle = setInterval(run, INTERVAL_MS);

  logInfo("AuctionReminderCron started — checking every 5 minutes");
  return _cronHandle;
};

export const stopAuctionReminderCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
