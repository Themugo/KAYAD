// backend/controllers/chatController.js

import Chat from "../models/Chat.js";
import mongoose from "mongoose";

// =============================
// 📤 SEND MESSAGE
// =============================
export const sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;

    if (!chatId || !text) {
      return res.status(400).json({
        message: "chatId and text are required",
      });
    }

    // ✅ validate object id
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        message: "Invalid chatId",
      });
    }

    const message = await Chat.create({
      chatId,
      sender: req.user.id,
      text,
    });

    // =============================
    // 🔥 REALTIME EMIT
    // =============================
    if (global.io) {
      global.io.to(chatId).emit("newMessage", {
        _id: message._id,
        chatId,
        sender: req.user.id,
        text: message.text,
        createdAt: message.createdAt,
      });
    }

    res.status(201).json(message);

  } catch (error) {
    console.error("❌ SEND MESSAGE ERROR:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// =============================
// 📥 GET MESSAGES
// =============================
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        message: "Invalid chatId",
      });
    }

    const messages = await Chat.find({ chatId })
      .sort({ createdAt: 1 })
      .limit(200); // 🔥 prevent overload

    res.json(messages);

  } catch (error) {
    console.error("❌ GET MESSAGES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// =============================
// 🧹 DELETE MESSAGE (OPTIONAL)
// =============================
export const deleteMessage = async (req, res) => {
  try {
    const message = await Chat.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // 🔒 only sender can delete
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await message.deleteOne();

    res.json({ message: "Deleted" });

  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

// =============================
// 👀 MARK AS READ (OPTIONAL)
// =============================
export const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;

    await Chat.updateMany(
      { chatId, read: false },
      { read: true }
    );

    res.json({ message: "Marked as read" });

  } catch (error) {
    res.status(500).json({ message: "Failed" });
  }
};