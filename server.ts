import "dotenv/config";
import express, { Express, Request, Response, NextFunction } from "express";
import http, { Server as HttpServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createRateLimiter } from "./services/rateLimit.js";
import { auditLog } from "./middleware/audit.js";
import mongoSanitize from "express-mongo-sanitize";
import pino, { Logger } from "pino";
import pinoHttp from "pino-http";
import { connectDB } from "./db/index.js";
import { seedPlans } from "./services/billing.js";
import { initIO } from "./services/socket.js";
import { authenticateSocket, authenticate } from "./middleware/auth.js";
import { sanitizeInput } from "./middleware/validation.js";
import { notFoundHandler } from "./middleware/errorHandler.js";
import { initializeQueues } from "./queues/index.js";
import { correlationIdMiddleware, globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { ipRateLimiter, ipThrottlingMiddleware, abuseDetectionMiddleware, securityHeadersMiddleware, initializeSecurityMiddleware } from "./middleware/securityHardening.js";
import { metricsMiddleware } from "./observability/metrics.js";
import "./observability/tracing.js";
import { startAlertMonitoring } from "./observability/alerting.js";
import "./sentry.js";

// Route imports
import authRoutes      from "./routes/auth.js";
import verificationRoutes from "./routes/verification.js";
import phoneVerificationRoutes from "./routes/phone-verification.js";
import oauthRoutes     from "./routes/oauth.js";
import deviceRoutes    from "./routes/devices.js";
import imeiRoutes      from "./routes/imei.js";
import trackRoutes     from "./routes/track.js";
import alertRoutes     from "./routes/alerts.js";
import aiRoutes        from "./routes/ai.js";
import aiIntegrationRoutes from "./routes/ai-integration.js";
import billingRoutes   from "./routes/billing.js";
import adsRoutes       from "./routes/ads.js";
import partnerRoutes   from "./routes/partner.js";
import adminRoutes     from "./routes/admin.js";
import accountLockoutRoutes from "./routes/accountLockout.js";
import twoFactorAuthRoutes  from "./routes/twoFactorAuth.js";
import communityRoutes from "./routes/community.js";
import lockRoutes      from "./routes/lock.js";
import healthRoutes    from "./routes/health.js";
import marketplaceRoutes from "./routes/marketplace.js";
import externalMarketplaceRoutes from "./routes/external-marketplace.js";
import notificationPreferencesRoutes from "./routes/notification-preferences.js";
import telecomAnalyticsRoutes from "./routes/telecom-analytics.js";
import auditLogsRoutes from "./routes/audit-logs.js";
import lawEnforcementCasesRoutes from "./routes/law-enforcement-cases.js";
import intelligenceBrokerRoutes from "./routes/intelligence-broker.js";
import insuranceRoutes from "./routes/insurance.js";
import blockchainRoutes from "./routes/blockchain.js";
import crossBorderRoutes from "./routes/crossBorder.js";
import deviceDnaRoutes from "./routes/deviceDna.js";
import financialsRoutes from "./routes/financials.js";
import recoveryRoutes from "./routes/recovery.js";
import gdprRoutes from "./routes/gdpr.js";
import deviceLockRoutes from "./routes/deviceLock.js";
import deviceTransferRoutes from "./routes/deviceTransfer.js";
import lawEnforcementRoutes from "./routes/lawEnforcement.js";
import policeIntegrationRoutes from "./routes/policeIntegration.js";
import policeHierarchyRoutes from "./routes/policeHierarchy.js";
import lawEnforcementDashboardRoutes from "./routes/lawEnforcementDashboard.js";
import telecomCompanyRoutes from "./routes/telecomCompany.js";
import telecomDashboardRoutes from "./routes/telecomDashboard.js";
import telecomIntegrationRoutes from "./routes/telecomIntegration.js";
import cellTowerRoutes from "./routes/cellTower.js";
import adminDashboardRoutes from "./routes/adminDashboard.js";
import adminManagementRoutes from "./routes/adminManagement.js";
import adminRoleRoutes from "./routes/adminRole.js";
import superAdminRoutes from "./routes/superAdmin.js";
import superAdminDashboardRoutes from "./routes/superAdminDashboard.js";
import dashboardSecurityRoutes from "./routes/dashboardSecurity.js";
import securityEnhancedRoutes from "./routes/securityEnhanced.js";
import selfieCaptureRoutes from "./routes/selfieCapture.js";
import predictiveAnalyticsRoutes from "./routes/predictiveAnalytics.js";
import stripeEnhancedRoutes from "./routes/stripeEnhanced.js";
import paypalRoutes from "./routes/paypal.js";
import webhooksRoutes from "./routes/webhooks.js";
import publicApiRoutes from "./routes/publicApi.js";
import partnerMarketplaceRoutes from "./routes/partnerMarketplace.js";
import resellerRoutes from "./routes/reseller.js";
import sellerResellerRoutes from "./routes/sellerReseller.js";
import repairShopRoutes from "./routes/repairShop.js";
import whiteLabelRoutes from "./routes/whiteLabel.js";
import adsEnhancedRoutes from "./routes/adsEnhanced.js";
import rewardsRoutes from "./routes/rewards.js";
import enterpriseRoutes from "./routes/enterprise.js";
import regulatoryRoutes from "./routes/regulatory.js";
import configurationManagementRoutes from "./routes/configurationManagement.js";
import pricingRoutes from "./routes/pricing.js";
import securityRoutes from "./routes/security.js";
import offlineRoutes from "./routes/offline.js";
import infrastructureRoutes from "./routes/infrastructure.js";
import networkEffectsRoutes from "./routes/networkEffects.js";
import aiAdvancedRoutes from "./routes/aiAdvanced.js";
import analyticsRoutes from "./routes/analytics.js";
import i18nRoutes from "./routes/i18n.js";
import enterpriseAdvancedRoutes from "./routes/enterpriseAdvanced.js";
import autoRegisterRoutes from "./routes/auto-register.js";
import reportsRoutes from "./routes/reports.js";
import { startCron }    from "./services/cron.js";

const app: Express = express();
const server: HttpServer = http.createServer(app);
const isProd: boolean = process.env.NODE_ENV === "production";

// Trust Railway/Heroku/Vercel proxy — required for rate-limiter to see real IPs
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Additional security headers ──────────────────────────────────────────────────
app.use(securityHeadersMiddleware);

// ── IP rate limiting ────────────────────────────────────────────────────────────
app.use(ipRateLimiter);

// ── IP throttling ───────────────────────────────────────────────────────────────
app.use(ipThrottlingMiddleware);

// ── Abuse detection ─────────────────────────────────────────────────────────────
app.use(abuseDetectionMiddleware);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins: string[] = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map((s: string) => s.trim());
app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      const error = new Error("Not allowed by CORS") as any;
      error.status = 403;
      cb(error);
    }
  },
  credentials: true,
}));

