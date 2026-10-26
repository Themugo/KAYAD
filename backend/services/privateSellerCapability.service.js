// ============================================================
//  PHASE 13E — private-seller capability service (C1).
//  Authoritative source: public.private_seller_capabilities (one row per users.id). Legacy role=individual_seller accounts with no
//  row fall back to their users.status (the only approval source that existed before 13E); once a row exists it is authoritative.
//  Never touches dealers / dealer_verifications / dealer_teams, never changes users.role or users.status, never creates users.
// ============================================================
import { getSupabase } from "../utils/supabase.js";
import { STAFF_ROLES } from "../config/roles.js";

const TABLE = "private_seller_capabilities";
const EVENTS_TABLE = "private_seller_listing_visibility_events";
export const SELLER_STATUSES = ["pending", "approved", "rejected", "suspended", "revoked"];
// Valid admin transitions (from -> allowed decisions). Applicant transitions: none -> pending, rejected -> pending.
const DECISIONS = {
  approve: { to: "approved", from: ["pending", "suspended", "revoked", "rejected"] },
  reject: { to: "rejected", from: ["pending"] },
  suspend: { to: "suspended", from: ["approved"] },
  revoke: { to: "revoked", from: ["approved", "suspended"] },
};
export const DECISION_NAMES = Object.keys(DECISIONS);
const LEGACY_MAP = { approved: "approved", rejected: "rejected", suspended: "suspended" };

const err = (status, code, message) => Object.assign(new Error(message), { status, code });
const map = (r) => r && ({
  userId: r.user_id, status: r.status, contactPhone: r.contact_phone ?? null, intendedUse: r.intended_use ?? null, source: r.source,
  submittedAt: r.submitted_at, reviewedAt: r.reviewed_at ?? null, reviewReason: r.review_reason ?? null,
});

export const getCapabilityRow = async (userId) => {
  const { data, error } = await getSupabase().from(TABLE).select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data || null;
};

/** Effective private-seller state for a user ({id, role, status}). Returns { status, source } where status is
 *  none | pending | approved | rejected | suspended | revoked | not_applicable. */
export const resolveSellerState = async (user) => {
  if (!user) return { status: "none", source: "none" };
  if (user.role === "dealer" || STAFF_ROLES.includes(user.role)) return { status: "not_applicable", source: "role" };
  const row = await getCapabilityRow(user.id ?? user._id);
  if (row) return { status: row.status, source: row.source === "legacy_backfill" ? "legacy_backfill" : "capability" };
  if (user.role === "individual_seller") return { status: LEGACY_MAP[user.status] || "pending", source: "legacy_users_status" };
  return { status: "none", source: "none" };
};

export const getMySellerCapability = async (user) => {
  const state = await resolveSellerState(user);
  const row = ["none", "not_applicable"].includes(state.status) ? null : await getCapabilityRow(user.id ?? user._id);
  return {
    status: state.status, source: state.source, application: map(row),
    canApply: user.role === "user" && (state.status === "none" || state.status === "rejected"),
    canList: state.status === "approved",
  };
};

const PHONE_RE = /^\+?[0-9]{9,15}$/;
export const submitApplication = async ({ user, contactPhone, intendedUse }) => {
  if (user.role !== "user") throw err(403, "SELLER_APPLICATION_NOT_ALLOWED", "Only personal buyer accounts can apply for private-seller access.");
  if (user.emailVerified !== true) throw err(403, "EMAIL_VERIFICATION_REQUIRED", "Please verify your email address before applying to sell.");
  const phone = String(contactPhone || "").replace(/[\s-]/g, "");
  if (!PHONE_RE.test(phone)) throw err(400, "INVALID_PHONE", "A valid contact phone number is required.");
  const note = intendedUse == null ? null : String(intendedUse).trim().slice(0, 500) || null;
  const sb = getSupabase();
  const existing = await getCapabilityRow(user.id);
  if (existing && existing.status !== "rejected") throw err(409, "SELLER_APPLICATION_EXISTS", `A private-seller application already exists (status: ${existing.status}).`);
  const now = new Date().toISOString();
  if (!existing) {
    const { data, error } = await sb.from(TABLE).insert({ user_id: user.id, status: "pending", contact_phone: phone, intended_use: note, source: "application", submitted_at: now }).select("*").single();
    // The primary key makes a concurrent double-submit fail closed instead of creating a second application.
    if (error) { if (error.code === "23505") throw err(409, "SELLER_APPLICATION_EXISTS", "A private-seller application already exists."); throw error; }
    return map(data);
  }
  // Re-application after rejection: only from 'rejected', guarded in the WHERE so a concurrent change cannot be overwritten.
  const { data, error } = await sb.from(TABLE).update({ status: "pending", contact_phone: phone, intended_use: note, submitted_at: now, reviewed_by: null, reviewed_at: null, review_reason: null, updated_at: now })
    .eq("user_id", user.id).eq("status", "rejected").select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw err(409, "SELLER_APPLICATION_EXISTS", "A private-seller application already exists.");
  return map(data);
};

