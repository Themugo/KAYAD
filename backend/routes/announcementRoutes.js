import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import {
  createAnnouncement,
  sendAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  deleteAnnouncement,
} from "../controllers/announcementController.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin"));

router.post("/", asyncHandler(createAnnouncement));

router.post("/:id/send", validateObjectId, asyncHandler(sendAnnouncement));

router.get("/", asyncHandler(getAnnouncements));

router.get("/:id", validateObjectId, asyncHandler(getAnnouncementById));

router.delete("/:id", validateObjectId, asyncHandler(deleteAnnouncement));

export default router;