// ── Input sanitization ─────────────────────────────────────────────────────────
app.use(sanitizeInput);

// ── Correlation ID middleware ───────────────────────────────────────────────────
app.use(correlationIdMiddleware);

// ── Metrics middleware ───────────────────────────────────────────────────────────
app.use(metricsMiddleware);

// ── Structured logging ────────────────────────────────────────────────────────
export const logger: Logger = pino({
  level: isProd ? "info" : "debug",
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

// ── Stripe webhook — MUST be before express.json() (needs raw body) ───────────
// Express Routers ARE callable as functions. We rewrite the path so the router
// sees "/stripe-webhook" relative to its own mount point.
app.post(
  "/api/billing/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response, next: NextFunction) => {
    req.url = "/stripe-webhook";   // strip the /api/billing prefix for the router
    billingRoutes(req, res, next);
  }
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));

// ── NoSQL injection protection ────────────────────────────────────────────────
// Strips keys with $ or . from user input — blocks $where/$gt injection attacks
app.use(mongoSanitize({ replaceWith: "_" }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Global: 200 req/15min per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Auth: 20 req/15min (brute-force protection). Redis-backed when REDIS_URL is
// set, so the limit holds across multiple server instances — without this, an
// attacker could bypass the limit entirely by round-robining requests across
// instances, each keeping its own separate in-memory counter.
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many auth attempts", useRedis: true });

// IMEI check: 30 req/min per IP (prevents blacklist enumeration)
const imeiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: "IMEI check rate limit exceeded — try again in a minute" } });

