// Owner-defined EMPLOYMENT LEVELS (e.g. "Sales", "Customer Success") and the company e-mail policy for staff.
//
// A level is a named permission set layered on one of the platform's existing staff roles (its "base role"): the user's role column stays a
// supported value (the database restricts it), and the level decides the exact permissions via per-user grants/revokes. Effective permissions
// of a member are therefore exactly the level's permission list. Levels never confer admin / superadmin / owner authority.
//
// Storage: public.system_settings, key "staff_levels" (no schema change), compare-and-swap on a revision.
//   { schemaVersion, companyEmailDomain, requireCompanyEmail, levels: [{key,label,description,baseRole,permissions}], assignments: {userId: levelKey}, revision, ... }
import { ROLE_PERMISSIONS, ASSIGNABLE_PERMISSIONS, PERM } from "../config/roles.js";
import * as supabaseModule from "../utils/supabase.js";
import * as loggerModule from "../infrastructure/logging/index.js";

const getSupabase = () => supabaseModule.getSupabase();
const logError = (...a) => { try { loggerModule.logError?.(...a); } catch { /* logging must not throw */ } };

export const STAFF_LEVELS_KEY = "staff_levels";
export const LEVEL_BASE_ROLES = Object.freeze(["marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"]);
// Authority that stays with the owner: a level can never carry staff governance or platform recovery.
const NOT_GRANTABLE_TO_LEVELS = new Set([PERM.MANAGE_STAFF, PERM.PLATFORM_RECOVERY]);
export const LEVEL_PERMISSIONS = Object.freeze(ASSIGNABLE_PERMISSIONS.filter((p) => !NOT_GRANTABLE_TO_LEVELS.has(p)));
const BUILTIN_ROLE_NAMES = new Set(["admin", "superadmin", "webhoist", "user", "dealer", "individual_seller", "ghost_checker", ...LEVEL_BASE_ROLES]);
const MAX_LEVELS = 25;
export const DEFAULT_COMPANY_DOMAIN = "kayad.space";

export class StaffLevelError extends Error {
  constructor(code, message, status, extra = {}) { super(message); this.name = "StaffLevelError"; this.code = code; this.status = status; Object.assign(this, extra); }
}
const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const normalizeDomain = (raw) => String(raw ?? "").trim().toLowerCase().replace(/^@/, "");
const DOMAIN_RE = /^(?=.{3,120}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

const defaults = () => ({ companyEmailDomain: DEFAULT_COMPANY_DOMAIN, requireCompanyEmail: false, levels: [], assignments: {}, revision: 0, updatedAt: null, updatedBy: null });

/** Pure. Validate one level definition. Returns { ok, errors, level }. */
export function validateLevel(input, { requireKey = true } = {}) {
  const errors = [];
  const key = String(input?.key ?? "").trim().toLowerCase();
  const label = String(input?.label ?? "").trim();
  const description = String(input?.description ?? "").trim();
  const baseRole = String(input?.baseRole ?? "");
  const permissions = Array.isArray(input?.permissions) ? [...new Set(input.permissions.map(String))] : null;
  if (requireKey && !/^[a-z][a-z0-9_]{1,31}$/.test(key)) errors.push("key must be 2-32 characters: lowercase letters, digits and underscores, starting with a letter");
  if (BUILTIN_ROLE_NAMES.has(key)) errors.push("key clashes with a built-in role name");
  if (label.length < 2 || label.length > 40) errors.push("label must be 2-40 characters");
  if (description.length > 200) errors.push("description must be at most 200 characters");
  if (!LEVEL_BASE_ROLES.includes(baseRole)) errors.push(`baseRole must be one of: ${LEVEL_BASE_ROLES.join(", ")}`);
  if (!permissions) errors.push("permissions must be a list");
  else {
    if (!permissions.length) errors.push("choose at least one permission");
    const bad = permissions.filter((p) => !LEVEL_PERMISSIONS.includes(p));
    if (bad.length) errors.push(`permissions not allowed on a level: ${bad.join(", ")}`);
  }
  return { ok: errors.length === 0, errors, level: { key, label, description, baseRole, permissions: permissions || [] } };
}

/** Pure. The per-user grants/revokes that make a base role's permissions equal the level's permission list exactly. */
export function permissionDeltaFor(level) {
  const base = new Set(ROLE_PERMISSIONS[level.baseRole] || []);
  const want = new Set(level.permissions);
  return { grantedPermissions: [...want].filter((p) => !base.has(p)), revokedPermissions: [...base].filter((p) => !want.has(p)) };
}

/** Pure. Build the full e-mail for a new staff member from a local part or a full address, applying the company policy. */
export function resolveStaffEmail({ email, emailLocalPart }, { companyEmailDomain, requireCompanyEmail }) {
  const domain = normalizeDomain(companyEmailDomain);
  let full = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!full && typeof emailLocalPart === "string" && emailLocalPart.trim()) {
    if (!domain) return { ok: false, message: "A company e-mail domain is not configured." };
    const local = emailLocalPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(local)) return { ok: false, message: "The e-mail name may contain letters, digits, dots, hyphens and underscores only." };
    full = `${local}@${domain}`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(full)) return { ok: false, message: "A valid email address is required." };
  if (requireCompanyEmail && domain && !full.endsWith(`@${domain}`)) return { ok: false, message: `Staff must use a company e-mail address (@${domain}).` };
  return { ok: true, email: full };
}

