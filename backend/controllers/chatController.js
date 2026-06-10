// backend/controllers/chatController.js

import Chat from "../models/Chat.js";
import mongoose from "mongoose";
import { sendSMS } from "../utils/sms.js";
import { getIO } from "../utils/io.js";

// =============================
// 💬 START / CREATE CHAT
// =============================
export const startChat = async (req, res) => {
  try {
    const { participantId, carId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, message: "participantId required" });
    }

    const participants = [req.user.id, participantId].sort();
    const filter = { participants: { $all: participants, $size: 2 } };
    if (carId) filter.car = carId;

    let chat = await Chat.findOne(filter).populate("participants", "name avatar");

    if (!chat) {
      chat = await Chat.create({
        participants,
        car: carId || null,
      });
      chat = await chat.populate("participants", "name avatar");
    }

    res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error("❌ START CHAT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to start chat" });
  }
};

// =============================
// 📥 GET USER CHATS (INBOX)
// =============================
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate("participants", "name avatar")
      .populate("car", "title images price")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, chats });
  } catch (error) {
    console.error("❌ GET USER CHATS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chats" });
  }
};

// =============================
// 📤 SEND MESSAGE
// =============================
export const sendMessage = async (req, res) => {
  try {
    const { content, text, message, attachments } = req.body;
    const msgText = content || text || message;
    const { chatId } = req.params;

    if (!chatId || !msgText) {
      return res.status(400).json({ success: false, message: "chatId and content required" });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chatId" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    if (!chat.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const messageData = { sender: req.user.id, text: msgText };
    if (attachments && Array.isArray(attachments)) {
      messageData.attachments = attachments.map((a) => ({
        url: a.url,
        type: a.type || "image",
      }));
    }
    await chat.addMessage(messageData);

    const savedMsg = chat.messages[chat.messages.length - 1];

    if (getIO()) {
      getIO()
        .to(`chat_${chatId}`)
        .emit("newMessage", {
          _id: savedMsg._id,
          chatId,
          sender: req.user.id,
          text: savedMsg.text,
          message: savedMsg.text,
          createdAt: savedMsg.createdAt,
          seen: false,
          seenBy: [],
          attachments: savedMsg.attachments || [],
        });
    }

    // 📧 Email + 📱 SMS (fire-and-forget)
    try {
      const { sendNewMessageEmail } = await import("../services/email.service.js");
      const User = (await import("../models/User.js")).default;
      const otherUserId = chat.participants.find((p) => String(p) !== String(req.user.id));
      if (otherUserId) {
        const otherUser = await User.findById(otherUserId).select("email name phone notifications");
        if (
          otherUser?.email &&
          otherUser?.notifications?.email !== false &&
          typeof sendNewMessageEmail === "function"
        ) {
          const fromUser = await User.findById(req.user.id).select("name");
          sendNewMessageEmail(otherUser, fromUser?.name || "A user", chat.car?.title || null).catch((e) =>
            console.warn("⚠️ New message email failed:", e.message),
          );
        }
        if (otherUser?.phone && otherUser?.notifications?.sms !== false) {
          const fromUser = await User.findById(req.user.id).select("name");
          sendSMS(
            otherUser.phone,
            `New message from ${fromUser?.name || "a user"} on Kayad${chat.car?.title ? ` about ${chat.car.title}` : ""}.`,
          ).catch((e) => console.warn("⚠️ SMS notification failed:", e.message));
        }
      }
    } catch (notifErr) {
      console.warn("⚠️ Failed to send notification for new message:", notifErr.message);
    }

    res.status(201).json({
      ...savedMsg.toObject(),
      message: savedMsg.text,
      seen: false,
      seenBy: [],
    });
  } catch (error) {
    console.error("❌ SEND MESSAGE ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// =============================
// 📥 GET MESSAGES
// =============================
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chatId" });
    }

    const chat = await Chat.findById(chatId).populate("messages.sender", "name avatar");

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    if (!chat.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const enriched = chat.messages.map((m) => ({
      ...m.toObject(),
      message: m.text,
      seen: m.seenBy && m.seenBy.length > 0,
      seenBy: m.seenBy || [],
    }));
    res.json({ success: true, messages: enriched });
  } catch (error) {
    console.error("❌ GET MESSAGES ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

// =============================
// 👀 MARK AS SEEN
// =============================
export const markAsSeen = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chatId" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    await chat.markAsSeen(req.user.id);

    if (getIO()) {
      getIO().to(`chat_${chatId}`).emit("messagesSeen", { chatId, userId: req.user.id });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ MARK AS SEEN ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to mark as seen" });
  }
};

// =============================
// 🧹 DELETE / LEAVE CHAT
// =============================
export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    chat.participants = chat.participants.filter((p) => p.toString() !== req.user.id);

    if (chat.participants.length === 0) {
      await chat.deleteOne();
    } else {
      await chat.save();
    }

    res.json({ success: true, message: "Left chat" });
  } catch (error) {
    console.error("❌ DELETE CHAT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to leave chat" });
  }
};
