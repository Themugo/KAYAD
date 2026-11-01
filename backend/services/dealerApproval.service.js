// Dealer approval: ONE place that decides whether a pending dealer application may be approved and turns the atomic database decision into
// an actionable result.
//
// The database function public.kayad_apply_dealer_verification_atomic is the transactional authority (users + dealers + dealer_verifications
// + audit row in one transaction, with row locks). It REQUIRES: a non-empty reason, an acting user whose users row is role admin|superadmin
// with status approved, an existing dealers row and an existing dealer_verifications row. Before this service existed the route sent no
// reason, never checked the rest and let every database exception surface as an opaque 500, so approval could not succeed and the
// operator was told only "failed".
//
// This module does not widen anybody's authority and does not bypass the function: it validates the application against the product's
// onboarding rules first (so an incomplete application is refused with a precise reason instead of being approved), calls the function
// with the operator's reason and maps its refusals to stable codes.
export const REASON_MIN = 8;
export const REQUIRED_DOCUMENTS = Object.freeze(["governmentId", "kraPin", "businessRegistration", "physicalAddress"]);

const text = (v) => (typeof v === "string" ? v.trim() : "");
export const cleanReason = (v) => {
  const t = typeof v === "string" ? [...v].map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch)).join("").trim().slice(0, 300) : "";
  return t.length >= REASON_MIN ? t : "";
};

export class DealerDecisionError extends Error {
  constructor(code, message, status = 409, extra = {}) { super(message); this.code = code; this.status = status; this.extra = extra; }
}

const defaultDeps = async () => {
  const db = await import("../db/index.js");
  const { getSupabase } = await import("../utils/supabase.js");
  return {
    findDealer: (userId) => db.findOne("dealers", { user: userId }),
    findVerification: (userId) => db.findOne("dealer_verifications", { user: userId }),
    findUser: (userId) => db.findById("users", userId),
    rpc: (name, args) => getSupabase().rpc(name, args),
  };
};

/**
 * Inspect an application. Returns { blockers: [{code,message}], warnings: [...], dealer, verification, alreadyApproved }.
 * A blocker means "do not approve": the application is incomplete or in a state approval must not silently override.
 */
export async function assessDealerApplication(user, deps) {
  const d = deps || (await defaultDeps());
  const blockers = [];
  const warnings = [];
  const dealer = await d.findDealer(String(user.id ?? user._id));
  const verification = await d.findVerification(String(user.id ?? user._id));
  const alreadyApproved = user.status === "approved" && dealer?.approved === true;

  if (user.isBanned) blockers.push({ code: "ACCOUNT_BANNED", message: "The account is banned. Reinstate it before approving." });
  if (!dealer) {
    blockers.push({ code: "DEALER_PROFILE_MISSING", message: "The dealer has not started onboarding: no dealer profile exists yet. The dealer must sign in and complete the business profile." });
  } else {
    const missing = [];
    if (!text(dealer.businessName)) missing.push("business name");
    if (!text(dealer.location)) missing.push("location");
    if (missing.length) blockers.push({ code: "DEALER_PROFILE_INCOMPLETE", message: `The dealer profile is missing: ${missing.join(", ")}.`, fields: missing });
    if (dealer.isSuspended) blockers.push({ code: "DEALER_SUSPENDED", message: "The dealer is suspended. Lift the suspension through the verification workflow first." });
  }
  if (!verification) {
    blockers.push({ code: "DEALER_VERIFICATION_NOT_SUBMITTED", message: "The dealer has not submitted verification documents." });
  } else {
    const status = verification.verificationStatus;
    if (status === "rejected") blockers.push({ code: "DEALER_VERIFICATION_REJECTED", message: "The application was rejected; the dealer must resubmit before it can be approved." });
    else if (status === "suspended") blockers.push({ code: "DEALER_VERIFICATION_SUSPENDED", message: "The dealer verification is suspended." });
    if (!verification.submittedAt) blockers.push({ code: "DEALER_VERIFICATION_NOT_SUBMITTED", message: "The dealer has not submitted verification documents." });
    const docs = verification.documents && typeof verification.documents === "object" ? verification.documents : {};
    const missingDocs = REQUIRED_DOCUMENTS.filter((k) => !docs[k] || (typeof docs[k] === "object" && Object.keys(docs[k]).length === 0));
    if (verification.submittedAt && missingDocs.length) {
      blockers.push({ code: "DEALER_DOCUMENTS_INCOMPLETE", message: `Required documents are missing: ${missingDocs.join(", ")}.`, documents: missingDocs });
    }
  }
  // Not blocking: a reviewer may approve before the dealer clicks the e-mail link, but the dealer cannot sign in until it is verified.
  if (user.emailVerified !== true) warnings.push({ code: "EMAIL_NOT_VERIFIED", message: "The dealer has not verified their e-mail address and cannot sign in until they do." });
  // De-duplicate by code (a missing submission can be reported by two checks).
  const seen = new Set();
  return { blockers: blockers.filter((b) => (seen.has(b.code) ? false : seen.add(b.code))), warnings, dealer, verification, alreadyApproved };
}

