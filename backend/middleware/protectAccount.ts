// backend/middleware/protectAccount.js
// ─────────────────────────────────────────────────────────────────────────
// Protects platform OWNER (webhost) accounts from modification by anyone
// other than an owner, and forbids destructive changes to owner accounts
// entirely (delete / re-role / email change) — so the principal identities
// stay immutable regardless of who else gains admin access.
//
// Apply to any route that edits or deletes a user identified by :id.
// ─────────────────────────────────────────────────────────────────────────

import User from "../models/User.ts";
import { isOwnerEmail, isMainOwnerEmail } from "../config/owners.ts";

const FORBIDDEN_FIELDS = ["email", "role"]; // never editable on an owner account

export const protectAccount = async (req, res, next) => {
  try {
    const targetId = req.params.id || req.params.userId;
    if (!targetId) return next();

    const target = await User.findById(targetId).select("email role");
    if (!target) return next(); // let the route 404 naturally

    const targetIsOwner = isOwnerEmail(target.email);
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

    // 4. The MAIN owner is the most protected: never deactivated/banned by anyone.
    if (isMainOwnerEmail(target.email) && /toggle-ban|deactivate/.test(req.path)) {
      return res.status(403).json({
        success: false,
        message: "The primary platform owner cannot be suspended or deactivated.",
      });
    }

    req.targetUser = target;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Account protection check failed" });
  }
};

export default protectAccount;
