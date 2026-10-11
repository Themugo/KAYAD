// backend/controllers/chatController.js

import { findById, create, update, remove } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { getIO } from "../utils/io.js";
import { findOrCreateLeadFromChat, addLeadActivity, updateLeadStage } from "../services/leadService.js";
import { logError } from '../infrastructure/logging/index.js';

// Fixed (Final Integration - real data integration): CHAT_FIELDS was
// previously declared as a local const inside startChat only, but
// getUserChats (a separate function further down this same file)
// also referenced it directly - a real ReferenceError, reproduced
// directly by calling the real function against a real database
// ("CHAT_FIELDS is not defined"), meaning this endpoint - the one
// this project's real chat backend needs for its most basic "list my
// chats" operation - has never been able to return anything but a
// 500. Hoisted to module scope so both functions (and any other real
// caller in this file) can safely share the identical field list.
// H-2 FIX (pre-existing comment, kept): select specific fields
// instead of "*" to avoid leaking internal chat data.
const CHAT_FIELDS = "id, participants, car, lastMessage, lastMessageAt, isBlocked, createdAt, updatedAt";

// Translate known chat RPC guard failures into stable HTTP responses. The SQL
// functions remain the concurrency-safe authority; this mapping prevents a
// normal authorization/blocking outcome from surfacing as a misleading 500.
const respondToChatRpcError = (res, error) => {
  const detail = String(error?.message || error?.details || error?.hint || "");
  if (detail.includes("CHAT_NOT_FOUND")) {
    return res.status(404).json({ success: false, message: "Chat not found" });
  }
  if (detail.includes("CHAT_FORBIDDEN")) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }
  if (detail.includes("CHAT_BLOCKED")) {
    return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });
  }
  if (detail.includes("CHAT_MESSAGE_EMPTY")) {
    return res.status(400).json({ success: false, message: "Message content is required" });
  }
  if (detail.includes("CHAT_IDEMPOTENCY_KEY_REQUIRED")) {
    return res.status(400).json({ success: false, code: "CHAT_IDEMPOTENCY_KEY_REQUIRED", message: "A valid message idempotency key is required" });
  }
  if (detail.includes("CHAT_IDEMPOTENCY_KEY_REUSED")) {
    return res.status(409).json({ success: false, code: "CHAT_IDEMPOTENCY_KEY_REUSED", message: "This message key was already used for different content" });
  }
  if (detail.includes("CHAT_ATTACHMENTS_INVALID")) {
    return res.status(400).json({ success: false, code: "CHAT_ATTACHMENTS_INVALID", message: "Message attachments are invalid" });
  }
  return null;
};

// =============================
// 💬 START / CREATE CHAT
// =============================
export const startChat = async (req, res) => {
  try {
    const participantId = req.body.recipientId || req.body.participantId;
    const { carId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, message: "recipientId required" });
    }

    const participants = [req.user.id, participantId].sort();
    if (String(participantId) === String(req.user.id)) return res.status(400).json({ success: false, message: "Cannot start a chat with yourself" });

    const sb = getSupabase();
    let query = sb.from("chats").select(CHAT_FIELDS).contains("participants", participants);
    if (carId) query = query.eq("car", carId);

    const { data: existing } = await query;
    if (existing?.some((c) => c.isBlocked)) return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });
    let chat = existing?.find((c) => c.participants?.length === participants.length) || null;

    if (!chat) {
      let created = false;
      try {
        chat = await create("chats", {
          participants,
          car: carId || null,
        });
        created = true;
      } catch (createErr) {
        // Concurrent start for the same pair/car: the unique index (uq_chats_participants_car) rejected the loser.
        // Converge on the winner's chat instead of failing the request with a 500 (D-MSG-3).
        if (createErr?.code !== "23505") throw createErr;
        let again = sb.from("chats").select(CHAT_FIELDS).contains("participants", participants);
        if (carId) again = again.eq("car", carId);
        const { data: winners } = await again;
        chat = winners?.find((c) => c.participants?.length === participants.length) || null;
        if (!chat) throw createErr;
      }

      if (created) {
        try {
          await findOrCreateLeadFromChat(chat.id);
        } catch (leadErr) {
          console.warn("⚠️ Failed to create lead from chat:", leadErr.message);
        }
      }
    }

    if (chat?.participants?.length) {
      const { data: users } = await sb.from("users").select("id, name, avatar").in("id", chat.participants);
      chat.participants = users || [];
    }

    res.status(201).json({ success: true, chat });
  } catch (error) {
    logError("❌ START CHAT ERROR:", error);
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
      .select(CHAT_FIELDS, { count: "exact" })
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
    logError("❌ GET USER CHATS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chats" });
  }
};

// =============================
// 🔢 GET UNREAD COUNT
// =============================
export const getUnreadCount = async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: chats, error: chatsError } = await sb
      .from("chats")
      .select("messages")
      .contains("participants", [req.user.id]);

    // Do not turn a failed database read into a successful-looking unread=0.
    // The navbar would otherwise falsely claim there are no unread messages.
    if (chatsError) throw chatsError;
    if (!Array.isArray(chats)) throw new Error("Unread count query returned no chat data");

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
    logError("❌ GET UNREAD COUNT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
};

