import { parseBonusAmount } from "../utils/referralGuards.js"; // STAGE 4A (G9)
import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import protectAccount from "../middleware/protectAccount.js";
import { authorize, requirePermission, hasPermission, PERMISSIONS } from "../middleware/role.js";
import { ASSIGNABLE_PERMISSIONS, PERM_LABELS, ROLE_PERMISSIONS, getEffectivePermissions } from "../config/roles.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate, validateObjectId, validateQuery, userListQuerySchema, carListQuerySchema, paymentListQuerySchema, reviewListQuerySchema, chatListQuerySchema, messageListQuerySchema } from "../middleware/validate.js";
import { auditLog } from "../middleware/auditLog.js";
import bcrypt from "bcryptjs";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getIO } from "../utils/io.js";
import inspectionGovernanceRoutes from "./adminInspectionGovernanceRoutes.js";

import User from "../models/User.js";
import UserAuth from "../models/UserAuth.js";
import { cacheMiddleware, CACHE_TTL } from "../utils/cache.js";
import { invalidatePublicListingCaches } from "../utils/publicListingCache.js";
import Car from "../models/Car.js";
import PlatformConfig from "../models/PlatformConfig.js";
import AuditLog from "../models/AuditLog.js";
import { auditAfterCommit } from "../utils/auditAfterCommit.js";
import { syncLegacyApproval } from "../services/privateSellerCapability.service.js"; // Phase 13E
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Ad from "../models/Ad.js";
import AdminAlert from "../models/AdminAlert.js";
import * as maintenanceControl from "../services/maintenanceControl.service.js";
import Referral from "../models/Referral.js";
import { listAdminReviews, moderateReview, deleteReview as deleteDealerReview } from "../services/review.service.js";
import Transaction from "../models/Transaction.js";
import Chat from "../models/Chat.js";
import MarketData from "../models/MarketData.js";
import SupportTicket from "../models/SupportTicket.js";
import FraudDetection from "../models/FraudDetection.js";
import DealerVerification from "../models/DealerVerification.js";
import { stkPush } from "../services/mpesaService.js";
import { sendNotification } from "../services/notification.service.js";
import { getDealerPlans } from "../services/dealerSubscription.service.js";
import { getSupabase } from "../utils/supabase.js";
import { buildAdminPaymentView } from "../utils/adminPaymentView.js";
import { inspectAccountDeletion, accountDeletionBlockedBody } from "../utils/accountDeletionGuard.js"; // Phase 14.9
import RefreshToken from "../models/RefreshToken.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "../services/communicationEvents.service.js";
import { getEscrowRules, getActiveEscrowAccounts, saveEscrowAccount, removeEscrowAccount } from "../services/escrowConfiguration.service.js";
import { setSellerEscrowCapability, getSellerEscrowCapabilityStatus } from "../services/escrowCapability.service.js";
import { setEscrowCapabilitySchema } from "../validation/escrow.schema.js";
import { moderationBlockedReason } from "../utils/carModerationGuard.js";
import { isOwnerUser, isOwnerEmail } from "../config/owners.js";
import { normalizeNavigation, validateNavigationInput } from "../utils/navigationConfig.js";
import { presentMessage } from "../services/chatAttachments.js";
import {
  getOnboardingPolicy,
  updateOnboardingPolicy,
  publicView as onboardingPublicView,
  publicRegistrationView,
  OnboardingPolicyError,
  POLICY_FIELDS,
  requireDecisionAuthority,
} from "../services/onboardingPolicy.service.js"; // STAGE 5


// Routes that only admin/superadmin can access
const adminOrSuper = authorize("admin", "superadmin");

// All staff roles (departmental admins)
const staffRole = authorize(
  "admin",
  "superadmin",
  "marketing",
  "technical_support",
  "hr",
  "accounts",
  "escrow_officer",
  "ad_manager",
  "moderator",
);

const router = express.Router();

// System-owner governance boundary: ordinary superadmins may operate the platform,
// but only a verified active platform owner may create staff, change staff roles,
// or grant/revoke staff permissions. Owner identity is resolved by the canonical
// owner registry; a client-supplied role or email alone is never sufficient.
const STAFF_GOVERNANCE_ROLES = Object.freeze(["admin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator", "ghost_checker"]);
const CREATABLE_STAFF_ROLES = Object.freeze(["admin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"]);

const systemOwnerOnly = (req, res, next) => {
  if (!isOwnerUser(req.user)) {
    return res.status(403).json({ success: false, code: "SYSTEM_OWNER_REQUIRED", message: "Only a verified active System Owner may manage staff roles and permissions." });
  }
  return next();
};

// ── Auto-audit all state-changing admin requests ────────────
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return auditLog(`admin.${req.method.toLowerCase()}`)(req, res, () => {
      res.once("finish", () => {
        if (res.statusCode < 500) {
          getIO()?.to("admins").emit("controlPlaneUpdated", { type:"adminMutation", method:req.method, path:req.path, statusCode:res.statusCode, at:new Date().toISOString() });
        }
      });
      next();
    });
  }
  next();
});

// Public shell config. The app layout uses this to apply branding before a
// visitor is logged in; admin writes and all sensitive settings stay protected.
router.get(
  "/public/config",
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne()
      .select(
        "platformName galleryTitle gallerySubtitle fontDisplay fontBody fontSizePct baseFontSize lineHeight branding allowGuestBrowsing heroCarIds heroFeaturedMode heroPresentation heroCardContent navigation",
      )
      .lean();

    if (!config) {
      // This is a public GET used by the unauthenticated application shell.
      // Return a safe in-memory default instead of creating a singleton record:
      // read requests must not require write privileges or mutate the database.
      config = { navigation: {} };
    }

    // Serve only the normalised, registry-bound navigation state. Whatever
    // is stored, the public client never receives unknown or malformed data.
    config = { ...config, navigation: normalizeNavigation(config.navigation) };

    res.json({ success: true, config });
  }),
);

// STAGE 5: public, non-sensitive registration modes so the signup UI renders the right form.
// Only the two registration modes and a trust flag are exposed; never authorities or actor ids.
router.get(
  "/public/onboarding-policy",
  asyncHandler(async (req, res) => {
    const result = await getOnboardingPolicy();
    res.set("Cache-Control", "no-store");
    res.json({ success: true, policy: publicRegistrationView(result) });
  }),
);

// =============================
// 🔒 APPLY GLOBAL ADMIN GUARD
// =============================
router.use(protect, adminOnly);

// Defense-in-depth permission routing for the high-impact admin control
// plane. Route-local adminOrSuper checks remain canonical for operations
// that are intentionally superadmin-only; this prevents a departmental
// staff role from reaching unrelated finance, platform, user, or data
// mutation surfaces merely because it is a member of STAFF_ROLES.
router.use((req, res, next) => {
  // STAGE 5F.5 (D-14): infer the permission from the route shape only. Dynamic ids used to take part in the match, so a UUID
  // group beginning "ad" (about 1 id in 50) was read as the "ads" family and a finance user was refused with
  // "Missing permission: manage_ads" on /dealers/<id>/package.
  const path = String(req.path || "")
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
  let permission = null;

  if (/\bescrow\b/.test(path)) {
    permission = PERMISSIONS.MANAGE_ESCROWS;
  } else if (/\b(payments?|transactions?|ledger|reconciliation|refund|payout)/.test(path)) {
    permission = PERMISSIONS.MANAGE_PAYMENTS;
  } else if (/\b(cars?|listings?|auctions?|bids?)/.test(path)) {
    permission = path.includes("auction") || path.includes("bid")
      ? PERMISSIONS.MANAGE_AUCTIONS
      : PERMISSIONS.MANAGE_CARS;
  } else if (/\b(staff|users?|dealer-verifications?)/.test(path)) {
    permission = path.includes("staff") ? PERMISSIONS.MANAGE_STAFF : PERMISSIONS.MANAGE_USERS;
  } else if (/\b(ads?|campaigns?)\b/.test(path)) {
    permission = PERMISSIONS.MANAGE_ADS;
  } else if (/\b(inspection|ntsa|inspector)/.test(path)) {
    permission = PERMISSIONS.MANAGE_INSPECTIONS;
  } else if (/\b(support|chat)/.test(path)) {
    // The admin UI maps the chat-moderation page to MANAGE_MODERATION (src/utils/permissions.ts "/admin/chats"); support staff
    // hold MANAGE_SUPPORT. Either is sufficient (any-of) so the guard and the UI agree.
    permission = [PERMISSIONS.MANAGE_SUPPORT, PERMISSIONS.MANAGE_MODERATION];
  } else if (/\b(security|audit|logs?)/.test(path)) {
    permission = PERMISSIONS.VIEW_LOGS;
  } else if (/\b(analytics|reports?|market-data)/.test(path)) {
    permission = PERMISSIONS.VIEW_ANALYTICS;
  } else if (/\b(settings?|config|cms|theme|branding|platform)/.test(path)) {
    permission = PERMISSIONS.MANAGE_SETTINGS;
  }

  if (!permission) return next();
  // STAGE 5F.5 (D-6): fail CLOSED. A matched path family whose permission name did not resolve used to fall through to "allow".
  const anyOf = Array.isArray(permission) ? permission : [permission];
  if (!anyOf.length || anyOf.some((p) => typeof p !== "string")) {
    return res.status(403).json({ success: false, code: "PERMISSION_NOT_CONFIGURED", message: "Access denied" });
  }
  if (anyOf.length > 1 && anyOf.some((p) => hasPermission(req.user, p))) return next();
  return requirePermission(anyOf[0])(req, res, next);
});

// Provider-network governance (path contains "inspection" => MANAGE_INSPECTIONS applies above).
router.use("/inspection-governance", inspectionGovernanceRoutes);

