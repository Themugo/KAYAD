// Dealership employment layer on top of dealer_teams (membership + access). It adds: the HR status, staff number, business contact, staff
// profile and an append-only employment history. It never creates a second identity or membership system and never changes a user's
// personal account.
//
// Two statuses are kept deliberately separate and tied together by a DB constraint (dealer_teams_access_employment_consistent):
//   dealer_teams.status        ACCESS    invited | active | suspended | removed      (what the backend authorises on every request)
//   dealer_teams.employment_status  HR   invited | onboarding | active | suspended | terminated | resigned | archived
//
// If the employment migration (20261123200000) has not been applied the feature reports `available:false` and every caller falls back to
// the previous behaviour, so deploying code before the migration cannot break the Team page.
import * as db from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { logError } from "../utils/logger.js";
import { DEALER_TEAM_PERMISSIONS } from "../middleware/dealerOrgAccess.js";

export const EMPLOYMENT_STATUSES = Object.freeze(["invited", "onboarding", "active", "suspended", "terminated", "resigned", "archived"]);
export const EMPLOYMENT_ACTIONS = Object.freeze(["suspend", "reinstate", "terminate", "resign", "archive"]);
export const BASIC_ROLE_KEY = "basic_staff";

let availability = { value: null, at: 0 };
const AVAILABILITY_TTL_MS = 60_000;
export function resetEmploymentAvailabilityCache() { availability = { value: null, at: 0 }; }

/** True when the employment columns/tables exist. Cached for a minute; never throws. */
export async function employmentAvailable() {
  if (availability.value !== null && Date.now() - availability.at < AVAILABILITY_TTL_MS) return availability.value;
  let ok = false;
  try {
    const { error } = await getSupabase().from("dealer_teams").select("id,employment_status,staff_number").limit(1);
    ok = !error;
  } catch { ok = false; }
  availability = { value: ok, at: Date.now() };
  return ok;
}

export const todayDate = () => new Date().toISOString().slice(0, 10);

const grantedKeys = (perms) => Object.keys(perms && typeof perms === "object" ? perms : {}).filter((k) => perms[k] === true);

/** Descriptive access level derived ONLY from the permissions actually granted (never stored, never trusted from a client). */
export function accessLevel(permissions, { isOwner = false } = {}) {
  if (isOwner) return "Full";
  const n = grantedKeys(permissions).filter((k) => DEALER_TEAM_PERMISSIONS.includes(k)).length;
  if (n === 0) return "Basic";
  const p = permissions || {};
  if (p.canManageTeam || p.canEditSettings || n >= 5) return "Extended";
  return "Standard";
}

/** HR status that goes with an access status when an employment action is applied (single source for the DB constraint pairs). */
export const ACTION_RESULT = Object.freeze({
  suspend: { from: ["active"], status: "suspended", employmentStatus: "suspended", event: "suspended" },
  reinstate: { from: ["suspended"], status: "active", employmentStatus: "active", event: "reinstated" },
  terminate: { from: ["active", "suspended"], status: "removed", employmentStatus: "terminated", event: "terminated", ends: true },
  resign: { from: ["active", "suspended"], status: "removed", employmentStatus: "resigned", event: "resigned", ends: true },
});

/** Append one employment event. Failure is logged and reported to the caller (history is important, but the access change already happened). */
export async function recordEmploymentEvent({ dealerId, teamId, type, actor = null, actorLabel = null, staffNumber = null, from = null, to = null, reason = null }) {
  try {
    await db.create("dealer_employment_events", {
      dealer: dealerId, teamId, eventType: type, actor: actor || null, actorLabel: actorLabel || null,
      staffNumber: staffNumber || null, fromValue: from, toValue: to, reason: reason ? String(reason).slice(0, 500) : null,
    });
    return true;
  } catch (err) {
    logError("dealer_employment_event_failed", { type, message: err?.message });
    return false;
  }
}

export async function listEmploymentEvents(dealerId, { teamId = null, limit = 100 } = {}) {
  const filters = { dealer: dealerId };
  if (teamId) filters.teamId = teamId;
  const rows = await db.findAll("dealer_employment_events", { filters, orderBy: "createdAt", ascending: false, limit: Math.min(Number(limit) || 100, 200) });
  return (rows || []).map((r) => ({
    id: r.id, teamId: r.teamId ?? r.team_id, type: r.eventType ?? r.event_type, at: r.createdAt ?? r.created_at,
    actorLabel: r.actorLabel ?? r.actor_label ?? null, staffNumber: r.staffNumber ?? r.staff_number ?? null,
    from: r.fromValue ?? r.from_value ?? null, to: r.toValue ?? r.to_value ?? null, reason: r.reason ?? null,
  }));
}

/** Concurrency-safe, idempotent staff number for an ACCEPTED member (SQL function; the dealership counter row is the lock). */
export async function allocateStaffNumber(teamId) {
  const { data, error } = await getSupabase().rpc("kayad_allocate_staff_number", { p_team: teamId });
  if (error) { const e = new Error(error.message || "staff number allocation failed"); e.code = /STAFF_CODE_REQUIRED/.test(error.message || "") ? "STAFF_CODE_REQUIRED" : "STAFF_NUMBER_FAILED"; throw e; }
  return data;
}

export async function setStaffCode(dealerId, code) {
  const { data, error } = await getSupabase().rpc("kayad_set_staff_code", { p_dealer: dealerId, p_code: code });
  if (error) {
    const m = String(error.message || "");
    const known = ["STAFF_CODE_INVALID", "STAFF_CODE_LOCKED", "STAFF_CODE_TAKEN"].find((c) => m.includes(c));
    const e = new Error(known || "STAFF_CODE_FAILED"); e.code = known || "STAFF_CODE_FAILED"; throw e;
  }
  return data;
}

export async function getStaffSettings(dealerId) {
  const row = await db.findOne("dealer_staff_settings", { dealer: dealerId });
  return row ? { staffCode: row.staffCode ?? row.staff_code, nextNumber: row.nextSeq ?? row.next_seq, locked: Number(row.nextSeq ?? row.next_seq) > 1 } : { staffCode: null, nextNumber: 1, locked: false };
}

/** Business contact must look like an e-mail address and must not equal anything we pretend to provision. It is a RECORD only. */
export function cleanBusinessEmail(value) {
  const v = String(value ?? "").normalize("NFKC").trim().toLowerCase();
  if (!v) return null;
  if (v.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { const e = new Error("Enter a valid business e-mail address."); e.code = "BUSINESS_EMAIL_INVALID"; throw e; }
  return v;
}
export function cleanText(value, max, field) {
  const v = String(value ?? "").normalize("NFKC").replace(/[\u0000-\u001f<>]/g, "").trim();
  if (v.length > max) { const e = new Error(`${field} is too long.`); e.code = "FIELD_TOO_LONG"; throw e; }
  return v || null;
}
