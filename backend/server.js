// backend/server.js — PRODUCTION HARDENED v3.0
// =============================================
// Security: mongoSanitize + XSS + IP whitelist + pagination cap
// Monitoring: Sentry (env-driven) + health checks
// Caching: Redis (env-driven, falls back to memory)
// Reliability: escrow auto-release cron + graceful shutdown
// =============================================

import express      from "express";
import http         from "http";
import mongoose     from "mongoose";
import cors         from "cors";
import dotenv       from "dotenv";
import helmet       from "helmet";
import morgan       from "morgan";
import cookieParser from "cookie-parser";
import { Server }   from "socket.io";
import jwt          from "jsonwebtoken";

// ─── Rate Limiters (from middleware) ───────────────────────────
import { globalLimiter, authLimiter, socketRateLimit } from "./middleware/rateLimiter.js";

// ─── Security Middleware ───────────────────────────────────────
import {
  mongoSanitize,
  xssProtection,
  paginationCap,
  extraHeaders,
  bodyGuard,
} from "./middleware/security.js";
import {
  mpesaIpWhitelist,
  validateMpesaCallback,
} from "./middleware/mpesaSecurity.js";
import { checkSystemStatus } from "./middleware/systemCheck.js";

// ─── Routes ───────────────────────────────────────────────────
import authRoutes         from "./routes/authRoutes.js";
import carRoutes          from "./routes/carRoutes.js";
import bidRoutes          from "./routes/bidRoutes.js";
import dealerRoutes       from "./routes/dealerRoutes.js";
import adminRoutes        from "./routes/adminRoutes.js";
import paymentRoutes      from "./routes/paymentRoutes.js";
import escrowRoutes       from "./routes/escrowRoutes.js";
import chatRoutes         from "./routes/chatRoutes.js";
import favoriteRoutes     from "./routes/favoriteRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes       from "./routes/reviewRoutes.js";
import transactionRoutes  from "./routes/transactionRoutes.js";
import auctionAdminRoutes from "./routes/auctionAdminRoutes.js";
import adRoutes          from "./routes/adRoutes.js";
import userRoutes        from "./routes/userRoutes.js";

// ─── Error Middleware ──────────────────────────────────────────
import notFound     from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// ─── Services & Utils ─────────────────────────────────────────
import { startAuctionEngine }  from "./realtime/auctionEngine.js";
import { startAuctionTimer }   from "./utils/auctionTimer.js";
import { startEscrowCron }     from "./services/escrowCron.js";
import { initSentry, sentryErrorHandler } from "./utils/sentry.js";
import { initCache }           from "./utils/cache.js";
import { registerHealthRoutes } from "./utils/healthCheck.js";

dotenv.config();

// ─── CONFIG ───────────────────────────────────────────────────
const app      = express();
const server   = http.createServer(app);
const PORT     = process.env.PORT     || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";

// ─── SENTRY (must be first) ───────────────────────────────────
await initSentry(app);

// ─── TRUST PROXY ──────────────────────────────────────────────
app.set("trust proxy", 1);

// ─── SECURITY HEADERS ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // managed by nginx
}));
app.use(extraHeaders());

// ─── LOGGING ──────────────────────────────────────────────────
if (NODE_ENV === "development") app.use(morgan("dev"));
if (NODE_ENV === "production") {
  app.use(morgan("combined", {
    skip: (req) => req.url === "/health",  // don't log health pings
  }));
}

// ─── RATE LIMITING ────────────────────────────────────────────
app.use(globalLimiter);

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  FRONTEND,
  ...(process.env.EXTRA_CORS_ORIGINS || "").split(",").filter(Boolean),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || NODE_ENV === "development") return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── BODY PARSERS ─────────────────────────────────────────────
app.use(cookieParser());
app.use(bodyGuard());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
// Serve uploaded files with strict headers to prevent script execution
app.use("/uploads", (req, res, next) => {
  const ext = req.path.split(".").pop()?.toLowerCase();
  const allowedExts = ["jpg", "jpeg", "png", "webp"];
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline"); // prevent download-as-script attacks
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  next();
}, express.static("uploads"));

// ─── SECURITY SANITIZATION ───────────────────────────────────
app.use(mongoSanitize());    // Block NoSQL injection
app.use(xssProtection());    // Sanitize XSS in inputs
app.use(paginationCap());    // Cap ?limit and ?page params

// ─── HEALTH CHECKS (before other routes, no auth) ────────────
registerHealthRoutes(app);

// ─── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === "production" ? allowedOrigins : true,
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

global.io = io;
app.set("io", io);

// Socket JWT auth
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(); // allow unauthenticated viewers
  }
});

