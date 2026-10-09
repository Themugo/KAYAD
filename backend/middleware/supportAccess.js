import { PERM, ROLE_PERMISSIONS, WEBHOIST } from "../config/roles.js";
import { isOwnerUser } from "../config/owners.js";

// Support authorization is EXPLICIT. The generic hasPermission()/getEffectivePermissions() helpers hand every
// permission to superadmin and the platform owner; that shortcut is deliberately NOT used here, so reading customer
// conversations is never implied by a role name.
//
//   agent     - role default (technical_support) or an explicit per-user grant of support_agent (minus revokes).
//               May read and answer cases, including internal notes.
//   oversight - role default (admin, superadmin) or the platform owner. READ-ONLY, must state a reason per case,
//               never sees internal notes, every read is audited.
//
// NOTE: per-user grantedPermissions/revokedPermissions are read if present on req.user, but the current schema has
// no column that persists them, so in practice only the role defaults apply (documented in the support reports).
const explicit = (user, perm) => {
  const set = new Set(ROLE_PERMISSIONS[user?.role] || []);
  // admin/superadmin role arrays are explicit lists in roles.js except superadmin (= all). Re-derive superadmin
  // defaults from this module's own table so the 'all permissions' shortcut cannot leak in.
  if (user?.role === "superadmin" || user?.role === WEBHOIST || isOwnerUser(user)) { set.clear(); set.add(PERM.SUPPORT_OVERSIGHT); }
  for (const p of user?.grantedPermissions || []) set.add(p);
  for (const p of user?.revokedPermissions || []) set.delete(p);
  return set.has(perm);
};

export const supportCapability = (user) => {
  if (!user) return null;
  if (explicit(user, PERM.SUPPORT_AGENT)) return "agent";
  if (explicit(user, PERM.SUPPORT_OVERSIGHT) || isOwnerUser(user)) return "oversight";
  return null;
};

const deny = (res) => res.status(403).json({ success: false, message: "Support access only" });

// Agent OR oversight (queue, metrics, case read). Read endpoints apply further capability rules in the service.
export const requireSupportViewer = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
  const cap = supportCapability(req.user);
  if (!cap) return deny(res);
  req.supportCapability = cap;
  next();
};

// Agent only (reply, internal note, status/priority/assignment).
export const requireSupportAgent = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (supportCapability(req.user) !== "agent") {
    return res.status(403).json({ success: false, message: "Only support agents can work on cases" });
  }
  req.supportCapability = "agent";
  next();
};

// Backward-compatible name used by earlier routes/tests: viewer semantics.
export const requireSupportStaff = requireSupportViewer;
