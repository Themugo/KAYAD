// backend/services/ownerMfa.service.js - PHASE 16: TOTP second factor for platform owners.
// What this is: RFC 6238 authenticator-app codes + single-use recovery codes. What it is not: SMS or e-mail OTP (no provider dependency).
// States: "not_installed" (candidate migration not applied: owners sign in exactly as before), "database" (enrolment possible and, once a
// factor is ACTIVE, enforced at sign-in and for every owner-management action), "error" (store unreadable: fails closed).
// Secrets: AES-256-GCM with OWNER_MFA_ENCRYPTION_KEY (32 bytes, base64). Without the key nothing can be enrolled and an already-enrolled owner
// cannot be verified (fails closed - see runbook for the recovery route). Recovery codes are stored only as HMAC-SHA256 hashes.
import crypto from "node:crypto";
import { getSupabase } from "../utils/supabase.js";
import { generateSecret, verifyTotp, otpauthUri } from "../utils/totp.js";
import { normalizeOwnerEmail } from "../config/owners.js";
import { logWarn } from "../infrastructure/logging/index.js";

export class MfaError extends Error {
  constructor(code, message, status = 400, extra = {}) { super(message); this.code = code; this.status = status; this.extra = extra; }
}
const MAX_FAILURES = 5, LOCK_MS = 15 * 60 * 1000, RECOVERY_CODE_COUNT = 10;

export const mfaPolicy = () => (["off", "enrolled_only", "required"].includes(process.env.OWNER_MFA_POLICY) ? process.env.OWNER_MFA_POLICY : "enrolled_only");