// =============================
// 📤 SEND MESSAGE
// =============================
export const sendMessage = async (req, res) => {
  try {
    const { content, text, message, attachments } = req.body;
    const rawText = content ?? text ?? message;
    const msgText = typeof rawText === "string" ? rawText.trim() : "";
    const { chatId } = req.params;

    if (!chatId || !msgText) {
      return res.status(400).json({ success: false, message: "chatId and content required" });
    }

    const chat = await findById("chats", chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    if (chat.isBlocked) {
      return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });
    }

    if (!chat.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const headerKey = req.get?.("Idempotency-Key") || req.headers?.["idempotency-key"];
    const idempotencyKey = req.body?.idempotencyKey || headerKey;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
      return res.status(400).json({ success: false, code: "CHAT_IDEMPOTENCY_KEY_REQUIRED", message: "A valid UUID idempotency key is required for each message send" });
    }

    const sb = getSupabase();
    // The schema accepts legacy URL strings and the newer object shape.
    // Normalize both before persistence so string attachments never become
    // { url: undefined } records.
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.map((attachment) => typeof attachment === "string"
        ? { url: attachment, type: "image" }
        : { url: attachment.url, type: attachment.type || "image" })
      : [];
    const { data: rpcResult, error: rpcError } = await sb.rpc("kayad_append_chat_message_idempotent", {
      p_chat_id: chatId,
      p_sender_id: req.user.id,
      p_text: msgText,
      p_attachments: normalizedAttachments,
      p_idempotency_key: idempotencyKey,
    });
    const rpcMessage = rpcResult?.message;
    const isReplay = rpcResult?.replayed === true;
    if (rpcError) {
      const handled = respondToChatRpcError(res, rpcError);
      if (handled) return handled;
      throw rpcError;
    }
    // A successful RPC call must return the persisted row. Never fabricate a
    // message ID or timestamp here: doing so could emit a message over Socket.IO
    // and notify the recipient for a message that was not actually committed.
    if (!rpcMessage || typeof rpcMessage !== "object" || !rpcMessage.id || !rpcMessage.createdAt) {
      logError("CHAT MESSAGE RPC RETURNED INVALID PERSISTED MESSAGE", {
        chatId,
        senderId: req.user.id,
        hasResult: Boolean(rpcMessage),
        hasId: Boolean(rpcMessage?.id),
        hasCreatedAt: Boolean(rpcMessage?.createdAt),
      });
      return res.status(502).json({
        success: false,
        code: "CHAT_MESSAGE_PERSISTENCE_UNCONFIRMED",
        message: "Message could not be confirmed as saved. Please refresh before retrying.",
      });
    }

    const messageData = {
      id: rpcMessage.id,
      sender: req.user.id,
      text: typeof rpcMessage.text === "string" ? rpcMessage.text : msgText,
      createdAt: rpcMessage.createdAt,
      seenBy: Array.isArray(rpcMessage.seenBy) ? rpcMessage.seenBy : [],
      attachments: Array.isArray(rpcMessage.attachments) ? rpcMessage.attachments : normalizedAttachments,
    };

    // A retry must return the original canonical message but must not emit
    // duplicate real-time events, lead activity, or notifications.
    if (!isReplay) {
    // Add lead activity for message sent
    try {
      const lead = await findOrCreateLeadFromChat(chatId);
      await addLeadActivity(lead.id, "message_sent", req.user.id, {
        description: "Message sent",
        metadata: { messageId: messageData.id },
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
          id: messageData.id,
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

    try {
      const { sendNotification } = await import("../services/notification.service.js");
      const otherUserId = chat.participants.find((p) => String(p) !== String(req.user.id));
      if (otherUserId) await sendNotification({
        userId: otherUserId,
        title: "New message",
        message: msgText,
        type: "chat",
        link: "/?nav=chat",
        data: { chatId, messageId: messageData.id },
      });
    } catch (notificationError) {
      console.warn("New message in-app notification failed:", notificationError.message);
    }
    }

    res.status(isReplay ? 200 : 201).json({
      ...messageData,
      message: msgText,
      seen: Array.isArray(messageData.seenBy) && messageData.seenBy.length > 0,
      seenBy: messageData.seenBy,
    });
  } catch (error) {
    logError("❌ SEND MESSAGE ERROR:", error);
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

    if (chat.isBlocked) return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });

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
    logError("❌ GET MESSAGES ERROR:", error);
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

    if (!chat.participants.some((p) => String(p) === String(req.user.id))) return res.status(403).json({ success: false, message: "Not authorized" });

    const sb = getSupabase();
    const { error: seenError } = await sb.rpc("kayad_mark_chat_seen", { p_chat_id: chatId, p_user_id: req.user.id });
    if (seenError) {
      const handled = respondToChatRpcError(res, seenError);
      if (handled) return handled;
      throw seenError;
    }

    if (getIO()) {
      getIO().to(`chat_${chatId}`).emit("messagesSeen", { chatId, userId: req.user.id });
    }

    res.json({ success: true });
  } catch (error) {
    logError("❌ MARK AS SEEN ERROR:", error);
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

    // A chat ID is not authority. Only an actual participant may leave or
    // remove this conversation; otherwise any signed-in user could mutate it.
    const isParticipant = (chat.participants || []).some(
      (participant) => String(participant) === String(req.user.id),
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const participants = chat.participants.filter((p) => String(p) !== String(req.user.id));

    if (participants.length === 0) {
      await remove("chats", chat.id);
    } else {
      await update("chats", chat.id, { participants });
    }

    res.json({ success: true, message: "Left chat" });
  } catch (error) {
    logError("❌ DELETE CHAT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to leave chat" });
  }
};
