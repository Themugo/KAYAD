// backend/services/ownerGovernance.service.js — STAGE 5B
// ─────────────────────────────────────────────────────────────────────────
// Application side of database-backed multi-owner governance. The database functions (migration candidate
// 20261019120000_stage5b_owner_governance_CANDIDATE.sql) are the ONLY write path and enforce the invariants (single
// advisory lock, last-usable-owner rule, one pending invitation per address, append-only events, same-transaction session
// revocation). This layer adds: step-up (password re-entry) + typed confirmation, invitation delivery through the existing
// Brevo adapter, notifications, registry invalidation, forced socket disconnect, and the read model for the admin console.
// Tokens exist in memory and in the e-mail only; the database stores SHA-256 hashes; nothing here ever logs or returns one.
// ─────────────────────────────────────────────────────────────────────────
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getSupabase } from "../utils/supabase.js";
import UserAuth from "../models/UserAuth.js";
import { OWNER_EMAILS, normalizeOwnerEmail } from "../config/owners.js";
import * as registry from "./ownerRegistry.service.js";
import { deliver } from "./communicationGateway.service.js";
import { COMMUNICATION_EVENTS } from "./communicationEvents.service.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { getIO } from "../utils/io.js";
import { logError, logWarn } from "../infrastructure/logging/index.js";

export class OwnerError extends Error {
  constructor(code, message, status = 400, extra = {}) { super(message); this.code = code; this.status = status; this.extra = extra; }
}

const MESSAGES = {
  OWNER_INVALID_REQUEST: [400, "The request is not valid."],
  OWNER_INVALID_EXPIRY: [400, "The invitation lifetime is out of range."],
  OWNER_ACTOR_NOT_OWNER: [403, "Only a verified, active owner can do this."],
  OWNER_ACTOR_REQUIRED: [403, "This action needs an acting owner."],
  OWNER_ALREADY_ACTIVE: [409, "That identity is already an active owner."],
  OWNER_NEEDS_RECOVERY: [409, "That owner membership exists but is not usable (unverified, suspended or its e-mail changed). Use the recovery procedure."],
  OWNER_INVITATION_PENDING: [409, "An invitation for that address is already pending. Use Resend to issue a fresh link."],
  OWNER_INVITATION_NOT_FOUND: [404, "No such pending invitation."],
  OWNER_INVITATION_CLOSED: [409, "That invitation was already accepted or revoked."],
  OWNER_INVITATION_COOLDOWN: [429, "An invitation was sent a moment ago. Wait a minute before resending."],
  OWNER_INVITATION_INVALID: [400, "This invitation link is not valid. Ask an owner to send a new one."],
  OWNER_INVITATION_EXPIRED: [410, "This invitation link has expired. Ask an owner to resend it."],
  OWNER_BOOTSTRAP_CLOSED: [409, "The one-time bootstrap is closed. Use the documented recovery procedure."],
  OWNER_RECOVERY_NOT_NEEDED: [409, "Emergency recovery is only available when no usable owner exists."],
  OWNER_LOGIN_REQUIRED: [401, "Sign in to the account that received this invitation, then open the link again."],
  OWNER_ACCOUNT_BLOCKED: [403, "That account is suspended or otherwise blocked; it cannot become an owner."],
  OWNER_PASSWORD_REQUIRED: [400, "Choose a password that meets the policy."],
  OWNER_NOT_MEMBER: [404, "That identity is not an active owner."],
  OWNER_LAST_USABLE: [409, "Blocked: this would leave KAYAD with no verified, active owner. Add and activate another owner first."],
  OWNER_NONE_ESTABLISHED: [409, "No verified, active owner exists yet."],
};
export const ownerError = (code, extra) => { const [status, message] = MESSAGES[code] || [400, "The request could not be completed."]; return new OwnerError(code, message, status, extra); };

const sha = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("hex");
const TOKEN_RE = /^[0-9a-f]{64}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const inviteTtlMs = () => Math.min(168, Math.max(1, Number(process.env.OWNER_INVITE_TTL_HOURS) || 24)) * 3600 * 1000;
const label = (user) => `owner:${normalizeOwnerEmail(user?.email)}`;
const mask = (e) => String(e || "").replace(/^(.{2}).*(@.*)$/, "$1***$2");

