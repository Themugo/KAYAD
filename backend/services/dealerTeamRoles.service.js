// Dealer team roles = named permission sets. Five built-in templates ship with the platform; the dealership owner can add, edit and delete
// their own (custom) roles. A role decides which permissions a member is given when they are invited or moved to that role.
// Custom roles live in public.dealer_team_roles. If that table has not been created yet (migration not applied) the built-in roles keep
// working and the API reports customRolesAvailable:false instead of failing.
import crypto from "node:crypto";
import * as db from "../db/index.js";
const { findAll, findOne, create, update } = db;
import { DEALER_TEAM_PERMISSIONS } from "../middleware/dealerOrgAccess.js";

export const PERMISSION_LABELS = Object.freeze({
  canListCars: "Add new vehicle listings",
  canEditCars: "Edit existing listings and photos",
  canDeleteCars: "Remove listings",
  canViewEarnings: "See earnings and payouts",
  canManageTeam: "Invite, change and remove team members",
  canApproveDeals: "Approve deals and offers",
  canChatBuyers: "Chat with buyers and handle leads",
  canEditSettings: "Change dealership settings",
});

const none = () => Object.fromEntries(DEALER_TEAM_PERMISSIONS.map((k) => [k, false]));
const only = (...on) => ({ ...none(), ...Object.fromEntries(on.map((k) => [k, true])) });

export const BUILTIN_ROLES = Object.freeze([
  { key: "manager", label: "Manager", description: "Runs day-to-day sales and inventory. Cannot manage the team.", permissions: only("canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canApproveDeals", "canChatBuyers", "canEditSettings"), builtin: true },
  { key: "sales_agent", label: "Sales agent", description: "Lists and edits vehicles and talks to buyers.", permissions: only("canListCars", "canEditCars", "canChatBuyers"), builtin: true },
  { key: "lot_agent", label: "Lot agent", description: "Adds and edits vehicles and photos.", permissions: only("canListCars", "canEditCars"), builtin: true },
  { key: "finance_officer", label: "Finance officer", description: "Sees earnings and approves deals.", permissions: only("canViewEarnings", "canApproveDeals"), builtin: true },
  { key: "viewer", label: "Viewer", description: "Read-only; no actions.", permissions: none(), builtin: true },
]);
const BUILTIN_KEYS = new Set(BUILTIN_ROLES.map((r) => r.key));

export class RoleError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const tableMissing = (err) => /dealer_team_roles|PGRST205|42P01|does not exist|schema cache/i.test(`${err?.code || ""} ${err?.message || ""}`);

export function cleanPermissions(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RoleError(400, "INVALID_PERMISSIONS", "Permissions must be an object of true/false values.");
  const unknown = Object.keys(input).filter((k) => !DEALER_TEAM_PERMISSIONS.includes(k));
  if (unknown.length) throw new RoleError(400, "UNKNOWN_PERMISSION", `Unknown permission: ${unknown.join(", ")}`);
  if (Object.values(input).some((v) => typeof v !== "boolean")) throw new RoleError(400, "INVALID_PERMISSIONS", "Permission values must be true or false.");
  return { ...none(), ...input };
}

