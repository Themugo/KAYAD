// backend/routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect);

router.get("/",              asyncHandler(getNotifications));
router.post("/read-all",     asyncHandler(markAllAsRead));
router.post("/:id/read",     asyncHandler(markAsRead));
router.delete("/:id",        asyncHandler(deleteNotification));

export default router;
