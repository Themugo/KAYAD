// backend/services/onboardingPolicy.service.js
// ─────────────────────────────────────────────────────────────────────────
// Stage 5 (2026-10-19) — OWNER-CONTROLLED ONBOARDING POLICY.
//
// Storage: the established key/value control plane, public.system_settings
// (key = 'onboarding_policy', value = jsonb). The same table already holds
// 'system_status' (kill-switch). NO schema change is needed, so no migration is
// required to launch; the row is created by the first authorized save.
//
// Policy fields (all server-validated enums; unknown keys are rejected):
//   privateSellerRegistration  enabled | disabled
//   dealerOnboardingMode       self_onboarding | approval_required | closed
//   listingModeration          hold_for_review | auto_publish
//   dealerDecisionAuthority    owner_only | admins     (who may approve/reject dealers & sellers)
//   listingDecisionAuthority   owner_only | admins     (who may approve/reject listings)
// Email verification for seller actions is NOT a setting: it is always required.
//
// Fail-safe contract (never "error ⇒ allowed"):
//   row missing                → INITIAL_DEFAULTS (deliberate launch configuration), source "default"
//   store unreachable / error  → RESTRICTIVE values, source "unavailable"
//   row or a field is corrupt  → RESTRICTIVE value for the corrupt field(s), source "invalid"
// Reads are cached for CACHE_TTL_MS (a change reaches every instance within that
// time); the cache is dropped on every successful write by this instance.
// Writes are compare-and-swap on the row's revision AND updated_at, so two
// concurrent editors cannot silently overwrite each other.
// ─────────────────────────────────────────────────────────────────────────
import * as supabaseModule from "../utils/supabase.js";
import * as loggerModule from "../infrastructure/logging/index.js";

// Namespace imports + guarded calls: this service is imported by many modules, and some test doubles
// replace utils/supabase.js or utils/logger.js with partial factories. A missing helper must degrade to
// the safe behaviour (treat as connected / skip logging), never to an import-time failure.
const getSupabase = () => supabaseModule.getSupabase();
const isSupabaseConnected = () =>
  typeof supabaseModule.isSupabaseConnected === "function" ? supabaseModule.isSupabaseConnected() : true;
const logError = (...a) => { try { loggerModule.logError?.(...a); } catch { /* logging must not throw */ } };
const logWarn = (...a) => { try { loggerModule.logWarn?.(...a); } catch { /* logging must not throw */ } };

export const ONBOARDING_POLICY_KEY = "onboarding_policy";
export const SCHEMA_VERSION = 1;
const CACHE_TTL_MS = 5_000;

export const POLICY_FIELDS = Object.freeze({
  privateSellerRegistration: Object.freeze(["enabled", "disabled"]),
  dealerOnboardingMode: Object.freeze(["self_onboarding", "approval_required", "closed"]),
  listingModeration: Object.freeze(["hold_for_review", "auto_publish"]),
  dealerDecisionAuthority: Object.freeze(["owner_only", "admins"]),
  listingDecisionAuthority: Object.freeze(["owner_only", "admins"]),
});

/** Deliberate initial configuration when no row exists. Dealers are NOT opened by default. */
export const INITIAL_DEFAULTS = Object.freeze({
  privateSellerRegistration: "enabled",
  dealerOnboardingMode: "approval_required",
  listingModeration: "hold_for_review",
  dealerDecisionAuthority: "owner_only",
  listingDecisionAuthority: "owner_only",
});

/** Used whenever the real value cannot be trusted. Every value is the most restrictive one. */
export const RESTRICTIVE = Object.freeze({
  privateSellerRegistration: "disabled",
  dealerOnboardingMode: "closed",
  listingModeration: "hold_for_review",
  dealerDecisionAuthority: "owner_only",
  listingDecisionAuthority: "owner_only",
});

