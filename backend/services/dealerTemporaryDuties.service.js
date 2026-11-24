// Temporary duties: time-boxed extra operational permissions for a dealership member, on top of their role (which never changes).
// Pure rules live here so they are unit-testable; persistence uses the same db layer as the rest of the team code.
import * as db from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

/** Only operational duties can be lent. Team management and dealership settings (governance) can never be granted temporarily. */
export const TEMPORARY_DUTY_PERMISSIONS = Object.freeze(["canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canApproveDeals", "canChatBuyers"]);
export const MAX_DUTY_DAYS = 90;

export class DutyError extends Error {
  constructor(code, message, status = 400, extra = {}) { super(message); this.code = code; this.status = status; this.extra = extra; }
}

/** Validates a grant request. `actorPermissions` is the granter's EFFECTIVE permission map; owners/platform staff pass `unrestricted`. */
export function validateGrant({ permissions, startsAt, expiresAt, reason, actorId, targetMemberId, actorPermissions = {}, unrestricted = false, now = new Date() }) {
  const keys = [...new Set(Array.isArray(permissions) ? permissions : [])];
  if (!keys.length) throw new DutyError("DUTY_PERMISSIONS_REQUIRED", "Choose at least one duty to lend.");
  const unknown = keys.filter((k) => !TEMPORARY_DUTY_PERMISSIONS.includes(k));
  if (unknown.length) throw new DutyError("DUTY_PERMISSION_NOT_ALLOWED", "These permissions cannot be granted temporarily.", 400, { fields: unknown });
  if (targetMemberId && String(targetMemberId) === String(actorId)) throw new DutyError("DUTY_SELF_GRANT", "You cannot grant temporary duties to yourself.", 403);
  if (!unrestricted) {
    const over = keys.filter((k) => actorPermissions[k] !== true);
    if (over.length) throw new DutyError("PERMISSION_GRANT_FORBIDDEN", "You cannot lend permissions you do not hold.", 403, { fields: over });
  }
  const end = new Date(expiresAt);
  if (!expiresAt || Number.isNaN(end.getTime())) throw new DutyError("DUTY_EXPIRY_REQUIRED", "An expiry date and time is required.");
  const start = startsAt ? new Date(startsAt) : now;
  if (Number.isNaN(start.getTime())) throw new DutyError("DUTY_START_INVALID", "The start time is not valid.");
  if (end <= now) throw new DutyError("DUTY_EXPIRY_PAST", "The expiry must be in the future.");
  if (end <= start) throw new DutyError("DUTY_WINDOW_INVALID", "The expiry must be after the start.");
  if (end.getTime() - start.getTime() > MAX_DUTY_DAYS * 86400000) throw new DutyError("DUTY_TOO_LONG", `Temporary duties last at most ${MAX_DUTY_DAYS} days. For longer cover, change the role instead.`);
  const cleanReason = reason == null ? null : String(reason).normalize("NFKC").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 300) || null;
  return { permissions: keys, startsAt: start.toISOString(), expiresAt: end.toISOString(), reason: cleanReason };
}

export const grantIsActive = (g, now = new Date()) => !g.revokedAt && new Date(g.startsAt) <= now && new Date(g.expiresAt) > now;

const norm = (r) => ({
  id: r.id, teamId: r.teamId ?? r.team_id, dealer: r.dealer, permissions: Array.isArray(r.permissions) ? r.permissions : [],
  reason: r.reason ?? null, startsAt: r.startsAt ?? r.starts_at, expiresAt: r.expiresAt ?? r.expires_at,
  grantedBy: r.grantedBy ?? r.granted_by ?? null, grantedByLabel: r.grantedByLabel ?? r.granted_by_label ?? null,
  revokedAt: r.revokedAt ?? r.revoked_at ?? null, createdAt: r.createdAt ?? r.created_at,
});

export async function listGrants(dealerId, teamId) {
  const rows = await db.findAll("dealer_team_temporary_grants", { filters: { dealer: dealerId, teamId }, orderBy: "createdAt", ascending: false, limit: 50 });
  const now = new Date();
  return (rows || []).map(norm).map((g) => ({ ...g, state: g.revokedAt ? "revoked" : new Date(g.expiresAt) <= now ? "expired" : new Date(g.startsAt) > now ? "scheduled" : "active" }));
}

export async function createGrant({ dealerId, teamId, actor, actorLabel, grant }) {
  const row = await db.create("dealer_team_temporary_grants", {
    dealer: dealerId, teamId, permissions: grant.permissions, reason: grant.reason, startsAt: grant.startsAt, expiresAt: grant.expiresAt,
    grantedBy: actor || null, grantedByLabel: actorLabel || null,
  });
  return norm(row);
}

export async function revokeGrant({ dealerId, teamId, grantId, actor }) {
  const rows = await db.findAll("dealer_team_temporary_grants", { filters: { id: grantId, dealer: dealerId, teamId }, limit: 1 });
  const existing = rows?.[0];
  if (!existing) throw new DutyError("DUTY_NOT_FOUND", "Temporary duty not found.", 404);
  const g = norm(existing);
  if (g.revokedAt) return { grant: g, changed: false };
  const updated = await db.update("dealer_team_temporary_grants", g.id, { revokedAt: new Date().toISOString(), revokedBy: actor || null });
  return { grant: norm({ ...existing, ...updated }), changed: true };
}

/**
 * Union of the permission keys currently lent to a membership. FAILS CLOSED: any error (including the table not existing yet in an
 * environment where the migration has not been applied) returns no extra permissions, so access is never widened by a fault.
 */
export async function activeDutyPermissions(teamId, now = new Date()) {
  try {
    const iso = now.toISOString();
    const { data, error } = await getSupabase().from("dealer_team_temporary_grants").select("permissions").eq("team_id", teamId).is("revoked_at", null).lte("starts_at", iso).gt("expires_at", iso).limit(50);
    if (error) return [];
    const out = new Set();
    for (const r of data || []) for (const k of Array.isArray(r.permissions) ? r.permissions : []) if (TEMPORARY_DUTY_PERMISSIONS.includes(k)) out.add(k);
    return [...out];
  } catch { return []; }
}