// ───── key handling ─────
const keyBytes = () => {
  const raw = process.env.OWNER_MFA_ENCRYPTION_KEY;
  if (!raw) return null;
  const b = Buffer.from(raw, "base64");
  return b.length === 32 ? b : null;
};
export const keyConfigured = () => !!keyBytes();
const need = () => { const k = keyBytes(); if (!k) throw new MfaError("OWNER_MFA_NOT_CONFIGURED", "Two-factor authentication is not configured on this server (OWNER_MFA_ENCRYPTION_KEY missing or not 32 bytes). Nothing was changed.", 503); return k; };
const b64u = (b) => Buffer.from(b).toString("base64url");
export function encryptSecret(plain, key = need()) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${b64u(iv)}:${b64u(c.getAuthTag())}:${b64u(ct)}`;
}
export function decryptSecret(blob, key = need()) {
  const [v, iv, tag, ct] = String(blob).split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new MfaError("OWNER_MFA_CORRUPT", "The stored second factor could not be read.", 503);
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch { throw new MfaError("OWNER_MFA_CORRUPT", "The stored second factor could not be read with the configured key.", 503); }
}
const pepper = () => crypto.createHash("sha256").update(Buffer.concat([Buffer.from("owner-mfa-recovery:"), need()])).digest();
const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const hashRecoveryCode = (code) => crypto.createHmac("sha256", pepper()).update(normCode(code)).digest("hex");
export const newRecoveryCode = () => { const r = crypto.randomBytes(10); const s = [...r].map((x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32]).join(""); return `${s.slice(0, 5)}-${s.slice(5)}`; };
const looksLikeRecovery = (c) => /^[A-Z2-9]{5}-?[A-Z2-9]{5}$/i.test(String(c || "").trim());

// ───── store access ─────
const isMissingTable = (e) => /PGRST205|42P01/.test(String(e?.code)) || /does not exist|schema cache|could not find the table/i.test(String(e?.message || ""));
async function factorRow(userId) {
  const { data, error } = await getSupabase().from("owner_mfa_factors").select("*").eq("user_id", userId).maybeSingle();
  if (error) { if (isMissingTable(error)) return { missing: true }; throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second-factor store is temporarily unavailable.", 503); }
  return { row: data || null };
}
export async function installed() { const r = await factorRow("00000000-0000-0000-0000-000000000000"); return !r.missing; }

async function audit(action, result, { actor, email, target, reason } = {}) {
  try { await getSupabase().rpc("kayad_owner_log_event", { p_action: `mfa.${action}`, p_result: result, p_actor: actor || null, p_actor_label: actor ? `owner:${normalizeOwnerEmail(email)}` : "system", p_email: normalizeOwnerEmail(email) || null, p_target: target || null, p_reason: reason || null, p_meta: {} }); }
  catch (e) { logWarn("owner mfa event not recorded", { event: "owner.mfa_event_failed", action, error: e?.message }); }
}

async function remainingRecoveryCodes(userId) {
  const { count } = await getSupabase().from("owner_mfa_recovery_codes").select("id", { count: "exact", head: true }).eq("user_id", userId).is("used_at", null);
  return count || 0;
}

// ───── public API ─────
export async function status(userId) {
  const r = await factorRow(userId);
  if (r.missing) return { installed: false, enrolled: false, pending: false, recoveryCodesRemaining: 0, policy: mfaPolicy(), keyConfigured: keyConfigured() };
  const active = r.row?.status === "active";
  return { installed: true, enrolled: active, pending: r.row?.status === "pending", recoveryCodesRemaining: active ? await remainingRecoveryCodes(userId) : 0, policy: mfaPolicy(), keyConfigured: keyConfigured(), lockedUntil: r.row?.locked_until || null };
}

/** Does this owner have an ACTIVE second factor that must be satisfied? Throws (fail closed) when the store cannot be read. */
export async function isEnforcedFor(userId) {
  if (mfaPolicy() === "off") return false;
  const r = await factorRow(userId);
  if (r.missing) return false;
  return r.row?.status === "active";
}

export async function beginEnrollment({ actor }) {
  const key = need();
  const r = await factorRow(actor.id);
  if (r.missing) throw new MfaError("OWNER_MFA_NOT_INSTALLED", "Owner two-factor authentication needs the Phase 16 migration, which has not been applied to this database yet.", 503);
  if (r.row?.status === "active") throw new MfaError("OWNER_MFA_ALREADY_ENROLLED", "A second factor is already active. Disable or reset it first.", 409);
  const secret = generateSecret();
  const enc = encryptSecret(secret, key);
  const sb = getSupabase();
  const { error } = r.row
    ? await sb.from("owner_mfa_factors").update({ secret_enc: enc, status: "pending", failed_attempts: 0, locked_until: null, last_used_step: null }).eq("user_id", actor.id)
    : await sb.from("owner_mfa_factors").insert({ user_id: actor.id, secret_enc: enc, status: "pending" });
  if (error) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second factor could not be started.", 503);
  await audit("enroll_started", "success", { actor: actor.id, email: actor.email });
  return { secret, otpauthUri: otpauthUri({ secret, account: normalizeOwnerEmail(actor.email) }) }; // the only time the secret leaves the server
}

/** Verify a TOTP code or a recovery code. Enforces lockout and replay protection. Returns { method }. Never reveals which part failed. */
export async function verifyCode(userId, code, { actorEmail = "", allowRecovery = true, pendingOk = false } = {}) {
  const key = need();
  const { row, missing } = await factorRow(userId);
  if (missing || !row || (row.status !== "active" && !(pendingOk && row.status === "pending"))) throw new MfaError("OWNER_MFA_NOT_ENROLLED", "No active second factor.", 400);
  if (row.locked_until && new Date(row.locked_until) > new Date()) throw new MfaError("OWNER_MFA_LOCKED", "Too many incorrect codes. Try again in 15 minutes.", 429);
  const sb = getSupabase();
  const lockedErr = () => new MfaError("OWNER_MFA_LOCKED", "Too many incorrect codes. Try again in 15 minutes.", 429);
  // PHASE 16B: the attempt is CHARGED before the code is evaluated, with a compare-and-set on (failed_attempts, locked_until).
  // The earlier read-modify-write let N concurrent requests all read "0 failures" and all be evaluated (40 parallel wrong codes -> 25 evaluated
  // against a limit of 5). Now only the request that wins each counter step is evaluated, so at most MAX_FAILURES codes are tried per window.
  // A success resets the counter below. No schema change.
  let willLock = false;
  {
    let cur = row;
    for (let i = 0; ; i++) {
      if (cur.locked_until && new Date(cur.locked_until) > new Date()) throw lockedErr();
      if (i >= 80) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second-factor store is busy. Try again shortly.", 503);
      const n = (cur.failed_attempts || 0) + 1;
      willLock = n >= MAX_FAILURES;
      const patch = willLock ? { failed_attempts: 0, locked_until: new Date(Date.now() + LOCK_MS).toISOString() } : { failed_attempts: n, locked_until: null };
      let q = sb.from("owner_mfa_factors").update(patch).eq("user_id", userId).eq("failed_attempts", cur.failed_attempts || 0);
      q = cur.locked_until ? q.eq("locked_until", cur.locked_until) : q.is("locked_until", null);
      const { data, error } = await q.select("user_id");
      if (error) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second-factor store is temporarily unavailable.", 503);
      if (data?.length) break;
      await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 20)));
      const re = await factorRow(userId);
      if (re.missing || !re.row) throw new MfaError("OWNER_MFA_NOT_ENROLLED", "No active second factor.", 400);
      cur = re.row;
    }
  }
  const fail = async () => {
    await audit("code_failed", "denied", { actor: userId, email: actorEmail, reason: willLock ? "locked" : undefined });
    throw new MfaError("OWNER_MFA_INVALID", "The code is not valid.", 403);
  };
  if (allowRecovery && looksLikeRecovery(code)) {
    const h = hashRecoveryCode(code);
    const { data, error } = await sb.from("owner_mfa_recovery_codes").update({ used_at: new Date().toISOString() }).eq("user_id", userId).eq("code_hash", h).is("used_at", null).select("id");
    if (error) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second-factor store is temporarily unavailable.", 503);
    if (!data?.length) return fail();
    await sb.from("owner_mfa_factors").update({ failed_attempts: 0, locked_until: null }).eq("user_id", userId);
    await audit("recovery_code_used", "success", { actor: userId, email: actorEmail });
    return { method: "recovery", recoveryCodesRemaining: await remainingRecoveryCodes(userId) };
  }
  const secret = decryptSecret(row.secret_enc, key);
  const step = verifyTotp(secret, code);
  if (step === null) return fail();
  // replay protection: atomically advance last_used_step; a second use of the same code (or an older one) updates nothing.
  // Two guarded single-statement updates (not one `.or()` filter: PostgREST rejects or-filters on an UPDATE that returns rows).
  const advance = async (apply) => apply(sb.from("owner_mfa_factors").update({ last_used_step: step, failed_attempts: 0, locked_until: null }).eq("user_id", userId)).select("user_id");
  let { data, error } = await advance((q) => q.lt("last_used_step", step));
  if (!error && !data?.length) ({ data, error } = await advance((q) => q.is("last_used_step", null)));
  if (error) { logWarn("owner mfa replay guard update failed", { event: "owner.mfa.store", code: error.code, message: error.message }); throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second-factor store is temporarily unavailable.", 503); }
  if (!data?.length) return fail();
  return { method: "totp" };
}

async function issueRecoveryCodes(userId) {
  const sb = getSupabase();
  await sb.from("owner_mfa_recovery_codes").delete().eq("user_id", userId);
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
  const { error } = await sb.from("owner_mfa_recovery_codes").insert(codes.map((c) => ({ user_id: userId, code_hash: hashRecoveryCode(c) })));
  if (error) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "Recovery codes could not be stored.", 503);
  return codes;
}

export async function activate({ actor, code }) {
  await verifyCode(actor.id, code, { actorEmail: actor.email, allowRecovery: false, pendingOk: true });
  const { data, error } = await getSupabase().from("owner_mfa_factors").update({ status: "active", activated_at: new Date().toISOString() }).eq("user_id", actor.id).eq("status", "pending").select("user_id");
  if (error || !data?.length) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second factor could not be activated.", 503);
  const recoveryCodes = await issueRecoveryCodes(actor.id);
  await audit("enrolled", "success", { actor: actor.id, email: actor.email });
  return { enrolled: true, recoveryCodes }; // shown once
}

export async function regenerateRecoveryCodes({ actor }) {
  const recoveryCodes = await issueRecoveryCodes(actor.id);
  await audit("recovery_codes_regenerated", "success", { actor: actor.id, email: actor.email });
  return { recoveryCodes };
}

/** Remove the factor (own disable, or a recovery by another owner / the emergency procedure). Idempotent. */
export async function resetFactor(userId, { by = null, byEmail = "", targetEmail = "", reason = "" } = {}) {
  const r = await factorRow(userId);
  if (r.missing) return { reset: false, reason: "not_installed" };
  const sb = getSupabase();
  await sb.from("owner_mfa_recovery_codes").delete().eq("user_id", userId);
  const { error } = await sb.from("owner_mfa_factors").delete().eq("user_id", userId);
  if (error) throw new MfaError("OWNER_MFA_STORE_UNAVAILABLE", "The second factor could not be reset.", 503);
  await audit("reset", "success", { actor: by, email: byEmail || targetEmail, target: userId, reason });
  return { reset: !!r.row };
}
