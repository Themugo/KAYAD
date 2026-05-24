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
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

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
import { csrfProtection } from "./middleware/csrf.js";
import { protect, adminOnly } from "./middleware/auth.js";
import responseWrapper from "./middleware/responseWrapper.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

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
import savedSearchRoutes from "./routes/savedSearchRoutes.js";
import ntsaVerificationRoutes from "./routes/ntsaVerificationRoutes.js";
import inspectionRoutes from "./routes/inspectionRoutes.js";
import escrowVaultRoutes from "./routes/escrowVaultRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import securityLogRoutes from "./routes/securityLogRoutes.js";
import smsBiddingRoutes from "./routes/smsBiddingRoutes.js";
import inspectorApplicationRoutes from "./routes/inspectorApplicationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import v1Routes from "./routes/v1.js";

// ─── Error Middleware ──────────────────────────────────────────
import notFound     from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// ─── Services & Utils ─────────────────────────────────────────
import requestLogger      from "./middleware/logger.js";
import { startAuctionEngine }  from "./realtime/auctionEngine.js";
import { startAuctionTimer }   from "./utils/auctionTimer.js";
import { startEscrowCron }     from "./services/escrowCron.js";
import { startAuctionReminderCron } from "./services/auctionReminderCron.js";
import { startSavedSearchCron } from "./services/savedSearchCron.js";
import { startPriceAlertCron } from "./services/priceAlertCron.js";
import { initSentry, sentryErrorHandler } from "./utils/sentry.js";
import { initCache }           from "./utils/cache.js";
import { registerHealthRoutes } from "./utils/healthCheck.js";
import { getEnv, validateEnv } from "./utils/env.js";
import { isRedisConnected }    from "./utils/cache.js";
import { setIO }               from "./utils/io.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, ".env") });

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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.sentry-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "blob:"],
      connectSrc: ["'self'", FRONTEND, `wss://${new URL(FRONTEND).hostname}`, "https://*.sentry.io"],
      fontSrc: ["'self'", "data:"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Permissions-Policy — restrict browser features
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(self)");
  next();
});

app.use(extraHeaders());

// ─── REQUEST LOGGER (assigns requestId to every request) ──────
app.use(requestLogger);

// ─── HTTP LOGGING ────────────────────────────────────────────
if (NODE_ENV === "development") app.use(morgan("dev"));
if (NODE_ENV === "production") {
  app.use(morgan("combined", {
    skip: (req) => req.url === "/health" || req.url === "/health/deep",
  }));
}

// ─── RATE LIMITING ────────────────────────────────────────────
app.use(globalLimiter);

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  FRONTEND, `https://${new URL(FRONTEND).hostname}`, `https://www.${new URL(FRONTEND).hostname}`,
  ...(process.env.EXTRA_CORS_ORIGINS || "").split(",").filter(Boolean),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || NODE_ENV === "development") return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Only allow YOUR Vercel deployments — not all *.vercel.app
    if (/^https:\/\/kayad-motors(-[a-z0-9]+)?(-themugos-projects)?\.vercel\.app$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    console.warn("⚠️ CORS blocked:", origin, "— set FRONTEND_URL or EXTRA_CORS_ORIGINS on Render");
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-By", "X-CSRF-Token", "X-XSRF-Token"],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// ─── BODY PARSERS ─────────────────────────────────────────────
app.use(cookieParser());
app.use(bodyGuard());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
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

// ─── METRICS ──────────────────────────────────────────────────
let metrics = { requests: 0, startedAt: Date.now() };
app.use((req, res, next) => {
  metrics.requests++;
  next();
});
app.get("/metrics", protect, adminOnly, (req, res) => {
  res.json({
    uptime: Math.round((Date.now() - metrics.startedAt) / 1000),
    totalRequests: metrics.requests,
    redis: isRedisConnected() ? "connected" : "disabled",
    env: NODE_ENV,
    memory: process.memoryUsage(),
    ts: new Date().toISOString(),
  });
});

// ─── API DOCS ─────────────────────────────────────────────────
if (NODE_ENV !== "production") {
  // Open access in development
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "KAYAD API Docs",
  }));
} else {
  // Require admin auth in production
  app.use("/api-docs", protect, adminOnly, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "KAYAD API Docs",
  }));
}

// ─── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || NODE_ENV === "development") return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (/^https:\/\/kayad-motors(-[a-z0-9]+)?(-themugos-projects)?\.vercel\.app$/.test(origin)) return cb(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      cb(new Error(`Socket CORS blocked: ${origin}`));
    },
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

app.set("io", io);
setIO(io);

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

  // Validate room IDs to prevent arbitrary room injection
  const isValidId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

  socket.on("joinAuction", (carId) => {
    if (isValidId(carId)) { socket.join(String(carId)); socket.join(`car_${carId}`); }
  });

  socket.on("joinChat",     (chatId) => { if (isValidId(chatId)) socket.join(`chat_${chatId}`); });
  socket.on("leaveChat",    (chatId) => { if (isValidId(chatId)) socket.leave(`chat_${chatId}`); });
  socket.on("typing",       ({ chatId, userId, name }) => {
    if (chatId) socket.to(`chat_${chatId}`).emit("typing", { chatId, userId, name });
  });
  socket.on("joinAdmin",    ()       => { if (socket.user?.role === "admin") socket.join("admins"); });
  socket.on("joinShowroom", ()       => { socket.join("showroom"); });
  socket.on("leaveShowroom",()       => { socket.leave("showroom"); });
  socket.on("disconnect",   ()      => {});
});

