// backend/services/auctionReminderCron.js
// ─────────────────────────────────────────────────────────────
// Runs every 5 minutes. Finds auctions ending within configurable
// thresholds and sends reminder emails to active bidders.
//
// ENV VARS:
//   AUCTION_REMINDER_ENABLED=true   (default: true)
// ─────────────────────────────────────────────────────────────

import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Notification from "../models/Notification.js";
import { getIO } from "../utils/io.js";

const ENABLED = process.env.AUCTION_REMINDER_ENABLED !== "false";

const notify = async (userId, title, message, type = "auction") => {
  try {
    const notif = await Notification.create({ user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    console.error("❌ Notify failed:", e.message);
  }
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
    const windowEnd = new Date(now.getTime() + threshold.ms + 60 * 1000);

    const endingAuctions = await Car.find({
      auctionStatus: "live",
      allowBid: true,
      auctionEnd: { $gte: windowStart, $lte: windowEnd },
      [`reminderSent_${threshold.label}min`]: { $ne: true },
    }).select("_id title currentBid price auctionEnd");

    if (endingAuctions.length === 0) continue;

    for (const car of endingAuctions) {
      try {
        const activeBidders = await Bid.find({
          carId: car._id,
          status: { $in: ["active", "paid"] },
        }).distinct("user");

        if (activeBidders.length === 0) continue;

        const { sendAuctionEndingSoonEmail } = await import("./email.service.js").catch(() => ({}));
        const User = (await import("../models/User.js")).default;

        for (const userId of activeBidders) {
          const user = await User.findById(userId).select("email name");
          if (user?.email && typeof sendAuctionEndingSoonEmail === "function") {
            sendAuctionEndingSoonEmail(user, car, threshold.minutes).catch(e =>
              console.warn("⚠️ Auction reminder email failed:", e.message)
            );
          }

          await notify(
            userId,
            `⏰ Auction ending in ${threshold.minutes} min`,
            `The auction for ${car.title || "a vehicle"} ends in ${threshold.minutes} minutes. Current bid: KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}.`,
            "auction"
          );
        }

        await Car.findByIdAndUpdate(car._id, {
          [`reminderSent_${threshold.label}min`]: true,
        });

        console.log(`  ✅ Reminder sent (${threshold.minutes}min) for car ${car._id} (${activeBidders.length} bidders)`);
      } catch (err) {
        console.error(`  ❌ Reminder failed for ${car._id}:`, err.message);
      }
    }
  }
};

// ── START ─────────────────────────────────────────────────────
let _cronHandle = null;

export const startAuctionReminderCron = () => {
  if (!ENABLED) {
    console.log("⏸  AuctionReminderCron disabled (AUCTION_REMINDER_ENABLED=false)");
    return;
  }

  const INTERVAL_MS = 5 * 60 * 1000;

  const run = async () => {
    try {
      await runReminders();
    } catch (err) {
      console.error("❌ AuctionReminderCron failed:", err.message);
    }
  };

  run();
  _cronHandle = setInterval(run, INTERVAL_MS);

  console.log("⏰ AuctionReminderCron started — checking every 5 minutes");
  return _cronHandle;
};

export const stopAuctionReminderCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
};
