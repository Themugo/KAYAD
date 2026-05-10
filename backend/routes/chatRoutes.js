import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import {
  sendMessage,
  getMessages,
  startChat,
  getUserChats,
  markAsSeen,
  deleteChat,
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/", protect, asyncHandler(startChat));

router.get("/", protect, asyncHandler(getUserChats));

router.get("/:chatId/messages", protect, validateObjectId, asyncHandler(getMessages));

router.post("/:chatId/message", protect, validateObjectId, asyncHandler(sendMessage));

router.post("/:chatId/seen", protect, validateObjectId, asyncHandler(markAsSeen));

router.delete("/:chatId", protect, validateObjectId, asyncHandler(deleteChat));

export default router;