export function passwordPolicyViolation(pw) {
  const p = String(pw || "");
  if (p.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(p)) return "Password must contain at least one lowercase letter";
  if (!/\d/.test(p)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(p)) return "Password must contain at least one special character";
  return null;
}

async function rpc(name, args) {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) {
    if (/PGRST202|42883/.test(String(error.code))) throw new OwnerError("OWNER_STORE_NOT_INSTALLED", "Owner governance is not installed in this database yet (migration candidate pending approval).", 503);
    throw new OwnerError("OWNER_STORE_UNAVAILABLE", "The owner membership store is temporarily unavailable. See the owner recovery runbook if this persists.", 503);
  }
  return data;
}
const unwrap = (r) => { if (!r || r.ok !== true) throw ownerError(r?.code || "OWNER_INVALID_REQUEST"); return r; };

export async function logEvent(action, result, { actor = null, actorLabelText = "system", email = null, target = null, reason = null, meta = {} } = {}) {
  try { await rpc("kayad_owner_log_event", { p_action: action, p_result: result, p_actor: actor, p_actor_label: actorLabelText, p_email: email, p_target: target, p_reason: reason, p_meta: meta }); }
  catch (e) { logWarn("owner event could not be recorded", { event: "owner.event_failed", action, code: e?.code }); }
}

// ───────────── step-up: fresh authentication for sensitive membership changes ─────────────
const stepUpFailures = new Map(); // userId -> { n, first }
const STEP_UP_MAX = 5, STEP_UP_WINDOW_MS = 15 * 60 * 1000;
export async function requireStepUp(actor, password) {
  const now = Date.now();
  const rec = stepUpFailures.get(actor.id);
  if (rec && now - rec.first > STEP_UP_WINDOW_MS) stepUpFailures.delete(actor.id);
  const cur = stepUpFailures.get(actor.id);
  if (cur && cur.n >= STEP_UP_MAX) throw new OwnerError("STEP_UP_LOCKED", "Too many incorrect passwords. Try again in 15 minutes.", 429);
  const auth = typeof password === "string" && password ? await UserAuth.findOne({ user: actor.id }).select("+password") : null;
  const ok = auth?.password ? await bcrypt.compare(password, auth.password) : (await bcrypt.compare(String(password || "x"), "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv"), false);
  if (!ok) {
    const n = (stepUpFailures.get(actor.id)?.n || 0) + 1;
    stepUpFailures.set(actor.id, { n, first: stepUpFailures.get(actor.id)?.first || now });
    await logEvent("step_up", "denied", { actor: actor.id, actorLabelText: label(actor), email: normalizeOwnerEmail(actor.email), reason: "incorrect password" });
    throw new OwnerError("STEP_UP_FAILED", "Your password is incorrect. Re-enter your password to confirm this change.", 403);
  }
  stepUpFailures.delete(actor.id);
}
const requireTypedConfirmation = (typed, expected) => {
  if (normalizeOwnerEmail(typed) !== normalizeOwnerEmail(expected)) throw new OwnerError("CONFIRMATION_MISMATCH", "Type the exact e-mail address of the identity you are changing to confirm.", 400);
};