// ─── RESPONSE WRAPPER (ensures every JSON response has `success` field) ──
app.use(responseWrapper);

// ─── SYSTEM STATUS CHECK (global middleware for protected routes) ──
app.use("/api", checkSystemStatus);

// ─── API ROUTES ───────────────────────────────────────────────
app.use("/api/auth/refresh",  csrfProtection);  // CSRF for cookie-based refresh
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
app.use("/api/saved-searches", savedSearchRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/ntsa-verification", ntsaVerificationRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/escrow-vault", escrowVaultRoutes);
app.use("/api/security-logs", securityLogRoutes);
app.use("/api/sms-bidding", smsBiddingRoutes);
app.use("/api/inspector-applications", inspectorApplicationRoutes);
app.use("/api/contact", contactRoutes);

// ─── API VERSIONING ──────────────────────────────────────────
// /api/v1/* — versioned alias for all routes above
app.use("/api/v1/payments/callback", mpesaIpWhitelist, validateMpesaCallback);
app.use("/api/v1", checkSystemStatus, v1Routes);

// ─── ERROR HANDLING ───────────────────────────────────────────
sentryErrorHandler(app);   // Sentry first
app.use(notFound);
app.use(errorHandler);

// ─── DATABASE ─────────────────────────────────────────────────
const connectDB = async (retries = 5, delay = 2000) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || "10"),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log(`✅ MongoDB: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = delay * Math.pow(2, attempt - 1);
      console.warn(`⚠️  MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}. Retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
};

// ── Mongoose connection monitoring ──────────────────────────
mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));
mongoose.connection.on("reconnected",  () => console.log("✅ MongoDB reconnected"));
mongoose.connection.on("error", (err) => console.error("🔥 MongoDB error:", err.message));

// ─── ENV VALIDATION ───────────────────────────────────────────
// (validateEnv is imported from ./utils/env.js)

// ─── BOOTSTRAP ────────────────────────────────────────────────
const bootstrap = async () => {
  try {
    validateEnv();
    await connectDB();
    await initCache();                  // Redis (optional)

    // Auto-seed if no superadmin accounts exist (fresh DB)
    try {
      const User = (await import("./models/User.js")).default;
      const existing = await User.countDocuments({ role: "superadmin" });
      if (existing === 0) {
        const { reseed } = await import("./seed.js");
        const result = await reseed();
        console.log(`  🌱 Auto-seeded: ${result.webhost.length} webhost, ${result.admin.length} admin, ${result.demos.length} demos, ${result.cars} cars`);
      }
    } catch (seedErr) {
      console.warn("  ⚠️  Auto-seed skipped:", seedErr.message);
    }

    server.listen(PORT, () => {
      console.log("");
      console.log("  🚗 Kayad API");
      console.log(`  ├─ URL:      http://localhost:${PORT}`);
      console.log(`  ├─ Env:      ${NODE_ENV}`);
      console.log(`  ├─ CORS:     ${FRONTEND}`);
      console.log(`  ├─ Routes:   16 + v1 (versioned)`);
      console.log(`  ├─ Security: mongoSanitize + XSS + IP whitelist + pagination cap`);
      console.log(`  ├─ Sentry:   ${process.env.SENTRY_DSN ? "✅" : "disabled"}`);
      console.log(`  ├─ Redis:    ${process.env.REDIS_URL   ? "connecting..." : "in-memory fallback"}`);
      console.log(`  └─ Socket:   ready`);
      console.log("");
    });

    await startAuctionEngine();
    startAuctionTimer(io);
    startEscrowCron();
    startAuctionReminderCron();
    startSavedSearchCron();
    startPriceAlertCron();

    console.log(`  ⏰ EscrowCron: auto-release after ${process.env.ESCROW_AUTO_RELEASE_DAYS || 7} days`);
    console.log(`  ⏰ AuctionReminderCron: reminders active`);
    console.log(`  ⏰ SavedSearchCron: 10-min cycle`);
    console.log(`  ⏰ PriceAlertCron: 15-min cycle`);
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

if (NODE_ENV !== "test") {
  process.on("SIGTERM",            () => shutdown("SIGTERM"));
  process.on("SIGINT",             () => shutdown("SIGINT"));
  process.on("unhandledRejection", (err) => console.error("❌ Unhandled rejection:", err.message));
  process.on("uncaughtException",  (err) => { console.error("❌ Uncaught exception:", err.message); process.exit(1); });
}

if (NODE_ENV === "test") {
  // Do NOT connect in test mode — tests handle their own DB connection
  // via mongodb-memory-server or TEST_MONGO_URI
} else {
  bootstrap();
}

export { app, server, bootstrap };
export default app;
