// realtime/websocket.js

import { placeBid } from "./auctionEngine.js";
import {
  emitBidUpdate,
  emitAuctionEnd,
  emitMessage,
  emitAdminAlert,
} from "./events.js";

import {
  addUser,
  removeUser,
  broadcastUserStatus,
  countRoomUsers,
} from "./presence.js";

import { socketRateLimit } from "./rateLimitSocket.js";

// =============================
// 🚀 SOCKET SETUP
// =============================
export function setupWebsocket(io) {
  io.on("connection", (socket) => {
    console.log("⚡ User connected:", socket.id);

    // =============================
    // 🔐 ATTACH USER (VERY IMPORTANT)
    // =============================
    const userId = socket.handshake.auth?.userId;

    if (userId) {
      socket.userId = userId;
      addUser(userId, socket.id);
      broadcastUserStatus(io, userId, true);
    }

    // =============================
    // 🚗 JOIN CAR ROOM
    // =============================
    socket.on("joinCar", (carId) => {
      socket.join(carId);

      const viewers = countRoomUsers(io, carId);

      io.to(carId).emit("viewerCount", {
        carId,
        viewers,
      });
    });

    // =============================
    // 💬 JOIN CHAT
    // =============================
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
    });

    // =============================
    // ⚡ PLACE BID (SECURE)
    // =============================
    socket.on("placeBid", async (data) => {
      try {
        const { carId, amount } = data;

        const userId = socket.userId;

        if (!userId) {
          return socket.emit("bidError", {
            message: "Unauthorized",
          });
        }

        // 🛡 RATE LIMIT
        if (!socketRateLimit(userId)) {
          return socket.emit("bidError", {
            message: "Too fast. Slow down.",
          });
        }

        const result = await placeBid({
          roomId: carId,
          bid: amount,
          userId,
        });

        if (!result.success) {
          return socket.emit("bidError", {
            message: result.message,
          });
        }

        // 🔥 BROADCAST
        emitBidUpdate(io, carId, {
          carId,
          amount,
          userId,
        });

      } catch (err) {
        console.error("❌ SOCKET BID ERROR:", err);

        socket.emit("bidError", {
          message: "Server error",
        });
      }
    });

    // =============================
    // 💬 SEND MESSAGE
    // =============================
    socket.on("sendMessage", (data) => {
      try {
        const { chatId, message } = data;

        if (!socket.userId) return;

        emitMessage(io, chatId, {
          ...message,
          sender: socket.userId,
          time: Date.now(),
        });

      } catch (err) {
        console.error("❌ CHAT ERROR:", err);
      }
    });

    // =============================
    // ✍️ TYPING EVENTS
    // =============================
    socket.on("typing", ({ chatId }) => {
      socket.to(chatId).emit("typing", {
        user: socket.userId,
      });
    });

    socket.on("stopTyping", ({ chatId }) => {
      socket.to(chatId).emit("stopTyping", {
        user: socket.userId,
      });
    });

    // =============================
    // 🚨 ADMIN ALERT
    // =============================
    socket.on("adminAlert", (msg) => {
      if (socket.userId) {
        emitAdminAlert(io, msg);
      }
    });

    // =============================
    // 🏁 END AUCTION
    // =============================
    socket.on("endAuction", (carId) => {
      emitAuctionEnd(io, carId, {
        carId,
        forced: true,
      });
    });

    // =============================
    // ❌ DISCONNECT
    // =============================
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);

      const user = removeUser(socket.id);

      if (user) {
        broadcastUserStatus(io, user, false);
      }
    });
  });
}