function normalizeDoc(raw) {
  const d = defaults();
  if (!isPlain(raw)) return d;
  if (typeof raw.companyEmailDomain === "string" && (raw.companyEmailDomain === "" || DOMAIN_RE.test(normalizeDomain(raw.companyEmailDomain)))) d.companyEmailDomain = normalizeDomain(raw.companyEmailDomain);
  d.requireCompanyEmail = raw.requireCompanyEmail === true;
  if (Array.isArray(raw.levels)) d.levels = raw.levels.filter((l) => validateLevel(l).ok).map((l) => validateLevel(l).level);
  if (isPlain(raw.assignments)) for (const [uid, k] of Object.entries(raw.assignments)) if (typeof k === "string" && d.levels.some((l) => l.key === k)) d.assignments[uid] = k;
  d.revision = Number.isInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0;
  d.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;
  d.updatedBy = typeof raw.updatedBy === "string" ? raw.updatedBy : null;
  return d;
}

let testOverride = null;
export function __setStaffLevelsForTests(doc) {
  if (process.env.NODE_ENV !== "test") throw new Error("test seam is only available in NODE_ENV=test");
  testOverride = doc === null ? null : normalizeDoc({ ...doc, revision: doc.revision ?? 1 });
}

async function readRow() {
  const { data, error } = await getSupabase().from("system_settings").select("value").eq("key", STAFF_LEVELS_KEY).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getStaffConfig() {
  if (testOverride && process.env.NODE_ENV === "test") return structuredClone(testOverride);
  try {
    const row = await readRow();
    return row ? normalizeDoc(row.value) : defaults();
  } catch (err) {
    logError("Staff levels read failed", { error: err?.message || String(err), code: "STAFF_LEVELS_READ_FAILED" });
    throw new StaffLevelError("STAFF_LEVELS_UNAVAILABLE", "Staff level settings could not be loaded.", 503);
  }
}

/** Compare-and-swap write of a mutated copy of the config. mutator(doc) mutates and may throw StaffLevelError. */
export async function saveStaffConfig(mutator, actorId) {
  if (testOverride && process.env.NODE_ENV === "test") {
    const next = structuredClone(testOverride); mutator(next); next.revision += 1; testOverride = next; return structuredClone(next);
  }
  let row;
  try { row = await readRow(); } catch (err) {
    logError("Staff levels write aborted: read failed", { error: err?.message || String(err), code: "STAFF_LEVELS_READ_FAILED" });
    throw new StaffLevelError("STAFF_LEVELS_UNAVAILABLE", "Settings store is unavailable", 503);
  }
  const current = row ? normalizeDoc(row.value) : defaults();
  const next = structuredClone(current);
  mutator(next);
  next.revision = current.revision + 1;
  next.updatedAt = new Date().toISOString();
  next.updatedBy = actorId ? String(actorId) : null;
  const value = { schemaVersion: 1, ...next };
  const sb = getSupabase();
  let write;
  if (!row) {
    write = await sb.from("system_settings").insert({ key: STAFF_LEVELS_KEY, value, description: "Owner-defined staff employment levels and company e-mail policy" }).select("key");
    if (write.error?.code === "23505") throw new StaffLevelError("STAFF_LEVELS_CONFLICT", "Staff levels were changed by someone else. Reload and try again.", 409);
  } else {
    let q = sb.from("system_settings").update({ value, updated_at: next.updatedAt }).eq("key", STAFF_LEVELS_KEY);
    q = Number.isInteger(row.value?.revision) ? q.eq("value->>revision", String(row.value.revision)) : q.is("value->>revision", null);
    write = await q.select("key");
  }
  if (write.error) {
    logError("Staff levels write failed", { error: write.error.message, code: "STAFF_LEVELS_WRITE_FAILED" });
    throw new StaffLevelError("STAFF_LEVELS_WRITE_FAILED", "Could not save staff levels", 500);
  }
  if (!Array.isArray(write.data) || write.data.length !== 1) throw new StaffLevelError("STAFF_LEVELS_CONFLICT", "Staff levels changed while saving. Reload and try again.", 409);
  return next;
}

export const memberCounts = (config) => {
  const counts = {};
  for (const k of Object.values(config.assignments)) counts[k] = (counts[k] || 0) + 1;
  return counts;
};
export const levelByKey = (config, key) => config.levels.find((l) => l.key === key) || null;

export async function createLevel(input, actorId) {
  const v = validateLevel(input);
  if (!v.ok) throw new StaffLevelError("STAFF_LEVEL_INVALID", "Invalid employment level", 400, { errors: v.errors });
  return saveStaffConfig((doc) => {
    if (doc.levels.length >= MAX_LEVELS) throw new StaffLevelError("STAFF_LEVEL_LIMIT", `At most ${MAX_LEVELS} levels are supported.`, 400);
    if (doc.levels.some((l) => l.key === v.level.key || l.label.toLowerCase() === v.level.label.toLowerCase())) throw new StaffLevelError("STAFF_LEVEL_EXISTS", "A level with that key or name already exists.", 409);
    doc.levels.push(v.level);
  }, actorId);
}

/** Returns { config, level, memberIds } so the caller can re-apply the new permissions to members. */
export async function updateLevel(key, input, actorId) {
  const v = validateLevel({ ...input, key }, { requireKey: false });
  if (!v.ok) throw new StaffLevelError("STAFF_LEVEL_INVALID", "Invalid employment level", 400, { errors: v.errors });
  let memberIds = [];
  const config = await saveStaffConfig((doc) => {
    const i = doc.levels.findIndex((l) => l.key === key);
    if (i < 0) throw new StaffLevelError("STAFF_LEVEL_NOT_FOUND", "Level not found", 404);
    if (doc.levels.some((l, j) => j !== i && l.label.toLowerCase() === v.level.label.toLowerCase())) throw new StaffLevelError("STAFF_LEVEL_EXISTS", "A level with that name already exists.", 409);
    doc.levels[i] = { ...v.level, key };
    memberIds = Object.entries(doc.assignments).filter(([, k]) => k === key).map(([uid]) => uid);
  }, actorId);
  return { config, level: levelByKey(config, key), memberIds };
}

export async function deleteLevel(key, actorId) {
  return saveStaffConfig((doc) => {
    if (!doc.levels.some((l) => l.key === key)) throw new StaffLevelError("STAFF_LEVEL_NOT_FOUND", "Level not found", 404);
    const members = Object.values(doc.assignments).filter((k) => k === key).length;
    if (members) throw new StaffLevelError("STAFF_LEVEL_IN_USE", `${members} staff member(s) still hold this level. Move them to another level or role first.`, 409, { members });
    doc.levels = doc.levels.filter((l) => l.key !== key);
  }, actorId);
}

export async function updateEmailPolicy({ companyEmailDomain, requireCompanyEmail }, actorId) {
  const domain = normalizeDomain(companyEmailDomain);
  if (domain && !DOMAIN_RE.test(domain)) throw new StaffLevelError("STAFF_EMAIL_POLICY_INVALID", "Enter a valid domain such as kayad.space", 400);
  if (typeof requireCompanyEmail !== "boolean") throw new StaffLevelError("STAFF_EMAIL_POLICY_INVALID", "requireCompanyEmail must be true or false", 400);
  if (requireCompanyEmail && !domain) throw new StaffLevelError("STAFF_EMAIL_POLICY_INVALID", "Set a company domain before requiring it.", 400);
  return saveStaffConfig((doc) => { doc.companyEmailDomain = domain; doc.requireCompanyEmail = requireCompanyEmail; }, actorId);
}

export const assignLevel = (userId, key, actorId) => saveStaffConfig((doc) => {
  if (!doc.levels.some((l) => l.key === key)) throw new StaffLevelError("STAFF_LEVEL_NOT_FOUND", "Level not found", 404);
  doc.assignments[String(userId)] = key;
}, actorId);
export const clearAssignment = (userId, actorId) => saveStaffConfig((doc) => { delete doc.assignments[String(userId)]; }, actorId);
