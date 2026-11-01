// Admin-configurable dealer paperwork. The saved configuration decides which supported items (config/dealerPaperwork.js) are
// asked for and which of those are mandatory. NOTHING here is hard-coded as required.
//
// Storage: the established key/value control plane, public.system_settings, key "dealer_paperwork_policy" (no schema change).
// Writes are compare-and-swap on a revision, like the onboarding policy.
//
// DEFAULT (no row saved): every supported item is OFFERED and NONE is required. Evidence for this default: dealer submission
// (services/dealerVerificationService.js) has always accepted any subset of documents, and approval is a human review; the previous
// "ID and KRA PIN mandatory" rule existed only in the onboarding validation schema and form. The launch intent for mandatory
// paperwork is not stated anywhere in the repository, so the onboarding-friendly default is used and the owner can make any item
// required from Settings > Onboarding.
//
// IN-PROGRESS APPLICATIONS (documented rule): requirements are evaluated when a decision is made, against the CURRENT configuration.
//   - Loosening (item becomes optional/disabled) immediately unblocks pending applications.
//   - Tightening (item becomes required) blocks approval of applications that are still pending until the item is supplied; the
//     admin screen names exactly which. It never touches already-approved dealers, and never deletes anything already submitted.
//   - Disabling an item keeps whatever was already submitted for it (hidden from the checklist, retained in the record).
import { PAPERWORK_ITEMS, PAPERWORK_KEYS } from "../config/dealerPaperwork.js";
import * as supabaseModule from "../utils/supabase.js";
import * as loggerModule from "../infrastructure/logging/index.js";

const getSupabase = () => supabaseModule.getSupabase();
const logError = (...a) => { try { loggerModule.logError?.(...a); } catch { /* logging must not throw */ } };

export const DEALER_PAPERWORK_KEY = "dealer_paperwork_policy";
export const SCHEMA_VERSION = 1;

export class PaperworkPolicyError extends Error {
  constructor(code, message, status, extra = {}) { super(message); this.name = "PaperworkPolicyError"; this.code = code; this.status = status; Object.assign(this, extra); }
}
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export const DEFAULT_ITEMS = Object.freeze(Object.fromEntries(PAPERWORK_KEYS.map((k) => [k, Object.freeze({ enabled: true, required: false })])));

/** Pure. A stored value -> { items, issues }. A corrupt record is reported and treated as unavailable by callers (never as "nothing required"). */
export function normalizeItems(raw) {
  const issues = [];
  if (!isPlainObject(raw)) return { items: null, issues: ["value is not an object"] };
  const source = raw.items;
  if (source === undefined) return { items: structuredClone(DEFAULT_ITEMS), issues };
  if (!isPlainObject(source)) return { items: null, issues: ["items is not an object"] };
  const items = {};
  for (const key of PAPERWORK_KEYS) {
    const v = source[key];
    if (v === undefined) { items[key] = { ...DEFAULT_ITEMS[key] }; continue; }
    if (!isPlainObject(v) || typeof v.enabled !== "boolean" || typeof v.required !== "boolean") { issues.push(`${key} is invalid`); continue; }
    if (v.required && !v.enabled) { issues.push(`${key} is required but disabled`); continue; }
    items[key] = { enabled: v.enabled, required: v.required };
  }
  for (const k of Object.keys(source)) if (!PAPERWORK_KEYS.includes(k)) issues.push(`unknown item: ${k}`);
  return issues.length ? { items: null, issues } : { items, issues };
}

/** Pure. Validate a change request: { items: { key: { enabled, required } } } (partial allowed). */
export function validateItemChanges(input) {
  const errors = [];
  if (!isPlainObject(input) || !isPlainObject(input.items)) return { ok: false, errors: ["items must be an object"], changes: {} };
  const changes = {};
  for (const [k, v] of Object.entries(input.items)) {
    if (!PAPERWORK_KEYS.includes(k)) { errors.push(`unknown item: ${k}`); continue; }
    if (!isPlainObject(v) || typeof v.enabled !== "boolean" || typeof v.required !== "boolean") { errors.push(`${k}: enabled and required must both be true or false`); continue; }
    if (v.required && !v.enabled) { errors.push(`${k}: an item cannot be required while disabled`); continue; }
    changes[k] = { enabled: v.enabled, required: v.required };
  }
  if (!errors.length && !Object.keys(changes).length) errors.push("no changes supplied");
  return { ok: errors.length === 0, errors, changes };
}

