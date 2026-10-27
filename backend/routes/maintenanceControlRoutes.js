// Maintenance control plane: mounted at /api/admin/system/maintenance (BEFORE the general /api/admin router).
//   GET  /status    System Owner or explicitly authorised technical-recovery staff
//   POST /recover   System Owner or authorised technical-recovery staff; password step-up (+ owner MFA when enrolled)
//   POST /activate  System Owner only; password step-up (+ owner MFA when enrolled); GLOBAL needs a typed confirmation
// Authorisation is decided here and by config/maintenancePolicy.js - never by the role label, an e-mail address or the UI.
import express from "express";
import { protect } from "../middleware/auth.js";
import { adminLimiter, stepUpLimiter } from "../middleware/rateLimiter.js";
import { isOwnerUser } from "../config/owners.js";
import { buildIdentity, decide, MAINTENANCE_FORBIDDEN_CODE, MAINTENANCE_SCOPES } from "../config/maintenancePolicy.js";
import * as svc from "../services/maintenanceControl.service.js";
import * as gov from "../services/ownerGovernance.service.js";
import { logError } from "../infrastructure/logging/index.js";

const router = express.Router();
router.use(adminLimiter);

const GLOBAL_CONFIRM = "GLOBAL SHUTDOWN";
const noStore = (res) => res.set("Cache-Control", "no-store");

const identityOf = (req) => buildIdentity({ ...req.user, id: req.user.id }, { isOwner: isOwnerUser(req.user) });

/** Authorise with the central policy (same decision function the gates use) and expose a normalised actor. */
const authorizeControl = (control) => (req, res, next) => {
  const identity = identityOf(req);
  const d = decide({ scope: "dealers", route: { kind: "control", control }, identity });
  if (!d.allow) {
    return res.status(403).json({ success: false, code: MAINTENANCE_FORBIDDEN_CODE, message: control === "activate" ? "Only a verified System Owner may activate or change maintenance." : "You are not authorised to use the maintenance controls." });
  }
  req.maintenanceActor = { id: req.user.id, name: req.user.name, email: req.user.email, isOwner: identity.isOwner };
  next();
};

const stepUp = async (req) => {
  const b = req.body || {};
  // Owners: password + authenticator/recovery code when a second factor is enrolled (same rule as every other owner change).
  // Technical staff: password re-entry (the repository has no second-factor store for non-owner staff; see the deployment plan).
  if (req.maintenanceActor.isOwner) await gov.requireStepUp(req.user, b.password, b.mfaCode);
  else await gov.passwordStepUp(req.user, b.password);
};

const send = (res, err) => {
  if (err instanceof svc.MaintenanceError) return res.status(err.status).json({ success: false, code: err.code, message: err.message, ...err.extra });
  if (err instanceof gov.OwnerError) return res.status(err.status).json({ success: false, code: err.code, message: err.message, ...(err.extra || {}) });
  logError("MAINTENANCE CONTROL ERROR", err);
  return res.status(500).json({ success: false, code: "MAINTENANCE_CONTROL_FAILED", message: "The maintenance control could not complete this request. Check the state shown and try again." });
};
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => send(res, e));

router.get("/status", protect, authorizeControl("status"), wrap(async (req, res) => {
  noStore(res);
  const state = await svc.readState(); // 503 MAINTENANCE_STORE_UNAVAILABLE when the store cannot be read - never a made-up "operational"
  res.json({
    success: true,
    state: svc.publicState(state),
    scopes: svc.scopeCatalog(),
    capabilities: { canActivate: req.maintenanceActor.isOwner, canRecover: true, role: req.maintenanceActor.isOwner ? "system_owner" : "technical_recovery", globalConfirmation: GLOBAL_CONFIRM },
    operator: { name: req.user.name || req.user.email, at: new Date().toISOString() },
  });
}));

router.post("/activate", protect, authorizeControl("activate"), stepUpLimiter, wrap(async (req, res) => {
  noStore(res);
  const b = req.body || {};
  const input = svc.validateActivation(b);
  if (MAINTENANCE_SCOPES[input.scope].requiresTypedConfirmation && b.confirmation !== GLOBAL_CONFIRM) {
    return res.status(400).json({ success: false, code: "MAINTENANCE_CONFIRMATION_REQUIRED", message: `Global shutdown refuses every visitor, buyer, seller, dealer and staff member. Type ${GLOBAL_CONFIRM} to confirm.` });
  }
  await stepUp(req);
  const out = await svc.activate({ actor: req.maintenanceActor, ...input, expectedVersion: b.expectedVersion, ip: req.ip });
  res.json({ success: true, changed: out.changed, transition: out.transition, state: out.state });
}));

router.post("/recover", protect, authorizeControl("recover"), stepUpLimiter, wrap(async (req, res) => {
  noStore(res);
  const b = req.body || {};
  const input = svc.validateRecovery(b, { reasonRequired: !req.maintenanceActor.isOwner });
  await stepUp(req);
  const out = await svc.recover({ actor: req.maintenanceActor, ...input, expectedVersion: b.expectedVersion, ip: req.ip });
  res.json({ success: true, changed: out.changed, transition: out.transition, state: out.state });
}));

export default router;