// ───────────── delivery ─────────────
const frontendUrl = () => (process.env.FRONTEND_URL || "https://www.kayad.space").replace(/\/+$/, "");
async function buildEmail(builder, args, fallback) { try { return (await import("./email.service.js"))[builder](args); } catch { return fallback; } }
async function sendInvitationEmail({ id, email, token, kind, invitedBy, resend }) {
  const acceptUrl = `${frontendUrl()}/owner-invite?token=${encodeURIComponent(token)}`;
  const ttlHours = Math.round(inviteTtlMs() / 3600000);
  try {
    const delivery = await deliver({
      userId: null, channel: "email", eventType: COMMUNICATION_EVENTS.OWNER_INVITATION /* secret-bearing: body/URL never persisted */,
      templateCode: "owner_invitation_email", recipient: email,
      ...(await buildEmail("buildOwnerInvitationEmail", { acceptUrl, kind, expiresInHours: ttlHours, invitedBy, resend },
        { subject: "Owner invitation — KAYAD", text: `Open this one-time link to continue: ${acceptUrl}`, html: `<p><a href="${acceptUrl}">Accept owner invitation</a></p>` })),
      metadata: { verification: true, resend: !!resend },
      idempotencyKey: `owner-invite:${id}:${sha(token).slice(0, 16)}`,
    });
    return { delivered: delivery?.status === "sent", status: delivery?.status || "suppressed" };
  } catch (e) {
    logError("Owner invitation e-mail dispatch failed", e, { event: "owner.invitation_email_failed" });
    return { delivered: false, status: "failed" };
  }
}
async function notifyOwners(headline, detail, { alsoTo = [] } = {}) {
  const targets = new Map();
  for (const [email, uid] of registry.currentOwners()) targets.set(email, uid);
  for (const e of alsoTo.map(normalizeOwnerEmail)) if (e && !targets.has(e)) targets.set(e, null);
  for (const [email, uid] of targets) {
    void (async () => {
      try {
        await deliver({ userId: uid, channel: "email", eventType: COMMUNICATION_EVENTS.OWNER_SECURITY_NOTICE, category: "system", templateCode: "owner_membership_notice", recipient: email,
          ...(await buildEmail("buildOwnerNoticeEmail", { headline, detail }, { subject: `Security notice: ${headline}`, text: `${headline}. ${detail}`, html: `<p>${headline}. ${detail}</p>` })),
          metadata: { ownerNotice: true } });
      } catch (e) { logWarn("owner notice not delivered", { event: "owner.notice_failed", to: mask(email), error: e?.message }); }
    })();
  }
}

// ───────────── read model ─────────────
export async function listGovernance({ eventLimit = 100 } = {}) {
  const sb = getSupabase();
  const [m, i, ev, st] = await Promise.all([
    sb.from("owner_memberships").select("*").order("activated_at", { ascending: true }),
    sb.from("owner_invitations").select("id,email,kind,status,invited_by_label,note,expires_at,resend_count,last_sent_at,accepted_at,created_at").order("created_at", { ascending: false }).limit(50),
    sb.from("owner_membership_events").select("id,at,action,result,actor_label,target_email,reason,metadata").order("at", { ascending: false }).limit(Math.min(Math.max(eventLimit, 1), 500)),
    sb.from("owner_bootstrap_state").select("status,closed_at,closed_by,closed_reason").eq("id", 1).maybeSingle(),
  ]);
  for (const r of [m, i, ev, st]) if (r.error) throw new OwnerError("OWNER_STORE_UNAVAILABLE", "The owner membership store is temporarily unavailable. See the owner recovery runbook if this persists.", 503);
  const ids = [...new Set((m.data || []).map((x) => x.user_id))];
  const users = ids.length ? (await sb.from("users").select("id,name,email,email_verified,is_banned,deactivated_at,status").in("id", ids)).data || [] : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const now = Date.now();
  const members = (m.data || []).map((x) => {
    const u = byId.get(x.user_id);
    const verified = u?.email_verified === true;
    const blocked = !u || u.is_banned === true || !!u.deactivated_at || ["suspended", "banned", "deactivated", "rejected"].includes(u.status);
    const emailMatches = !!u && normalizeOwnerEmail(u.email) === x.email;
    return { id: x.id, userId: x.user_id, name: u?.name || null, email: x.email, status: x.status, verified, usable: x.status === "active" && verified && !blocked && emailMatches,
      blockedReason: x.status !== "active" ? null : !verified ? "email not verified" : blocked ? "account suspended or deactivated" : !emailMatches ? "account e-mail changed" : null,
      addedVia: x.added_via, addedBy: x.added_by_label, activatedAt: x.activated_at, revokedAt: x.revoked_at, revokedBy: x.revoked_by_label, revokeReason: x.revoke_reason };
  });
  const invitations = (i.data || []).map((x) => ({ id: x.id, email: x.email, kind: x.kind, status: x.status === "pending" && new Date(x.expires_at).getTime() <= now ? "expired" : x.status,
    invitedBy: x.invited_by_label, note: x.note, expiresAt: x.expires_at, resendCount: x.resend_count, lastSentAt: x.last_sent_at, acceptedAt: x.accepted_at, createdAt: x.created_at }));
  const events = (ev.data || []).map((x) => ({ id: x.id, at: x.at, action: x.action, result: x.result, actor: x.actor_label, targetEmail: x.target_email, reason: x.reason, metadata: x.metadata || {} }));
  return { members, invitations, events, bootstrap: st.data || null, store: registry.describe(), designatedCount: OWNER_EMAILS.length };
}

