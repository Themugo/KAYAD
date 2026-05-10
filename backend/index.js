// backend/index.js

import dotenv from "dotenv";
import http from "http";
import app from "./server.js";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

import { startAuctionEngine } from "./services/auctionEngine.js";
import { startAuctionTimer } from "./utils/auctionTimer.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

// =============================
// 🚀 BOOTSTRAP FUNCTION
// =============================
const startServer = async () => {
  try {
    // =============================
    // 🗄 CONNECT DB
    // =============================
    await connectDB();
    console.log("✅ Database connected");

    // =============================
    // 🌐 HTTP SERVER
    // =============================
    const server = http.createServer(app);

    // =============================
    // 🔥 SOCKET.IO
    // =============================
    const io = new Server(server, {
      cors: {
        origin: isProd
          ? ["https://your-frontend.com"]
          : "*",
      },
    });

    // 👉 inject instead of global
    app.set("io", io);

    // =============================
    // 🔌 SOCKET EVENTS
    // =============================
    io.on("connection", (socket) => {
      console.log("🔌 Connected:", socket.id);

      socket.on("joinAuction", (carId) => {
        socket.join(carId);
      });

      socket.on("joinAdmin", () => {
        socket.join("admins");
      });

      socket.on("disconnect", () => {
        console.log("❌ Disconnected:", socket.id);
      });
    });

    // =============================
    // ▶️ START SERVER
    // =============================
    server.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);

      // =============================
      // ⚡ BACKGROUND JOBS
      // =============================
      startAuctionEngine();
      startAuctionTimer(io);

      console.log("⚡ Auction systems running");
    });

    // =============================
    // 🛑 GRACEFUL SHUTDOWN
    // =============================
    process.on("SIGINT", () => shutdown(server));
    process.on("SIGTERM", () => shutdown(server));

  } catch (err) {
    console.error("❌ SERVER START FAILED:", err);
    process.exit(1);
  }
};

// =============================
// 🛑 SHUTDOWN HANDLER
// =============================
const shutdown = (server) => {
  console.log("🛑 Shutting down server...");

  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

// =============================
// 🚀 START
// =============================
startServer();