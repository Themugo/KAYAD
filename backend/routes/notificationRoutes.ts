// backend/routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { validateObjectId } from "../middleware/validate.ts";
import { idempotencyCheck } from "../middleware/idempotency.ts";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.ts";

const router = express.Router();
router.use(protect);

router.get("/", asyncHandler(getNotifications));
router.post("/read-all", idempotencyCheck, asyncHandler(markAllAsRead));
router.post("/:id/read", idempotencyCheck, validateObjectId, asyncHandler(markAsRead));
router.delete("/:id", idempotencyCheck, validateObjectId, asyncHandler(deleteNotification));

export default router;
