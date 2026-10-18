// backend/utils/referralGuards.js — Stage 4A (G9, 2026-10-18)
// Pure input guards for the referral flows (registration attribution and the admin manual credit).
// Pure functions so the abuse cases can be tested without the 2,000-line route file.

/** Only a plain string may be a referral code. Objects/arrays (JSON operator injection such as {"$ne":null}) become "". */
export function parseReferralCode(raw) {
  return typeof raw === "string" ? raw.trim().slice(0, 64) : "";
}

/** A bonus amount must be a finite positive JSON number. Strings ("abc", "1e999", "5") are rejected, never coerced. */
export function parseBonusAmount(raw) {
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : NaN;
}

/** Referrer eligibility for NEW attributions: not the registrant (normalised emails) and not suspended/deactivated. */
export function referrerEligible(referrer, registrantEmail, normalize = (e) => String(e || "").trim().toLowerCase()) {
  if (!referrer) return false;
  if (normalize(referrer.email) === normalize(registrantEmail)) return false;
  if (referrer.isBanned || referrer.deactivatedAt) return false;
  return true;
}
