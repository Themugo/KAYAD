import { getSupabase } from "../utils/supabase.js";
import { isOwnerUser } from "../config/owners.js";

const OWNER_ROLE = "dealer";
const STAFF_BYPASS = new Set(["admin", "superadmin"]);

export const DEALER_TEAM_PERMISSIONS = Object.freeze([
  "canListCars", "canEditCars", "canDeleteCars", "canViewEarnings",
  "canManageTeam", "canApproveDeals", "canChatBuyers", "canEditSettings",
]);

export async function resolveDealerOrg(req) {
  if (!req.user) return null;
  if (isOwnerUser(req.user) || STAFF_BYPASS.has(req.user.role)) {
    return { dealerId: req.user.id, isOwner: false, role: req.user.role, permissions: DEALER_TEAM_PERMISSIONS };
  }
  if (req.user.role === OWNER_ROLE) {
    return { dealerId: req.user.id, isOwner: true, role: "dealer", permissions: DEALER_TEAM_PERMISSIONS };
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("dealer_teams")
    .select("id,dealer,member,role,permissions,status")
    .eq("member", req.user.id)
    .eq("status", "active")
    .limit(50);
  if (error) throw error;
  const rows = data || [];
  // The browser may NAME the dealership it is working in (X-Dealer-Org), but the name is only ever matched against this user's own ACTIVE
  // memberships read from the database on this request. It can never add access: a name that is not one of them is refused, never ignored.
  const requested = String(req.headers?.["x-dealer-org"] || "").trim().toLowerCase();
  let membership;
  if (requested) {
    membership = rows.find((m) => String(m.dealer).toLowerCase() === requested);
    if (!membership) return null;
  } else {
    // Phase 14.7: one user may hold active memberships in several dealerships. Without a selection, picking the first row would silently
    // authorize against an arbitrary organization, so ambiguous membership FAILS CLOSED until the caller selects one.
    if (new Set(rows.map((m) => String(m.dealer))).size > 1) return { ambiguous: true, choices: rows.map((m) => String(m.dealer)) };
    membership = rows[0];
  }
  if (!membership) return null;

  return {
    dealerId: membership.dealer,
    membershipId: membership.id,
    isOwner: false,
    role: membership.role,
    permissions: membership.permissions || {},
  };
}

export function dealerOrgAccess(requiredPermission) {
  return async (req, res, next) => {
    try {
      const org = await resolveDealerOrg(req);
      if (org?.ambiguous) return res.status(403).json({ success: false, code: "DEALER_ORG_AMBIGUOUS", message: "Your account is an active member of more than one dealership. Organization selection is not supported yet, so access is refused." });
      if (!org) return res.status(403).json({ success: false, code: "DEALER_ORG_ACCESS_REQUIRED", message: "Active dealer organization access required" });
      if (requiredPermission && !org.permissions?.[requiredPermission] && !org.isOwner && !STAFF_BYPASS.has(req.user.role) && !isOwnerUser(req.user)) {
        return res.status(403).json({ success: false, code: "DEALER_PERMISSION_REQUIRED", message: `Missing dealer permission: ${requiredPermission}`, requiredPermission });
      }
      req.dealerOrg = org;
      req.dealerId = org.dealerId;
      next();
    } catch (err) {
      console.error("DEALER ORG ACCESS ERROR:", err);
      res.status(500).json({ success: false, message: "Dealer organization authorization failed" });
    }
  };
}
