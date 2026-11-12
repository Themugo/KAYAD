// ============================================================
//  Dealer workspace delegation (G-23).
//
//  The dealership owner (role `dealer`) passes straight through. A hired team member is a PERSONAL account (role `user`) with an
//  ACTIVE `dealer_teams` row; if that row grants one of the permissions a route accepts, the request is run in the dealership's
//  context: `req.user` becomes the dealer identity (so inventory/leads handlers and requireDealerVerification judge the DEALER's
//  verification, plan limits and ownership), and `req.actingMember` records who really acted, for audit.
//
//  Membership is re-read on EVERY request, so removing or suspending a member (or the dealer) cuts access immediately. Nothing
//  here changes anyone's role. Owner-only surfaces (settings, payouts, subscription, team, finance) keep `dealerBusinessOnly`
//  and are never reachable through delegation. Ambiguous membership (several dealerships) fails closed.
// ============================================================
import User from "../models/User.js";
import { resolveDealerOrg } from "./dealerOrgAccess.js";
import { dealerBusinessOnly } from "./dealerIsolation.js";
import { dealerPublicName } from "../utils/companyName.js";

const deny = (res, status, code, message, extra = {}) => res.status(status).json({ success: false, code, message, ...extra });

/** @param {string|string[]} permissions  the member needs ANY one of these team permissions */
export function dealerWorkspaceAccess(permissions) {
  const needed = [].concat(permissions);
  return async (req, res, next) => {
    try {
      if (!req.user) return deny(res, 401, "UNAUTHENTICATED", "Not authorized");
      // Owner, staff and the platform owner keep the existing behaviour.
      if (req.user.role !== "user") return dealerBusinessOnly(req, res, next);

      const org = await resolveDealerOrg(req);
      if (org?.ambiguous) return deny(res, 403, "DEALER_ORG_AMBIGUOUS", "Your account is an active member of more than one dealership; ask the owner to contact support.");
      if (!org || org.isOwner || !org.membershipId) return deny(res, 403, "DEALER_ORG_ACCESS_REQUIRED", "Active dealer organization access required");
      if (!needed.some((p) => org.permissions?.[p] === true)) {
        return deny(res, 403, "DEALER_PERMISSION_REQUIRED", `Missing dealer permission: ${needed.join(" or ")}`, { requiredPermission: needed });
      }

      const dealer = await User.findById(org.dealerId);
      if (!dealer || dealer.role !== "dealer") return deny(res, 403, "DEALER_ORG_ACCESS_REQUIRED", "Active dealer organization access required");
      if (["suspended", "banned", "rejected", "deleted"].includes(String(dealer.status || ""))) {
        return deny(res, 403, "DEALER_NOT_ACTIVE", "This dealership is not active.");
      }

      req.actingMember = { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, membershipId: org.membershipId, teamRole: org.role };
      req.dealerOrg = org;
      req.dealerId = String(dealer._id ?? dealer.id);
      req.user = {
        id: req.dealerId,
        role: "dealer",
        effectiveRole: "dealer",
        name: dealer.name,
        email: dealer.email,
        status: dealer.status || "approved",
        emailVerified: dealer.emailVerified === true,
        grantedPermissions: [],
        revokedPermissions: [],
        actingMember: req.actingMember,
      };
      return next();
    } catch (err) {
      console.error("DEALER WORKSPACE ACCESS ERROR:", err);
      return deny(res, 500, "DEALER_WORKSPACE_FAILED", "Dealer organization authorization failed");
    }
  };
}

/** GET /api/dealer-platform/my-workspace — tells a signed-in account whether it works for a dealership (for the entry screen). Read-only. */
export async function myWorkspaceHandler(req, res) {
  try {
    if (!req.user) return deny(res, 401, "UNAUTHENTICATED", "Not authorized");
    if (req.user.role !== "user") return res.json({ success: true, data: { membership: null, ambiguous: false } });
    const org = await resolveDealerOrg(req);
    if (org?.ambiguous) return res.json({ success: true, data: { membership: null, ambiguous: true } });
    if (!org || org.isOwner || !org.membershipId) return res.json({ success: true, data: { membership: null, ambiguous: false } });
    const dealer = await User.findById(org.dealerId);
    if (!dealer || dealer.role !== "dealer" || ["suspended", "banned", "rejected", "deleted"].includes(String(dealer.status || ""))) {
      return res.json({ success: true, data: { membership: null, ambiguous: false } });
    }
    const granted = Object.entries(org.permissions || {}).filter(([, v]) => v === true).map(([k]) => k);
    return res.json({ success: true, data: { membership: { dealershipName: dealerPublicName(dealer), teamRole: org.role, permissions: granted } , ambiguous: false } });
  } catch (err) {
    console.error("MY WORKSPACE ERROR:", err);
    return deny(res, 500, "DEALER_WORKSPACE_FAILED", "Could not load your dealership access");
  }
}