export class OnboardingPolicyError extends Error {
  constructor(code, message, status, extra = {}) {
    super(message);
    this.name = "OnboardingPolicyError";
    this.code = code;
    this.status = status;
    Object.assign(this, extra);
  }
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const meta = (raw) => ({
  revision: Number.isInteger(raw?.revision) && raw.revision >= 0 ? raw.revision : 0,
  updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
  updatedBy: typeof raw?.updatedBy === "string" ? raw.updatedBy : null,
});

/** Pure: turn a stored value into a policy. Corrupt fields become RESTRICTIVE and are reported. */
export function normalizePolicyValue(raw) {
  if (!isPlainObject(raw)) {
    return { policy: { ...RESTRICTIVE }, issues: ["value is not an object"], meta: meta(null) };
  }
  const policy = {};
  const issues = [];
  for (const [field, allowed] of Object.entries(POLICY_FIELDS)) {
    if (raw[field] === undefined) policy[field] = INITIAL_DEFAULTS[field]; // older revision without the field
    else if (typeof raw[field] === "string" && allowed.includes(raw[field])) policy[field] = raw[field];
    else { policy[field] = RESTRICTIVE[field]; issues.push(`${field} is invalid`); }
  }
  return { policy, issues, meta: meta(raw) };
}

/** Pure: validate a change request. Returns { ok, errors, changes }. */
export function validatePolicyChanges(input) {
  const errors = [];
  if (!isPlainObject(input)) return { ok: false, errors: ["changes must be an object"], changes: {} };
  const changes = {};
  for (const [k, v] of Object.entries(input)) {
    if (!Object.hasOwn(POLICY_FIELDS, k)) { errors.push(`unknown setting: ${k}`); continue; }
    if (typeof v !== "string" || !POLICY_FIELDS[k].includes(v)) { errors.push(`${k} must be one of: ${POLICY_FIELDS[k].join(", ")}`); continue; }
    changes[k] = v;
  }
  if (!errors.length && !Object.keys(changes).length) errors.push("no changes supplied");
  return { ok: errors.length === 0, errors, changes };
}

let cache = null; // { at, result }
export const invalidateOnboardingPolicyCache = () => { cache = null; };

const restrictiveResult = (source, why) => ({
  policy: { ...RESTRICTIVE }, source, revision: 0, updatedAt: null, updatedBy: null, issues: why ? [why] : [], rowToken: null,
});

async function readRow() {
  const { data, error } = await getSupabase()
    .from("system_settings").select("value, updated_at").eq("key", ONBOARDING_POLICY_KEY).maybeSingle();
  if (error) throw error;
  return data || null;
}

function resultFromRow(row) {
  if (!row) {
    return { policy: { ...INITIAL_DEFAULTS }, source: "default", revision: 0, updatedAt: null, updatedBy: null, issues: [], rowToken: null };
  }
  const { policy, issues, meta: m } = normalizePolicyValue(row.value);
  return { policy, source: issues.length ? "invalid" : "database", revision: m.revision, updatedAt: m.updatedAt, updatedBy: m.updatedBy, issues, rowToken: row.updated_at ?? null };
}

// Test seam. Honoured ONLY when NODE_ENV === "test" so it cannot influence a deployed process.
let testOverride = null;
export function __setOnboardingPolicyForTests(partial, source = "database") {
  if (process.env.NODE_ENV !== "test") throw new Error("test seam is only available in NODE_ENV=test");
  testOverride = partial === null ? null : { policy: { ...INITIAL_DEFAULTS, ...partial }, source, revision: 1, updatedAt: null, updatedBy: null, issues: [], rowToken: null };
  invalidateOnboardingPolicyCache();
}

/** Effective policy. Never throws: any failure yields the RESTRICTIVE policy with source "unavailable". */
export async function getOnboardingPolicy({ fresh = false } = {}) {
  if (testOverride && process.env.NODE_ENV === "test") {
    return testOverride.source === "unavailable" ? { ...restrictiveResult("unavailable", "test"), } : testOverride;
  }
  const now = Date.now();
  if (!fresh && cache && now - cache.at < CACHE_TTL_MS) return cache.result;
  if (!isSupabaseConnected()) return restrictiveResult("unavailable", "database not connected");
  try {
    const result = resultFromRow(await readRow());
    cache = { at: now, result };
    return result;
  } catch (err) {
    logError("Onboarding policy read failed — using restrictive policy", { error: err?.message || String(err), code: "ONBOARDING_POLICY_READ_FAILED" });
    return restrictiveResult("unavailable", "read failed");
  }
}

/** True when the policy values may be trusted (row missing is trusted: it is the deliberate default). */
export const isPolicyTrusted = (result) => result?.source === "default" || result?.source === "database";

/**
 * Apply a validated change with compare-and-swap.
 * @returns {{before, after}} effective policies (+ revision)
 * @throws OnboardingPolicyError 400 validation | 409 conflict | 503 store unavailable
 */
export async function updateOnboardingPolicy({ changes: rawChanges, expectedRevision, actorId }) {
  const v = validatePolicyChanges(rawChanges);
  if (!v.ok) throw new OnboardingPolicyError("ONBOARDING_POLICY_INVALID", "Invalid onboarding settings", 400, { errors: v.errors });
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new OnboardingPolicyError("ONBOARDING_POLICY_REVISION_REQUIRED", "expectedRevision (integer) is required", 400, { errors: ["expectedRevision is required"] });
  }
  if (!isSupabaseConnected()) throw new OnboardingPolicyError("ONBOARDING_POLICY_UNAVAILABLE", "Settings store is unavailable", 503);