// =============================
// ⚙️ SAFE PAGINATION HELPER
// =============================
const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100); // cap at 100
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 📊 DASHBOARD STATS (FULL AGGREGATION)
// =============================
router.get(
  "/stats",
  staffRole,
  cacheMiddleware(CACHE_TTL.STATS, () => "cache:GET:/api/admin/stats"),
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // STAGE 5F.5 (D-8): one unreadable source used to reject Promise.all and blank EVERY dashboard tile (the hosted-database
    // symptom). Each metric is now settled on its own: a source that cannot be read is `null` and named in `unavailable`;
    // a real zero stays 0. Nothing is defaulted to 0.
    const metricNames = ["totalUsers", "totalCars", "activeAuctions", "totalEscrows", "totalDealers", "verifiedDealers", "bidsTodayCount", "totalPayments", "pendingDealers", "pendingCars", "openEscrows", "disputedEscrows", "revenueAgg", "totalBidsAll", "totalFavorites", "pendingReviews", "activeAlerts", "individualSellers", "carsSold", "pendingReports", "verificationQueue", "supportQueue", "fraudAlerts", "activeListings"];
    const settledMetrics = await Promise.allSettled([
      User.countDocuments(),                                                          // totalUsers
      Car.countDocuments(),                                                           // totalCars
      Car.countDocuments({ auctionStatus: "live" }),                                  // activeAuctions
      Escrow.countDocuments(),                                                        // totalEscrows
      User.countDocuments({ role: "dealer" }),                                        // totalDealers
      User.countDocuments({ role: "dealer", status: "approved" }),                    // verifiedDealers  (STAGE 5A: users has no `approved` column; status is the account gate)
      Bid.countDocuments({ createdAt: { $gte: today } }),                             // bidsTodayCount
      Payment.countDocuments({ status: "success" }),                                  // totalPayments
      User.countDocuments({ role: "dealer", status: "pending" }),                     // pendingDealers
      Car.countDocuments({ status: "pending" }),                                      // pendingCars
      Escrow.countDocuments({ status: { $in: ["funded", "vehicle_confirmed", "delivered"] } }),                                      // openEscrows
      Escrow.countDocuments({ status: "disputed" }),                                  // disputedEscrows
      Escrow.aggregate([{ $match: { status: "released" } }, { $group: { _id: null, total: { $sum: "$commission" } } }]), // revenueAgg
      Bid.countDocuments(),                                                           // totalBidsAll
      Car.aggregate([{ $group: { _id: null, total: { $sum: "$favoritesCount" } } }]),  // totalFavorites
      // Fixed from a pre-existing bug: these two positions were
      // pointed at the wrong models entirely (pendingReviews was
      // counting pending BIDS; pendingReports was counting unread
      // Contacts — and the `reports` table it should logically
      // reference is actually a generated-analytics-file table with
      // no "pending" concept, so `disputes` is the real "reports
      // needing admin action" source instead).
      listAdminReviews({ status: "pending", page: 1, limit: 1 }).then((r) => r.total), // pendingReviews
      AdminAlert.countDocuments({ read: false }),                                      // activeAlerts
      User.countDocuments({ role: "individual_seller" }),                              // individualSellers
      Car.countDocuments({ status: "sold" }),                                          // carsSold
      Escrow.countDocuments({ status: "disputed" }),          // pendingReports
      DealerVerification.countDocuments({ verificationStatus: { $in: ["pending", "under_review"] } }), // verificationQueue
      SupportTicket.countDocuments({ status: { $in: ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "escalated"] } }), // supportQueue
      FraudDetection.countDocuments({ severity: { $in: ["critical", "high"] }, status: { $nin: ["dismissed", "action_taken"] } }), // fraudAlerts
      Car.countDocuments({ status: "available" }),                                    // activeListings
    ]);
    const unavailable = metricNames.filter((_, i) => settledMetrics[i].status !== "fulfilled");
    const [totalUsers, totalCars, activeAuctions, totalEscrows, totalDealers, verifiedDealers, bidsTodayCount, totalPayments, pendingDealers, pendingCars, openEscrows, disputedEscrows, revenueAgg, totalBidsAll, totalFavorites, pendingReviews, activeAlerts, individualSellers, carsSold, pendingReports, verificationQueue, supportQueue, fraudAlerts, activeListings] = settledMetrics.map((r) => (r.status === "fulfilled" ? r.value : null));

    const totalRevenue = revenueAgg === null ? null : (revenueAgg[0]?.total || 0);
    const totalFavs = totalFavorites === null ? null : (totalFavorites[0]?.total || 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCars,
        activeAuctions,
        totalEscrows,
        totalRevenue,
        totalDealers,
        verifiedDealers,
        bidsToday: bidsTodayCount,
        totalPayments,
        pendingDealers,
        pendingCars,
        openEscrows,
        // Keep the explicit domain name for new consumers while retaining the
        // historical `alerts` alias for existing dashboard clients.
        disputedEscrows,
        alerts: disputedEscrows,
        totalBids: totalBidsAll,
        totalFavorites: totalFavs,
        pendingReviews,
        activeAlerts,
        individualSellers,
          carsSold,
        pendingReports,
        verificationQueue,
        supportQueue,
        fraudAlerts,
        activeListings,
      },
      unavailable,
    });
  }),
);

// =============================
// 👥 GET USERS (PAGINATED + FILTER + SEARCH)
// =============================
router.get(
  "/users",
  validateQuery(userListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.banned === "true") filter.isBanned = true;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.seller === "true") {
      filter.role = { $in: ["dealer", "individual_seller"] };
    }
    if (req.query.pendingApproval === "true") {
      // STAGE 5F.5 (D-9): the "Pending dealers" tile counts role=dealer, so a dealer-scoped queue link must list exactly those rows;
      // without an explicit role the queue still covers both seller kinds, as before.
      if (!(req.query.role === "dealer" || req.query.role === "individual_seller")) filter.role = { $in: ["dealer", "individual_seller"] };
      filter.status = "pending"; // STAGE 5A: users.approved does not exist; status is the account gate
    }

    // 🔎 SEARCH (name/email)
    // H-9 FIX: Escape user input to prevent ReDoS via $regex patterns.
    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }

    // H-2 FIX: Use field whitelist instead of select("-password") which leaks
    // internal fields like bankAccount, mpesaBusiness, paymentDetails, etc.
    const ADMIN_USER_FIELDS = "_id name email role phone avatar status isBanned location dealerRating bio businessName createdAt lastLoginAt emailVerified phoneVerified dealerPackage subscriptionStatus";

    const [users, total, summaryTotal, summaryAdmins, summaryDealers, summaryBanned, summaryPending] = await Promise.all([
      User.find(filter).select(ADMIN_USER_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
      User.countDocuments({}),
      User.countDocuments({ role: { $in: ["admin", "superadmin", "webhoist"] } }),
      User.countDocuments({ role: "dealer" }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ role: { $in: ["dealer", "individual_seller"] }, status: "pending" }),
    ]);

    // STAGE 5A: `approved` / `verificationStatus` / `businessType` / `lastLogin` are not columns of `users` (selecting them made this
    // endpoint fail with 500 on the real schema). The admin UI still reads `approved` and `verificationStatus`, so derive them
    // from the authoritative account gate, `status`.
    const decorated = users.map((u) => ({
      ...u,
      approved: u.status === "approved",
      verificationStatus: u.status === "approved" ? "verified" : u.status === "rejected" ? "rejected" : "pending",
      lastLogin: u.lastLoginAt ?? null,
    }));

    res.json({
      success: true,
      users: decorated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      // Authoritative global counts; do not infer these from the current page or filters.
      summary: {
        totalUsers: summaryTotal,
        admins: summaryAdmins,
        dealers: summaryDealers,
        banned: summaryBanned,
        pendingApproval: summaryPending,
      },
    });
  }),
);

// =============================
// 🚫 TOGGLE BAN USER
// =============================
router.post(
  "/users/:id/toggle-ban",
  adminOrSuper,
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🚫 prevent self-ban
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot ban yourself",
      });
    }

    // Phase 15: rank boundary. protectAccount only shields platform-OWNER accounts, so an ordinary `admin` could ban a
    // superadmin (and another admin) and lock them out. Banning follows the same rule as deactivation: a superadmin target is
    // only reachable by the platform owner, and an admin target needs a superadmin (or the owner).
    const requesterIsOwner = isOwnerEmail(req.user?.email);
    if ((user.role === "superadmin" && !requesterIsOwner) || (user.role === "admin" && req.user.role !== "superadmin" && !requesterIsOwner)) {
      await auditAfterCommit({
        action: "User ban refused: insufficient rank",
        admin: req.user.name || req.user.email,
        adminId: req.user.id,
        details: { outcome: "refused", targetUserId: String(user._id), targetRole: user.role },
      });
      return res.status(403).json({ success: false, code: "ADMIN_RANK_REQUIRED", message: "You do not have sufficient rank to change this account's ban status." });
    }

    // Phase 15: the toggle was not idempotent (a stale screen or a double click inverted the intended action), returned no
    // resulting state and wrote no audit record. An optional explicit `banned` boolean now sets the state idempotently; the
    // response always carries the server-confirmed `isBanned`, and every change is audited (ids only).
    const wanted = typeof req.body?.banned === "boolean" ? req.body.banned : !user.isBanned;
    const changed = wanted !== !!user.isBanned;
    if (changed) {
      user.isBanned = wanted;
      await user.save();
      if (wanted) {
        await UserAuth.findOneAndUpdate({ user: req.params.id }, { $inc: { tokenVersion: 1 } });
        await RefreshToken.revokeAllForUser(req.params.id, "account_banned");
        invalidateUserCache(req.params.id);
      } else {
        invalidateUserCache(req.params.id);
      }
      await auditAfterCommit({
        action: wanted ? "User banned" : "User unbanned",
        admin: req.user.name || req.user.email,
        adminId: req.user.id,
        details: { outcome: "success", targetUserId: String(user._id), targetRole: user.role },
      });
    }

    res.json({
      success: true,
      isBanned: !!user.isBanned,
      changed,
      message: user.isBanned ? "User banned" : "User unbanned",
    });
  }),
);

// =============================
// 🧑‍💼 APPROVE DEALER
// =============================
router.post(
  "/users/:id/approve-dealer",
  adminOrSuper,
  requireDecisionAuthority("dealer"), // STAGE 5: owner-controlled decision authority
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!["dealer", "individual_seller"].includes(user.role)) {
      return res.status(400).json({ success: false, code: "NOT_A_SELLER_ACCOUNT", message: "Only dealer and seller accounts can be approved here." });
    }
    // STAGE 5A: `users.approved` / `users.verification_status` do not exist (this handler failed with 500 on the real schema and
    // never approved anyone). Approval is: the atomic verification RPC for dealers (dealers.approved, dealer_verifications) plus
    // the account gate users.status = "approved" for dealers and private sellers alike.
    if (user.role === "dealer") {
      const { error: rpcError } = await getSupabase().rpc("kayad_apply_dealer_verification_atomic", {
        p_user: String(req.params.id),
        p_action: "approve",
        p_admin: String(req.user.id),
        p_reason: null,
      });
      if (rpcError) throw rpcError;
    }
    // 13F: sync the authoritative capability row FIRST so a database failure aborts before users.status changes and the
    // response can state the real capability outcome (a suspended/revoked seller is not reinstated by this legacy endpoint).
    const legacySync = user.role === "individual_seller" ? await syncLegacyApproval(req.params.id, req.user.id) : null;
    // Phase 13I: a suspended/revoked private seller is NOT approved by this legacy path. Previously the handler still stamped
    // users.status/dealerApprovedAt and told the seller "Your seller account has been approved" (e-mail/SMS/WhatsApp/in-app) while the
    // authoritative capability row stayed restricted. Refuse before ANY side effect; reinstatement runs through the review workflow
    // (PATCH /api/private-seller-capability/admin/:userId/decision), which restores only the listings the policy hid.
    if (legacySync && ["suspended", "revoked"].includes(legacySync.status)) {
      await auditAfterCommit({
        action: "Dealer decision: approve-dealer refused (private seller restricted)",
        admin: req.user.name || req.user.email,
        adminId: req.user.id,
        details: { outcome: "refused", targetUserId: String(user._id), sellerCapabilityStatus: legacySync.status },
      });
      return res.status(409).json({
        success: false,
        code: "SELLER_CAPABILITY_RESTRICTED",
        sellerCapabilityStatus: legacySync.status,
        message: `This private seller is ${legacySync.status}. Nothing was changed. Use Private Seller Applications to reinstate access.`,
      });
    }
    await User.findByIdAndUpdate(req.params.id, { status: "approved", dealerApprovedAt: new Date() });

    await auditAfterCommit({
      action: "Dealer decision: approve-dealer",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { outcome: "success", targetUserId: String(user._id) },
    });

    emitCommunication({
      userId: user._id,
      eventType: COMMUNICATION_EVENTS.DEALER_VERIFIED,
      title: "Dealer account approved",
      message: "Your dealer account has been approved. You can now list vehicles and access dealer features.",
      channels: ["in_app", "email", "sms", "whatsapp"],
      metadata: { userId: user._id },
    }).catch((e) => console.warn("⚠️ Dealer approval communication failed:", e.message));

    sendNotification({
      userId: user._id,
      title: "Seller Account Approved",
      message: "Your seller account has been approved. You can now list vehicles and access seller features.",
      type: "info",
    }).catch((e) => console.warn("⚠️ Admin notification failed:", e.message));

res.json({
      success: true,
      message: "Seller approved",
      ...(legacySync ? { sellerCapabilityStatus: legacySync.status } : {}),
    });
  }),
);