/** Map a refusal from the database function (or a missing function) to a stable, actionable error. Unknown errors are returned as null. */
export function mapDecisionError(err) {
  const msg = String(err?.message || "");
  const code = String(err?.code || "");
  if (code === "PGRST202" || code === "42883") return new DealerDecisionError("DATABASE_MIGRATION_REQUIRED", "The dealer approval function is not installed in this database. Nothing was changed.", 503);
  if (/Admin authorization required/i.test(msg)) return new DealerDecisionError("ADMIN_ACCOUNT_REQUIRED", "Your login is not an active administrator account in the database (its role must be admin or superadmin and its status approved). The approval was refused and nothing was changed.", 403);
  if (/Superadmin privileges required|Administrator privileges required|Administrative actor is not active/i.test(msg)) return new DealerDecisionError("INSUFFICIENT_ADMIN_ROLE", "Your administrator account does not have the privilege this decision requires. Nothing was changed.", 403);
  if (/capability is disabled or unknown/i.test(msg)) return new DealerDecisionError("ADMIN_CAPABILITY_UNAVAILABLE", "The dealer-management capability is disabled in the control registry. Nothing was changed.", 503);
  if (/changes are locked/i.test(msg)) return new DealerDecisionError("ADMIN_CHANGES_LOCKED", "Administrative changes are currently locked. Nothing was changed.", 423);
  if (/A reason is required/i.test(msg)) return new DealerDecisionError("REASON_REQUIRED", `State the reason for this decision (at least ${REASON_MIN} characters).`, 400);
  if (/Dealer record not found/i.test(msg)) return new DealerDecisionError("DEALER_PROFILE_MISSING", "The dealer has not started onboarding: no dealer profile exists yet. Nothing was changed.", 409);
  if (/Dealer verification record not found/i.test(msg)) return new DealerDecisionError("DEALER_VERIFICATION_NOT_SUBMITTED", "The dealer has not submitted verification documents. Nothing was changed.", 409);
  if (/User not found/i.test(msg)) return new DealerDecisionError("USER_NOT_FOUND", "The user no longer exists.", 404);
  if (/cannot be converted into a dealer/i.test(msg)) return new DealerDecisionError("SUPERADMIN_NOT_ELIGIBLE", "A superadmin account cannot be approved as a dealer. Use a separate dealer account.", 409);
  return null;
}

/**
 * Approve a dealer. Idempotent: an already-approved dealer returns { changed:false } with no database call and no side effects.
 * Throws DealerDecisionError for every refusal; any other error is the caller's 500.
 */
