// backend/controllers/chatController.js

import crypto from "node:crypto";
import { findById, create, update, remove } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { sendSMS } from "../utils/sms.js";
import { getIO } from "../utils/io.js";
import { findOrCreateLeadFromChat, addLeadActivity, updateLeadStage } from "../services/leadService.js";

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

    const sb = getSupabase();
    let query = sb.from("chats").select("*").contains("participants", participants);
    if (carId) query = query.eq("car", carId);

    const { data: existing } = await query;
    let chat = existing?.find((c) => c.participants?.length === participants.length) || null;

    if (!chat) {
      chat = await create("chats", {
        participants,
        car: carId || null,
      });

      try {
        await findOrCreateLeadFromChat(chat.id);
      } catch (leadErr) {
        console.warn("⚠️ Failed to create lead from chat:", leadErr.message);
      }
    }

    if (chat?.participants?.length) {
      const { data: users } = await sb.from("users").select("id, name, avatar").in("id", chat.participants);
      chat.participants = users || [];
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sb = getSupabase();

    const { data: chats, count: total } = await sb
      .from("chats")
      .select("*", { count: "exact" })
      .contains("participants", [req.user.id])
      .order("updatedAt", { ascending: false })
      .range(skip, skip + limit - 1);

    for (const chat of chats || []) {
      if (chat.participants?.length) {
        const { data: users } = await sb.from("users").select("id, name, avatar").in("id", chat.participants);
        chat.participants = users || [];
      }
      if (chat.car) {
        const { data: car } = await sb.from("cars").select("id, title, images, price").eq("id", chat.car).single();
        chat.car = car || null;
      }
    }

    res.json({ success: true, chats, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("❌ GET USER CHATS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chats" });
  }
};

// =============================
// 🔢 GET UNREAD COUNT
// =============================
export const getUnreadCount = async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: chats } = await sb
      .from("chats")
      .select("messages")
      .contains("participants", [req.user.id]);

    let unread = 0;
    for (const chat of chats || []) {
      for (const msg of chat.messages || []) {
        if (msg.sender !== req.user.id && (!msg.seenBy || !msg.seenBy.includes(req.user.id))) {
          unread++;
        }
      }
    }

    res.json({ success: true, unread });
  } catch (error) {
    console.error("❌ GET UNREAD COUNT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to get unread count" });
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

    const chat = await findById("chats", chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    if (!chat.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const messageId = crypto.randomUUID();
    const messageData = { id: messageId, sender: req.user.id, text: msgText, createdAt: new Date().toISOString(), seenBy: [] };
    if (attachments && Array.isArray(attachments)) {
      messageData.attachments = attachments.map((a) => ({
        url: a.url,
        type: a.type || "image",
      }));
    }

    const messages = [...(chat.messages || []), messageData];
    await update("chats", chatId, { messages });

    // Add lead activity for message sent
    try {
      const lead = await findOrCreateLeadFromChat(chatId);
      await addLeadActivity(lead.id, "message_sent", req.user.id, {
        description: "Message sent",
        metadata: { messageId },
      });

      if (lead.stage === "new") {
        const dealerId = chat.participants.find((p) => p.toString() !== req.user.id.toString());
        if (dealerId && req.user.id.toString() === dealerId.toString()) {
          await updateLeadStage(lead.id, "contacted", req.user.id);
        }
      }
    } catch (leadErr) {
      console.warn("⚠️ Failed to add lead activity:", leadErr.message);
    }

    if (getIO()) {
      getIO()
        .to(`chat_${chatId}`)
        .emit("newMessage", {
          id: messageId,
          chatId,
          sender: req.user.id,
          text: msgText,
          message: msgText,
          createdAt: messageData.createdAt,
          seen: false,
          seenBy: [],
          attachments: messageData.attachments || [],
        });
    }

    // 📧 Email + 📱 SMS (fire-and-forget)
    try {
      const { sendNewMessageEmail } = await import("../services/email.service.js");
      const { findById: findUser } = await import("../db/index.js");
      const otherUserId = chat.participants.find((p) => String(p) !== String(req.user.id));
      if (otherUserId) {
        const otherUser = await findUser("users", otherUserId, "email,name,phone,notifications");
        if (
          otherUser?.email &&
          otherUser?.notifications?.email !== false &&
          typeof sendNewMessageEmail === "function"
        ) {
          const fromUser = await findUser("users", req.user.id, "name");
          sendNewMessageEmail(otherUser, fromUser?.name || "A user", chat.car?.title || null).catch((e) =>
            console.warn("⚠️ New message email failed:", e.message),
          );
        }
        if (otherUser?.phone && otherUser?.notifications?.sms !== false) {
          const fromUser = await findUser("users", req.user.id, "name");
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
      ...messageData,
      message: msgText,
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

    const chat = await findById("chats", chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    if (!chat.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const sb = getSupabase();
    const senderIds = [...new Set((chat.messages || []).map((m) => m.sender))];
    const { data: users } = await sb.from("users").select("id, name, avatar").in("id", senderIds);
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    const enriched = (chat.messages || []).map((m) => ({
      ...m,
      message: m.text,
      seen: m.seenBy && m.seenBy.length > 0,
      seenBy: m.seenBy || [],
      sender: userMap[m.sender] || m.sender,
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

    const chat = await findById("chats", chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const messages = (chat.messages || []).map((m) => {
      if (m.sender !== req.user.id && (!m.seenBy || !m.seenBy.includes(req.user.id))) {
        return { ...m, seenBy: [...(m.seenBy || []), req.user.id] };
      }
      return m;
    });

    await update("chats", chatId, { messages });

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
    const chat = await findById("chats", req.params.chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const participants = chat.participants.filter((p) => p.toString() !== req.user.id);

    if (participants.length === 0) {
      await remove("chats", chat.id);
    } else {
      await update("chats", chat.id, { participants });
    }

    res.json({ success: true, message: "Left chat" });
  } catch (error) {
    console.error("❌ DELETE CHAT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to leave chat" });
  }
};