// ───────────── mutations (owner-initiated) ─────────────
export async function inviteOwner({ actor, email, confirmEmail, password, note, kind = "invitation" }) {
  const target = normalizeOwnerEmail(email);
  if (!EMAIL_RE.test(target)) throw ownerError("OWNER_INVALID_REQUEST");
  requireTypedConfirmation(confirmEmail, target);
  await requireStepUp(actor, password);
  const token = newToken();
  const r = unwrap(await rpc("kayad_owner_issue_invitation", { p_email: target, p_kind: kind, p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: actor.id, p_actor_label: label(actor), p_note: note ? String(note).slice(0, 500) : null }));
  registry.invalidate({ taint: false }); // invitation only: no privilege changed
  const mail = await sendInvitationEmail({ id: r.id, email: target, token, kind, invitedBy: normalizeOwnerEmail(actor.email), resend: false });
  await registry.ensureFresh();
  await notifyOwners("An owner invitation was issued", `${mask(normalizeOwnerEmail(actor.email))} invited ${mask(target)} to become a platform owner. Access is granted only after that person verifies their mailbox and accepts.`);
  return { invitation: { id: r.id, email: target, kind, expiresAt: r.expires_at }, emailDelivered: mail.delivered, emailStatus: mail.status };
}

async function invitationRow(id) {
  const { data, error } = await getSupabase().from("owner_invitations").select("id,email,kind,status").eq("id", id).maybeSingle();
  if (error) throw ownerError("OWNER_STORE_UNAVAILABLE");
  if (!data) throw ownerError("OWNER_INVITATION_NOT_FOUND");
  return data;
}

export async function resendInvitation({ actor, invitationId, confirmEmail, password }) {
  const row = await invitationRow(invitationId);
  requireTypedConfirmation(confirmEmail, row.email);
  await requireStepUp(actor, password);
  const token = newToken();
  const r = unwrap(await rpc("kayad_owner_resend_invitation", { p_invitation_id: invitationId, p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: actor.id, p_actor_label: label(actor), p_cooldown_seconds: Number(process.env.OWNER_INVITE_RESEND_COOLDOWN_SECONDS ?? 60) }));
  registry.invalidate({ taint: false });
  const mail = await sendInvitationEmail({ id: r.id, email: r.email, token, kind: r.kind, invitedBy: normalizeOwnerEmail(actor.email), resend: true });
  return { invitation: { id: r.id, email: r.email, kind: r.kind, expiresAt: r.expires_at }, emailDelivered: mail.delivered, emailStatus: mail.status };
}

export async function revokeInvitation({ actor, invitationId, confirmEmail, password, reason }) {
  const row = await invitationRow(invitationId);
  requireTypedConfirmation(confirmEmail, row.email);
  await requireStepUp(actor, password);
  unwrap(await rpc("kayad_owner_revoke_invitation", { p_invitation_id: invitationId, p_actor: actor.id, p_actor_label: label(actor), p_reason: String(reason || "revoked by owner").slice(0, 500) }));
  registry.invalidate({ taint: false });
  return { revoked: true };
}

async function memberRow(userId) {
  const { data, error } = await getSupabase().from("owner_memberships").select("id,user_id,email,status").eq("user_id", userId).eq("status", "active").maybeSingle();
  if (error) throw ownerError("OWNER_STORE_UNAVAILABLE");
  if (!data) throw ownerError("OWNER_NOT_MEMBER");
  return data;
}

function afterRevocation(userId) {
  registry.invalidate();
  invalidateUserCache(userId);
  try { getIO()?.in(`user_${userId}`).disconnectSockets(true); } catch (e) { logWarn("socket disconnect after owner revocation failed", { error: e?.message }); }
}

