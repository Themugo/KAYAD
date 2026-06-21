// backend/routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect);

router.get("/", asyncHandler(getNotifications));
router.post("/read-all", idempotencyCheck, asyncHandler(markAllAsRead));
router.post("/:id/read", idempotencyCheck, validateObjectId, asyncHandler(markAsRead));
router.delete("/:id", idempotencyCheck, validateObjectId, asyncHandler(deleteNotification));

export default router;
