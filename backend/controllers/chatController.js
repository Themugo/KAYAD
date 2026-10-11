// backend/controllers/chatController.js

import { findById, create, update, remove } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { getIO } from "../utils/io.js";
import { findOrCreateLeadFromChat, addLeadActivity, updateLeadStage } from "../services/leadService.js";
import { logError } from '../infrastructure/logging/index.js';
import { STAFF_ROLES } from "../config/roles.js";
import {
  AttachmentError, normalizeIncomingAttachments, presentAttachments, presentMessage,
  findChatAttachment, bareFolder, parseMetadata, CHAT_UPLOAD_FOLDER, CHAT_ATTACHMENT_MIME, ATTACHMENT_URL_TTL_SECONDS,
} from "../services/chatAttachments.js";
import { getUploadRecord } from "../services/sqlUploadStore.js";
import { v2 as cloudinary } from "cloudinary";
import { buildNewMessageEvent, markChatOutboxResult } from "../services/chatOutbox.service.js";

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
const CHAT_INBOX_FIELDS = `${CHAT_FIELDS}, messages`;

const publicChatRole = (role) => {
  if (role === "dealer") return "Dealer";
  if (role === "individual_seller") return "Private seller";
  if (["technical_support"].includes(role)) return "KAYAD Support";
  if (role === "escrow_officer") return "KAYAD Escrow Team";
  if (["admin", "superadmin", "hr", "accounts", "marketing", "ad_manager", "moderator", "ghost_checker"].includes(role)) return "KAYAD Team";
  return "Marketplace member";
};