export async function removeOwner({ actor, targetUserId, confirmEmail, password, reason }) {
  const m = await memberRow(targetUserId);
  requireTypedConfirmation(confirmEmail, m.email);
  const why = String(reason || "").trim();
  if (why.length < 3) throw new OwnerError("REASON_REQUIRED", "Give a short reason; it is recorded in the audit history.", 400);
  await requireStepUp(actor, password);
  const r = unwrap(await rpc("kayad_owner_revoke_membership_atomic", { p_target_user: targetUserId, p_actor: actor.id, p_actor_label: label(actor), p_reason: why.slice(0, 500) }));
  afterRevocation(targetUserId);
  await registry.ensureFresh();
  await notifyOwners("An owner was removed", `${mask(normalizeOwnerEmail(actor.email))} removed ${mask(m.email)} as a platform owner. Their sessions were ended.`, { alsoTo: [m.email] });
  return { removed: true, usableOwnersRemaining: r.usable_after };
}

const VERIFIED_VIA = new Set(["in_person", "video_call", "phone_call_known_number", "other_documented"]);
/** One owner recovers another whose mailbox/credentials are lost: end their access now, then re-invite with a credential reset. */
/** An interrupted recovery leaves the member revoked with reason "recovery: …" and no pending invitation: it can simply be re-issued. */
async function interruptedRecovery(userId) {
  const sb = getSupabase();
  const { data: m, error } = await sb.from("owner_memberships").select("id,user_id,email,status,revoke_reason,revoked_at").eq("user_id", userId).eq("status", "revoked").order("revoked_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !m || !/^recovery:/.test(String(m.revoke_reason || ""))) return null;
  const { data: active } = await sb.from("owner_memberships").select("id").eq("email", m.email).eq("status", "active").maybeSingle();
  if (active) return null;
  const { data: pend } = await sb.from("owner_invitations").select("id").eq("email", m.email).eq("status", "pending").maybeSingle();
  return pend ? null : m;
}

/** One owner recovers another whose mailbox/credentials are lost: end their access now, then re-invite with a credential reset. */
export async function recoverOwner({ actor, targetUserId, confirmEmail, password, verifiedVia, note }) {
  let m; let resumed = false;
  try { m = await memberRow(targetUserId); } catch (e) { if (e?.code !== "OWNER_NOT_MEMBER") throw e; m = await interruptedRecovery(targetUserId); resumed = !!m; if (!m) throw e; }
  if (m.user_id === actor.id) throw new OwnerError("RECOVERY_SELF", "Recover another owner; to change your own credentials use the normal password change.", 400);
  requireTypedConfirmation(confirmEmail, m.email);
  if (!VERIFIED_VIA.has(verifiedVia) || String(note || "").trim().length < 10) throw new OwnerError("RECOVERY_EVIDENCE_REQUIRED", "Record how the person's identity was verified out of band (not by e-mail alone) and a short note.", 400);
  await requireStepUp(actor, password);
  if (!resumed) {
    unwrap(await rpc("kayad_owner_revoke_membership_atomic", { p_target_user: targetUserId, p_actor: actor.id, p_actor_label: label(actor), p_reason: `recovery: ${verifiedVia}: ${String(note).trim()}`.slice(0, 500) }));
    afterRevocation(targetUserId);
  }
  const token = newToken();
  let r;
  try {
    r = unwrap(await rpc("kayad_owner_issue_invitation", { p_email: m.email, p_kind: "recovery", p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: actor.id, p_actor_label: label(actor), p_note: `verified via ${verifiedVia}` }));
  } catch (e) {
    // The membership is already revoked (the safe state). Say so and make the retry possible instead of leaving the person stranded.
    await logEvent("recovery_issue", "failed", { actor: actor.id, actorLabelText: label(actor), email: m.email, target: m.user_id, reason: String(e?.code || "error").slice(0, 80) });
    throw new OwnerError("OWNER_RECOVERY_INCOMPLETE", "Access for this owner was ended but the recovery invitation could not be issued. Run Recover again for the same person to re-issue it.", 503, { retry: true });
  }
  registry.invalidate({ taint: false });
  const mail = await sendInvitationEmail({ id: r.id, email: m.email, token, kind: "recovery", invitedBy: normalizeOwnerEmail(actor.email), resend: false });
  await registry.ensureFresh();
  await notifyOwners("Owner recovery started", `${mask(normalizeOwnerEmail(actor.email))} started recovery for ${mask(m.email)} (identity verified out of band). The old credentials stop working when the new link is accepted.`);
  return { recovery: true, resumed, invitation: { id: r.id, email: m.email, expiresAt: r.expires_at }, emailDelivered: mail.delivered };
}

// ───────────── invitee side (public routes, token-gated) ─────────────
export async function previewInvitation(token) {
  if (!TOKEN_RE.test(String(token || ""))) throw ownerError("OWNER_INVITATION_INVALID");
  const { data, error } = await getSupabase().from("owner_invitations").select("email,kind,status,expires_at").eq("token_hash", sha(token)).maybeSingle();
  if (error) throw ownerError("OWNER_STORE_UNAVAILABLE");
  if (!data || data.status === "accepted" || data.status === "revoked") throw ownerError("OWNER_INVITATION_INVALID");
  if (data.status === "expired" || new Date(data.expires_at).getTime() <= Date.now()) throw ownerError("OWNER_INVITATION_EXPIRED");
  const u = (await getSupabase().from("users").select("id,email_verified").eq("email", data.email).maybeSingle()).data;
  return { valid: true, kind: data.kind, expiresAt: data.expires_at, email: mask(data.email), mode: u?.email_verified === true ? "signin" : "set_password" };
}

export async function acceptInvitation({ token, name, password, authUserId }) {
  if (!TOKEN_RE.test(String(token || ""))) throw ownerError("OWNER_INVITATION_INVALID");
  let hash = null;
  if (password !== undefined && password !== null && password !== "") {
    const v = passwordPolicyViolation(password);
    if (v) throw new OwnerError("OWNER_PASSWORD_POLICY", v, 400);
    hash = await bcrypt.hash(password, 12);
  }
  const r = unwrap(await rpc("kayad_owner_accept_invitation_atomic", { p_token_hash: sha(token), p_name: String(name || "").slice(0, 120) || null, p_password_hash: hash, p_authenticated_user: authUserId || null }));
  invalidateUserCache(r.user_id);
  registry.invalidate();
  await registry.ensureFresh();
  // bootstrap switches itself off once every designated identity is established
  try {
    const established = new Set(registry.currentOwners().map(([e]) => e));
    if (OWNER_EMAILS.length && OWNER_EMAILS.every((e) => established.has(e))) await rpc("kayad_owner_bootstrap_close", { p_actor_label: "system:auto", p_reason: "all designated owners established" });
  } catch (e) { logWarn("bootstrap auto-close not completed", { error: e?.message }); }
  await notifyOwners("An owner joined", `${mask(r.email)} accepted an owner invitation (${r.kind}) and is now an active platform owner.`);
  return { accepted: true, email: mask(r.email), accountCreated: r.account_created, credentialsReset: r.credentials_reset };
}

// ───────────── bootstrap (operator CLI) ─────────────
/** State of each DESIGNATED identity, without exposing anything beyond a masked address and a state word. */
export async function bootstrapReport() {
  const sb = getSupabase();
  const snap = await rpc("kayad_owner_snapshot");
  const owners = new Map((snap.owners || []).map((o) => [normalizeOwnerEmail(o.email), o]));
  const pending = new Set((snap.pending_emails || []).map(normalizeOwnerEmail));
  const rows = [];
  for (const email of OWNER_EMAILS) {
    const u = (await sb.from("users").select("id,email_verified,is_banned,deactivated_at,status").eq("email", email).maybeSingle()).data;
    const o = owners.get(email);
    let state;
    if (o?.usable) state = "provisioned";
    else if (o) state = "active_not_usable";
    else if (u && (u.is_banned === true || u.deactivated_at || ["suspended", "banned", "deactivated", "rejected"].includes(u.status))) state = "blocked";
    else if (pending.has(email)) state = "invitation_pending";
    else if (u && u.email_verified !== true) state = "pending_verification";
    else if (u) state = "account_verified_not_owner";
    else state = "unprovisioned";
    rows.push({ identity: mask(email), email, state });
  }
  return { bootstrap: snap.bootstrap, usableOwners: (snap.owners || []).filter((o) => o.usable).length, designated: rows };
}

export async function bootstrapApply({ operator, resendPending = false }) {
  if (!operator || String(operator).trim().length < 3) throw new OwnerError("OPERATOR_REQUIRED", "--operator <name> is required so the audit record names who ran the bootstrap.", 400);
  const label_ = `bootstrap-cli:${String(operator).trim().slice(0, 60)}`;
  const report = await bootstrapReport();
  if (report.bootstrap !== "open") throw ownerError("OWNER_BOOTSTRAP_CLOSED");
  const out = [];
  for (const row of report.designated) {
    if (["provisioned", "active_not_usable"].includes(row.state)) { out.push({ identity: row.identity, result: row.state === "provisioned" ? "already_provisioned" : "needs_attention_not_usable" }); continue; }
    if (row.state === "blocked") { out.push({ identity: row.identity, result: "refused_blocked_account" }); continue; }
    // a verified account that was never made an owner may still be invited — acceptance asks it to sign in, never to reset its password
    const token = newToken();
    let r;
    if (row.state === "invitation_pending") {
      if (!resendPending) { out.push({ identity: row.identity, result: "invitation_already_pending" }); continue; }
      const { data } = await getSupabase().from("owner_invitations").select("id").eq("email", row.email).eq("status", "pending").maybeSingle();
      r = await rpc("kayad_owner_resend_invitation", { p_invitation_id: data?.id, p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: null, p_actor_label: label_, p_cooldown_seconds: 60 });
    } else {
      r = await rpc("kayad_owner_issue_invitation", { p_email: row.email, p_kind: "bootstrap", p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: null, p_actor_label: label_, p_note: "initial owner bootstrap" });
    }
    if (!r?.ok) { out.push({ identity: row.identity, result: `refused:${r?.code}` }); continue; }
    const mail = await sendInvitationEmail({ id: r.id, email: row.email, token, kind: "bootstrap", invitedBy: "the KAYAD platform operator", resend: row.state === "invitation_pending" });
    out.push({ identity: row.identity, result: mail.delivered ? "invitation_sent" : `invitation_created_email_${mail.status}` });
  }
  return { operator: String(operator).trim(), results: out };
}

/** Emergency path — zero usable owners. The database refuses it whenever a usable owner exists. */
export async function emergencyRecovery({ operator, incident }) {
  if (!operator || String(operator).trim().length < 3 || !incident || String(incident).trim().length < 3) throw new OwnerError("OPERATOR_REQUIRED", "--operator and --incident are required.", 400);
  const until = Date.parse(process.env.OWNER_EMERGENCY_RECOVERY_UNTIL || "");
  if (!Number.isFinite(until) || until <= Date.now() || until > Date.now() + 24 * 3600 * 1000) throw new OwnerError("RECOVERY_NOT_AUTHORIZED", "Emergency recovery is not authorised: set OWNER_EMERGENCY_RECOVERY_UNTIL to an ISO time within the next 24 hours in the deployment environment.", 403);
  const label_ = `emergency-cli:${String(operator).trim().slice(0, 60)}:${String(incident).trim().slice(0, 40)}`;
  const out = [];
  for (const email of OWNER_EMAILS) {
    const token = newToken();
    const { data: pend } = await getSupabase().from("owner_invitations").select("id").eq("email", email).eq("status", "pending").maybeSingle();
    const r = pend
      ? await rpc("kayad_owner_resend_invitation", { p_invitation_id: pend.id, p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: null, p_actor_label: label_, p_cooldown_seconds: 60 })
      : await rpc("kayad_owner_issue_invitation", { p_email: email, p_kind: "recovery", p_token_hash: sha(token), p_expires: new Date(Date.now() + inviteTtlMs()).toISOString(), p_actor: null, p_actor_label: label_, p_note: `emergency recovery, incident ${String(incident).trim().slice(0, 40)}` });
    if (!r?.ok) { out.push({ identity: mask(email), result: `refused:${r?.code}` }); continue; }
    const mail = await sendInvitationEmail({ id: r.id, email, token, kind: "recovery", invitedBy: "the KAYAD platform operator", resend: !!pend });
    out.push({ identity: mask(email), result: mail.delivered ? "recovery_invitation_sent" : `recovery_invitation_created_email_${mail.status}` });
  }
  return { operator: String(operator).trim(), incident: String(incident).trim(), results: out };
}

export const __testing = { sha, stepUpFailures, MESSAGES };
