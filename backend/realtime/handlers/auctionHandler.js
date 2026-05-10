// realtime/handlers/auctionHandler.js

import { placeBid } from "../auctionEngine.js";
import { socketRateLimit } from "../rateLimitSocket.js";
import { countRoomUsers } from "../presence.js";

// =============================
// 🧠 HELPER: AUTH CHECK
// =============================
const isAuthenticated = (socket) => {
  return socket.user && socket.user.id;
};

export const auctionHandler = (io, socket) => {
  // 🚫 Block unauthenticated users from bidding
  const userId = socket.user?.id;

  // =============================
  // 🚗 JOIN CAR ROOM
  // =============================
  socket.on("joinCar", (carId) => {
    if (!carId) return;

    socket.join(carId);

    const viewers = countRoomUsers(io, carId);

    io.to(carId).emit("viewerCount", {
      carId,
      viewers,
    });

    console.log(`👁 ${userId} joined car ${carId}`);
  });

  // =============================
  // 🚪 LEAVE CAR ROOM
  // =============================
  socket.on("leaveCar", (carId) => {
    if (!carId) return;

    socket.leave(carId);

    const viewers = countRoomUsers(io, carId);

    io.to(carId).emit("viewerCount", {
      carId,
      viewers,
    });
  });

  // =============================
  // ⚡ PLACE BID (SECURE 🔥)
  // =============================
  socket.on("placeBid", async (data) => {
    try {
      if (!isAuthenticated(socket)) {
        return socket.emit("bidError", {
          message: "Unauthorized",
        });
      }

      const { carId, amount } = data;

      if (!carId || !amount) {
        return socket.emit("bidError", {
          message: "Invalid bid data",
        });
      }

      // 🛡 RATE LIMIT (per user)
      if (!socketRateLimit(userId)) {
        return socket.emit("bidError", {
          message: "Too many bids. Slow down.",
        });
      }

      // =============================
      // 🔥 CORE ENGINE
      // =============================
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

      // =============================
      // 📡 BROADCAST RESULT
      // =============================
      io.to(carId).emit("bidUpdate", {
        carId,
        currentBid: result.currentBid,
        bidder: result.userId,
        isAuto: result.isAuto || false,
        time: Date.now(),
      });

      // =============================
      // 🏆 WINNER UPDATE (IF ANY)
      // =============================
      if (result.isWinning) {
        io.to(carId).emit("auctionLeader", {
          carId,
          leader: result.userId,
          amount: result.currentBid,
        });
      }

      // =============================
      // ✅ ACK TO BIDDER (IMPORTANT UX)
      // =============================
      socket.emit("bidPlaced", {
        success: true,
        amount: result.currentBid,
      });

    } catch (err) {
      console.error("❌ AUCTION HANDLER ERROR:", err);

      socket.emit("bidError", {
        message: "Server error",
      });
    }
  });

  // =============================
  // 🏁 END AUCTION (ADMIN ONLY 🔥)
  // =============================
  socket.on("endAuction", ({ carId }) => {
    if (!socket.user || socket.user.role !== "admin") {
      return socket.emit("bidError", {
        message: "Unauthorized action",
      });
    }

    if (!carId) return;

    io.to(carId).emit("auctionEnded", {
      carId,
      endedBy: socket.user.id,
      time: Date.now(),
    });

    console.log("🏁 Auction ended:", carId);
  });

  // =============================
  // 🔌 DISCONNECT CLEANUP
  // =============================
  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", userId);
  });
};