// Single-flight per target: two clicks (or two tabs on this instance) for the same dealer are serialised, so the second one re-reads the
// state the first produced and returns "already approved" instead of repeating the decision and its side effects. Across instances the
// database function (row locks, same end state) keeps the data consistent; only the duplicate-notification guarantee is per instance.
const inFlight = new Map();
const serialise = (key, task) => {
  const prev = inFlight.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(task);
  const tail = run.catch(() => {});
  inFlight.set(key, tail);
  tail.then(() => { if (inFlight.get(key) === tail) inFlight.delete(key); });
  return run;
};

export async function approveDealer({ user, actorId, reason }, deps) {
  const d = deps || (await defaultDeps());
  const why = cleanReason(reason);
  if (!why) throw new DealerDecisionError("REASON_REQUIRED", `State the reason for approving this dealer (at least ${REASON_MIN} characters).`, 400);
  if (user.role !== "dealer") throw new DealerDecisionError("NOT_A_DEALER_ACCOUNT", "Only dealer accounts are approved through dealer verification.", 400);
  const id = String(user.id ?? user._id);

  return serialise(id, async () => {
    // Re-read the account inside the lock: the row the caller holds may be stale (another admin or tab may have decided meanwhile).
    const fresh = (d.findUser ? await d.findUser(id) : null) || user;
    if (!fresh) throw new DealerDecisionError("USER_NOT_FOUND", "The user no longer exists.", 404);
    if (fresh.role !== "dealer") throw new DealerDecisionError("NOT_A_DEALER_ACCOUNT", "Only dealer accounts are approved through dealer verification.", 400);
    const assessed = await assessDealerApplication({ ...user, ...fresh, id }, d);
    if (assessed.alreadyApproved) return { changed: false, alreadyApproved: true, warnings: assessed.warnings };
    if (assessed.blockers.length) {
      throw new DealerDecisionError("DEALER_APPLICATION_INCOMPLETE", assessed.blockers.map((b) => b.message).join(" "), 409, { blockers: assessed.blockers });
    }

    const { data, error } = await d.rpc("kayad_apply_dealer_verification_atomic", { p_user: id, p_action: "approve", p_admin: String(actorId), p_reason: why });
    if (error) {
      const mapped = mapDecisionError(error);
      if (mapped) throw mapped;
      throw error;
    }
    return { changed: true, alreadyApproved: false, warnings: assessed.warnings, result: data, reason: why };
  });
}

/** Same mapping for the reject / suspend actions that go through verify-dealer. */
export async function applyDealerAction({ userId, action, actorId, reason }, deps) {
  const d = deps || (await defaultDeps());
  if (!["approve", "reject"].includes(action)) throw new DealerDecisionError("INVALID_ACTION", "Action must be 'approve' or 'reject'.", 400);
  const why = cleanReason(reason);
  if (!why) throw new DealerDecisionError("REASON_REQUIRED", `State the reason for this decision (at least ${REASON_MIN} characters).`, 400);
  const { data, error } = await d.rpc("kayad_apply_dealer_verification_atomic", { p_user: String(userId), p_action: action, p_admin: String(actorId), p_reason: why });
  if (error) {
    const mapped = mapDecisionError(error);
    if (mapped) throw mapped;
    throw error;
  }
  return { changed: true, result: data, reason: why };
}

/** Batch view for the Seller Management list: what each pending dealer still lacks. Fail-soft: an unreadable store returns null (unknown). */
export async function summarizeApplications(users, deps) {
  const dealers = users.filter((u) => u.role === "dealer");
  if (!dealers.length) return new Map();
  const d = deps || (await defaultDeps());
  const out = new Map();
  for (const u of dealers) {
    try {
      const a = await assessDealerApplication(u, d);
      out.set(String(u.id ?? u._id), { blockers: a.blockers.map((b) => ({ code: b.code, message: b.message })), warnings: a.warnings.map((w) => w.code), alreadyApproved: a.alreadyApproved });
    } catch { out.set(String(u.id ?? u._id), null); }
  }
  return out;
}
