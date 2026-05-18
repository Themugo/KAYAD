import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  listApplications,
  getApplication,
} from "../controllers/inspectorApplicationController.js";

const router = Router();

// Public — anyone can apply
router.post("/apply", submitApplication);

// Protected — get own application status (if user is logged in)
router.get("/my", protect, async (req, res) => {
  const InspectorApplication = (await import("../models/InspectorApplication.js")).default;
  const apps = await InspectorApplication.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, applications: apps });
});

// Admin
router.get("/", protect, adminOnly, listApplications);
router.get("/:id", protect, adminOnly, getApplication);
router.post("/:id/approve", protect, adminOnly, approveApplication);
router.post("/:id/reject", protect, adminOnly, rejectApplication);

export default router;
