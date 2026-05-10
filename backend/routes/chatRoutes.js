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
} from "../controllers/chatController.js";

import Chat from "../models/Chat.js";

const router = express.Router();

// =============================
// ⚙️ PAGINATION HELPER
// =============================
const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 💬 START / CREATE CHAT
// =============================
router.post(
  "/",
  protect,
  asyncHandler(startChat)
);

// =============================
// 📥 GET USER CHATS (INBOX)
// =============================
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const chats = await Chat.find({
      participants: req.user.id,
    })
      .populate("participants", "name avatar")
      .populate("car", "title images price")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      chats,
    });
  })
);

// =============================
// 📜 GET MESSAGES (PAGINATED)
// =============================
router.get(
  "/:chatId/messages",
  protect,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    // 🔒 ACCESS CONTROL
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const messages = chat.messages
      .slice(-limit * page) // simple pagination
      .slice(0, limit)
      .reverse();

    res.json({
      success: true,
      messages,
      page,
    });
  })
);

// =============================
// 📤 SEND MESSAGE
// =============================
router.post(
  "/:chatId/message",
  protect,
  validateObjectId,
  asyncHandler(sendMessage)
);

// =============================
// 👀 MARK CHAT AS SEEN
// =============================
router.post(
  "/:chatId/seen",
  protect,
  validateObjectId,
  asyncHandler(markAsSeen)
);

// =============================
// ❌ DELETE / LEAVE CHAT
// =============================
router.delete(
  "/:chatId",
  protect,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    // remove user from participants
    chat.participants = chat.participants.filter(
      (p) => p.toString() !== req.user.id
    );

    await chat.save();

    res.json({
      success: true,
      message: "Left chat",
    });
  })
);

export default router;