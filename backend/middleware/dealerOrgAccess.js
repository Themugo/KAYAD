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
    .limit(2);
  if (error) throw error;
  const membership = data?.[0];
  if (!membership) return null;
  // Phase 14.7: the schema allows one user to hold active memberships in several dealerships (unique per dealer+member) but
  // there is no "current organization" selector in the product. Picking the first row would silently authorize against an
  // arbitrary organization, so ambiguous membership FAILS CLOSED until the product owner defines a selector.
  if (new Set((data || []).map((m) => String(m.dealer))).size > 1) return { ambiguous: true };

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
