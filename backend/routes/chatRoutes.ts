import express from "express";
import { protect } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { validate, validateObjectId } from "../middleware/validate.ts";
import { chatLimiter, createLimiter } from "../middleware/rateLimiter.ts";
import { createChatSchema, sendMessageSchema } from "../validation/platform.schema.ts";
import {
  sendMessage,
  getMessages,
  startChat,
  getUserChats,
  markAsSeen,
  deleteChat,
} from "../controllers/chatController.ts";

const router = express.Router();

router.post("/", protect, createLimiter, validate(createChatSchema), asyncHandler(startChat));

router.get("/", protect, asyncHandler(getUserChats));

router.get("/:chatId/messages", protect, validateObjectId, asyncHandler(getMessages));

router.post(
  "/:chatId/message",
  protect,
  chatLimiter,
  validateObjectId,
  validate(sendMessageSchema),
  asyncHandler(sendMessage),
);

router.post("/:chatId/seen", protect, validateObjectId, asyncHandler(markAsSeen));

router.delete("/:chatId", protect, validateObjectId, asyncHandler(deleteChat));

export default router;