export const decideApplication = async ({ targetUserId, decision, reason, adminId }) => {
  const rule = DECISIONS[decision];
  if (!rule) throw err(400, "INVALID_DECISION", "Unknown decision.");
  const row = await getCapabilityRow(targetUserId);
  if (!row) throw err(404, "SELLER_APPLICATION_NOT_FOUND", "No private-seller application exists for this user.");
  if (!rule.from.includes(row.status)) throw err(409, "INVALID_TRANSITION", `Cannot ${decision} an application that is ${row.status}.`);
  if (["reject", "suspend", "revoke"].includes(decision) && !String(reason || "").trim()) throw err(400, "REASON_REQUIRED", "A reason is required for this decision.");
  const now = new Date().toISOString();
  const { data, error } = await getSupabase().from(TABLE).update({ status: rule.to, reviewed_by: adminId, reviewed_at: now, review_reason: reason ? String(reason).slice(0, 500) : null, updated_at: now })
    .eq("user_id", targetUserId).eq("status", row.status).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw err(409, "INVALID_TRANSITION", "The application changed while it was being reviewed; reload and retry.");
  // The database visibility trigger hides/restores eligible public listings atomically with the capability
  // transition above (same statement, same transaction). Phase 13F: report the outcome truthfully. Cache invalidation
  // runs in strict mode so a Redis failure is surfaced to the administrator instead of being swallowed; the decision
  // itself is NOT undone because the database (and every public read path's status filter) is authoritative.
  const visibilityChanged = (["suspended", "revoked"].includes(data.status) && row.status !== data.status)
    || (data.status === "approved" && ["suspended", "revoked"].includes(row.status));
  const visibility = { changed: visibilityChanged, cacheInvalidated: null, listingsHiddenByPolicy: null };
  if (visibilityChanged) {
    try {
      const { invalidatePublicListingCaches } = await import("../utils/publicListingCache.js");
      await invalidatePublicListingCaches({ strict: true });
      visibility.cacheInvalidated = true;
    } catch (cacheError) {
      visibility.cacheInvalidated = false;
      console.error("Private-seller listing cache invalidation failed", cacheError?.message || cacheError);
    }
    try {
      const { count, error: countError } = await getSupabase().from(EVENTS_TABLE).select("car_id", { count: "exact", head: true }).eq("seller_user_id", targetUserId).is("restored_at", null);
      if (!countError) visibility.listingsHiddenByPolicy = count ?? 0;
    } catch { /* informational only */ }
  }
  return { before: row.status, after: data.status, application: map(data), visibility };
};

export const listApplications = async ({ status, limit = 50 } = {}) => {
  let q = getSupabase().from(TABLE).select("*").order("submitted_at", { ascending: false }).limit(Math.min(Number(limit) || 50, 200));
  if (status && SELLER_STATUSES.includes(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(map);
};

/** Keeps the capability row in step when the LEGACY admin approval endpoint approves an individual_seller.
 *  Only a pending/rejected row is moved to approved. A suspended/revoked row is deliberately NOT reinstated here (reinstatement
 *  restores hidden listings and must go through the review workflow); the returned status lets the caller report that truthfully.
 *  Phase 13F: database errors now propagate (they were silently ignored) and the reviewing administrator is recorded. */
export const syncLegacyApproval = async (userId, adminId = null) => {
  const row = await getCapabilityRow(userId);
  if (!row) return { synced: false, status: null };
  if (row.status === "approved") return { synced: false, status: "approved" };
  if (!["pending", "rejected"].includes(row.status)) return { synced: false, status: row.status };
  const now = new Date().toISOString();
  const { data, error } = await getSupabase().from(TABLE)
    .update({ status: "approved", reviewed_by: adminId, reviewed_at: now, updated_at: now })
    .eq("user_id", userId).in("status", ["pending", "rejected"]).select("status");
  if (error) throw error;
  return { synced: (data || []).length > 0, status: (data || [])[0]?.status || row.status };
};