// =============================
// 💼 UPDATE SELLER FINANCIAL SETTINGS
// =============================
router.put(
  "/users/:id/seller-settings",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowed = ["commission", "waiver", "discount"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    }

    // Phase 15: no migration defines users.commission / users.waiver / users.discount, so on the real schema this save fails
    // with a raw "Could not find the 'commission' column of 'users' in the schema cache" 500. Per-seller commission terms are a
    // financial policy, so the schema is NOT invented here; the endpoint now says plainly that nothing was stored.
    try {
      await user.save();
    } catch (error) {
      if (/schema cache|PGRST204|column .* does not exist|42703/i.test(`${error?.code || ""} ${error?.message || ""}`)) {
        return res.status(503).json({
          success: false,
          code: "SELLER_SETTINGS_NOT_PERSISTED",
          message: "Per-seller commission, waiver and discount settings are not backed by the database schema yet. Nothing was saved.",
        });
      }
      throw error;
    }

    await auditAfterCommit({
      action: `Seller settings updated for ${user.name || user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { userId: user._id, changes: req.body },
    });

    res.json({
      success: true,
      message: "Seller settings updated",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        commission: user.commission,
        waiver: user.waiver,
        discount: user.discount,
        approved: user.status === "approved",
        isBanned: user.isBanned,
        dealerRating: user.dealerRating,
      },
    });
  }),
);

// =============================
// 🚗 GET CARS (PAGINATED + FILTER + SEARCH)
// =============================
router.get(
  "/cars",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.sold === "true") filter.sold = true;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.auctionStatus) filter.auctionStatus = req.query.auctionStatus;

    // 🔎 SEARCH (title)
    // H-9 FIX: Escape user input to prevent ReDoS.
    if (req.query.search) {
      filter.title = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
    }

    const [cars, total] = await Promise.all([
      Car.find(filter).populate("dealer", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      Car.countDocuments(filter),
    ]);

    res.json({
      success: true,
      cars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

// =============================
// ❌ DELETE CAR (HARD DELETE)
// =============================
router.delete(
  "/cars/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    await Car.softDelete(car._id, req.user.id);
    await invalidatePublicListingCaches(); // Phase C.1: deleted listing must leave every public cache now
    if (car.dealer) {
      await User.findByIdAndUpdate(car.dealer, {
        $inc: { listingCount: -1 },
      });
      await User.updateOne({ _id: car.dealer }, [
        {
          $set: {
            listingCount: { $max: ["$listingCount", 0] },
          },
        },
      ]).catch((e) => console.warn("⚠️ Dealer listing count update failed:", e.message));
    }

    res.json({
      success: true,
      message: "Car deleted",
    });
  }),
);

// =============================
// ✅ TOGGLE NTSA VERIFICATION
// =============================
router.post(
  "/cars/:id/verify",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { ntsaVerified, dutyStatus, logbookVerified } = req.body;
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    if (ntsaVerified !== undefined) car.ntsaVerified = ntsaVerified;
    if (dutyStatus !== undefined) car.dutyStatus = dutyStatus;
    if (logbookVerified !== undefined) car.logbookVerified = logbookVerified;
    if (req.body.ntsaVerified || req.body.logbookVerified) car.verifiedBy = req.user.id;
    await car.save();
    res.json({ success: true, car });
  }),
);

// =============================
// ✅ APPROVE / REJECT CAR LISTING (MODERATION QUEUE)
// =============================
router.post(
  "/cars/:id/moderate",
  adminOrSuper,
  requireDecisionAuthority("listing"), // STAGE 5: owner-controlled decision authority
  validateObjectId,
  asyncHandler(async (req, res) => {
    // STAGE 5A (Gate E): the negative decision HIDES the listing. The database status constraint
    // (cars_status_check: available/sold/pending/reserved/hidden/draft) has no `rejected` value until owner decision D3 is
    // taken, so writing it failed with a 500 and never changed the listing. "reject" is kept as a backward-compatible alias
    // of "hide"; every response, notification and audit entry says what really happened (hidden, not publicly visible).
    const { adminNote } = req.body;
    const requested = req.body.action;
    if (!["approve", "hide", "reject"].includes(requested)) {
      return res.status(400).json({ success: false, code: "INVALID_MODERATION_ACTION", message: "Action must be 'approve' or 'hide'" });
    }
    const action = requested === "approve" ? "approve" : "hide";

    const car = await Car.findById(req.params.id).populate("dealer", "email phone name");
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    // STAGE 7 ADMIN/OPERATIONS PRIVILEGE-BOUNDARY FIX: see
    // backend/utils/carModerationGuard.js for the full rationale. A sold car
    // is no longer eligible for listing moderation.
    const blockedReason = moderationBlockedReason(car);
    if (blockedReason) {
      return res.status(409).json({ success: false, code: "LISTING_MODERATION_BLOCKED", message: blockedReason });
    }

    // STAGE 5A (real-DB defect): the car was loaded with a populated dealer object, and car.save() wrote that object back
    // into the uuid column (cars.dealer_id), so every single-listing decision returned 500. Update only the status.
    const newStatus = action === "approve" ? "available" : "hidden";
    await Car.findByIdAndUpdate(req.params.id, { status: newStatus });
    car.status = newStatus;

    const dealer = car.dealer;
    const listingTitle = car.title || car.brand + " " + (car.model || "");

    if (dealer) {
      if (action === "approve") {
        await sendNotification({
          userId: (typeof dealer === "string" ? dealer : dealer?.id ?? (typeof dealer?._id === "string" ? dealer._id : null)),
          title: "Listing Approved",
          message: `Your listing "${listingTitle}" has been approved and is now live on the marketplace.`,
          type: "info",
          email: dealer.email,
        });
      } else {
        await sendNotification({
          userId: (typeof dealer === "string" ? dealer : dealer?.id ?? (typeof dealer?._id === "string" ? dealer._id : null)),
          title: "Listing not approved",
          message: `Your listing "${listingTitle}" was not approved and is not publicly visible.${adminNote ? ` Reason: ${adminNote}` : ""}`,
          type: "system",
          email: dealer.email,
        });
      }
    }

    await auditAfterCommit({
      action: `Listing decision: ${action === "approve" ? "approved" : "hidden"} — ${listingTitle}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { carId: car._id, action, requestedAction: requested, resultingStatus: car.status, adminNote },
    });

    res.json({
      success: true,
      action,
      status: car.status,
      message: action === "approve" ? "Listing approved and published." : "Listing hidden. It is not publicly visible.",
      car,
    });
  }),
);

// =============================
// ⚙️ PLATFORM CONFIG
// =============================

// GET CONFIG
router.get(
  "/config",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne().lean();
    if (!config) {
      config = await PlatformConfig.create({});
    }
    // Never return payment credentials to the browser. The settings UI receives
    // presence flags and may submit blank values to retain the stored secret.
    const safeConfig = { ...config };
    if (safeConfig.daraja && typeof safeConfig.daraja === "object") {
      safeConfig.daraja = {
        ...safeConfig.daraja,
        consumerKey: "",
        consumerSecret: "",
        passkey: "",
        hasConsumerKey: Boolean(config.daraja.consumerKey),
        hasConsumerSecret: Boolean(config.daraja.consumerSecret),
        hasPasskey: Boolean(config.daraja.passkey),
      };
    }
    res.set("Cache-Control", "no-store");
    res.json({ success: true, config: safeConfig });
  }),
);

// UPDATE CONFIG
router.put(
  "/config",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const allowed = [
      "platformName",
      "supportEmail",
      "supportPhone",
      "galleryTitle",
      "gallerySubtitle",
      "dealerCommission",
      "bidCommitmentPct",
      "escrowReleaseDays",
      "maxListingImages",
      "allowGuestBrowsing",
      "requireDealerApproval",
      "dealerTrialDays",
      "waivePayments",
      "freeMarket",
      "fontDisplay",
      "fontBody",
      "fontSizePct",
      "baseFontSize",
      "lineHeight",
      "listingFee",
      "auctionRegistrationFee",
      "ghostCheckFee",
      "commissionPercentage",
      "platformVat",
      "buyerPremiumPct",
      "activePromos",
      "daraja",
      "bank",
      "reconciliation",
      "branding",
      "heroCarIds",
      "heroFeaturedMode",
      "heroPresentation",
      "heroCardContent",
    ];

    // Validate user-editable general settings before persistence. Reject invalid
    // input rather than silently saving values that break runtime assumptions.
    const body = req.body || {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (body.supportEmail !== undefined && body.supportEmail !== "" && !emailPattern.test(String(body.supportEmail))) {
      return res.status(400).json({ success: false, message: "Enter a valid support email address." });
    }
    if (body.platformName !== undefined && (typeof body.platformName !== "string" || !body.platformName.trim() || body.platformName.length > 100)) {
      return res.status(400).json({ success: false, message: "Platform name must be 1–100 characters." });
    }
    const numericRules = {
      dealerCommission: [0, 50], bidCommitmentPct: [0, 100], escrowReleaseDays: [1, 30],
      maxListingImages: [1, 20], dealerTrialDays: [0, 365], fontSizePct: [50, 200],
    };
    for (const [key, [min, max]] of Object.entries(numericRules)) {
      if (body[key] !== undefined && (!Number.isFinite(Number(body[key])) || Number(body[key]) < min || Number(body[key]) > max)) {
        return res.status(400).json({ success: false, message: `${key} must be between ${min} and ${max}.` });
      }
    }
    if (body.bank !== undefined) {
      if (!body.bank || typeof body.bank !== "object" || Array.isArray(body.bank)) {
        return res.status(400).json({ success: false, message: "Invalid bank transfer settings." });
      }
      const reconciliationEmail = body.bank.reconciliationEmail;
      if (reconciliationEmail && !emailPattern.test(String(reconciliationEmail))) {
        return res.status(400).json({ success: false, message: "Enter a valid reconciliation email address." });
      }
    }
    if (body.daraja !== undefined) {
      if (!body.daraja || typeof body.daraja !== "object" || Array.isArray(body.daraja)) {
        return res.status(400).json({ success: false, message: "Invalid Daraja settings." });
      }
      if (body.daraja.environment !== undefined && !["sandbox", "production"].includes(body.daraja.environment)) {
        return res.status(400).json({ success: false, message: "Daraja environment must be sandbox or production." });
      }
      const currentDaraja = config.daraja?.toObject?.() || config.daraja || {};
      body.daraja = { ...body.daraja };
      for (const key of ["consumerKey", "consumerSecret", "passkey"]) {
        if (typeof body.daraja[key] !== "string" || body.daraja[key].trim() === "") {
          if (currentDaraja[key]) body.daraja[key] = currentDaraja[key];
          else delete body.daraja[key];
        }
      }
      delete body.daraja.hasConsumerKey;
      delete body.daraja.hasConsumerSecret;
      delete body.daraja.hasPasskey;
    }
    if (body.reconciliation !== undefined) {
      const r = body.reconciliation;
      if (!r || typeof r !== "object" || Array.isArray(r)) return res.status(400).json({ success: false, message: "Invalid reconciliation settings." });
      if (r.matchThresholdMins !== undefined && (!Number.isInteger(Number(r.matchThresholdMins)) || Number(r.matchThresholdMins) < 60 || Number(r.matchThresholdMins) > 10080)) {
        return res.status(400).json({ success: false, message: "Match threshold must be between 60 and 10080 minutes." });
      }
      if (r.schedule !== undefined && !["every hour", "every 6 hours", "every 12 hours", "daily"].includes(r.schedule)) {
        return res.status(400).json({ success: false, message: "Unsupported reconciliation schedule." });
      }
    }

    // Navigation presentation state: strictly validated and REPLACED (not
    // shallow-merged) so an item can be un-hidden. Same route, same guards,
    // same audit as every other platform setting.
    let navigationAudit = null;
    if (req.body.navigation !== undefined) {
      const checked = validateNavigationInput(req.body.navigation);
      if (!checked.ok) {
        return res.status(400).json({ success: false, message: "Invalid navigation configuration", errors: checked.errors });
      }
      navigationAudit = {
        before: normalizeNavigation(config.navigation?.toObject?.() || config.navigation),
        after: checked.value,
      };
      config.navigation = checked.value;
    }

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (typeof body[key] === "object" && body[key] !== null && !Array.isArray(body[key])) {
          config[key] = { ...(config[key]?.toObject?.() || config[key] || {}), ...body[key] };
        } else {
          config[key] = body[key];
        }
      }
    }

    await config.save();

    await auditAfterCommit({
      action: "Platform config updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    if (navigationAudit) {
      await auditAfterCommit({
        action: "Navigation configuration updated",
        admin: req.user.name || req.user.email,
        adminId: req.user.id,
        details: navigationAudit,
      });
    }

    const safeConfig = { ...(config.toObject?.() || config) };
    if (safeConfig.daraja && typeof safeConfig.daraja === "object") {
      safeConfig.daraja = {
        ...safeConfig.daraja,
        consumerKey: "",
        consumerSecret: "",
        passkey: "",
        hasConsumerKey: Boolean(safeConfig.daraja.consumerKey),
        hasConsumerSecret: Boolean(safeConfig.daraja.consumerSecret),
        hasPasskey: Boolean(safeConfig.daraja.passkey),
      };
    }
    res.set("Cache-Control", "no-store");
    res.json({ success: true, config: safeConfig });
  }),
);

