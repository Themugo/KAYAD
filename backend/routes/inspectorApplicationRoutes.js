import { Router } from "express";
import InspectorApplication from "../models/InspectorApplication.js";
import { protect, allowRoles, optionalAuth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { submitApplicationSchema, approveApplicationSchema, rejectApplicationSchema } from "../validation/inspectorApplication.schema.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  listApplications,
  getApplication,
  listActiveInspectors,
} from "../controllers/inspectorApplicationController.js";

// STAGE 5C: adminOnly admits EVERY staff role, including ghost_checker (the inspectors themselves), which let an inspector read every
// applicant's national-ID/phone and approve or reject other inspectors. Review authority is the same set that is notified of new
// applications (controller INSPECTOR_REVIEW_ROLES); the owner passes allowRoles as webhoist.
const reviewerOnly = allowRoles("admin", "superadmin", "hr", "technical_support");

const router = Router();

const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = Object.entries(result.error.flatten().fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
      .join("; ");
    return res.status(400).json({ success: false, message: message || "Invalid request" });
  }
  req.body = result.data;
  next();
};


router.get("/active", asyncHandler(listActiveInspectors));
router.post("/apply", optionalAuth, createLimiter, validateBody(submitApplicationSchema), asyncHandler(submitApplication));

router.get(
  "/my",
  protect,
  asyncHandler(async (req, res) => {
    const apps = await InspectorApplication.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, applications: apps });
  }),
);

router.get("/", protect, reviewerOnly, asyncHandler(listApplications));
router.get("/:id", protect, reviewerOnly, validateObjectId, asyncHandler(getApplication));
router.post("/:id/approve", protect, reviewerOnly, validateObjectId, validateBody(approveApplicationSchema), asyncHandler(approveApplication));
router.post("/:id/reject", protect, reviewerOnly, validateObjectId, validateBody(rejectApplicationSchema), asyncHandler(rejectApplication));

export default router;
