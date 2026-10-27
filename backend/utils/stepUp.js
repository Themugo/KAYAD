// Phase 14.9 - password step-up for high-impact changes.
//
// The payout destination for dealer / private-seller proceeds is the account phone (users.phone): both
// POST /api/dealer/payouts/:escrowId/initiate and the staff escrow payout read it. Changing that number with nothing more than a
// live session (stolen cookie, unattended device) would let a session holder redirect money. A payout-capable account therefore
// has to re-prove its password when the phone number actually changes. Unchanged phone numbers and non-payout roles are unaffected.
import UserAuth from "../models/UserAuth.js";

export const STEP_UP_ROLES = Object.freeze(["dealer", "individual_seller"]);
export const needsPhoneStepUp = (role) => STEP_UP_ROLES.includes(role);

/** Resolves to null when the password is valid, otherwise the 403 body to send. Never reveals which part was wrong beyond required/failed. */
export async function checkPasswordStepUp(userId, currentPassword) {
  if (typeof currentPassword !== "string" || !currentPassword) {
    return { success: false, code: "STEP_UP_REQUIRED", message: "Enter your current password to change the phone number used for payouts and verification.", fields: ["currentPassword"] };
  }
  const auth = await UserAuth.findOne({ user: userId }).select("+password");
  const ok = auth ? await auth.matchPassword(currentPassword) : false;
  if (!ok) return { success: false, code: "STEP_UP_FAILED", message: "The password you entered is incorrect.", fields: ["currentPassword"] };
  return null;
}
