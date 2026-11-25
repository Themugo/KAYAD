// Business notifications for a DEALERSHIP: the owner plus the active staff whose permission covers the event. Each person gets the
// notice in their own account (their bell), the owner by in-app + e-mail/SMS per their preferences, staff in-app only.
// Best-effort by design: a notification failure must never fail the business action that caused it.
import { findAll } from "../db/index.js";
import { sendNotification } from "./notification.service.js";
import { logWarn } from "../utils/logger.js";

/** Active staff of the dealership (accepted invitation, status active) whose stored permissions include `permission`. */
export async function dealershipStaffRecipients(dealerId, permission) {
  if (!dealerId) return [];
  const rows = await findAll("dealer_teams", { filters: { dealer: dealerId, status: "active" }, limit: 200 });
  return [...new Set((rows || []).filter((m) => m.member && (!permission || m.permissions?.[permission] === true)).map((m) => String(m.member)))];
}

export async function notifyDealership(dealerId, { permission, title, message, type = "info", link = "/?nav=dealer-dashboard", data = {} }) {
  try {
    if (!dealerId) return { owner: false, staff: 0 };
    const owner = await sendNotification({ userId: dealerId, title, message, type, link, data });
    let staff = 0;
    for (const memberId of await dealershipStaffRecipients(dealerId, permission)) {
      if (memberId === String(dealerId)) continue;
      const row = await sendNotification({ userId: memberId, title, message, type, link, data: { ...data, dealerId: String(dealerId) }, channels: [] });
      if (row) staff += 1;
    }
    return { owner: Boolean(owner), staff };
  } catch (err) {
    logWarn("Dealership notification failed", { dealerId: String(dealerId), error: err?.message });
    return { owner: false, staff: 0 };
  }
}
