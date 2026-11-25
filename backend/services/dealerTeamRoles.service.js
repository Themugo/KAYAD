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
  // Onboarding access level, NOT an operational job role. Every new invitation starts here; the dealer promotes the employee after they join.
  // It holds no dealership permission at all: it can reach only the employee's own staff profile (which needs an active membership, nothing more).
  { key: "basic_staff", label: "Basic Staff Access", description: "Starting access for every new employee: their own staff profile only. No leads, customers, listings, deals, finance or team access until the dealership assigns a role.", permissions: none(), builtin: true, onboarding: true },
  { key: "manager", label: "Manager", description: "Runs day-to-day sales and inventory. Cannot manage the team.", permissions: only("canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canApproveDeals", "canChatBuyers", "canEditSettings"), builtin: true },
  { key: "sales_agent", label: "Sales agent", description: "Lists and edits vehicles and talks to buyers.", permissions: only("canListCars", "canEditCars", "canChatBuyers"), builtin: true },
  { key: "lot_agent", label: "Lot agent", description: "Adds and edits vehicles and photos.", permissions: only("canListCars", "canEditCars"), builtin: true },
  { key: "finance_officer", label: "Finance officer", description: "Sees earnings and approves deals.", permissions: only("canViewEarnings", "canApproveDeals"), builtin: true },
  { key: "viewer", label: "Viewer", description: "Read-only; no actions.", permissions: none(), builtin: true },
]);
const BUILTIN_KEYS = new Set(BUILTIN_ROLES.map((r) => r.key));
// The onboarding level is the platform's safe baseline for every new invitation, so its permissions stay empty for every dealership.
// Every other built-in role can be adapted per dealership: the change is stored as an override row in dealer_team_roles keyed by the
// built-in key, and "reset to default" simply removes that row. Nothing about the platform default itself changes.
export const LOCKED_BUILTIN_KEYS = Object.freeze(["basic_staff"]);
const isLocked = (key) => LOCKED_BUILTIN_KEYS.includes(key);

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

async function loadRows(dealerId) {
  try {
    const rows = await findAll("dealer_team_roles", { filters: { dealer: dealerId }, orderBy: "createdAt", ascending: true, limit: 100 });
    return { available: true, rows: rows || [] };
  } catch (err) {
    if (tableMissing(err)) return { available: false, rows: [] };
    throw err;
  }
}
const toRole = (r) => ({ key: r.key, label: r.label, description: r.description || "", permissions: { ...none(), ...(r.permissions || {}) }, builtin: false, id: r.id });

/** The six built-in roles as THIS dealership sees them: platform defaults with any saved override applied. */
function effectiveBuiltins(rows) {
  const byKey = new Map(rows.filter((r) => BUILTIN_KEYS.has(r.key)).map((r) => [r.key, r]));
  return BUILTIN_ROLES.map((b) => {
    const o = byKey.get(b.key);
    if (!o || isLocked(b.key)) return { ...b, locked: isLocked(b.key), customised: false, defaultPermissions: b.permissions };
    return { ...b, label: o.label, description: o.description || b.description, permissions: { ...none(), ...(o.permissions || {}) }, customised: true, locked: false, defaultLabel: b.label, defaultPermissions: b.permissions, id: o.id };
  });
}

export async function listCustomRoles(dealerId) {
  const { available, rows } = await loadRows(dealerId);
  return { available, rows: rows.filter((r) => !BUILTIN_KEYS.has(r.key)).map(toRole), builtins: effectiveBuiltins(rows) };
}

export async function listRoles(dealerId) {
  const custom = await listCustomRoles(dealerId);
  return { roles: [...custom.builtins, ...custom.rows], customRolesAvailable: custom.available, permissions: DEALER_TEAM_PERMISSIONS.map((k) => ({ key: k, label: PERMISSION_LABELS[k] || k })) };
}