io.on("connection", (socket) => {
  const uid = socket.user?.id || socket.user?._id;
  if (uid) socket.join(`user_${uid}`);

  socket.on("joinAuction", (carId) => {
    if (carId) { socket.join(String(carId)); socket.join(`car_${carId}`); }
  });

  socket.on("placeBid", async ({ auctionId, bidAmount, maskedName }) => {
    if (!auctionId || !bidAmount) return;
    // 🔒 SECURITY: Always use the authenticated socket user, never trust client-sent userId
    const authenticatedUserId = socket.user?.id || socket.user?._id;
    if (!authenticatedUserId) return; // reject unauthenticated bids

    // 🚦 Rate limit: max 3 bids per second per user
    if (!socketRateLimit(authenticatedUserId)) {
      socket.emit("error", { message: "Too many bids — slow down" });
      return;
    }
    try {
      const Auction = (await import("./models/Auction.js")).default;
      const auction = await Auction.findById(auctionId);
      if (!auction || auction.status !== "active") return;

      if (bidAmount <= auction.highestBid) return;
      auction.highestBid = bidAmount;
      auction.bidHistory.push({ userId: authenticatedUserId, bid: bidAmount });
      const now = new Date();
      const timeRemaining = auction.endTime - now;
      if (timeRemaining < 30000 && timeRemaining > 0) {
        auction.endTime = new Date(auction.endTime.getTime() + 30000);
        auction.extendedCount = (auction.extendedCount || 0) + 1;
      }
      await auction.save();

      io.to(String(auctionId)).emit("newBid", {
        amount: bidAmount,
        bidder: maskedName || `Bidder #${100 + (auction.bidHistory?.length || 0)}`,
        time: new Date(),
        endTime: auction.endTime,
      });
      if (auction.endTime > now) {
        io.to(String(auctionId)).emit("timeExtended", { newEndTime: auction.endTime });
      }
    } catch (err) {
      console.error("placeBid socket error:", err.message);
    }
  });

  socket.on("joinChat",  (chatId) => { if (chatId) socket.join(`chat_${chatId}`); });
  socket.on("joinAdmin", ()       => { if (socket.user?.role === "admin") socket.join("admins"); });
  socket.on("disconnect", ()      => {});
});

// ─── SYSTEM STATUS CHECK (global middleware for protected routes) ──
app.use("/api", checkSystemStatus);

// ─── API ROUTES ───────────────────────────────────────────────
app.use("/api/auth",          authLimiter, authRoutes);
app.use("/api/cars",          carRoutes);
app.use("/api/bids",          bidRoutes);
app.use("/api/dealer",        dealerRoutes);
app.use("/api/admin",         adminRoutes);

// M-Pesa callback gets IP whitelist before routes mount
app.use("/api/payments/callback",   mpesaIpWhitelist, validateMpesaCallback);
app.use("/api/payments",      paymentRoutes);

app.use("/api/escrow",        escrowRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/favorites",     favoriteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews",       reviewRoutes);
app.use("/api/transactions",  transactionRoutes);
app.use("/api/auction-admin", auctionAdminRoutes);
app.use("/api/ads",          adRoutes);
app.use("/api/users",        userRoutes);

// ─── ERROR HANDLING ───────────────────────────────────────────
sentryErrorHandler(app);   // Sentry first
app.use(notFound);
app.use(errorHandler);

// ─── DATABASE ─────────────────────────────────────────────────
const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || "10"),
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log(`✅ MongoDB: ${conn.connection.host}`);
};

// ─── BOOTSTRAP ────────────────────────────────────────────────
const bootstrap = async () => {
  try {
    await connectDB();
    await initCache();                  // Redis (optional)

    server.listen(PORT, () => {
      console.log("");
      console.log("  🚗 Kayad API");
      console.log(`  ├─ URL:      http://localhost:${PORT}`);
      console.log(`  ├─ Env:      ${NODE_ENV}`);
      console.log(`  ├─ CORS:     ${FRONTEND}`);
      console.log(`  ├─ Routes:   15 mounted`);
      console.log(`  ├─ Security: mongoSanitize + XSS + IP whitelist + pagination cap`);
      console.log(`  ├─ Sentry:   ${process.env.SENTRY_DSN ? "✅" : "disabled"}`);
      console.log(`  ├─ Redis:    ${process.env.REDIS_URL   ? "connecting..." : "in-memory fallback"}`);
      console.log(`  └─ Socket:   ready`);
      console.log("");
    });

    await startAuctionEngine();
    startAuctionTimer(io);
    startEscrowCron();

    console.log(`  ⏰ EscrowCron: auto-release after ${process.env.ESCROW_AUTO_RELEASE_DAYS || 7} days`);
    console.log(`  ⚡ AuctionEngine: running`);
    console.log("");
  } catch (err) {
    console.error("❌ Bootstrap failed:", err.message);
    process.exit(1);
  }
};

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n🛑 ${signal} — shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close();
    console.log("✅ Shutdown complete");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000); // force after 10s
};

process.on("SIGTERM",            () => shutdown("SIGTERM"));
process.on("SIGINT",             () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => console.error("❌ Unhandled rejection:", err.message));
process.on("uncaughtException",  (err) => { console.error("❌ Uncaught exception:", err.message); process.exit(1); });

bootstrap();