// UPDATE PACKAGES (admin edits pricing/limits without code changes)
router.put(
  "/config/packages",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const { packages } = req.body;
    if (!Array.isArray(packages)) return res.status(400).json({ success: false, message: "packages must be an array" });

    config.packages = packages;
    await config.save();

    await auditAfterCommit({
      action: "Listing packages updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, config });
  }),
);

// =============================
// 📋 AUDIT LOG
// =============================

// GET AUDIT LOG
router.get(
  "/audit-log",
  staffRole,
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      success: true,
      entries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// APPEND AUDIT LOG ENTRY
router.post(
  "/audit-log",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const { action, details } = req.body || {};

    if (!action) {
      return res.status(400).json({ success: false, message: "Action is required" });
    }
    // STAGE 5F.5 (D-3): manual entries must be recognisable as manual and cannot impersonate system actions
    // (e.g. "update_staff_permissions"); action/details are bounded so the trail cannot be flooded or padded.
    if (typeof action !== "string" || !/^[A-Za-z0-9_.:-]{1,64}$/.test(action)) {
      return res.status(400).json({ success: false, message: "Action must be 1-64 characters: letters, digits, _ . : -" });
    }
    if (details != null && (typeof details !== "object" || Array.isArray(details) || JSON.stringify(details).length > 4096)) {
      return res.status(400).json({ success: false, message: "Details must be an object of at most 4096 characters" });
    }

    const entry = await AuditLog.create({
      action: `manual.${action}`,
      details: { ...(details || {}), manualEntry: true },
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, entry });
  }),
);

// =============================
// STAGE 5 — OWNER-CONTROLLED ONBOARDING POLICY
// View: admin / superadmin holding MANAGE_SETTINGS (path layer above). Change: platform owner only.
// =============================
const ownerOnly = (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist" && req.user?.emailVerified !== true) {
    // The owner is identified by email alone and is exempt from the generic verification gate; a policy
    // change additionally requires that this owner address has been VERIFIED (see launch checklist).
    return res.status(403).json({ success: false, code: "OWNER_EMAIL_UNVERIFIED", message: "Verify the owner email address before changing onboarding policy." });
  }
  if (req.user?.effectiveRole === "webhoist") return next();
  return res.status(403).json({
    success: false,
    code: "OWNER_ONLY",
    message: "Only the platform owner can change onboarding policy.",
  });
};

router.get(
  "/settings/onboarding",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const result = await getOnboardingPolicy({ fresh: true });
    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      policy: onboardingPublicView(result),
      options: POLICY_FIELDS,
      canChange: req.user?.effectiveRole === "webhoist" && req.user?.emailVerified === true,
      issues: result.issues,
    });
  }),
);

router.put(
  "/settings/onboarding",
  adminOrSuper,
  ownerOnly,
  asyncHandler(async (req, res) => {
    const { expectedRevision, ...changes } = req.body || {};
    const actor = { admin: req.user.name || req.user.email, adminId: req.user.id };
    try {
      const { before, after } = await updateOnboardingPolicy({
        changes,
        expectedRevision,
        actorId: req.user.id,
      });
      await auditAfterCommit({
        action: "Onboarding policy updated",
        ...actor,
        details: { outcome: "success", before, after },
      });
      res.json({ success: true, message: "Onboarding settings saved", policy: after });
    } catch (err) {
      if (err instanceof OnboardingPolicyError) {
        await auditAfterCommit({
          action: "Onboarding policy update rejected",
          ...actor,
          details: { outcome: "failed", code: err.code, attempted: Object.keys(changes) },
        });
        return res.status(err.status).json({
          success: false,
          code: err.code,
          message: err.message,
          errors: err.errors,
          current: err.current,
        });
      }
      throw err;
    }
  }),
);

// =============================
// 🚨 SYSTEM KILL-SWITCH (superadmin only)
// =============================
router.post(
  "/system/kill-switch",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    const SWITCHES = { auctions: "isAuctionActive", payments: "isPaymentsActive" };

    if (type === "full_maintenance") {
      // Platform-wide / scoped maintenance has its own audited control plane (scope, reason, step-up, owner-only):
      // /api/admin/system/maintenance. It cannot be started through this legacy endpoint.
      return res.status(400).json({ success: false, code: "MAINTENANCE_USE_SCOPED_CONTROL", message: "Maintenance is now started from the Panic Room maintenance control (scope, reason and confirmation required): POST /api/admin/system/maintenance/activate." });
    }
    if (!SWITCHES[type]) return res.status(400).json({ success: false, message: "Invalid kill-switch type" });

    const out = await maintenanceControl.setFeatureSwitch(SWITCHES[type], false);
    await auditAfterCommit({
      action: `Kill-switch activated: ${type}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, changed: out.changed, message: `${type} disabled globally` });
  }),
);

// =============================
// 🚨 SYSTEM RECOVERY (superadmin only) - feature switches only; ending maintenance is the control plane's job
// =============================
router.post(
  "/system/recover",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    const SWITCHES = { auctions: "isAuctionActive", payments: "isPaymentsActive" };

    if (type === "maintenance") {
      return res.status(400).json({ success: false, code: "MAINTENANCE_USE_SCOPED_CONTROL", message: "End maintenance with POST /api/admin/system/maintenance/recover (owner or authorised technical recovery, with step-up)." });
    }
    let out;
    if (type === "all") out = await maintenanceControl.recoverAllFeatureSwitches(); // feature switches only; an active maintenance is left to its own control
    else if (SWITCHES[type]) out = await maintenanceControl.setFeatureSwitch(SWITCHES[type], true);
    else return res.status(400).json({ success: false, message: "Invalid recovery type" });

    await auditAfterCommit({
      action: `System recovered: ${type}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, changed: out.changed, maintenanceActive: out.state.isMaintenanceMode, message: `${type} re-enabled globally` });
  }),
);

// =============================
// 🌐 DEALER SUBDOMAIN MANAGEMENT
// =============================
router.put(
  "/dealers/:id/subdomain",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { subdomain } = req.body;
    if (!subdomain) return res.status(400).json({ success: false, message: "Subdomain required" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.subdomain = subdomain.toLowerCase().trim();
    await user.save();

    await auditAfterCommit({
      action: `Subdomain ${subdomain}.kayad.space assigned to ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `Subdomain ${subdomain}.kayad.space is now live!` });
  }),
);

// =============================
// ✅ DEALER VERIFICATION (approve/reject)
// =============================
router.post(
  "/users/:id/verify-dealer",
  adminOrSuper,
  requireDecisionAuthority("dealer"), // STAGE 5: owner-controlled decision authority
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    const { data: result, error } = await getSupabase().rpc('kayad_apply_dealer_verification_atomic', {
      p_user: String(req.params.id),
      p_action: action,
      p_admin: String(req.user.id),
      p_reason: req.body.reason || null,
    });
    if (error) throw error;
    // STAGE 5: the RPC updates users.role/dealers/dealer_verifications but not the account gate, which left an
    // "approved" dealer's listings pending forever. Keep users.status consistent with the decision.
    await User.findByIdAndUpdate(req.params.id, { status: action === "approve" ? "approved" : "rejected" });

    await auditAfterCommit({
      action: `Dealer verification: ${action} for ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `Dealer ${action}d successfully.`, result });
  }),
);

// =============================
// 📱 TEST MPESA STK PUSH
// =============================
router.post(
  "/daraja/test",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const currentPlatformConfig = await PlatformConfig.findOne();
    if (process.env.NODE_ENV === "production" || currentPlatformConfig?.daraja?.environment === "production") {
      return res.status(403).json({ success: false, code: "MPESA_TEST_DISABLED_IN_PRODUCTION", message: "STK Push testing is disabled when the backend or Daraja environment is production. Use the Safaricom sandbox configuration." });
    }
    const { phone, amount } = req.body;

    if (!/^254[17]\d{8}$/.test(String(phone || "")) || !Number.isInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > 1000) {
      return res.status(400).json({ success: false, message: "Use a valid Kenyan mobile number and an integer test amount from KES 1 to 1,000." });
    }

    const result = await stkPush(phone, Number(amount));

    await auditAfterCommit({
      action: `Test M-Pesa STK Push to ${phone} for KES ${amount}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { checkoutId: result?.CheckoutRequestID },
    });

    res.json({
      success: true,
      message: "STK push sent",
      checkoutRequestID: result?.CheckoutRequestID,
    });
  }),
);

// =============================
// 🗑 DELETE USER (superadmin only — permanent removal of an account that has no retained history)
// =============================
// Phase 14.9: the previous handler soft-deleted the user's cars and then hard-deleted the user row. On the real schema that
// either failed with a foreign-key 500 after the cars were already gone, or cascade-deleted payments, payouts, auction
// registrations/deposit holds, dealerships and teams. The account is now inspected first (utils/accountDeletionGuard.js) and
// refused with a documented 409 when any retained record depends on it. There is no ownership-transfer / closure workflow,
// so dealer owners are always refused; deactivation (below) is the supported way to retire an account.
router.delete(
  "/users/:id",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin")
      return res.status(400).json({ success: false, message: "Cannot delete superadmin" });
    if (user._id.toString() === req.user.id)
      return res.status(400).json({ success: false, message: "Cannot delete yourself" });

    const targetId = String(user.id ?? user._id);
    const refuse = async (reasons, stage) => {
      await auditAfterCommit({
        action: "User deletion blocked",
        admin: req.user.name || req.user.email,
        adminId: req.user.id,
        details: { targetUserId: targetId, role: user.role, stage, reasons: reasons.map((r) => ({ code: r.code, count: r.count })) },
      });
      return res.status(409).json(accountDeletionBlockedBody(reasons));
    };

    let reasons;
    try {
      reasons = await inspectAccountDeletion(targetId);
    } catch (err) {
      // Fail closed: an uninspectable account is never deleted.
      console.error("ACCOUNT DELETE DEPENDENCY CHECK FAILED:", err.message);
      return res.status(503).json({ success: false, code: "ACCOUNT_DELETE_CHECK_FAILED", message: "Retained-record check could not be completed; nothing was deleted." });
    }
    if (reasons.length) return refuse(reasons, "preflight");

    // Freeze the account (no new sessions or activity) and re-check, so a record created between the first check and the
    // delete cannot be cascade-deleted. If the re-check finds one, the prior deactivation state is restored.
    const priorDeactivation = user.deactivatedAt || null;
    if (!priorDeactivation) await User.findByIdAndUpdate(targetId, { deactivatedAt: new Date() });
    await UserAuth.findOneAndUpdate({ user: targetId }, { $inc: { tokenVersion: 1 } });
    await RefreshToken.revokeAllForUser(targetId, "account_deletion");
    invalidateUserCache(targetId);
    try {
      reasons = await inspectAccountDeletion(targetId);
    } catch (err) {
      if (!priorDeactivation) await User.findByIdAndUpdate(targetId, { deactivatedAt: null });
      return res.status(503).json({ success: false, code: "ACCOUNT_DELETE_CHECK_FAILED", message: "Retained-record check could not be completed; nothing was deleted." });
    }
    if (reasons.length) {
      if (!priorDeactivation) await User.findByIdAndUpdate(targetId, { deactivatedAt: null });
      return refuse(reasons, "recheck");
    }

    const { data: removed, error: removeError } = await getSupabase().from("users").delete().eq("id", targetId).select("id");
    if (removeError) {
      if (!priorDeactivation) await User.findByIdAndUpdate(targetId, { deactivatedAt: null }).catch(() => {});
      if (removeError.code === "23503") return refuse([{ code: "LINKED_RECORDS", count: 1, message: "A retained record was created while the deletion was in progress." }], "constraint");
      throw removeError;
    }
    if (!removed?.length) return res.status(404).json({ success: false, message: "User not found" });
    await invalidatePublicListingCaches(); // Phase C.1 contract: a removed account must never linger in any public listing cache

    await auditAfterCommit({
      action: "User deleted",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { targetUserId: targetId, role: user.role },
    });

    res.json({ success: true, message: "Account permanently deleted" });
  }),
);

// =============================
// ⛔ DEACTIVATE USER (superadmin only — soft disable)
// =============================
router.put(
  "/users/:id/deactivate",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin")
      return res.status(400).json({ success: false, message: "Cannot deactivate superadmin" });

    user.deactivatedAt = user.deactivatedAt ? null : new Date();
    await user.save();
    const deactivatedAt = user.deactivatedAt;

    await auditAfterCommit({
      action: user.deactivatedAt ? `User deactivated: ${user.email}` : `User reactivated: ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: deactivatedAt ? "User deactivated" : "User reactivated",
      deactivatedAt,
      user: {
        _id: user._id,
        email: user.email,
        deactivatedAt,
      },
    });
  }),
);