let testOverride = null;
export function __setDealerPaperworkForTests(items, source = "database") {
  if (process.env.NODE_ENV !== "test") throw new Error("test seam is only available in NODE_ENV=test");
  testOverride = items === null ? null : { items: { ...structuredClone(DEFAULT_ITEMS), ...items }, source, revision: 1, updatedAt: null, updatedBy: null };
}

async function readRow() {
  const { data, error } = await getSupabase().from("system_settings").select("value, updated_at").eq("key", DEALER_PAPERWORK_KEY).maybeSingle();
  if (error) throw error;
  return data || null;
}
const meta = (raw) => ({
  revision: Number.isInteger(raw?.revision) && raw.revision >= 0 ? raw.revision : 0,
  updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
  updatedBy: typeof raw?.updatedBy === "string" ? raw.updatedBy : null,
});
const unavailable = (why) => ({ items: null, source: "unavailable", revision: 0, updatedAt: null, updatedBy: null, issues: [why] });

/** @returns {{items: object|null, source: "default"|"database"|"invalid"|"unavailable", revision, updatedAt, updatedBy, issues}} items is null when it cannot be trusted. */
export async function getDealerPaperworkPolicy() {
  if (testOverride && process.env.NODE_ENV === "test") return testOverride.source === "unavailable" ? unavailable("test") : { ...testOverride, issues: [] };
  try {
    const row = await readRow();
    if (!row) return { items: structuredClone(DEFAULT_ITEMS), source: "default", revision: 0, updatedAt: null, updatedBy: null, issues: [] };
    const { items, issues } = normalizeItems(row.value);
    return { items, source: issues.length ? "invalid" : "database", ...meta(row.value), issues };
  } catch (err) {
    logError("Dealer paperwork policy read failed", { error: err?.message || String(err), code: "DEALER_PAPERWORK_READ_FAILED" });
    return unavailable("read failed");
  }
}

/** Compare-and-swap update. Throws PaperworkPolicyError (400 validation | 409 conflict | 503 unavailable | 500 write). */
export async function updateDealerPaperworkPolicy({ changes: rawChanges, expectedRevision, actorId }) {
  const v = validateItemChanges(rawChanges);
  if (!v.ok) throw new PaperworkPolicyError("DEALER_PAPERWORK_INVALID", "Invalid paperwork settings", 400, { errors: v.errors });
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new PaperworkPolicyError("DEALER_PAPERWORK_REVISION_REQUIRED", "expectedRevision (integer) is required", 400, { errors: ["expectedRevision is required"] });
  let row;
  try { row = await readRow(); } catch (err) {
    logError("Dealer paperwork write aborted: read failed", { error: err?.message || String(err), code: "DEALER_PAPERWORK_READ_FAILED" });
    throw new PaperworkPolicyError("DEALER_PAPERWORK_UNAVAILABLE", "Settings store is unavailable", 503);
  }
  const currentMeta = meta(row?.value);
  if (currentMeta.revision !== expectedRevision) throw new PaperworkPolicyError("DEALER_PAPERWORK_CONFLICT", "Paperwork settings changed since you loaded them. Reload and review before saving.", 409);
  // A corrupt stored record is repaired from defaults + the validated change; nothing else is carried over from it.
  const base = row ? (normalizeItems(row.value).items ?? structuredClone(DEFAULT_ITEMS)) : structuredClone(DEFAULT_ITEMS);
  const nextItems = { ...base, ...v.changes };
  const nextRevision = currentMeta.revision + 1;
  const stamp = new Date().toISOString();
  const value = { schemaVersion: SCHEMA_VERSION, items: nextItems, revision: nextRevision, updatedAt: stamp, updatedBy: actorId ? String(actorId) : null };
  const sb = getSupabase();
  let write;
  if (!row) {
    write = await sb.from("system_settings").insert({ key: DEALER_PAPERWORK_KEY, value, description: "Admin-configured dealer paperwork requirements" }).select("key");
    if (write.error) {
      if (write.error.code === "23505") throw new PaperworkPolicyError("DEALER_PAPERWORK_CONFLICT", "Settings were created by someone else. Reload and review.", 409);
      logError("Dealer paperwork insert failed", { error: write.error.message, code: "DEALER_PAPERWORK_WRITE_FAILED" });
      throw new PaperworkPolicyError("DEALER_PAPERWORK_WRITE_FAILED", "Could not save settings", 500);
    }
  } else {
    let q = sb.from("system_settings").update({ value, updated_at: stamp }).eq("key", DEALER_PAPERWORK_KEY);
    q = Number.isInteger(row.value?.revision) ? q.eq("value->>revision", String(row.value.revision)) : q.is("value->>revision", null);
    write = await q.select("key");
    if (write.error) {
      logError("Dealer paperwork update failed", { error: write.error.message, code: "DEALER_PAPERWORK_WRITE_FAILED" });
      throw new PaperworkPolicyError("DEALER_PAPERWORK_WRITE_FAILED", "Could not save settings", 500);
    }
  }
  if (!Array.isArray(write.data) || write.data.length !== 1) throw new PaperworkPolicyError("DEALER_PAPERWORK_CONFLICT", "Settings changed while saving. Reload and review.", 409);
  return { before: { items: base, revision: currentMeta.revision }, after: { items: nextItems, revision: nextRevision, updatedAt: stamp, updatedBy: actorId ? String(actorId) : null } };
}