const slug = (label) => String(label || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

export async function listCustomRoles(dealerId) {
  try {
    const rows = await findAll("dealer_team_roles", { filters: { dealer: dealerId }, orderBy: "createdAt", ascending: true, limit: 100 });
    return { available: true, rows: (rows || []).map((r) => ({ key: r.key, label: r.label, description: r.description || "", permissions: { ...none(), ...(r.permissions || {}) }, builtin: false, id: r.id })) };
  } catch (err) {
    if (tableMissing(err)) return { available: false, rows: [] };
    throw err;
  }
}

export async function listRoles(dealerId) {
  const custom = await listCustomRoles(dealerId);
  return { roles: [...BUILTIN_ROLES, ...custom.rows], customRolesAvailable: custom.available, permissions: DEALER_TEAM_PERMISSIONS.map((k) => ({ key: k, label: PERMISSION_LABELS[k] || k })) };
}

/** The role (built-in or this dealership's custom role) for a key, or null. */
export async function resolveRole(dealerId, key) {
  const k = String(key || "");
  const builtin = BUILTIN_ROLES.find((r) => r.key === k);
  if (builtin) return builtin;
  if (!k) return null;
  const custom = await listCustomRoles(dealerId);
  return custom.rows.find((r) => r.key === k) || null;
}

function validateLabel(label) {
  const v = String(label || "").trim();
  if (v.length < 2 || v.length > 40) throw new RoleError(400, "INVALID_ROLE_NAME", "Role name must be 2 to 40 characters.");
  if (/[<>\u0000-\u001f]/.test(v)) throw new RoleError(400, "INVALID_ROLE_NAME", "Role name contains characters that are not allowed.");
  return v;
}

export async function createCustomRole(dealerId, { label, description, permissions }) {
  const cleanLabel = validateLabel(label);
  const perms = cleanPermissions(permissions);
  const custom = await listCustomRoles(dealerId);
  if (!custom.available) throw new RoleError(503, "CUSTOM_ROLES_UNAVAILABLE", "Custom roles need a database update that has not been applied yet.");
  if (custom.rows.length >= 30) throw new RoleError(409, "ROLE_LIMIT", "A dealership can have at most 30 custom roles.");
  const base = slug(cleanLabel);
  if (!base) throw new RoleError(400, "INVALID_ROLE_NAME", "Role name must contain letters or numbers.");
  let key = `custom_${base}`;
  if (BUILTIN_KEYS.has(base) || custom.rows.some((r) => r.key === key || r.label.toLowerCase() === cleanLabel.toLowerCase()) || BUILTIN_ROLES.some((r) => r.label.toLowerCase() === cleanLabel.toLowerCase())) {
    throw new RoleError(409, "ROLE_EXISTS", "A role with that name already exists.");
  }
  const row = await create("dealer_team_roles", { dealer: dealerId, key, label: cleanLabel, description: String(description || "").trim().slice(0, 200), permissions: perms });
  return { key: row.key || key, label: cleanLabel, description: row.description || "", permissions: perms, builtin: false, id: row.id };
}

export async function updateCustomRole(dealerId, key, { label, description, permissions }) {
  if (BUILTIN_KEYS.has(key)) throw new RoleError(409, "ROLE_BUILTIN", "Built-in roles cannot be edited. Create a custom role instead.");
  const existing = await findOne("dealer_team_roles", { dealer: dealerId, key });
  if (!existing) throw new RoleError(404, "ROLE_NOT_FOUND", "Role not found.");
  const patch = {};
  if (label !== undefined) {
    patch.label = validateLabel(label);
    const custom = await listCustomRoles(dealerId);
    if (custom.rows.some((r) => r.key !== key && r.label.toLowerCase() === patch.label.toLowerCase()) || BUILTIN_ROLES.some((r) => r.label.toLowerCase() === patch.label.toLowerCase())) throw new RoleError(409, "ROLE_EXISTS", "A role with that name already exists.");
  }
  if (description !== undefined) patch.description = String(description || "").trim().slice(0, 200);
  if (permissions !== undefined) patch.permissions = cleanPermissions(permissions);
  if (!Object.keys(patch).length) throw new RoleError(400, "NO_CHANGES", "Nothing to change.");
  const row = await update("dealer_team_roles", existing.id, patch);
  return { key, label: row.label, description: row.description || "", permissions: { ...none(), ...(row.permissions || {}) }, builtin: false, id: row.id, previousPermissions: existing.permissions || {} };
}

export async function deleteCustomRole(dealerId, key, { inUseCount }) {
  if (BUILTIN_KEYS.has(key)) throw new RoleError(409, "ROLE_BUILTIN", "Built-in roles cannot be deleted.");
  const existing = await findOne("dealer_team_roles", { dealer: dealerId, key });
  if (!existing) throw new RoleError(404, "ROLE_NOT_FOUND", "Role not found.");
  if (inUseCount > 0) throw new RoleError(409, "ROLE_IN_USE", `${inUseCount} team member${inUseCount === 1 ? " has" : "s have"} this role. Move them to another role first.`);
  await db.remove("dealer_team_roles", existing.id);
  return { key };
}

export const newInviteToken = () => crypto.randomBytes(32).toString("hex");
