// realtime/handlers/adminHandler.js

import { socketRateLimit } from "../rateLimitSocket.js";

// =============================
// 🧠 HELPER: ADMIN CHECK
// =============================
const isAdmin = (socket) => {
  return socket.user && socket.user.role === "admin";
};

export const adminHandler = (io, socket) => {
  // 🚫 Block non-admins early
  if (!isAdmin(socket)) return;

  console.log("👑 Admin connected:", socket.user?.id);

  // =============================
  // 🚨 ADMIN ALERT (RATE LIMITED)
  // =============================
  socket.on("adminAlert", (data) => {
    if (!socketRateLimit(socket.user.id)) return;

    if (!data?.message) return;

    io.emit("adminAlert", {
      message: data.message,
      admin: socket.user.id,
      time: Date.now(),
    });
  });

  // =============================
  // 📊 SYSTEM STATS (ENHANCED)
  // =============================
  socket.on("getStats", () => {
    if (!socketRateLimit(socket.user.id)) return;

    const usersOnline = io.engine.clientsCount;

    // Optional: track rooms
    const rooms = Object.keys(io.sockets.adapter.rooms).length;

    socket.emit("stats", {
      usersOnline,
      activeRooms: rooms,
      time: Date.now(),
    });
  });

  // =============================
  // 🔥 FORCE CLOSE AUCTION (SAFE)
  // =============================
  socket.on("forceCloseAuction", ({ carId }) => {
    if (!socketRateLimit(socket.user.id)) return;

    if (!carId) return;

    // Notify auction room
    io.to(carId).emit("auctionEnded", {
      carId,
      forced: true,
      closedBy: socket.user.id,
      time: Date.now(),
    });

    // Global alert
    io.emit("adminAlert", {
      message: `🚨 Auction ${carId} was force closed`,
      admin: socket.user.id,
      time: Date.now(),
    });

    console.log("⚠️ Admin forced auction close:", carId);
  });

  // =============================
  // 🔌 ADMIN DISCONNECT LOG
  // =============================
  socket.on("disconnect", () => {
    console.log("👑 Admin disconnected:", socket.user?.id);
  });
};