// Track: 120 req/min per IP (mobile agents ping every 30s per device). Also
// Redis-backed: this endpoint may accept unauthenticated pings depending on
// TRACK_REQUIRE_AUTH, so cross-instance enforcement matters here too.
const trackLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120, message: "Ping rate limit exceeded", useRedis: true });

// AI: 30 req/min (independent of per-user monthly quota)
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: "AI rate limit exceeded" } });

// Intelligence Broker: 50 req/min per IP (prevents abuse of intelligence endpoints)
const intelligenceBrokerLimiter = rateLimit({ windowMs: 60 * 1000, max: 50, message: { error: "Intelligence broker rate limit exceeded" } });

// ── M-Pesa callback IP whitelist ─────────────────────────────────────────────
// Safaricom publishes their callback IPs — only accept callbacks from them
const MPESA_CALLBACK_IPS = new Set([
  "196.201.214.200", "196.201.214.206", "196.201.213.114",
  "196.201.214.207", "196.201.214.208", "196.201.213.44",
  "196.201.212.127", "196.201.212.138", "196.201.212.129",
  "196.201.212.136", "196.201.212.74",  "196.201.212.69",
]);

function mpesaIpWhitelist(req: Request, res: Response, next: NextFunction): void {
  if (process.env.MPESA_ENV !== "production") return next(); // bypass in sandbox
  const ip = req.ip || req.connection.remoteAddress;
  const clean = ip?.replace("::ffff:", "");
  if (clean && MPESA_CALLBACK_IPS.has(clean)) return next();
  logger.warn({ ip: clean }, "M-Pesa callback rejected — IP not whitelisted");
  res.status(403).json({ error: "Forbidden" });
}

// ── Routes ────────────────────────────────────────────────────────────────────
// ── Audit logging on sensitive surfaces (compliance review §9) ───────────────
// Records WHO accessed WHAT, WHEN, from where, and the outcome — including denied
// (401/403) attempts — for access to criminal/PII/biometric data, privileged
// admin/dashboard actions, telecom PII, device control, and auth events. Writes
// are async (non-blocking) to AuditLog (1-year TTL). Selective by design: high-
// volume, low-sensitivity paths (/track, /imei, /ai, marketplace) are excluded to
// keep the trail high-signal and the collection from bloating.
const AUDITED_PATHS = [
  "/api/auth",
  "/api/law-enforcement", "/api/police-integration", "/api/police-hierarchy",
  "/api/le-dashboard", "/api/law-enforcement-cases",
  "/api/admin", "/api/admin-dashboard", "/api/admin-management", "/api/admin-roles",
  "/api/super-admin", "/api/super-admin-dashboard", "/api/dashboard-security",
  "/api/selfie-capture", "/api/security-enhanced",
  "/api/telecom-company", "/api/telecom-dashboard", "/api/telecom-integration",
  "/api/device-locks", "/api/device-transfers",
  "/api/regulatory", "/api/gdpr", "/api/audit-logs",
];
app.use(AUDITED_PATHS, auditLog);

app.use("/api/health", healthRoutes);