/** The role (built-in or this dealership's custom role) for a key, or null. */
export async function resolveRole(dealerId, key) {
  const k = String(key || "");
  if (!k) return null;
  const custom = await listCustomRoles(dealerId);
  return custom.builtins.find((r) => r.key === k) || custom.rows.find((r) => r.key === k) || null;
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
  if (BUILTIN_KEYS.has(base) || custom.rows.some((r) => r.key === key || r.label.toLowerCase() === cleanLabel.toLowerCase()) || custom.builtins.some((r) => r.label.toLowerCase() === cleanLabel.toLowerCase())) {
    throw new RoleError(409, "ROLE_EXISTS", "A role with that name already exists.");
  }
  const row = await create("dealer_team_roles", { dealer: dealerId, key, label: cleanLabel, description: String(description || "").trim().slice(0, 200), permissions: perms });
  return { key: row.key || key, label: cleanLabel, description: row.description || "", permissions: perms, builtin: false, id: row.id };
}

export async function updateCustomRole(dealerId, key, { label, description, permissions }) {
  if (isLocked(key)) throw new RoleError(409, "ROLE_LOCKED", "Basic Staff Access is the starting level for every new employee and always has no permissions. Give people extra access individually, or assign them a role.");
  const builtin = BUILTIN_ROLES.find((r) => r.key === key);
  const { available, rows, builtins } = await listCustomRoles(dealerId);
  if (builtin && !available) throw new RoleError(503, "CUSTOM_ROLES_UNAVAILABLE", "Editing built-in roles needs a database update that has not been applied yet.");
  const existing = await findOne("dealer_team_roles", { dealer: dealerId, key });
  if (!builtin && !existing) throw new RoleError(404, "ROLE_NOT_FOUND", "Role not found.");
  const current = builtin ? builtins.find((r) => r.key === key) : toRole(existing);
  const patch = {};
  if (label !== undefined) {
    patch.label = validateLabel(label);
    if (rows.some((r) => r.key !== key && r.label.toLowerCase() === patch.label.toLowerCase()) || builtins.some((r) => r.key !== key && r.label.toLowerCase() === patch.label.toLowerCase())) throw new RoleError(409, "ROLE_EXISTS", "A role with that name already exists.");
  }
  if (description !== undefined) patch.description = String(description || "").trim().slice(0, 200);
  if (permissions !== undefined) patch.permissions = cleanPermissions(permissions);
  if (!Object.keys(patch).length) throw new RoleError(400, "NO_CHANGES", "Nothing to change.");
  let row;
  if (existing) row = await update("dealer_team_roles", existing.id, patch);
  else row = await create("dealer_team_roles", { dealer: dealerId, key, label: patch.label ?? current.label, description: patch.description ?? current.description ?? "", permissions: patch.permissions ?? current.permissions });
  return { key, label: row.label, description: row.description || "", permissions: { ...none(), ...(row.permissions || {}) }, builtin: Boolean(builtin), customised: Boolean(builtin), id: row.id, previousPermissions: current.permissions || {} };
}

/** Put a built-in role back to the platform default for this dealership (removes the saved override). */
export async function resetBuiltinRole(dealerId, key) {
  if (isLocked(key)) throw new RoleError(409, "ROLE_LOCKED", "Basic Staff Access cannot be changed, so there is nothing to reset.");
  const builtin = BUILTIN_ROLES.find((r) => r.key === key);
  if (!builtin) throw new RoleError(404, "ROLE_NOT_FOUND", "Only built-in roles can be reset to their defaults.");
  const existing = await findOne("dealer_team_roles", { dealer: dealerId, key });
  if (!existing) throw new RoleError(409, "ROLE_NOT_CUSTOMISED", "This role is already using its default permissions.");
  await db.remove("dealer_team_roles", existing.id);
  return { key, label: builtin.label, description: builtin.description, permissions: builtin.permissions, builtin: true, customised: false, previousPermissions: { ...none(), ...(existing.permissions || {}) } };
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
