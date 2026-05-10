// socket/socket.js

import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // restrict in production
    },
  });

  io.on("connection", (socket) => {
    console.log("⚡ User connected:", socket.id);

    // =============================
    // 🚗 JOIN CAR ROOM
    // =============================
    socket.on("joinCar", (carId) => {
      socket.join(carId);
      console.log(`📡 Joined car room: ${carId}`);
    });

    // =============================
    // 💬 JOIN CHAT
    // =============================
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
    });

    // =============================
    // 💬 SEND MESSAGE
    // =============================
    socket.on("sendMessage", (data) => {
      io.to(data.chatId).emit("newMessage", data);
    });

    // =============================
    // ❌ DISCONNECT
    // =============================
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });

  return io;
};

// =============================
// 📡 EMIT HELPERS
// =============================
export const emitBidUpdate = (carId, bidData) => {
  if (io) {
    io.to(carId).emit("bidUpdate", bidData);
  }
};

export const emitAuctionEnd = (carId) => {
  if (io) {
    io.to(carId).emit("auctionEnded", { carId });
  }
};

export const emitAdminAlert = (message) => {
  if (io) {
    io.emit("adminAlert", { message });
  }
};