app.use("/api/auth",      authLimiter,  authRoutes);
app.use("/api/auth/oauth", oauthRoutes);
app.use("/api/auth/verify-phone", authLimiter, phoneVerificationRoutes);
app.use("/api/verify",    authLimiter,  verificationRoutes);
app.use("/api/devices",               deviceRoutes);
app.use("/api/devices",               lockRoutes);
app.use("/api/devices/auto-register", authenticate, autoRegisterRoutes);     // lock/unlock/commands on /api/devices/:id/*
app.use("/api/imei",    imeiLimiter,  imeiRoutes);
app.use("/api/track",   trackLimiter, trackRoutes);
app.use("/api/alerts",                alertRoutes);
app.use("/api/ai",      aiLimiter,    aiRoutes);
app.use("/api/ai-integration", aiLimiter, aiIntegrationRoutes);
// Apply M-Pesa IP whitelist specifically to callback endpoint
app.post("/api/billing/mpesa-callback", mpesaIpWhitelist);
app.use("/api/billing",               billingRoutes);
app.use("/api/ads",                   adsRoutes);
app.use("/api/partner",               partnerRoutes);
app.use("/api/admin",                 adminRoutes);
app.use("/api/admin/account-lockout", accountLockoutRoutes);
app.use("/api/2fa",                   authLimiter, twoFactorAuthRoutes);
app.use("/api/community",             communityRoutes);
app.use("/api/marketplace",           marketplaceRoutes);
app.use("/api/external-marketplace",  externalMarketplaceRoutes);
app.use("/api/notification-preferences", notificationPreferencesRoutes);
app.use("/api/telecom-analytics",     telecomAnalyticsRoutes);
app.use("/api/audit-logs",            auditLogsRoutes);
app.use("/api/law-enforcement-cases", lawEnforcementCasesRoutes);
app.use("/api/intelligence-broker",   intelligenceBrokerLimiter, intelligenceBrokerRoutes);
app.use("/api/insurance",             insuranceRoutes);
app.use("/api/blockchain",            blockchainRoutes);
app.use("/api/cross-border",          crossBorderRoutes);
app.use("/api/dna",                   deviceDnaRoutes);
app.use("/api/financials",            financialsRoutes);
app.use("/api/recovery",              recoveryRoutes);
app.use("/api/gdpr",                  gdprRoutes);
app.use("/api/device-locks",          deviceLockRoutes);
app.use("/api/device-transfers",      deviceTransferRoutes);
app.use("/api/law-enforcement",       lawEnforcementRoutes);
app.use("/api/police-integration",    policeIntegrationRoutes);
app.use("/api/police-hierarchy",      policeHierarchyRoutes);
app.use("/api/le-dashboard",          lawEnforcementDashboardRoutes);
app.use("/api/telecom-company",       telecomCompanyRoutes);
app.use("/api/telecom-dashboard",     telecomDashboardRoutes);
app.use("/api/telecom-integration",   telecomIntegrationRoutes);
app.use("/api/cell-tower",            cellTowerRoutes);
app.use("/api/admin-dashboard",       adminDashboardRoutes);
app.use("/api/admin-management",      adminManagementRoutes);
app.use("/api/admin-roles",           adminRoleRoutes);
app.use("/api/super-admin",           superAdminRoutes);
app.use("/api/super-admin-dashboard", superAdminDashboardRoutes);
app.use("/api/dashboard-security",    dashboardSecurityRoutes);
app.use("/api/security-enhanced",     securityEnhancedRoutes);
app.use("/api/selfie-capture",        selfieCaptureRoutes);
app.use("/api/predictive-analytics",  predictiveAnalyticsRoutes);
app.use("/api/stripe-enhanced",       stripeEnhancedRoutes);
app.use("/api/paypal",                paypalRoutes);
app.use("/api/webhooks",              webhooksRoutes);
app.use("/api/public-api",            publicApiRoutes);
app.use("/api/partner-marketplace",   partnerMarketplaceRoutes);
app.use("/api/pricing",               pricingRoutes);
app.use("/api/reports",               reportsRoutes);
app.use("/api/reseller",              resellerRoutes);
app.use("/api/seller-reseller",       sellerResellerRoutes);
app.use("/api/repair-shop",           repairShopRoutes);
app.use("/api/white-label",           whiteLabelRoutes);
app.use("/api/ads-enhanced",          adsEnhancedRoutes);
app.use("/api/rewards",               rewardsRoutes);
app.use("/api/enterprise",            enterpriseRoutes);
app.use("/api/regulatory",            regulatoryRoutes);
app.use("/api/configuration",         configurationManagementRoutes);
app.use("/api/security",              securityRoutes);
app.use("/api/offline",               offlineRoutes);
app.use("/api/infrastructure",       infrastructureRoutes);
app.use("/api/network-effects",       networkEffectsRoutes);
app.use("/api/ai-advanced",           aiAdvancedRoutes);
app.use("/api/analytics",             analyticsRoutes);
app.use("/api/i18n",                  i18nRoutes);
app.use("/api/enterprise-advanced",   enterpriseAdvancedRoutes);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = initIO(server, allowedOrigins);
io.use(authenticateSocket);

