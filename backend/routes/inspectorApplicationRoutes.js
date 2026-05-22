import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { submitApplicationSchema, approveApplicationSchema, rejectApplicationSchema } from "../validation/inspectorApplication.schema.js";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  listApplications,
  getApplication,
} from "../controllers/inspectorApplicationController.js";

const router = Router();

router.post("/apply", validate(submitApplicationSchema), asyncHandler(submitApplication));

router.get("/my", protect, asyncHandler(async (req, res) => {
  const InspectorApplication = (await import("../models/InspectorApplication.js")).default;
  const apps = await InspectorApplication.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, applications: apps });
}));

router.get("/", protect, adminOnly, asyncHandler(listApplications));
router.get("/:id", protect, adminOnly, asyncHandler(getApplication));
router.post("/:id/approve", protect, adminOnly, validate(approveApplicationSchema), asyncHandler(approveApplication));
router.post("/:id/reject", protect, adminOnly, validate(rejectApplicationSchema), asyncHandler(rejectApplication));

export default router;
