// Dealer suspension = a reasoned REQUEST by Admin staff + a Super Admin DECISION. A pending request is never an effective suspension.
// The effective restriction reuses the existing mechanism (verificationController.applyVerificationTransition); this service only
// records, authorises and sequences the request. Separation of duties is enforced here and by DB constraints.
import { getSupabase } from "../utils/supabase.js";
import { findById } from "../db/index.js";
import { sendNotification } from "./notification.service.js";
import { isMissingDatabaseObject } from "../middleware/provisioningGuard.js";
import { logError } from "../utils/logger.js";

const TABLE = "dealer_suspension_requests";
export const REASON_CATEGORIES = ["policy_violation", "fraud_or_misrepresentation", "compliance_or_documents", "customer_harm", "security", "other"];
const err = (status, code, message) => Object.assign(new Error(message), { statusCode: status, status, code });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const map = (r) => r && ({
  id: r.id, verificationId: r.verification_id, dealerUserId: r.dealer_user_id, requestedBy: r.requested_by,
  reasonCategory: r.reason_category, reason: r.reason, evidenceReference: r.evidence_reference ?? null, scope: r.scope,
  status: r.status, decidedBy: r.decided_by ?? null, decidedAt: r.decided_at ?? null, decisionReason: r.decision_reason ?? null,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
const guard = (e) => { if (isMissingDatabaseObject(e)) throw err(503, "FEATURE_NOT_PROVISIONED", "Dealer suspension requests are not provisioned in this environment (the table is not present). No request was recorded and no dealer was changed."); throw e; };

export const submitRequest = async ({ verificationId, actor, reasonCategory, reason, evidenceReference }) => {
  if (!UUID_RE.test(String(verificationId || ""))) throw err(400, "INVALID_ID", "Invalid dealer verification id.");
  if (actor?.role !== "admin") throw err(403, "REQUEST_ROLE_REQUIRED", "Only Admin staff submit suspension requests. A Super Admin suspends directly with a recorded reason.");
  if (!REASON_CATEGORIES.includes(reasonCategory)) throw err(400, "INVALID_REASON_CATEGORY", "Choose a valid reason category.");
  const text = String(reason || "").trim();
  if (text.length < 10) throw err(400, "REASON_REQUIRED", "Enter a detailed reason (at least 10 characters).");
  const verification = await findById("dealer_verifications", verificationId);
  if (!verification) throw err(404, "VERIFICATION_NOT_FOUND", "Dealer verification not found.");
  if (verification.verificationStatus !== "approved") throw err(409, "DEALER_NOT_SUSPENDABLE", `Only an approved dealer can be suspended (current status: ${verification.verificationStatus}).`);
  const { data, error } = await getSupabase().from(TABLE).insert({
    verification_id: verificationId, dealer_user_id: verification.user ?? null, requested_by: actor.id,
    reason_category: reasonCategory, reason: text.slice(0, 2000), evidence_reference: evidenceReference ? String(evidenceReference).trim().slice(0, 500) || null : null,
  }).select("*").single();
  if (error) {
    if (error.code === "23505") throw err(409, "SUSPENSION_REQUEST_EXISTS", "A suspension request for this dealer is already pending.");
    guard(error);
  }
  await notifySuperAdmins(data, verification).catch((e) => logError("Suspension request notification failed", e));
  return map(data);
};

async function notifySuperAdmins(row, verification) {
  const { data } = await getSupabase().from("users").select("id").eq("role", "superadmin").limit(50);
  await Promise.all((data || []).map((u) => sendNotification({
    userId: u.id, title: "Dealer suspension awaiting your decision",
    message: `An Admin requested a dealer suspension (${row.reason_category.replace(/_/g, " ")}). It takes effect only if you approve it.`, type: "verification",
  })));
}

export const listRequests = async ({ actor, status, limit = 50 }) => {
  let q = getSupabase().from(TABLE).select("*").order("created_at", { ascending: false }).limit(Math.min(Number(limit) || 50, 200));
  if (["pending", "approved", "rejected", "cancelled"].includes(status)) q = q.eq("status", status);
  if (actor.role !== "superadmin") q = q.eq("requested_by", actor.id); // Admin staff see their own requests only
  const { data, error } = await q;
  if (error) guard(error);
  return (data || []).map(map);
};

export const cancelRequest = async ({ requestId, actor }) => {
  if (!UUID_RE.test(String(requestId || ""))) throw err(400, "INVALID_ID", "Invalid request id.");
  const { data: row, error } = await getSupabase().from(TABLE).select("*").eq("id", requestId).maybeSingle();
  if (error) guard(error);
  if (!row) throw err(404, "REQUEST_NOT_FOUND", "Suspension request not found.");
  if (row.requested_by !== actor.id && actor.role !== "superadmin") throw err(403, "NOT_YOUR_REQUEST", "Only the requester or a Super Admin can cancel a request.");
  const { data, error: upErr } = await getSupabase().from(TABLE).update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", requestId).eq("status", "pending").select("*").maybeSingle();
  if (upErr) guard(upErr);
  if (!data) throw err(409, "REQUEST_NOT_PENDING", `The request is already ${row.status}.`);
  return map(data);
};

/** decision: "approve" | "reject". Only a Super Admin, never the requester. Atomic claim of the pending row prevents replay/double approval. */
export const decideRequest = async ({ requestId, actor, decision, reason, applySuspension }) => {
  if (!UUID_RE.test(String(requestId || ""))) throw err(400, "INVALID_ID", "Invalid request id.");
  if (actor?.role !== "superadmin") throw err(403, "SUPER_ADMIN_REQUIRED", "Only a Super Admin can decide a dealer suspension request.");
  if (!["approve", "reject"].includes(decision)) throw err(400, "INVALID_DECISION", "Decision must be approve or reject.");
  const note = String(reason || "").trim();
  if (decision === "reject" && note.length < 3) throw err(400, "REASON_REQUIRED", "A reason is required to reject a request.");
  const sb = getSupabase();
  const { data: row, error } = await sb.from(TABLE).select("*").eq("id", requestId).maybeSingle();
  if (error) guard(error);
  if (!row) throw err(404, "REQUEST_NOT_FOUND", "Suspension request not found.");
  if (row.requested_by === actor.id) throw err(403, "SELF_APPROVAL_FORBIDDEN", "You cannot decide a request you submitted.");
  if (row.status !== "pending") throw err(409, "REQUEST_NOT_PENDING", `The request is already ${row.status}.`);
  const now = new Date().toISOString();
  const claim = await sb.from(TABLE).update({ status: decision === "approve" ? "approved" : "rejected", decided_by: actor.id, decided_at: now, decision_reason: note || null, updated_at: now })
    .eq("id", requestId).eq("status", "pending").select("*").maybeSingle();
  if (claim.error) guard(claim.error);
  if (!claim.data) throw err(409, "REQUEST_NOT_PENDING", "The request was decided by someone else; reload.");
  if (decision === "approve") {
    try {
      const verification = await applySuspension(row.verification_id, { suspensionReason: row.reason, adminNotes: `Approved suspension request ${row.id}` });
      await sendNotification({ userId: row.requested_by, title: "Dealer suspension request approved", message: "A Super Admin approved your request; the dealer is now suspended.", type: "verification" }).catch((e) => logError("Approval notification failed", e));
      return { request: map(claim.data), verification };
    } catch (e) {
      // The restriction did not apply: put the request back to pending so the decision can be retried; nothing is half-done.
      await sb.from(TABLE).update({ status: "pending", decided_by: null, decided_at: null, decision_reason: null, updated_at: new Date().toISOString() }).eq("id", requestId).eq("status", "approved");
      throw e;
    }
  }
  await sendNotification({ userId: row.requested_by, title: "Dealer suspension request rejected", message: `A Super Admin rejected your request: ${note}`, type: "verification" }).catch((e) => logError("Rejection notification failed", e));
  return { request: map(claim.data), verification: null };
};
