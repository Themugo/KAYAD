import { sendNotification } from "./notification.service.js";
import { findAll } from "../db/index.js";
import { isSupabaseConnected } from "../utils/supabase.js";
import { logWarn } from "../utils/logger.js";

export const checkVerificationDeadlines = async () => {
  if (!isSupabaseConnected()) {
    logWarn("checkVerificationDeadlines skipped: Supabase not connected");
    return;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = await findAll("dealer_verifications", {
    filters: { verificationStatus: "pending", updatedAt: { $lte: sevenDaysAgo } },
  });

  for (const v of stale) {
    await sendNotification({
      userId: v.user?.id || v.user,
      title: "Verification Reminder",
      message: "Your verification documents have been pending for 7 days. Please ensure all documents are submitted correctly.",
      type: "system",
    });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const autoClose = await findAll("dealer_verifications", {
    filters: { verificationStatus: "pending", updatedAt: { $lte: thirtyDaysAgo } },
  });

  for (const v of autoClose) {
    await sendNotification({
      userId: v.user?.id || v.user,
      title: "Verification Expired",
      message: "Your verification request has been closed due to inactivity. Please resubmit your documents.",
      type: "system",
    });
  }

  return { reminded: stale.length, expired: autoClose.length };
};

export const startVerificationDeadlineCron = checkVerificationDeadlines;
