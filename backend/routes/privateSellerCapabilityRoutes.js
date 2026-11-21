// Phase 13E — personal-account private-seller capability: apply, read own state, admin review.
import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requirePermission, PERMISSIONS } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getMySellerCapability, submitApplication, decideApplication, listApplications, DECISION_NAMES, SELLER_STATUSES } from "../services/privateSellerCapability.service.js";

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const applySchema = z.object({ contactPhone: z.string().min(9).max(20), intendedUse: z.string().max(500).optional(), acceptTerms: z.literal(true) });
const decisionSchema = z.object({ decision: z.enum(DECISION_NAMES), reason: z.string().max(500).optional() });
const fail = (res, e) => (e?.status ? res.status(e.status).json({ success: false, code: e.code, message: e.message }) : null);

// ---- the signed-in person (personal account) ----------------------------------------------------------------------------------
router.get("/me", protect, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getMySellerCapability(req.user) });
}));

router.post("/apply", protect, validate(applySchema), asyncHandler(async (req, res) => {
  try {
    const application = await submitApplication({ user: req.user, contactPhone: req.body.contactPhone, intendedUse: req.body.intendedUse });
    await logActionFromReq(req, "private_seller_application_submitted", { target: req.user.id, targetModel: "User", details: { status: application.status } });
    res.status(201).json({ success: true, data: { status: application.status, application } });
  } catch (e) { if (!fail(res, e)) throw e; }
}));

// ---- staff review (explicit permission; never self-service) ---------------------------------------------------------------------
router.get("/admin/applications", protect, requirePermission(PERMISSIONS.MANAGE_USERS), asyncHandler(async (req, res) => {
  const status = SELLER_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  res.json({ success: true, data: await listApplications({ status, limit: req.query.limit }) });
}));

router.patch("/admin/:userId/decision", protect, requirePermission(PERMISSIONS.MANAGE_USERS), validate(decisionSchema), asyncHandler(async (req, res) => {
  if (!UUID_RE.test(req.params.userId)) return res.status(400).json({ success: false, message: "Invalid ID format" });
  try {
    const result = await decideApplication({ targetUserId: req.params.userId, decision: req.body.decision, reason: req.body.reason, adminId: req.user.id });
    await logActionFromReq(req, `private_seller_${req.body.decision}`, { target: req.params.userId, targetModel: "User", details: { before: result.before, after: result.after, reason: req.body.reason || null } });
    res.json({ success: true, data: result });
  } catch (e) { if (!fail(res, e)) throw e; }
}));

export default router;