/** Pure. What the dealer is asked for, in catalogue order, required vs optional. Disabled items are not listed. */
export function checklistFor(items) {
  return PAPERWORK_KEYS.filter((k) => items[k].enabled).map((k) => ({ key: k, label: PAPERWORK_ITEMS[k].label, help: PAPERWORK_ITEMS[k].help, required: items[k].required, kind: PAPERWORK_ITEMS[k].kind }));
}

/** Pure. Admin view of the configuration for every supported item (including disabled ones). */
export function adminViewFor(items) {
  return PAPERWORK_KEYS.map((k) => ({ key: k, label: PAPERWORK_ITEMS[k].label, help: PAPERWORK_ITEMS[k].help, kind: PAPERWORK_ITEMS[k].kind, enabled: items[k].enabled, required: items[k].required }));
}

/**
 * Pure. Validate documents a dealer submits against the configuration.
 *  - items that are not enabled are ignored (reported), never stored and never rejected;
 *  - an enabled entry that is present must be valid whether required or optional;
 *  - a required entry must be present (phoneVerification is completed by OTP, so it is never required AT SUBMISSION, only at approval).
 */
export function validateSubmission(documents, items, { existing = {} } = {}) {
  const accepted = {};
  const ignored = [];
  const errors = [];
  const input = isPlainObject(documents) ? documents : {};
  for (const key of Object.keys(input)) {
    if (!PAPERWORK_KEYS.includes(key)) { errors.push({ key, message: `Unknown document type: ${key}` }); continue; }
    if (PAPERWORK_ITEMS[key].kind === "verification") { ignored.push(key); continue; } // set by the OTP flow only; never trusted from a form
    if (!items[key].enabled) { ignored.push(key); continue; }
    const value = input[key];
    if (value === undefined || value === null) continue;
    const parsed = PAPERWORK_ITEMS[key].schema.safeParse(value);
    if (!parsed.success) errors.push({ key, message: `${PAPERWORK_ITEMS[key].label}: ${parsed.error.issues.map((i) => i.message).join("; ")}` });
    else accepted[key] = parsed.data;
  }
  const missingRequired = PAPERWORK_KEYS.filter((k) => items[k].enabled && items[k].required && PAPERWORK_ITEMS[k].kind === "entry" && !accepted[k] && !existing[k]);
  for (const key of missingRequired) errors.push({ key, message: `${PAPERWORK_ITEMS[key].label} is required.` });
  return { ok: errors.length === 0, errors, accepted, ignored, missingRequired };
}

/** Pure. Compare what a verification record holds with the configuration. Only ENABLED+REQUIRED items can be missing-required. */
export function evaluateRequirements(documents, items) {
  const docs = isPlainObject(documents) ? documents : {};
  const present = (k) => (PAPERWORK_ITEMS[k].kind === "verification" ? docs[k]?.verified === true : isPlainObject(docs[k]) && Object.keys(docs[k]).length > 0);
  const enabled = PAPERWORK_KEYS.filter((k) => items[k].enabled);
  return {
    requiredMissing: enabled.filter((k) => items[k].required && !present(k)),
    optionalMissing: enabled.filter((k) => !items[k].required && !present(k)),
    supplied: PAPERWORK_KEYS.filter(present),
  };
}