io.on("connection", (socket) => {
  const { userId, role } = socket.data;
  socket.join(`user:${userId}`);
  if (role === "admin") socket.join("role:admin");

  socket.on("subscribe_device", async (imei: unknown) => {
    if (typeof imei !== "string" || !/^\d{15,17}$/.test(imei)) return;
    // Privileged roles may monitor any device (recovery/law-enforcement workflows).
    if (role === "admin" || role === "super_admin" || role === "law_enforcement") {
      socket.join(`device:${imei}`);
      return;
    }
    try {
      const { Device } = await import("./db/index.js");
      const device = await Device.findOne({ imei }).select("owner").lean() as { owner?: unknown } | null;
      if (device && String(device.owner ?? "") === String(userId)) {
        socket.join(`device:${imei}`);
      }
      // Silently no-op on mismatch/not-found — don't leak device existence to the client.
    } catch (err) {
      logger.warn({ err, imei }, "subscribe_device ownership check failed");
    }
  });

  // Admin map: subscribe to ALL device updates via role:admin room
  // (track.js already emits to "role:admin" for every ping)
  socket.on("subscribe_all_admin", () => {
    if (role === "admin") {
      socket.join("role:admin"); // already joined — no-op, but makes intent clear
    }
  });

  socket.on("disconnect", () => {
    if (!isProd) console.log(`Socket disconnected: ${socket.id}`);
  });

  if (!isProd) console.log(`Socket connected: ${socket.id} user:${userId} role:${role}`);
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

// ── DB connection with retry ──────────────────────────────────────────────────
async function connectWithRetry(retries: number = 5, delay: number = 3000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      await connectDB();
      return;
    } catch (err) {
      if (i === retries) throw err;
      console.warn(`MongoDB connection failed (attempt ${i}/${retries}) — retrying in ${delay}ms…`);
      await new Promise<void>(resolve => setTimeout(resolve, delay));
    }
  }
}

// ── Graceful shutdown + uncaught error handlers ───────────────────────────────
process.on("unhandledRejection", (reason: unknown) => {
  console.error("[UnhandledRejection]", reason);
});
process.on("uncaughtException", (err: Error) => {
  console.error("[UncaughtException]", err);
  process.exit(1);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  server.close(() => process.exit(0));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = ["JWT_SECRET", "MONGO_URI"];
const missing: string[] = [];
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) missing.push(key);
}
if (missing.length > 0) {
  console.error(`[startup] Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const PORT: number = parseInt(process.env.PORT || "4000", 10);
connectWithRetry().then(async () => {
  seedPlans();
  startCron();
  // Background infra (queues/Redis, security middleware, alert monitoring) is NOT
  // required to serve HTTP. A failure here must be logged and tolerated, never
  // crash the process — otherwise the port never binds and the whole deploy fails.
  try { await initializeQueues(); }            catch (e) { console.error("[startup] queue init failed (continuing without background queues):", e); }
  try { await initializeSecurityMiddleware(); } catch (e) { console.error("[startup] security middleware init failed (continuing):", e); }
  try { startAlertMonitoring(); }              catch (e) { console.error("[startup] alert monitoring failed (continuing):", e); }
  server.listen(PORT, () => console.log(`SimTrace API → port ${PORT} [${isProd ? "production" : "development"}]`));
}).catch(err => {
  console.error("Failed to connect to MongoDB after retries:", err);
  process.exit(1);
});
