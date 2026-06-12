import { Router } from "express";
import InspectorApplication from "../models/InspectorApplication.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  listApplications,
  getApplication,
} from "../controllers/inspectorApplicationController.js";

const router = Router();

router.post("/apply", asyncHandler(submitApplication));

router.get(
  "/my",
  protect,
  asyncHandler(async (req, res) => {
    const apps = await InspectorApplication.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, applications: apps });
  }),
);

router.get("/", protect, adminOnly, asyncHandler(listApplications));
router.get("/:id", protect, adminOnly, asyncHandler(getApplication));
router.post("/:id/approve", protect, adminOnly, asyncHandler(approveApplication));
router.post("/:id/reject", protect, adminOnly, asyncHandler(rejectApplication));

export default router;
