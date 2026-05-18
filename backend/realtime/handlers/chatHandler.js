// realtime/handlers/chatHandler.js

import Chat from "../../models/Chat.js";

// =============================
// 🧠 HELPERS
// =============================
const isAuthenticated = (socket) => {
  return socket.user && socket.user.id;
};

const sanitizeText = (text = "") => {
  return text.trim().slice(0, 1000); // limit message size
};

export const chatHandler = (io, socket) => {
  const userId = socket.user?.id;

  // =============================
  // 💬 JOIN CHAT
  // =============================
  socket.on("joinChat", (chatId) => {
    if (!chatId || !isAuthenticated(socket)) return;

    socket.join(chatId);

    console.log(`💬 ${userId} joined chat ${chatId}`);
  });

  // =============================
  // 🚪 LEAVE CHAT
  // =============================
  socket.on("leaveChat", (chatId) => {
    if (!chatId) return;

    socket.leave(chatId);
  });

  // =============================
  // 📤 SEND MESSAGE (SECURE + SAVED 🔥)
  // =============================
  socket.on("sendMessage", async (data) => {
    try {
      if (!isAuthenticated(socket)) {
        return socket.emit("chatError", {
          message: "Unauthorized",
        });
      }

      const { chatId, text, attachments = [] } = data;

      if (!chatId || (!text && attachments.length === 0)) {
        return socket.emit("chatError", {
          message: "Empty message",
        });
      }

      const cleanText = sanitizeText(text);

      // =============================
      // 🔍 FIND CHAT
      // =============================
      const chat = await Chat.findById(chatId);

      if (!chat) {
        return socket.emit("chatError", {
          message: "Chat not found",
        });
      }

      // 🚫 BLOCKED CHAT
      if (chat.isBlocked) {
        return socket.emit("chatError", {
          message: "Chat is blocked",
        });
      }

      // =============================
      // 💬 CREATE MESSAGE
      // =============================
      const messageData = {
        sender: userId,
        text: cleanText,
        attachments,
        seenBy: [userId],
      };

      await chat.addMessage(messageData);

      const payload = {
        ...messageData,
        chatId,
        time: Date.now(),
      };

      // =============================
      // 📡 BROADCAST
      // =============================
      io.to(chatId).emit("newMessage", payload);

      // 📧 New message email (fire-and-forget)
      try {
        const { sendNewMessageEmail } = await import("../../services/email.service.js");
        const User = (await import("../../models/User.js")).default;
        const otherUserId = chat.participants.find(p => String(p) !== String(userId));
        if (otherUserId && typeof sendNewMessageEmail === "function") {
          const otherUser = await User.findById(otherUserId).select("email name");
          if (otherUser?.email) {
            const fromUser = await User.findById(userId).select("name");
            const carTitle = chat.car?.title || null;
            sendNewMessageEmail(otherUser, fromUser?.name || "A user", carTitle).catch(e =>
              console.warn("⚠️ New message email failed:", e.message)
            );
          }
        }
      } catch (_) {}

      // =============================
      // ✅ ACK TO SENDER
      // =============================
      socket.emit("messageSent", payload);

    } catch (err) {
      console.error("❌ CHAT ERROR:", err);

      socket.emit("chatError", {
        message: "Server error",
      });
    }
  });

  // =============================
  // 👀 MARK AS SEEN
  // =============================
  socket.on("markSeen", async ({ chatId }) => {
    try {
      if (!isAuthenticated(socket) || !chatId) return;

      const chat = await Chat.findById(chatId);

      if (!chat) return;

      await chat.markAsSeen(userId);

      socket.to(chatId).emit("messagesSeen", {
        chatId,
        userId,
      });

    } catch (err) {
      console.error("❌ SEEN ERROR:", err);
    }
  });

  // =============================
  // ✍️ TYPING INDICATOR (THROTTLED 🔥)
  // =============================
  let typingTimeout;

  socket.on("typing", ({ chatId }) => {
    if (!chatId || !isAuthenticated(socket)) return;

    socket.to(chatId).emit("typing", {
      userId,
    });

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
      socket.to(chatId).emit("stopTyping", {
        userId,
      });
    }, 2000);
  });

  socket.on("stopTyping", ({ chatId }) => {
    if (!chatId) return;

    socket.to(chatId).emit("stopTyping", {
      userId,
    });
  });

  // =============================
  // 🔌 DISCONNECT
  // =============================
  socket.on("disconnect", () => {
    console.log("💬 Chat user disconnected:", userId);
  });
};