const toPublicChatParticipant = (user) => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  publicRole: publicChatRole(user.role),
});

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

    if (String(participantId) === String(req.user.id)) return res.status(400).json({ success: false, message: "Cannot start a chat with yourself" });

    const sb = getSupabase();
    const { data: recipient, error: recipientError } = await sb
      .from("users")
      .select("id, role")
      .eq("id", participantId)
      .maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient) return res.status(404).json({ success: false, message: "Recipient not found" });
    // Staff and operational providers must be reached through their assigned
    // case/transaction workflows, not an arbitrary public direct message.
    // Existing authorized conversations remain readable through normal chat
    // membership; this gate prevents creating new bypass conversations.
    if (STAFF_ROLES.includes(String(recipient.role))) {
      return res.status(403).json({
        success: false,
        code: "CHAT_RECIPIENT_REQUIRES_CASE_ROUTE",
        message: "Use the relevant KAYAD support or transaction workflow to contact this team",
      });
    }

    // A vehicle-linked conversation is only valid when the selected recipient
    // owns/manages that listing. Do not trust a client-provided recipientId to
    // route an inquiry to an unrelated user or dealer.
    if (carId) {
      const { data: car, error: carError } = await sb
        .from("cars")
        .select("id, dealer_id, status, approved, deleted_at")
        .eq("id", carId)
        .maybeSingle();
      if (carError) throw carError;
      if (!car || car.deleted_at || !car.dealer_id || String(car.dealer_id) !== String(participantId)) {
        return res.status(403).json({ success: false, code: "CHAT_LISTING_RECIPIENT_MISMATCH", message: "This recipient is not authorized for the selected listing" });
      }
      if (car.status === "hidden" || car.status === "draft" || car.approved === false) {
        return res.status(404).json({ success: false, message: "Listing is not available for a new inquiry" });
      }
    }

    const participants = [req.user.id, participantId].sort();
    let query = sb.from("chats").select(CHAT_FIELDS).contains("participants", participants);
    if (carId) query = query.eq("car", carId);

    const { data: existing, error: existingError } = await query;
    if (existingError) throw existingError;
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
      const { data: users, error: usersError } = await sb.from("users").select("id, name, avatar, role").in("id", chat.participants);
      if (usersError) throw usersError;
      chat.participants = (users || []).map(toPublicChatParticipant);
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

    const { data: chats, count: total, error: chatsError } = await sb
      .from("chats")
      .select(CHAT_INBOX_FIELDS, { count: "exact" })
      .contains("participants", [req.user.id])
      .order("updatedAt", { ascending: false })
      .range(skip, skip + limit - 1);
    if (chatsError) throw chatsError;
    if (!Array.isArray(chats)) throw new Error("Chat inbox query returned no chat data");

    for (const chat of chats) {
      const messages = Array.isArray(chat.messages) ? chat.messages : [];
      chat.unreadCount = messages.reduce((count, message) => {
        const senderId = typeof message?.sender === "object" ? message.sender?.id : message?.sender;
        const seenBy = Array.isArray(message?.seenBy) ? message.seenBy.map(String) : [];
        return count + (String(senderId) !== String(req.user.id) && message?.seen !== true && !seenBy.includes(String(req.user.id)) ? 1 : 0);
      }, 0);
      // Keep the inbox response to summaries; raw message history is only
      // returned by the separately authorized history endpoint.
      delete chat.messages;
      if (chat.participants?.length) {
        const { data: users, error: usersError } = await sb.from("users").select("id, name, avatar, role").in("id", chat.participants);
        if (usersError) throw usersError;
        chat.participants = (users || []).map(toPublicChatParticipant);
      }
      if (chat.car) {
        const { data: car, error: carError } = await sb.from("cars").select("id, title, images, price").eq("id", chat.car).maybeSingle();
        if (carError) throw carError;
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
        const senderId = typeof msg?.sender === "object" ? msg.sender?.id : msg?.sender;
        const seenBy = Array.isArray(msg?.seenBy) ? msg.seenBy.map(String) : [];
        if (String(senderId) !== String(req.user.id) && msg?.seen !== true && !seenBy.includes(String(req.user.id))) {
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

    if (!chat.participants.some((p) => String(p) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const headerKey = req.get?.("Idempotency-Key") || req.headers?.["idempotency-key"];
    const idempotencyKey = req.body?.idempotencyKey || headerKey;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
      return res.status(400).json({ success: false, code: "CHAT_IDEMPOTENCY_KEY_REQUIRED", message: "A valid UUID idempotency key is required for each message send" });
    }

    const sb = getSupabase();
    // Attachments are references to uploads the SENDER owns in the private chat folder (never client URLs).
    let normalizedAttachments;
    try {
      normalizedAttachments = normalizeIncomingAttachments(attachments, req.user.id);
    } catch (attErr) {
      if (attErr instanceof AttachmentError) {
        return res.status(attErr.status).json({ success: false, code: attErr.code, message: attErr.message });
      }
      throw attErr;
    }
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

    // Inline (fast-path) delivery. The outbox row committed with the message is the durable record: it is marked done only
    // when every step below succeeded; otherwise the reconciler (services/chatOutbox.service.js) retries it.
    let delivered = true;
    if (getIO()) {
      getIO().to(`chat_${chatId}`).emit("newMessage", buildNewMessageEvent(chatId, messageData));
    }

    try {
      const { sendNotification } = await import("../services/notification.service.js");
      const otherUserId = chat.participants.find((p) => String(p) !== String(req.user.id));
      if (otherUserId) delivered = Boolean(await sendNotification({
        userId: otherUserId,
        title: "New message",
        message: msgText,
        type: "chat",
        link: "/?nav=chat",
        data: { chatId, messageId: messageData.id },
      }));
    } catch (notificationError) {
      delivered = false;
      console.warn("New message in-app notification failed:", notificationError.message);
    }
    if (delivered) await markChatOutboxResult(messageData.id, true);
    }

    res.status(isReplay ? 200 : 201).json({
      ...messageData,
      attachments: presentAttachments(chatId, messageData.attachments),
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

    if (!chat.participants.some((p) => String(p) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const sb = getSupabase();
    const senderIds = [...new Set((chat.messages || []).map((m) => m.sender))];
    const { data: users } = await sb.from("users").select("id, name, avatar").in("id", senderIds);
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    const enriched = (chat.messages || []).map((m) => ({
      ...presentMessage(chatId, m),
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
// 📎 GET ATTACHMENT (authorized, non-cacheable delivery of a chat file)
// =============================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const getAttachment = async (req, res) => {
  try {
    const { chatId, uploadId } = req.params;
    if (!UUID_RE.test(String(uploadId || ""))) return res.status(404).json({ success: false, message: "Attachment not found" });
    // Fresh read on every request: membership loss, blocking or detaching the file ends access immediately.
    const chat = await findById("chats", chatId);
    const isParticipant = Array.isArray(chat?.participants) && chat.participants.some((p) => String(p) === String(req.user.id));
    // Private chat files are participant-scoped. Administrative status alone
    // is not a reason to bypass the conversation boundary; support staff must
    // use the separately permissioned support-case workflow.
    const att = chat ? findChatAttachment(chat, uploadId) : undefined;
    if (!chat || !isParticipant || !att) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }
    if (chat.isBlocked) return res.status(423).json({ success: false, code: "CHAT_BLOCKED", message: "This conversation is blocked" });
    // The local upload record is a cache of the bytes; it can be gone (ephemeral disk). The message holds the coordinates.
    const record = getUploadRecord(uploadId);
    const mime = String(att.mimeType || record?.mimeType || "").toLowerCase();
    if (!CHAT_ATTACHMENT_MIME.has(mime) || (record && bareFolder(record.folder) !== CHAT_UPLOAD_FOLDER)) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }
    res.set({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-site",
      "Referrer-Policy": "no-referrer",
    });
    if (record?.content) {
      res.set({ "Content-Type": mime, "Content-Disposition": "inline" });
      return res.status(200).send(Buffer.from(record.content));
    }
    const publicId = att.publicId || record?.publicId || (record ? parseMetadata(record).publicId : null);
    if ((att.provider || record?.provider) === "cloudinary" && publicId) {
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      // Expiring, signed, authenticated-asset download: scoped to this one asset and valid for minutes.
      const url = cloudinary.utils.private_download_url(String(publicId), ext, {
        type: "authenticated", resource_type: "image",
        expires_at: Math.floor(Date.now() / 1000) + ATTACHMENT_URL_TTL_SECONDS,
      });
      return res.redirect(302, url);
    }
    return res.status(404).json({ success: false, message: "Attachment not found" });
  } catch (error) {
    logError("❌ GET ATTACHMENT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch attachment" });
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

    // Leaving ends realtime access immediately: evict every live socket of this user from the chat room.
    try { getIO()?.in(`user_${req.user.id}`).socketsLeave(`chat_${chat.id}`); } catch (e) { logError("socket eviction failed", e); }

    res.json({ success: true, message: "Left chat" });
  } catch (error) {
    logError("❌ DELETE CHAT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to leave chat" });
  }
};
