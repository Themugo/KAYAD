// backend/middleware/protectAccount.js
// ─────────────────────────────────────────────────────────────────────────
// Protects platform OWNER (webhost) accounts from modification by anyone
// other than an owner, and forbids destructive changes to owner accounts
// entirely (delete / re-role / email change) — so the principal identities
// stay immutable regardless of who else gains admin access.
//
// Apply to any route that edits or deletes a user identified by :id.
// ─────────────────────────────────────────────────────────────────────────

import User from "../models/User.js";
import { isOwnerEmail, isOwnerAccountEmail } from "../config/owners.js";

const FORBIDDEN_FIELDS = ["email", "role"]; // never editable on an owner account

export const protectAccount = async (req, res, next) => {
  try {
    const targetId = req.params.id || req.params.userId;
    if (!targetId) return next();

    const target = await User.findById(targetId).select("email role");
    if (!target) return next(); // let the route 404 naturally

    const targetIsOwner = isOwnerAccountEmail(target.email); // STAGE 5B closure: also true while the membership store is unreadable
    const requesterIsOwner = isOwnerEmail(req.user?.email);
    const method = req.method.toUpperCase();

    // 1. Owner accounts can only be touched by an owner.
    if (targetIsOwner && !requesterIsOwner) {
      return res.status(403).json({
        success: false,
        message: "This is a protected platform-owner account and cannot be modified by other administrators.",
      });
    }

    // 2. Owner accounts can never be deleted — not even by an owner — via admin routes.
    if (targetIsOwner && method === "DELETE") {
      return res.status(403).json({
        success: false,
        message: "Platform-owner accounts are immutable and cannot be deleted.",
      });
    }

    // 3. Even an owner cannot change an owner's email or role away from owner status.
    if (targetIsOwner && req.body && typeof req.body === "object") {
      for (const f of FORBIDDEN_FIELDS) {
        if (f in req.body) {
          return res.status(403).json({
            success: false,
            message: `The ${f} of a platform-owner account is immutable.`,
          });
        }
      }
    }

    // 4. IMMUTABLE ACCOUNTS: every platform-owner account and every Super Admin (role "superadmin") can never be suspended, banned,
    // deactivated, deleted, re-roled or re-emailed through any admin route, by anyone, other owners included. The only way an owner
    // identity changes is the dedicated owner-governance flow (mailbox-verified, separate routes), which does not use this middleware.
    // STAGE 5F.5 (D-5): PUT /admin/staff/:id {isBanned:true} suspends an account without passing through a toggle-ban/deactivate
    // path, so the body flag is checked as well.
    const targetIsSuperadmin = target.role === "superadmin";
    const bodyBans = !!req.body && typeof req.body === "object" && (req.body.isBanned === true || req.body.isBanned === "true");
    if ((targetIsOwner || targetIsSuperadmin) && (/toggle-ban|deactivate/.test(req.path) || bodyBans || method === "DELETE")) {
      return res.status(403).json({
        success: false,
        code: "IMMUTABLE_ACCOUNT",
        message: "Super Admin and platform-owner accounts are immutable: they cannot be suspended, banned, deactivated or deleted.",
      });
    }
    if (targetIsSuperadmin && req.body && typeof req.body === "object") {
      for (const f of FORBIDDEN_FIELDS) {
        if (f in req.body) {
          return res.status(403).json({ success: false, code: "IMMUTABLE_ACCOUNT", message: `The ${f} of a Super Admin account is immutable.` });
        }
      }
    }

    req.targetUser = target;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Account protection check failed" });
  }
};

export default protectAccount;
