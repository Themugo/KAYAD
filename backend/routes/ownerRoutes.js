// backend/routes/ownerRoutes.js — STAGE 5B owner governance API.
//  /api/owner          owner-only (protect + verified owner + store healthy). Every mutation re-checks the password (step-up) and a typed confirmation.
//  /api/owner-access   public, token-gated invitation preview/accept (rate limited at mount).
import express from "express";
import { protect } from "../middleware/auth.js";
import { isOwnerUser } from "../config/owners.js";
import * as gov from "../services/ownerGovernance.service.js";
import * as registry from "../services/ownerRegistry.service.js";
import { logError } from "../infrastructure/logging/index.js";

const send = (res, e) => {
  if (e instanceof gov.OwnerError) {
    if (e.status === 429 || e.status === 503) res.set("Retry-After", e.status === 503 ? "5" : "60");
    return res.status(e.status).json({ success: false, code: e.code, message: e.message, ...(e.extra || {}) });
  }
  logError("owner route failure", e, { event: "owner.route_failure" });
  return res.status(500).json({ success: false, code: "OWNER_INTERNAL", message: "The request could not be completed." });
};
const wrap = (fn) => async (req, res) => { try { await fn(req, res); } catch (e) { send(res, e); } };

/** Server-side authority: a verified owner whose membership is currently active in the database (or the Stage 5A rule while the store is not installed). */
export const requireOwner = (req, res, next) => {
  const u = req.user;
  if (registry.describe().mode === "error") {
    // The membership store cannot be read: owner privilege is suspended for EVERYONE (fail closed). Say so, and point to recovery.
    return res.status(503).set("Retry-After", "5").json({ success: false, code: "OWNER_STORE_UNAVAILABLE", message: "Owner privileges are suspended because the owner membership store cannot be read. This resolves by itself when the database recovers; if it does not, follow runbooks/stage5b-owner-governance-20261019/OWNER_BOOTSTRAP_AND_RECOVERY_RUNBOOK.md." });
  }
  if (!u || u.effectiveRole !== "webhoist" || u.emailVerified !== true || !isOwnerUser(u)) {
    return res.status(403).json({ success: false, code: "OWNER_ONLY", message: "Only a verified platform owner can manage owners." });
  }
  next();
};
/** Membership writes need the database store (not the legacy env fallback) — otherwise explain exactly what is missing. */
const requireStore = (_req, res, next) => {
  const d = registry.describe();
  if (d.mode === "database") return next();
  const notInstalled = d.mode === "legacy";
  return res.status(503).set("Retry-After", "5").json({ success: false, code: notInstalled ? "OWNER_STORE_NOT_INSTALLED" : "OWNER_STORE_UNAVAILABLE",
    message: notInstalled ? "Owner management needs the owner-governance migration, which has not been applied to this database yet. Owner access continues to work as before." : "The owner membership store is unreadable right now; owner privileges are suspended until it recovers. Follow the owner recovery runbook if this persists." });
};

export const ownerRouter = express.Router();
ownerRouter.use(protect, requireOwner);

ownerRouter.get("/", wrap(async (req, res) => {
  const d = registry.describe();
  res.set("Cache-Control", "no-store");
  if (d.mode !== "database") return res.json({ success: true, store: d, members: [], invitations: [], events: [], canManage: false, self: { id: req.user.id } });
  const g = await gov.listGovernance({ eventLimit: Math.min(Number(req.query.events) || 100, 500) });
  res.json({ success: true, ...g, canManage: true, self: { id: req.user.id } });
}));
ownerRouter.post("/invitations", requireStore, wrap(async (req, res) => {
  const b = req.body || {};
  res.status(201).json({ success: true, ...(await gov.inviteOwner({ actor: req.user, email: b.email, confirmEmail: b.confirmEmail, password: b.password, note: b.note })) });
}));
ownerRouter.post("/invitations/:id/resend", requireStore, wrap(async (req, res) => {
  const b = req.body || {};
  res.json({ success: true, ...(await gov.resendInvitation({ actor: req.user, invitationId: req.params.id, confirmEmail: b.confirmEmail, password: b.password })) });
}));
ownerRouter.delete("/invitations/:id", requireStore, wrap(async (req, res) => {
  const b = req.body || {};
  res.json({ success: true, ...(await gov.revokeInvitation({ actor: req.user, invitationId: req.params.id, confirmEmail: b.confirmEmail, password: b.password, reason: b.reason })) });
}));
ownerRouter.delete("/members/:userId", requireStore, wrap(async (req, res) => {
  const b = req.body || {};
  res.json({ success: true, ...(await gov.removeOwner({ actor: req.user, targetUserId: req.params.userId, confirmEmail: b.confirmEmail, password: b.password, reason: b.reason })) });
}));
ownerRouter.post("/members/:userId/recovery", requireStore, wrap(async (req, res) => {
  const b = req.body || {};
  res.json({ success: true, ...(await gov.recoverOwner({ actor: req.user, targetUserId: req.params.userId, confirmEmail: b.confirmEmail, password: b.password, verifiedVia: b.verifiedVia, note: b.note })) });
}));

/**
 * Identify the caller if (and only if) they present a VALID session — Bearer header or the access cookie — using the real `protect`
 * (revocation, token-version, ban and owner checks included). Any failure leaves the request anonymous; it never answers the request.
 * Used by invitation acceptance, where an existing verified account must prove it is the signed-in one.
 */
export const softAuth = (req, res, next) => {
  const hasToken = (req.headers.authorization || "").startsWith("Bearer ") || !!req.cookies?.token;
  if (!hasToken) return next();
  let done = false;
  const go = () => { if (!done) { done = true; next(); } };
  const shim = { status() { return shim; }, set() { return shim; }, setHeader() {}, cookie() { return shim; }, clearCookie() { return shim; }, json() { delete req.user; go(); return shim; }, send() { delete req.user; go(); return shim; }, end() { delete req.user; go(); return shim; } };
  Promise.resolve(protect(req, shim, go)).catch(() => { delete req.user; go(); });
};

export const ownerAccessRouter = express.Router();
ownerAccessRouter.get("/invitation", wrap(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ success: true, ...(await gov.previewInvitation(String(req.query.token || ""))) });
}));
ownerAccessRouter.post("/accept", softAuth, wrap(async (req, res) => {
  const b = req.body || {};
  res.set("Cache-Control", "no-store");
  res.json({ success: true, ...(await gov.acceptInvitation({ token: String(b.token || ""), name: b.name, password: b.password, authUserId: req.user?.id || null })) });
}));
