import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate, validateObjectId, validateQuery, chatListQuerySchema, messageListQuerySchema } from "../middleware/validate.js";
import { chatLimiter, createLimiter } from "../middleware/rateLimiter.js";
import { createChatSchema, sendMessageSchema } from "../validation/chat.schema.js";
import {
  sendMessage,
  getMessages,
  startChat,
  getUserChats,
  markAsSeen,
  deleteChat,
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/", protect, createLimiter, validate(createChatSchema), asyncHandler(startChat));

router.get("/", protect, validateQuery(chatListQuerySchema), asyncHandler(getUserChats));

router.get("/:chatId/messages", protect, validateObjectId, validateQuery(messageListQuerySchema), asyncHandler(getMessages));

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