// =============================
// 👥 STAFF MANAGEMENT (superadmin only)
// =============================

// GET ALL STAFF
router.get(
  "/staff",
  authorize("superadmin"),
  systemOwnerOnly,
  asyncHandler(async (req, res) => {
    const staffRoles = [
      "admin",
      "superadmin",
      "marketing",
      "technical_support",
      "hr",
      "accounts",
      "escrow_officer",
      "ad_manager",
      "moderator",
      "ghost_checker",
    ];
    const staff = await User.find({ role: { $in: staffRoles } })
      // STAGE 5F.5 (D-13): users has `last_login_at`, not `last_login`, and no `permissions_updated_at` column — selecting either
      // made this endpoint (and the whole Staff page) fail with a 500 on a database built from the repository migrations.
      .select("name email role isBanned lastLoginAt createdAt grantedPermissions revokedPermissions")
      .sort({ createdAt: -1 })
      .lean();
    // Attach computed effective permissions for the UI
    const enriched = staff.map((s) => ({
      ...s,
      isOwner: isOwnerUser(s), // safe boolean for the UI; never infer owner authority from a role label
      lastLogin: s.lastLoginAt ?? null, // UI field name (AdminStaffList) kept stable
      effectivePermissions: getEffectivePermissions(s),
      rolePermissions: ROLE_PERMISSIONS[s.role] || [],
    }));
    res.json({ success: true, staff: enriched });
  }),
);

// GET PERMISSION CATALOG (assignable permissions + labels) — for the assignment UI
router.get(
  "/staff/permissions/catalog",
  authorize("superadmin"),
  systemOwnerOnly,
  asyncHandler(async (req, res) => {
    const catalog = ASSIGNABLE_PERMISSIONS.map((p) => ({
      key: p,
      label: PERM_LABELS[p]?.label || p,
      desc: PERM_LABELS[p]?.desc || "",
      group: PERM_LABELS[p]?.group || "Other",
    }));
    res.json({ success: true, catalog });
  }),
);

// GET CANONICAL ASSIGNABLE STAFF ROLE CATALOG. Labels are descriptive only;
// role permissions come from the backend policy, never from frontend labels.
router.get(
  "/staff/roles/catalog",
  authorize("superadmin"),
  systemOwnerOnly,
  asyncHandler(async (_req, res) => {
    const staffRoles = ["admin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator", "ghost_checker"];
    res.json({ success: true, roles: staffRoles.map((role) => ({ role, permissions: ROLE_PERMISSIONS[role] || [] })) });
  }),
);

// GET ONE STAFF MEMBER'S EFFECTIVE PERMISSIONS
router.get(
  "/staff/:id/permissions",
  authorize("superadmin"),
  systemOwnerOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select("name email role grantedPermissions revokedPermissions")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({
      success: true,
      permissions: {
        role: user.role,
        rolePermissions: ROLE_PERMISSIONS[user.role] || [],
        grantedPermissions: user.grantedPermissions || [],
        revokedPermissions: user.revokedPermissions || [],
        effectivePermissions: getEffectivePermissions(user),
        updatedAt: null, // no persisted timestamp column exists; the change time is in the audit trail (update_staff_permissions)
      },
    });
  }),
);

// UPDATE A STAFF MEMBER'S ASSIGNED PERMISSIONS (superadmin only)
router.put(
  "/staff/:id/permissions",
  authorize("superadmin"),
  systemOwnerOnly,
  validateObjectId,
  protectAccount,
  auditLog("update_staff_permissions"),
  asyncHandler(async (req, res) => {
    let { grantedPermissions = [], revokedPermissions = [] } = req.body;
    if (!Array.isArray(grantedPermissions) || !Array.isArray(revokedPermissions)) {
      return res.status(400).json({ success: false, message: "grantedPermissions and revokedPermissions must be arrays" });
    }
    if ([...grantedPermissions, ...revokedPermissions].some((p) => typeof p !== "string")) {
      return res.status(400).json({ success: false, message: "Permission keys must be strings" });
    }
    // Validate against the assignable catalog — reject unknown/forbidden keys rather than silently dropping them.
    const allowed = new Set(ASSIGNABLE_PERMISSIONS);
    const unknown = [...new Set([...grantedPermissions, ...revokedPermissions])].filter((p) => !allowed.has(p));
    if (unknown.length) return res.status(400).json({ success: false, message: `Unsupported permission key(s): ${unknown.join(", ")}` });
    grantedPermissions = [...new Set(grantedPermissions)];
    revokedPermissions = [...new Set(revokedPermissions)];

    // A permission can't be both granted and revoked — grant wins, drop from revoked
    revokedPermissions = revokedPermissions.filter((p) => !grantedPermissions.includes(p));

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    // Never modify another superadmin's permissions through this endpoint.
    if (user.role === "superadmin" || isOwnerUser(user)) {
      return res.status(403).json({ success: false, message: "Cannot modify a protected System Owner / superadmin identity's permissions" });
    }
    if (!STAFF_GOVERNANCE_ROLES.includes(user.role)) {
      return res.status(409).json({ success: false, code: "STAFF_ACCOUNT_REQUIRED", message: "Permissions can only be assigned to an existing staff account." });
    }

    const beforePerms = { granted: user.grantedPermissions || [], revoked: user.revokedPermissions || [] };
    user.grantedPermissions = grantedPermissions;
    user.revokedPermissions = revokedPermissions;
    // STAGE 5F.5 (D-12): `permissions_updated_at/by` do not exist in the schema; writing them made every grant fail with a 500.
    // Who/when is recorded by auditLog("update_staff_permissions") above; the before/after delta is recorded below.
    await user.save();
    await auditAfterCommit({
      action: "Staff governance: permissions changed",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { targetUserId: String(user.id ?? req.params.id), targetRole: user.role, before: beforePerms, after: { granted: grantedPermissions, revoked: revokedPermissions }, reason: typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : undefined },
    });

    res.json({
      success: true,
      message: "Permissions updated",
      permissions: {
        grantedPermissions: user.grantedPermissions,
        revokedPermissions: user.revokedPermissions,
        effectivePermissions: getEffectivePermissions(user),
      },
    });
  }),
);

// CREATE STAFF ACCOUNT
router.post(
  "/staff",
  authorize("superadmin"),
  systemOwnerOnly,
  asyncHandler(async (req, res) => {
    const { name, password, role } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const staffRoles = CREATABLE_STAFF_ROLES;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || !email || typeof password !== "string" || password.length < 12 || !role) {
      return res.status(400).json({ success: false, message: "A valid name (1–120 characters), email, password (at least 12 characters), and role are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email address is required." });
    }
    if (!staffRoles.includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: `Invalid staff role. Must be one of: ${staffRoles.join(", ")}` });
    }
    // STAGE 5B closure: owner identities (designated / active / invited) are provisioned ONLY through the mailbox-verified owner flow.
    if (isReservedOwnerEmail(email)) {
      return res.status(409).json({ success: false, message: "That address is reserved for platform-owner provisioning." });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }
    const user = await User.create({ name: name.trim(), email, role });
    try {
      await UserAuth.create({ user: user.id, password: await bcrypt.hash(password, 12) });
    } catch (error) {
      // Do not leave an orphan staff identity when credential creation fails.
      // Soft-delete is the repository's supported user rollback mechanism.
      await User.softDelete(user.id, req.user.id).catch((rollbackError) => {
        console.error("Staff account creation rollback failed", { userId: String(user.id), error: rollbackError?.message });
      });
      throw error;
    }
    await auditAfterCommit({
      action: "Staff governance: account created",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { targetUserId: String(user.id), role, reason: typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : undefined },
    });
    res.json({
      success: true,
      message: `Staff account created: ${email}`,
      user: { name: user.name, email: user.email, role: user.role },
    });
  }),
);