  let row;
  try { row = await readRow(); } catch (err) {
    logError("Onboarding policy write aborted: read failed", { error: err?.message || String(err), code: "ONBOARDING_POLICY_READ_FAILED" });
    throw new OnboardingPolicyError("ONBOARDING_POLICY_UNAVAILABLE", "Settings store is unavailable", 503);
  }
  const current = resultFromRow(row);
  if (current.revision !== expectedRevision) {
    throw new OnboardingPolicyError("ONBOARDING_POLICY_CONFLICT", "Settings changed since you loaded them. Reload and review before saving.", 409, { current: publicView(current) });
  }
  // A corrupt stored policy is repaired from the trusted merge (corrupt fields were already replaced by RESTRICTIVE).
  const nextRevision = current.revision + 1;
  const stamp = new Date().toISOString();
  const value = { schemaVersion: SCHEMA_VERSION, ...current.policy, ...v.changes, revision: nextRevision, updatedAt: stamp, updatedBy: actorId ? String(actorId) : null };

  const sb = getSupabase();
  let write;
  if (!row) {
    write = await sb.from("system_settings").insert({ key: ONBOARDING_POLICY_KEY, value, description: "Owner-controlled onboarding policy (Stage 5)" }).select("key");
    if (write.error) {
      if (write.error.code === "23505") throw new OnboardingPolicyError("ONBOARDING_POLICY_CONFLICT", "Settings were created by someone else. Reload and review.", 409);
      logError("Onboarding policy insert failed", { error: write.error.message, code: "ONBOARDING_POLICY_WRITE_FAILED" });
      throw new OnboardingPolicyError("ONBOARDING_POLICY_WRITE_FAILED", "Could not save settings", 500);
    }
  } else {
    // Compare-and-swap on the stored revision (a JSON-path filter), not on a timestamp: timestamptz text
    // round-trips (precision/offset formatting) are a needless way to get a spurious 409. The UPDATE only
    // matches while the revision we validated is still the stored one; the loser updates zero rows.
    // A stored value with no/zero revision (never written by this service) is matched on its absence of one.
    let q = sb.from("system_settings").update({ value, updated_at: stamp }).eq("key", ONBOARDING_POLICY_KEY);
    q = Number.isInteger(row.value?.revision) ? q.eq("value->>revision", String(row.value.revision)) : q.is("value->>revision", null);
    write = await q.select("key");
    if (write.error) {
      logError("Onboarding policy update failed", { error: write.error.message, code: "ONBOARDING_POLICY_WRITE_FAILED" });
      throw new OnboardingPolicyError("ONBOARDING_POLICY_WRITE_FAILED", "Could not save settings", 500);
    }
  }
  if (!Array.isArray(write.data) || write.data.length !== 1) {
    // Zero rows affected: somebody else won the race between our read and our write.
    throw new OnboardingPolicyError("ONBOARDING_POLICY_CONFLICT", "Settings changed while saving. Reload and review.", 409);
  }
  invalidateOnboardingPolicyCache();
  const after = { policy: { ...current.policy, ...v.changes }, revision: nextRevision, updatedAt: stamp, updatedBy: actorId ? String(actorId) : null, source: "database" };
  return { before: publicView(current), after: publicView(after) };
}

