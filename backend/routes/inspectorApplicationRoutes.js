import { Router } from "express";
import InspectorApplication from "../models/InspectorApplication.js";
import { protect, adminOnly, optionalAuth } from "../middleware/auth.js";
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

router.get("/", protect, adminOnly, asyncHandler(listApplications));
router.get("/:id", protect, adminOnly, validateObjectId, asyncHandler(getApplication));
router.post("/:id/approve", protect, adminOnly, validateObjectId, validateBody(approveApplicationSchema), asyncHandler(approveApplication));
router.post("/:id/reject", protect, adminOnly, validateObjectId, validateBody(rejectApplicationSchema), asyncHandler(rejectApplication));

export default router;