// UPDATE STAFF ROLE
router.put(
  "/staff/:id",
  authorize("superadmin"),
  systemOwnerOnly,
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (isOwnerUser(user) || user.role === "superadmin") {
      return res.status(403).json({ success: false, code: "PROTECTED_OWNER_IDENTITY", message: "System Owner and Super Admin identities cannot be changed through staff editing." });
    }
    if (!STAFF_GOVERNANCE_ROLES.includes(user.role)) {
      return res.status(409).json({ success: false, code: "STAFF_ACCOUNT_REQUIRED", message: "Only an existing staff account can be edited here." });
    }
    const beforeState = { role: user.role, isBanned: user.isBanned === true };
    if (req.body.role) {
      // Only known staff roles may be assigned — never "superadmin" itself
      // (superadmin elevation goes through the webhoist owner flow only).
      const staffRoles = [
        "admin",
        "marketing",
        "technical_support",
        "hr",
        "accounts",
        "escrow_officer",
        "ad_manager",
        "moderator",
        "ghost_checker",
      ];
      if (!staffRoles.includes(req.body.role)) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid staff role. Must be one of: ${staffRoles.join(", ")}` });
      }
      user.role = req.body.role;
    }
    // STAGE 5F.5 (D-4): isBanned must be a real boolean — a string such as "false" is truthy and would suspend the account.
    if (req.body.isBanned !== undefined && typeof req.body.isBanned !== "boolean") {
      return res.status(400).json({ success: false, message: "isBanned must be true or false" });
    }
    if (req.body.name !== undefined && (typeof req.body.name !== "string" || !req.body.name.trim() || req.body.name.length > 120)) {
      return res.status(400).json({ success: false, message: "name must be a non-empty string of at most 120 characters" });
    }
    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.isBanned !== undefined) user.isBanned = req.body.isBanned;
    await user.save();
    await auditAfterCommit({
      action: "Staff governance: staff record updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { targetUserId: String(user.id ?? req.params.id), before: beforeState, after: { role: user.role, isBanned: user.isBanned === true }, reason: typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : undefined },
    });
    res.json({
      success: true,
      message: "Staff updated",
      user: { name: user.name, email: user.email, role: user.role, isBanned: user.isBanned },
    });
  }),
);

// DELETE STAFF ACCOUNT
router.delete(
  "/staff/:id",
  authorize("superadmin"),
  systemOwnerOnly,
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (isOwnerUser(user) || user.role === "superadmin" || String(user.id ?? user._id) === String(req.user.id))
      return res.status(403).json({ success: false, code: "PROTECTED_STAFF_IDENTITY", message: "System Owner, Super Admin and your own account cannot be removed through staff management." });
    if (!STAFF_GOVERNANCE_ROLES.includes(user.role)) {
      return res.status(409).json({ success: false, code: "STAFF_ACCOUNT_REQUIRED", message: "Only an existing staff account can be removed here." });
    }
    await User.softDelete(req.params.id, req.user.id);
    // Phase 14.9: a soft-deleted identity must not keep a working session (auth also rejects deleted accounts).
    await UserAuth.findOneAndUpdate({ user: req.params.id }, { $inc: { tokenVersion: 1 } });
    await RefreshToken.revokeAllForUser(req.params.id, "account_deletion");
    invalidateUserCache(req.params.id);
    await auditAfterCommit({
      action: "Staff governance: account deleted",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { targetUserId: String(req.params.id), role: user.role, reason: typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : undefined },
    });
    res.json({ success: true, message: "Staff account deleted" });
  }),
);

// =============================
// 🌱 SEED STAFF ACCOUNTS (webhost/superadmin only)
// Creates platform staff roles for production operations
// =============================
router.post(
  "/seed-departments",
  authorize("superadmin"),
  systemOwnerOnly,
  asyncHandler(async (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const devFallback = (pw) => {
      if (isProd) throw new Error("Seed password required via env var in production");
      console.warn("⚠️  Using dev-only fallback password — set SEED_* env vars for production");
      return pw;
    };
    const departments = [
      {
        name: "Marketing",
        email: "marketing@kayad.space",
        password: await bcrypt.hash(process.env.SEED_MARKET_PW || devFallback("SEED_MARKET_PW"), 12),
        role: "marketing",
      },
      {
        name: "Tech Support",
        email: "support@kayad.space",
        password: await bcrypt.hash(process.env.SEED_SUPPORT_PW || devFallback("SEED_SUPPORT_PW"), 12),
        role: "technical_support",
      },
      {
        name: "HR",
        email: "hr@kayad.space",
        password: await bcrypt.hash(process.env.SEED_HR_PW || devFallback("SEED_HR_PW"), 12),
        role: "hr",
      },
      {
        name: "Accounts",
        email: "accounts@kayad.space",
        password: await bcrypt.hash(process.env.SEED_ACCOUNTS_PW || devFallback("SEED_ACCOUNTS_PW"), 12),
        role: "accounts",
      },
      {
        name: "Escrow",
        email: "escrow@kayad.space",
        password: await bcrypt.hash(process.env.SEED_ESCROW_PW || devFallback("SEED_ESCROW_PW"), 12),
        role: "escrow_officer",
      },
      {
        name: "Ad Manager",
        email: "ads@kayad.space",
        password: await bcrypt.hash(process.env.SEED_ADS_PW || devFallback("SEED_ADS_PW"), 12),
        role: "ad_manager",
      },
    ];
    const created = [];
    for (const dept of departments) {
      const exists = await User.findOne({ email: dept.email });
      if (!exists) {
        const user = await User.create(dept);
        created.push({ email: dept.email, role: dept.role, status: "created" });
      } else {
        created.push({ email: dept.email, role: exists.role, status: "already exists" });
      }
    }
    res.json({ success: true, message: "Department accounts provisioned", accounts: created });
  }),
);

// =============================
// 📢 AD CAMPAIGN MANAGEMENT
// =============================

// GET ALL ADS
router.get(
  "/ads",
  asyncHandler(async (req, res) => {
    const ads = await Ad.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, ads });
  }),
);

// H-3 FIX: Whitelist allowed fields to prevent mass assignment attacks.
// Without this, an attacker could inject arbitrary fields like `createdBy`,
// `impressions`, `clicks`, or `internalFlags` via the request body.
const AD_ALLOWED_FIELDS = [
  "title", "description", "imageUrl", "targetUrl", "position",
  "status", "budget", "spent", "startDate", "endDate",
  "priority", "audience", "placement", "impressions", "clicks",
];

// CREATE AD
router.post(
  "/ads",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const payload = {};
    for (const key of AD_ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }
    payload.createdBy = req.user.id;
    const ad = await Ad.create(payload);
    res.json({ success: true, ad });
  }),
);

// UPDATE AD
router.put(
  "/ads/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, ad });
  }),
);

// DELETE AD
router.delete(
  "/ads/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, message: "Ad deleted" });
  }),
);

// =============================
// 💳 ALL PAYMENTS
// =============================
router.get(
  "/payments",
  validateQuery(paymentListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name email")
        .populate("car", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    // Phase 15: explicit projection (masked phone, no checkout id / metadata / user id) plus a derived reconciliation state.
    // `totalRevenue` is kept for client compatibility, but it is the sum of successful customer COLLECTIONS received on the
    // platform shortcode (not platform revenue, and not proof that dealers have been paid); `totalCollected` is the honest name.
    const view = await buildAdminPaymentView(payments);
    const collected = totalRevenue[0]?.total || 0;
    const needsReconciliation = view.filter((p) => p.reconciliation.state === "needs_reconciliation").length;
    res.json({
      success: true,
      payments: view,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        totalRevenue: collected,
        totalCollected: collected,
        totalTransactions: totalRevenue[0]?.count || 0,
        needsReconciliationOnPage: needsReconciliation,
        basis: "successful customer collections on the platform shortcode; not platform revenue; dealer payouts are separate",
      },
    });
  }),
);

// =============================
// 📦 ASSIGN / REVOKE DEALER SUBSCRIPTION
// =============================
router.patch(
  "/dealers/:id/package",
  protect,
  adminOnly,
  // STAGE 5F.5 (D-1): the path-layer guess does not match "/dealers/…", so any staff role (marketing, hr,
  // ghost_checker…) could grant or revoke a paid subscription. Granting entitlements is a finance action.
  requirePermission(PERMISSIONS.MANAGE_PAYMENTS),
  asyncHandler(async (req, res) => {
    const { dealerPackage, durationDays = 30 } = req.body || {};
    const dealerId = req.params.id;

    if (!dealerPackage) return res.status(400).json({ success: false, message: "dealerPackage is required" });
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 3660) {
      return res.status(400).json({ success: false, message: "durationDays must be an integer between 1 and 3660" });
    }

    const user = await User.findById(dealerId).select("id role");
    if (!user || user.role !== "dealer") return res.status(404).json({ success: false, message: "Dealer not found" });

    const sb = getSupabase();
    let result;
    if (dealerPackage === "none") {
      const rpc = await sb.rpc("kayad_revoke_dealer_subscription_atomic", {
        p_dealer: dealerId,
        p_reason: "admin_revoke",
      });
      if (rpc.error) throw rpc.error;
      result = rpc.data;
    } else {
      const plans = await getDealerPlans();
      if (!plans.some((p) => p.id === dealerPackage)) {
        return res.status(400).json({ success: false, message: "Invalid dealer plan" });
      }
      const rpc = await sb.rpc("kayad_grant_dealer_subscription_atomic", {
        p_dealer: dealerId,
        p_plan_id: dealerPackage,
        p_duration_days: days,
        p_reason: "admin_grant",
      });
      if (rpc.error) throw rpc.error;
      result = rpc.data;
    }

    const updated = await User.findById(dealerId)
      .select("id name email role phone avatar status dealerPackage packageListingMax packageFeatures packageExpiresAt packageAutoRenew subscriptionStatus")
      .lean();

    res.json({ success: true, subscription: result, user: updated });
  }),
);

// =============================
// 🆓 ZERO-COST DEALER ONBOARDING
// =============================
router.post(
  "/zero-cost-onboarding",
  protect,
  adminOnly,
  // STAGE 5F.5 (D-2): bulk free-plan grant to every approved dealer — admin/superadmin AND finance permission.
  adminOrSuper,
  requirePermission(PERMISSIONS.MANAGE_PAYMENTS),
  asyncHandler(async (req, res) => {
    const { dealerIds, durationDays = 90 } = req.body || {};
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 3660) {
      return res.status(400).json({ success: false, message: "durationDays must be an integer between 1 and 3660" });
    }

    const ids = Array.isArray(dealerIds) ? dealerIds.filter(Boolean).map(String) : [];
    let dealers;
    if (ids.length) {
      dealers = await User.find({ _id: { $in: ids }, role: "dealer", status: "approved" }).select("id").lean();
    } else {
      dealers = await User.find({ role: "dealer", status: "approved" }).select("id").lean();
    }

    const sb = getSupabase();
    const planId = "starter";
    let modifiedCount = 0;
    for (const dealer of dealers) {
      const rpc = await sb.rpc("kayad_grant_dealer_subscription_atomic", {
        p_dealer: dealer.id,
        p_plan_id: planId,
        p_duration_days: days,
        p_reason: "admin_zero_cost_onboarding",
      });
      if (rpc.error) throw rpc.error;
      modifiedCount += 1;
    }

    res.json({ success: true, modifiedCount, matchedCount: dealers.length, planId, durationDays: days });
  }),
);

// =============================
// 🖼 LOGO UPLOAD
// =============================
import { uploadMemory, handleUploadError } from "../middleware/upload.js";
import { uploadImage } from "../config/cloudinary.js";
import { isReservedOwnerEmail } from "../config/owners.js"; // STAGE 5B closure
router.post(
  "/upload-logo",
  protect,
  adminOnly,
  uploadMemory.single("logo"),
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ success: false, code: "LOGO_STORAGE_NOT_CONFIGURED", message: "Logo storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the server environment." });
    }
    const result = await uploadImage(req.file, "kayad/branding", {
      generateVariants: true,
      preserveOriginal: true,
    });
    if (!result?.url || typeof result.url !== "string") {
      return res.status(502).json({ success: false, code: "LOGO_UPLOAD_INVALID_RESPONSE", message: "The image storage provider did not return a usable logo URL." });
    }
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();
    const existingBranding = config.branding?.toObject?.() || config.branding || {};
    config.branding = { ...existingBranding, logoType: "image", logoUrl: result.url };
    await config.save();
    await auditAfterCommit({
      action: "Platform logo updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { logoUrl: result.url },
    });
    res.json({ success: true, url: result.url, thumb: result.thumb });
  }),
);

// =============================
// ⭐ REVIEW MODERATION
// =============================
router.get(
  "/reviews",
  staffRole,
  validateQuery(reviewListQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await listAdminReviews(req.query);
    res.json({ success: true, reviews: result.reviews, statusCounts: result.statusCounts, pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages } });
  }),
);

router.patch(
  "/reviews/:id/status",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const review = await moderateReview(req.params.id, req.body.status, req.user.id);
    res.json({ success: true, message: `Review ${req.body.status}`, review });
  }),
);

router.delete(
  "/reviews/:id",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    await deleteDealerReview(req.params.id, req.user.id, true);
    res.json({ success: true, message: "Review deleted" });
  }),
);

// =============================
// 👥 REFERRAL MANAGEMENT
// =============================

router.get(
  "/referrals/stats",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    // Referral balances and payouts are operational data: do not serve stale cached totals after a decision.
    const [totalReferrals, pendingCount, creditedCount, expiredCount, totalBonus] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: "pending" }),
      Referral.countDocuments({ status: "credited" }),
      Referral.countDocuments({ status: "expired" }),
      Transaction.aggregate([
        { $match: { type: "referral_bonus", status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((r) => r[0]?.total || 0),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({ success: true, stats: { totalReferrals, pendingCount, creditedCount, expiredCount, totalBonus } });
  }),
);

router.get(
  "/referrals",
  staffRole,
  asyncHandler(async (req, res) => {
    const allowedStatuses = new Set(["pending", "credited", "expired"]);
    const rawPage = req.query.page === undefined ? 1 : Number(req.query.page);
    const rawLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(rawPage) || rawPage < 1 || rawPage > 100000) {
      return res.status(400).json({ success: false, message: "Page must be a positive integer" });
    }
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50) {
      return res.status(400).json({ success: false, message: "Limit must be an integer between 1 and 50" });
    }
    const { status, referrer, referee } = req.query;
    if (status !== undefined && (typeof status !== "string" || !allowedStatuses.has(status))) {
      return res.status(400).json({ success: false, message: "Unsupported referral status" });
    }
    const filter = {};
    if (status) filter.status = status;
    if (typeof referrer === "string" && referrer.trim()) filter.referrer = referrer.trim();
    if (typeof referee === "string" && referee.trim()) filter.referee = referee.trim();

    const skip = (rawPage - 1) * rawLimit;
    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .populate("referrer", "name email referralCode")
        .populate("referee", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(rawLimit)
        .lean(),
      Referral.countDocuments(filter),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      referrals,
      pagination: { page: rawPage, limit: rawLimit, total, pages: Math.ceil(total / rawLimit) },
    });
  }),
);

router.get(
  "/referrals/:id",
  staffRole,
  asyncHandler(async (req, res) => {
    const referral = await Referral.findById(req.params.id)
      .populate("referrer", "name email referralCode credits referralEarnings referralCount")
      .populate("referee", "name email")
      .lean();
    if (!referral) return res.status(404).json({ success: false, message: "Referral not found" });
    res.json({ success: true, referral });
  }),
);

router.post(
  "/referrals/:id/credit",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    // STAGE 4A (G9): the amount must be a finite positive NUMBER (strings such as "abc" or "1e999" passed the old
    // `!amount || amount <= 0` test and reached $inc). A maximum is a business-policy decision (register D12) and is not invented here.
    const amount = parseBonusAmount(req.body?.amount);
    if (!Number.isFinite(amount))
      return res.status(400).json({ success: false, message: "Valid bonus amount is required" });

    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: "Referral not found" });
    if (referral.status !== "pending")
      return res.status(400).json({ success: false, message: `Referral is already ${referral.status}` });

    const reference = `REF-${referral._id}`;
    const existingTransaction = await Transaction.findOne({ reference });
    if (existingTransaction) {
      return res.status(409).json({
        success: false,
        code: "REFERRAL_CREDIT_RECONCILIATION_REQUIRED",
        message: "A transaction already exists for this referral. Reconcile the referral and referrer balance before retrying.",
      });
    }

    // Conditional transition: only the request that actually moves pending -> credited may pay out, so two
    // concurrent admin clicks cannot both credit the referrer.
    const claimed = await Referral.findOneAndUpdate(
      { _id: referral._id, status: "pending" },
      { status: "credited", bonusAmount: amount, creditedAt: new Date() },
      { new: true },
    );
    if (!claimed) return res.status(409).json({ success: false, message: "Referral is no longer pending" });

    let balanceUpdated = false;
    try {
      const userUpdate = await User.findByIdAndUpdate(referral.referrer, {
        $inc: { credits: amount, referralEarnings: amount, referralCount: 1 },
      });
      if (!userUpdate) throw new Error("Referral owner could not be found; credit was not completed");
      balanceUpdated = true;

      // Stable reference makes the payout traceable and supports recovery after an uncertain write result.
      await Transaction.create({
        user: referral.referrer,
        type: "referral_bonus",
        amount,
        status: "success",
        reference,
        description: `Referral bonus for ${referral.referee}`,
      });

      await auditAfterCommit({
        admin: req.user._id,
        action: "Credit Referral",
        target: `Referral ${referral._id}`,
        details: `Credited KES ${amount} to referrer`,
      });
    } catch (error) {
      // The persistence adapter does not expose a cross-table transaction. Compensate successful writes
      // and return a reconciliation error if any compensation itself fails; never report success.
      const compensationErrors = [];
      try {
        // A network error may occur after the database accepted the insert, before create() returned.
        const persistedTransaction = await Transaction.findOne({ reference: `REF-${referral._id}` });
        if (persistedTransaction) await Transaction.deleteOne({ reference: `REF-${referral._id}` });
      } catch (e) { compensationErrors.push(`transaction rollback: ${e.message}`); }
      try {
        if (balanceUpdated) await User.findByIdAndUpdate(referral.referrer, {
          $inc: { credits: -amount, referralEarnings: -amount, referralCount: -1 },
        });
      } catch (e) { compensationErrors.push(`balance rollback: ${e.message}`); }
      try {
        await Referral.findOneAndUpdate(
          { _id: referral._id, status: "credited" },
          { status: "pending", bonusAmount: 0, creditedAt: null },
          { new: true },
        );
      } catch (e) { compensationErrors.push(`referral rollback: ${e.message}`); }
      req.log?.error?.({ err: error, referralId: String(referral._id), compensationErrors }, "Referral credit failed");
      return res.status(500).json({
        success: false,
        code: compensationErrors.length ? "REFERRAL_CREDIT_RECONCILIATION_REQUIRED" : "REFERRAL_CREDIT_ROLLED_BACK",
        message: compensationErrors.length
          ? "Referral credit failed and automatic rollback was incomplete. Reconciliation is required before retrying."
          : "Referral credit could not be completed. Changes were rolled back; please retry after checking the record.",
      });
    }

    res.json({ success: true, message: "Referral credited successfully", referral: claimed });
  }),
);

router.post(
  "/referrals/:id/expire",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: "Referral not found" });
    if (referral.status !== "pending")
      return res.status(400).json({ success: false, message: `Referral is already ${referral.status}` });

    // Conditional state transition prevents concurrent expire/credit requests from both winning.
    const expired = await Referral.findOneAndUpdate(
      { _id: referral._id, status: "pending" },
      { status: "expired" },
      { new: true },
    );
    if (!expired) return res.status(409).json({ success: false, message: "Referral is no longer pending" });

    await auditAfterCommit({
      admin: req.user._id,
      action: "Expire Referral",
      target: `Referral ${referral._id}`,
      details: "Expired pending referral",
    });

    res.json({ success: true, message: "Referral expired", referral: expired });
  }),
);

router.get(
  "/users/:id/referrals",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    if (typeof req.params.id !== "string" || !req.params.id.trim() || req.params.id.length > 128) {
      return res.status(400).json({ success: false, message: "A valid user ID is required" });
    }
    const user = await User.findById(req.params.id.trim())
      .select("name email referralCode referralEarnings referralCount credits")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const [referred, referredBy] = await Promise.all([
      Referral.find({ referrer: req.params.id })
        .populate("referee", "name email createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Referral.findOne({ referee: req.params.id }).populate("referrer", "name email referralCode").lean(),
    ]);

    res.json({ success: true, user, referred, referredBy });
  }),
);

// =============================
// 💬 CHAT MODERATION
// =============================

router.get(
  "/chats",
  staffRole,
  validateQuery(chatListQuerySchema),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter = {};
    if (req.query.isBlocked !== undefined) filter.isBlocked = req.query.isBlocked === "true";
    const skip = (page - 1) * limit;

    // Keep the resolved user IDs in this scope for both the query and its count.
    let userIds = null;
    if (search) {
      const safeSearch = escapeRegex(search);
      const users = await User.find({
        $or: [{ name: { $regex: safeSearch, $options: "i" } }, { email: { $regex: safeSearch, $options: "i" } }],
      }).select("_id").lean();
      userIds = users.map((user) => user._id);
    }
    const queryFilter = {
      ...filter,
      ...(userIds ? { participants: { $in: userIds } } : {}),
    };
    const [chats, total] = await Promise.all([
      Chat.find(queryFilter)
        .populate("participants", "name email")
        .populate("car", "title brand model")
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Chat.countDocuments(queryFilter),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      chats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  "/chats/:chatId/messages",
  adminOrSuper,
  validateObjectId("chatId"),
  validateQuery(messageListQuerySchema),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.chatId)
      .populate("participants", "name email")
      .populate("messages.sender", "name email")
      .lean();
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        participants: chat.participants,
        isBlocked: chat.isBlocked,
        car: chat.car,
        messages: (chat.messages || []).map((m) => presentMessage(String(chat._id), m)),
      },
    });
  }),
);

router.delete(
  "/chats/:chatId/messages/:messageId",
  adminOrSuper,
  validateObjectId("chatId"),
  (req, res, next) => {
    const messageId = String(req.params.messageId || "");
    if (!/^(?:[0-9a-f]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID format" });
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    const msg = chat.messages.id(req.params.messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    msg.text = "[deleted by admin]";
    msg.attachments = [];
    await chat.save();

    await auditAfterCommit({
      admin: req.user._id,
      action: "Delete Chat Message",
      target: `Message ${req.params.messageId} in Chat ${req.params.chatId}`,
      details: "Message deleted by admin",
    });

    res.json({ success: true, message: "Message deleted" });
  }),
);

router.post(
  "/chats/:chatId/block",
  adminOrSuper,
  validateObjectId("chatId"),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { isBlocked: true }, { new: true });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    await auditAfterCommit({
      admin: req.user._id,
      action: "Block Chat",
      target: `Chat ${chat._id}`,
      details: "Chat blocked by admin",
    });
    res.json({ success: true, message: "Chat blocked", chat });
  }),
);

router.post(
  "/chats/:chatId/unblock",
  adminOrSuper,
  validateObjectId("chatId"),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { isBlocked: false }, { new: true });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    await auditAfterCommit({
      admin: req.user._id,
      action: "Unblock Chat",
      target: `Chat ${chat._id}`,
      details: "Chat unblocked by admin",
    });
    res.json({ success: true, message: "Chat unblocked", chat });
  }),
);

// =============================
// 📊 MARKET DATA MANAGEMENT
// =============================

const validateMarketDataValues = (value) => {
  const errors = [];
  const currentYear = new Date().getFullYear();
  if (typeof value.brand !== "string" || !value.brand.trim() || value.brand.trim().length > 100) errors.push("brand must be a non-empty string up to 100 characters");
  if (typeof value.model !== "string" || !value.model.trim() || value.model.trim().length > 120) errors.push("model must be a non-empty string up to 120 characters");
  const year = Number(value.year);
  if (!Number.isInteger(year) || year < 1900 || year > currentYear + 1) errors.push("year must be a valid vehicle year");
  const prices = [Number(value.lowPrice), Number(value.avgPrice), Number(value.highPrice)];
  if (!prices.every((n) => Number.isFinite(n) && n > 0)) errors.push("lowPrice, avgPrice and highPrice must be positive finite numbers");
  else if (!(prices[0] <= prices[1] && prices[1] <= prices[2])) errors.push("prices must satisfy lowPrice <= avgPrice <= highPrice");
  const sampleSize = Number(value.sampleSize ?? 1);
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 1000000) errors.push("sampleSize must be a positive whole number");
  if (value.engineCC != null && value.engineCC !== "" && (!Number.isFinite(Number(value.engineCC)) || Number(value.engineCC) <= 0 || Number(value.engineCC) > 100000)) errors.push("engineCC must be a positive number when provided");
  for (const field of ["bodyType", "fuel", "transmission", "source"]) {
    if (value[field] != null && (typeof value[field] !== "string" || value[field].length > 100)) errors.push(`${field} must be text up to 100 characters`);
  }
  return errors;
};

router.get(
  "/market-data",
  staffRole,
  asyncHandler(async (req, res) => {
    const { brand, model, year } = req.query;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(page) || page < 1 || page > 1000000) return res.status(400).json({ success: false, message: "page must be a positive integer" });
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ success: false, message: "limit must be an integer between 1 and 50" });
    if (brand != null && (typeof brand !== "string" || brand.trim().length > 100)) return res.status(400).json({ success: false, message: "brand filter is invalid" });
    if (model != null && (typeof model !== "string" || model.trim().length > 120)) return res.status(400).json({ success: false, message: "model filter is invalid" });
    if (year != null && (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > currentYear + 1)) return res.status(400).json({ success: false, message: "year filter is invalid" });
    const filter = {};
    if (brand?.trim()) filter.brand = { $regex: escapeRegex(brand.trim()), $options: "i" };
    if (model?.trim()) filter.model = { $regex: escapeRegex(model.trim()), $options: "i" };
    if (year != null && year !== "") filter.year = Number(year);
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      MarketData.find(filter).sort({ brand: 1, model: 1, year: -1 }).skip(skip).limit(limit).lean(),
      MarketData.countDocuments(filter),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({ success: true, entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

router.get(
  "/market-data/:id",
  staffRole,
  asyncHandler(async (req, res) => {
    const entry = await MarketData.findById(req.params.id).lean();
    if (!entry) return res.status(404).json({ success: false, message: "Market data entry not found" });
    res.json({ success: true, entry });
  }),
);

router.post(
  "/market-data",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const {
      brand,
      model,
      year,
      bodyType,
      fuel,
      transmission,
      engineCC,
      lowPrice,
      avgPrice,
      highPrice,
      sampleSize,
      source,
    } = req.body;
    if (!brand || !model || !year || lowPrice == null || avgPrice == null || highPrice == null) {
      return res
        .status(400)
        .json({ success: false, message: "brand, model, year, lowPrice, avgPrice, highPrice are required" });
    }

    const validationErrors = validateMarketDataValues({ brand, model, year, bodyType, fuel, transmission, engineCC, lowPrice, avgPrice, highPrice, sampleSize, source });
    if (validationErrors.length) return res.status(400).json({ success: false, message: "Market data entry is invalid", errors: validationErrors });
    const entry = await MarketData.create({
      brand: brand.trim(), model: model.trim(), year: Number(year), bodyType, fuel, transmission,
      engineCC: engineCC == null || engineCC === "" ? undefined : Number(engineCC),
      lowPrice: Number(lowPrice), avgPrice: Number(avgPrice), highPrice: Number(highPrice),
      sampleSize: Number(sampleSize ?? 1), source,
    });

    await auditAfterCommit({
      admin: req.user._id,
      action: "Create Market Data",
      target: `MarketData ${entry._id}`,
      details: `Created ${brand} ${model} ${year}`,
    });
    res.status(201).json({ success: true, entry });
  }),
);

router.put(
  "/market-data/:id",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const allowed = [
      "brand",
      "model",
      "year",
      "bodyType",
      "fuel",
      "transmission",
      "engineCC",
      "lowPrice",
      "avgPrice",
      "highPrice",
      "sampleSize",
      "source",
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const current = await MarketData.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ success: false, message: "Market data entry not found" });
    const candidate = { ...current, ...updates };
    const validationErrors = validateMarketDataValues(candidate);
    if (validationErrors.length) return res.status(400).json({ success: false, message: "Market data entry is invalid", errors: validationErrors });
    for (const field of ["year", "lowPrice", "avgPrice", "highPrice", "sampleSize", "engineCC"]) {
      if (updates[field] !== undefined && updates[field] !== "") updates[field] = Number(updates[field]);
    }
    if (updates.brand !== undefined) updates.brand = updates.brand.trim();
    if (updates.model !== undefined) updates.model = updates.model.trim();
    updates.lastUpdated = new Date();

    const entry = await MarketData.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!entry) return res.status(404).json({ success: false, message: "Market data entry not found" });

    await auditAfterCommit({
      admin: req.user._id,
      action: "Update Market Data",
      target: `MarketData ${entry._id}`,
      details: `Updated ${entry.brand} ${entry.model} ${entry.year}`,
    });
    res.json({ success: true, entry });
  }),
);

router.delete(
  "/market-data/:id",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const entry = await MarketData.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: "Market data entry not found" });

    await auditAfterCommit({
      admin: req.user._id,
      action: "Delete Market Data",
      target: `MarketData ${req.params.id}`,
      details: `Deleted ${entry.brand} ${entry.model} ${entry.year}`,
    });
    res.json({ success: true, message: "Market data entry deleted" });
  }),
);

router.post(
  "/market-data/bulk",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: "entries array is required" });
    }
    if (entries.length > 500) return res.status(400).json({ success: false, message: "A maximum of 500 entries may be imported at once" });

    let created = 0;
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        errors.push({ index: i, message: "Entry must be a JSON object" });
        continue;
      }
      if (
        !entry.brand ||
        !entry.model ||
        !entry.year ||
        entry.lowPrice == null ||
        entry.avgPrice == null ||
        entry.highPrice == null
      ) {
        errors.push({
          index: i,
          message: "Missing required fields (brand, model, year, lowPrice, avgPrice, highPrice)",
        });
        continue;
      }
      const validationErrors = validateMarketDataValues({ ...entry, source: entry.source || "bulk_import" });
      if (validationErrors.length) {
        errors.push({ index: i, message: validationErrors.join("; ") });
        continue;
      }
      try {
        await MarketData.create({
          ...entry, brand: entry.brand.trim(), model: entry.model.trim(), year: Number(entry.year),
          lowPrice: Number(entry.lowPrice), avgPrice: Number(entry.avgPrice), highPrice: Number(entry.highPrice),
          sampleSize: Number(entry.sampleSize ?? 1),
          engineCC: entry.engineCC == null || entry.engineCC === "" ? undefined : Number(entry.engineCC),
          source: entry.source || "bulk_import",
        });
        created++;
      } catch (err) {
        errors.push({ index: i, message: err.message });
      }
    }

    await auditAfterCommit({
      admin: req.user._id,
      action: "Bulk Import Market Data",
      target: "MarketData",
      details: `${created} created, ${errors.length} errors`,
    });
    res.json({ success: true, created, errors, total: entries.length });
  }),
);

// =============================
// 🔔 GET ADMIN ALERTS
// =============================
router.get(
  "/alerts",
  asyncHandler(async (req, res) => {
    const { limit = 20, severity, read } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (read === "false") filter.read = false;
    if (read === "true") filter.read = true;

    const [alerts, unreadCount] = await Promise.all([
      AdminAlert.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean(),
      AdminAlert.countDocuments({ read: false }),
    ]);

    res.json({ success: true, alerts, unreadCount });
  }),
);

// =============================
// ✅ MARK ALERT READ
// =============================
router.post(
  "/alerts/:id/read",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const alert = await AdminAlert.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found" });
    res.json({ success: true, alert });
  }),
);

// =============================
// ✅ MARK ALL ALERTS READ
// =============================
router.post(
  "/alerts/read-all",
  asyncHandler(async (req, res) => {
    await AdminAlert.updateMany({ read: false }, { read: true });
    res.json({ success: true, message: "All alerts marked read" });
  }),
);

// =============================
// 🖥 GET SYSTEM HEALTH
// =============================
router.get(
  "/system/health",
  asyncHandler(async (req, res) => {
    const [userCount, carCount, liveAuctions, pendingEscrows, heldEscrows, pendingModeration, recentErrors] =
      await Promise.all([
        User.countDocuments(),
        Car.countDocuments(),
        Car.countDocuments({ auctionStatus: "live" }),
        Escrow.countDocuments({ status: "pending" }),
        Escrow.countDocuments({ status: { $in: ["funded", "vehicle_confirmed", "delivered"] } }),
        Car.countDocuments({ status: "pending" }),
        AdminAlert.countDocuments({
          severity: "critical",
          read: false,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

    // Phase 15: "healthy" used to be reported whenever there were no unread critical alerts, which says nothing about the
    // database, payment provider, messaging providers or queues. This endpoint only has counts and the alert feed, so it can
    // say "warning" (critical alerts present) or "no_critical_alerts" (nothing evidence-based is wrong) - never "healthy".
    // Provider/credential telemetry is reported by the communications provider-health and operations control-room routes.
    const status = recentErrors > 0 ? "warning" : "no_critical_alerts";

    res.json({
      success: true,
      health: {
        status,
        basis: "operational counts and the unread critical-alert feed only; provider, database and queue health are not probed here",
        users: userCount,
        listings: carCount,
        liveAuctions,
        pendingEscrows,
        heldEscrows,
        pendingModeration,
        criticalAlerts24h: recentErrors,
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

// =============================
// 🔐 ESCROW CUSTODY ADMINISTRATION
// Business rights are deliberately separated: viewing escrow does not
// grant custody configuration power. Account numbers are masked in the
// admin control plane to avoid unnecessary financial-data exposure.

const maskAccountNumber = (value) => {
  const raw = String(value || "");
  if (raw.length <= 4) return raw ? `••••${raw}` : "";
  return `••••••${raw.slice(-4)}`;
};

const sanitizeAdminEscrowAccount = (account) => account ? ({
  id: account.id,
  accountName: account.accountName,
  accountType: account.accountType || "bank",
  bankName: account.bankName,
  accountNumber: maskAccountNumber(account.accountNumber),
  branch: account.branch || null,
  currency: account.currency || "KES",
  isActive: account.isActive !== false,
  isPrimary: account.isPrimary === true,
  notes: account.notes || null,
}) : null;

router.get("/escrow/config", requirePermission(PERMISSIONS.VIEW_ESCROW), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getEscrowRules() });
}));

router.get("/escrow/accounts", requirePermission(PERMISSIONS.CONFIGURE_ESCROW), asyncHandler(async (req, res) => {
  const accounts = await getActiveEscrowAccounts();
  res.json({ success: true, data: accounts.map(sanitizeAdminEscrowAccount) });
}));

router.post("/escrow/accounts", requirePermission(PERMISSIONS.CONFIGURE_ESCROW), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: sanitizeAdminEscrowAccount(await saveEscrowAccount(req.body || {})) });
}));

router.patch("/escrow/accounts/:id", requirePermission(PERMISSIONS.CONFIGURE_ESCROW), validateObjectId, asyncHandler(async (req, res) => {
  res.json({ success: true, data: sanitizeAdminEscrowAccount(await saveEscrowAccount(req.body || {}, req.params.id)) });
}));

router.delete("/escrow/accounts/:id", requirePermission(PERMISSIONS.CONFIGURE_ESCROW), validateObjectId, asyncHandler(async (req, res) => {
  await removeEscrowAccount(req.params.id);
  res.json({ success: true });
}));

// =============================
// 🔐 ESCROW SELLER CAPABILITY ADMINISTRATION (Stage 9)
// Closes the gap Stage 8 documented: "No per-seller / per-vehicle admin
// grant mechanism exists." This is the single admin-facing surface that
// grants/revokes/suspends/restores a seller's (individual_seller or
// dealer) escrow eligibility. It does not touch the platform custody
// account configuration above, and it is not a second escrow engine — it
// only ever sets users.escrow_capability_status, which
// escrowCapability.service.js's computeEffectiveEscrowEnabled() then
// consumes identically for both the public ESCROW badge and the real
// purchase-time escrow decision (paymentController.js).
//
// Path intentionally contains "escrow" so the global admin permission
// gate above (the `/\bescrow\b/` regex) requires PERMISSIONS.MANAGE_ESCROWS
// in addition to the route-local CONFIGURE_ESCROW check below — the same
// defense-in-depth pattern already used for /escrow/accounts.
// =============================

router.get("/escrow/sellers/:userId/capability", requirePermission(PERMISSIONS.VIEW_ESCROW), validateObjectId, asyncHandler(async (req, res) => {
  const status = await getSellerEscrowCapabilityStatus(req.params.userId);
  res.json({ success: true, data: { userId: req.params.userId, status } });
}));

router.patch(
  "/escrow/sellers/:userId/capability",
  requirePermission(PERMISSIONS.CONFIGURE_ESCROW),
  validateObjectId,
  validate(setEscrowCapabilitySchema),
  asyncHandler(async (req, res) => {
    const result = await setSellerEscrowCapability({
      targetUserId: req.params.userId,
      status: req.body.status,
      reason: req.body.reason,
      adminUser: req.user,
      req,
    });
    res.json({ success: true, data: result });
  }),
);

export default router;
