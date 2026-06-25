import DealerVerification from "../models/DealerVerification.js";
import { sendNotification } from "./notification.service.js";

export const checkVerificationDeadlines = async () => {
  // Find verifications stuck in "pending" for more than 7 days with no update
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = await DealerVerification.find({
    verificationStatus: "pending",
    updatedAt: { $lte: sevenDaysAgo },
  }).populate("user");

  for (const v of stale) {
    await sendNotification({
      userId: v.user._id,
      title: "Verification Reminder",
      message: "Your verification documents have been pending for 7 days. Please ensure all documents are submitted correctly.",
      type: "system",
    });
  }

  // Auto-close verifications pending > 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const autoClose = await DealerVerification.find({
    verificationStatus: "pending",
    updatedAt: { $lte: thirtyDaysAgo },
  });

  for (const v of autoClose) {
    await sendNotification({
      userId: v.user._id,
      title: "Verification Expired",
      message: "Your verification request has been closed due to inactivity. Please resubmit your documents.",
      type: "system",
    });
    // Don't delete — just leave as pending, the user can resubmit
  }

  return { reminded: stale.length, expired: autoClose.length };
};