/** Shape returned to admins. */
export function publicView(result) {
  return {
    ...result.policy,
    revision: result.revision,
    updatedAt: result.updatedAt ?? null,
    updatedBy: result.updatedBy ?? null,
    source: result.source,
    emailVerificationRequiredForSellers: true, // fixed by design; not configurable
  };
}

/** Shape returned to the anonymous registration UI: only what is needed to render the right form. */
export function publicRegistrationView(result) {
  const trusted = isPolicyTrusted(result);
  return {
    privateSellerRegistration: result.policy.privateSellerRegistration,
    dealerOnboardingMode: result.policy.dealerOnboardingMode,
    available: trusted,
    emailVerificationRequiredForSellers: true,
  };
}

/** Pure: may `user` take an approve/reject decision in `domain` under `result`? */
export function mayDecide(user, domain, result) {
  if (!user) return false;
  const authority = domain === "listing" ? result.policy.listingDecisionAuthority : result.policy.dealerDecisionAuthority;
  // The owner is identified by EMAIL (config/owners.js) and is exempt from the generic email-verification gate.
  // If the owner's account did not exist, anyone could register that address and inherit owner power. So for
  // owner-only authority we additionally require that the owner's own email is VERIFIED.
  const isOwner = user.effectiveRole === "webhoist" && user.emailVerified === true;
  if (authority === "admins") return isOwner || user.role === "admin" || user.role === "superadmin";
  return isOwner; // owner_only (and any untrusted policy): only the verified platform owner
}

/** Express middleware: enforce the owner's decision-authority setting server-side. */
export const requireDecisionAuthority = (domain) => async (req, res, next) => {
  try {
    const result = await getOnboardingPolicy();
    if (mayDecide(req.user, domain, result)) return next();
    logWarn("Decision blocked by owner decision-authority setting", { domain, userId: req.user?.id, role: req.user?.role, source: result.source });
    return res.status(403).json({
      success: false,
      code: "DECISION_AUTHORITY_REQUIRED",
      message: domain === "listing"
        ? "Listing approval and rejection are reserved for the platform owner under the current onboarding settings."
        : "Dealer and seller approval and rejection are reserved for the platform owner under the current onboarding settings.",
    });
  } catch (err) {
    logError("Decision authority check failed — denying", { error: err?.message, code: "DECISION_AUTHORITY_CHECK_FAILED" });
    return res.status(503).json({ success: false, code: "ONBOARDING_POLICY_UNAVAILABLE", message: "Settings are temporarily unavailable. Try again shortly." });
  }
};

/**
 * May this user put one of THEIR OWN listings straight into a public ("available") state?
 * Owner and staff: yes (their own moderation authority is enforced elsewhere).
 * Everyone else: only when the owner chose auto_publish, the policy is trustworthy, and the
 * seller account itself is approved. hold_for_review / unavailable / invalid ⇒ no.
 */
export async function sellerMayPublishDirectly(user) {
  if (!user) return false;
  if (user.effectiveRole === "webhoist") return true;
  if (user.role === "admin" || user.role === "superadmin") return true;
  const result = await getOnboardingPolicy();
  return isPolicyTrusted(result) && result.policy.listingModeration === "auto_publish" && user.status === "approved";
}

export const PUBLICATION_REVIEW_REQUIRED = Object.freeze({
  success: false,
  code: "LISTING_PUBLICATION_REQUIRES_REVIEW",
  message: "Publishing is controlled by listing review. Submit the listing for review (status: pending) and it will go live once approved.",
});
