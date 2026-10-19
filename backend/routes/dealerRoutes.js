import express from "express";
import { protect, dealerOnly, requireApproved, allowRoles } from "../middleware/auth.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getPagination, withPagination } from "../middleware/apiPagination.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { cacheDealerData, cacheAnalytics, invalidateCache } from "../middleware/apiCache.js";
import { initiatePayment } from "../services/paymentService.js";
import { getPricingRecommendations } from "../services/pricingRecommendationService.js";

import { findAll, findById, findOne, create, update, remove, paginate, count } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// STAGE 5C: raw PostgREST queries bypass the model adapter, so they must use the REAL snake_case column names and must
// surface database errors instead of rendering them as silent zeros / empty dashboards.
const must = ({ data, count, error }) => { if (error) throw error; return { data, count }; };
const countOf = (r) => must(r).count || 0;
const WHOLESALE_UNSUPPORTED = /42703|PGRST204|PGRST200|PGRST205|column .*wholesale|wholesale.*does not exist|Could not find/i;
import { sellerMayPublishDirectly, PUBLICATION_REVIEW_REQUIRED } from "../services/onboardingPolicy.service.js"; // STAGE 5
import { sendNotification } from "../services/notification.service.js";
import { initiateDealerUpgrade } from "../services/dealerSubscription.service.js";
import { deliver } from "../services/communicationGateway.service.js";
import { startAuction, extendAuction, closeAuction } from "../services/auctionLifecycle.service.js";
import { disburseB2C } from "../services/mpesaB2C.service.js";
import { dealerOnboardingSchema } from "../validation/dealerOnboarding.schema.js";
import { submitDealerVerification } from "../services/dealerVerificationService.js";

const router = express.Router();

// =============================
// 🧭 DEALER ONBOARDING (PENDING DEALERS)
// =============================
// This route intentionally sits before the approved-dealer boundary. A newly
// registered dealer is pending by design, but must still be able to complete
// the existing onboarding + verification workflow that leads to approval.
router.get("/onboarding", protect, allowRoles("dealer"), asyncHandler(async (req, res) => {
  let dealer = await findOne("dealers", { user: req.user.id });
  if (!dealer) {
    dealer = await create("dealers", { user: req.user.id, approved: false, isSuspended: false });
  }
  res.json({ success: true, dealer });
}));

router.put("/onboarding", protect, allowRoles("dealer"), asyncHandler(async (req, res) => {
  const parsed = dealerOnboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
      .join("; ");
    return res.status(400).json({ success: false, message: message || "Invalid dealer onboarding data" });
  }

  const { businessName, location, bio, paymentDetails, documents } = parsed.data;
  let dealer = await findOne("dealers", { user: req.user.id });
  if (!dealer) {
    dealer = await create("dealers", { user: req.user.id, approved: false, isSuspended: false });
  }

  const previousDealer = dealer;
  dealer = await update("dealers", dealer.id, {
    businessName,
    location,
    bio: bio || null,
    paymentDetails,
    onboardingComplete: true,
    onboardingCompletedAt: new Date().toISOString(),
  });

  try {
    const verification = await submitDealerVerification(req.user.id, documents);

    await logActionFromReq(req, "dealer_onboarding_completed", {
      target: dealer.id,
      targetModel: "Dealer",
      details: { verificationStatus: verification.verification.verificationStatus },
    });

    return res.status(200).json({
      success: true,
      message: "Dealer onboarding completed and verification submitted.",
      dealer,
      verification: verification.verification,
      progress: verification.progress,
    });
  } catch (error) {
    // Do not leave a dealer claiming onboarding completion when the required
    // verification record could not be created. Restore the prior durable state
    // so the user can safely retry without a misleading half-complete account.
    try {
      await update("dealers", dealer.id, {
        businessName: previousDealer.businessName ?? null,
        location: previousDealer.location ?? null,
        bio: previousDealer.bio ?? null,
        paymentDetails: previousDealer.paymentDetails ?? {},
        onboardingComplete: previousDealer.onboardingComplete ?? false,
        onboardingCompletedAt: previousDealer.onboardingCompletedAt ?? null,
      });
    } catch (rollbackError) {
      console.error("Dealer onboarding compensation failed:", rollbackError?.message || rollbackError);
    }
    throw error;
  }
}));

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect, dealerOnly, requireApproved);

// =============================
// 💰 EARNINGS (FILTERABLE + PAGINATED + CACHED)
// =============================
router.get(
  "/earnings",
  validateQuery(analyticsQuerySchema),
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    let dateFrom, dateTo;
    if (req.query.from || req.query.to) {
      if (req.query.from) dateFrom = new Date(req.query.from).toISOString();
      if (req.query.to) dateTo = new Date(req.query.to).toISOString();
    } else {
      const days = parseInt(req.query.days) || 30;
      dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Earnings are the dealer_amount of successful payments made FOR the dealer's own vehicles (payments.user_id is the payer).
    const { data: ownCars } = must(await sb.from("cars").select("id").eq("dealer_id", req.user.id));
    const ownCarIds = (ownCars || []).map((r) => r.id);
    const empty = { data: [], count: 0 };
    let listQuery = ownCarIds.length ? sb.from("payments").select("*", { count: 'exact' }).in("car_id", ownCarIds).eq("status", "success").order("created_at", { ascending: false }).range(skip, skip + limit - 1) : null;
    if (listQuery && dateFrom) listQuery = listQuery.gte("created_at", dateFrom);
    if (listQuery && dateTo) listQuery = listQuery.lte("created_at", dateTo);
    const { data: rawPayments, count: total } = listQuery ? must(await listQuery) : empty;
    const payments = (rawPayments || []).map((p) => ({ ...p, createdAt: p.created_at, dealerAmount: Number(p.dealer_amount || 0), platformFee: Number(p.platform_fee || 0) }));

    let aggQuery = ownCarIds.length ? sb.from("payments").select("dealer_amount,created_at").in("car_id", ownCarIds).eq("status", "success") : null;
    if (aggQuery && dateFrom) aggQuery = aggQuery.gte("created_at", dateFrom);
    if (aggQuery && dateTo) aggQuery = aggQuery.lte("created_at", dateTo);
    const { data: aggRaw } = aggQuery ? must(await aggQuery) : empty;
    const aggData = (aggRaw || []).map((p) => ({ createdAt: p.created_at, dealerAmount: Number(p.dealer_amount || 0) }));
    const monthlyMap = {};
    (aggData || []).forEach((p) => {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap[key]) monthlyMap[key] = { year: d.getFullYear(), month: d.getMonth(), amount: 0 };
      monthlyMap[key].amount += (p.dealerAmount || 0);
    });
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly = Object.values(monthlyMap).sort((a, b) => a.year - b.year || a.month - b.month).map((m) => ({
      month: months[m.month],
      label: `${months[m.month]} ${m.year}`,
      amount: m.amount,
    }));

    const totalAmount = payments.reduce((sum, p) => sum + (p.dealerAmount || 0), 0);

    res.json({
      success: true,
      total: totalAmount,
      monthly,
      count: payments.length,
      payments,
      pagination: { page, limit, total: total || 0, pages: Math.ceil((total || 0) / limit) },
    });
  }),
);

// =============================
// 🚗 MY LISTINGS (PAGINATED + CACHED)
// =============================
router.get(
  "/cars",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    let query = sb.from("cars").select("*", { count: 'exact' }).eq("dealer_id", req.user.id).order("created_at", { ascending: false }).range(skip, skip + limit - 1);
    if (req.query.sold === "true") query = query.eq("sold", true);
    if (req.query.active === "true") query = query.eq("sold", false);
    if (req.query.status) query = query.eq("status", req.query.status);
    if (req.query.search) {
      const q = `%${req.query.search}%`;
      query = query.or(`title.ilike.${q},brand.ilike.${q},model.ilike.${q},vin.ilike.${q}`);
    }
    const { data: cars, count: total } = must(await query);

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
// 📊 ANALYTICS (VIEWS, BIDS, TOP CARS, CONVERSION, PRICE COMPARISON, TIME TO SELL)
// =============================
router.get(
  "/analytics",
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;
    const periodDays = parseInt(req.query.days) || 30;
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const sb = getSupabase();
    const { data: dealerIdList } = must(await sb.from("cars").select("id").eq("dealer_id", dealerId));
    const dealerCarIds = (dealerIdList || []).map((r) => r.id);
    const dealerCars = await findAll("cars", { filters: { dealer: dealerId } });

    const totalViews = dealerCars.reduce((s, c) => s + (c.views || 0), 0);
    const totalCars = dealerCars.length;

    const fromStr = from.toISOString();
    const [totalBids, totalInquiries, totalFavorites, topCars] = await Promise.all([
      dealerCarIds.length > 0
        ? sb.from("bids").select("id", { count: 'exact', head: true }).in("car_id", dealerCarIds).gte("created_at", fromStr).then(countOf)
        : 0,
      dealerCarIds.length > 0
        ? sb.from("chats").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).gte("createdAt", fromStr).then(countOf)
        : 0,
      dealerCarIds.length > 0
        ? sb.from("favorites").select("id", { count: 'exact', head: true }).in("car_id", dealerCarIds).gte("created_at", fromStr).then(countOf)
        : 0,
      sb.from("cars").select("title,views,bids_count,favorites_count,current_bid,price,auction_status,status,created_at").eq("dealer_id", dealerId).order("views", { ascending: false }).order("bids_count", { ascending: false }).limit(10).then((r) => must(r).data || []).then((rows) => rows.map((c) => ({ title: c.title, views: c.views, bidsCount: c.bids_count, favoritesCount: c.favorites_count, currentBid: c.current_bid, price: c.price, auctionStatus: c.auction_status, status: c.status, createdAt: c.created_at }))),
    ]);

    // ── Price comparison ──────────────────────────────────────
    let priceComparison = [];
    if (dealerCars.length > 0) {
      const brandModelGroups = {};
      dealerCars.forEach(c => {
        if (c.brand && c.price) {
          const key = `${c.brand}|${c.model || 'all'}`;
          if (!brandModelGroups[key]) brandModelGroups[key] = { prices: [], brand: c.brand, model: c.model };
          brandModelGroups[key].prices.push(c.price);
        }
      });
      for (const [, group] of Object.entries(brandModelGroups)) {
        const avgPrice = Math.round(group.prices.reduce((a, b) => a + b, 0) / group.prices.length);
        let marketQuery = sb.from("cars").select("price").eq("brand", group.brand).gt("price", 0);
        if (group.model !== 'all') marketQuery = marketQuery.eq("model", group.model);
        const { data: marketPrices } = must(await marketQuery);
        const marketAvg = marketPrices && marketPrices.length > 0
          ? Math.round(marketPrices.reduce((s, c) => s + c.price, 0) / marketPrices.length)
          : null;
        priceComparison.push({
          brand: group.brand,
          model: group.model,
          dealerAvg: avgPrice,
          marketAvg,
          difference: marketAvg ? Math.round(((avgPrice - marketAvg) / marketAvg) * 100) : null,
          count: group.prices.length,
        });
      }
    }

    // ── Time to sell ──────────────────────────────────────────
    const soldCars = dealerCars.filter(c => c.sold && c.createdAt);
    const timeToSellByBrand = {};
    soldCars.forEach(c => {
      const brand = c.brand || 'Unknown';
      if (!timeToSellByBrand[brand]) timeToSellByBrand[brand] = { days: [], count: 0 };
      const days = Math.max(1, Math.round((new Date(c.updatedAt || Date.now()) - new Date(c.createdAt)) / 86400000));
      timeToSellByBrand[brand].days.push(days);
      timeToSellByBrand[brand].count++;
    });
    const timeToSell = Object.entries(timeToSellByBrand).map(([brand, data]) => ({
      brand,
      avgDays: Math.round(data.days.reduce((a, b) => a + b, 0) / data.days.length),
      count: data.count,
    }));

    // ── Monthly revenue ───────────────────────────────────────
    const { data: revData } = dealerCarIds.length ? must(await sb.from("payments").select("dealer_amount,created_at").in("car_id", dealerCarIds).eq("status", "success").gte("created_at", fromStr)) : { data: [] };
    const revMap = {};
    (revData || []).forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!revMap[key]) revMap[key] = { year: d.getFullYear(), month: d.getMonth() + 1, total: 0 };
      revMap[key].total += Number(p.dealer_amount || 0);
    });
    const monthlyRevenue = Object.values(revMap).sort((a, b) => a.year - b.year || a.month - b.month);

    res.json({
      success: true,
      analytics: {
        totalViews,
        totalBids,
        totalInquiries,
        totalFavorites,
        totalCars,
        conversionRates: {
          viewsToBids: totalViews > 0 ? Number(((totalBids / totalViews) * 100).toFixed(1)) : 0,
          viewsToInquiries: totalViews > 0 ? Number(((totalInquiries / totalViews) * 100).toFixed(1)) : 0,
          viewsToFavorites: totalViews > 0 ? Number(((totalFavorites / totalViews) * 100).toFixed(1)) : 0,
        },
        topCars,
        priceComparison,
        timeToSell,
        monthlyRevenue,
      },
    });
  }),
);

// =============================
// 📦 SUMMARY (FAST DASHBOARD) + CACHED
// =============================
router.get(
  "/summary",
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;

    const sb = getSupabase();
    const { data: idList } = must(await sb.from("cars").select("id").eq("dealer_id", dealerId));
    const dealerCarIds = (idList || []).map((r) => r.id);

    const [
      totalCars,
      soldCars,
      totalFromPayments,
      viewsFromCars,
      liveAuctions,
      pendingEscrows,
      pendingBids,
      draftCars,
      totalInquiries,
      totalFavorites,
      unreadMessages,
    ] = await Promise.all([
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).then(countOf),
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).eq("sold", true).then(countOf),

      dealerCarIds.length > 0
        ? sb.from("payments").select("dealer_amount").in("car_id", dealerCarIds).eq("status", "success").then((r) => (must(r).data || []).reduce((s, p) => s + Number(p.dealer_amount || 0), 0))
        : 0,

      sb.from("cars").select("views").eq("dealer_id", dealerId).then((r) => (must(r).data || []).reduce((s, c) => s + (c.views || 0), 0)),

      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).eq("auction_status", "live").then(countOf),

      sb.from("escrows").select("id", { count: 'exact', head: true }).eq("seller", dealerId).in("status", ["funded", "vehicle_confirmed", "delivered"]).then(countOf),

      dealerCarIds.length > 0
        ? sb.from("bids").select("id", { count: 'exact', head: true }).in("car_id", dealerCarIds).eq("status", "pending").then(countOf)
        : 0,

      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).eq("auction_status", "draft").then(countOf),

      dealerCarIds.length > 0
        ? sb.from("chats").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).then(countOf)
        : 0,

      dealerCarIds.length > 0
        ? sb.from("favorites").select("id", { count: 'exact', head: true }).in("car_id", dealerCarIds).then(countOf)
        : 0,

      // Unread = the dealer's per-conversation unread counters (messages carries no receiver column).
      sb.from("conversations").select("seller_unread_count").eq("seller_id", dealerId).then((r) => (must(r).data || []).reduce((s, c) => s + (c.seller_unread_count || 0), 0)),
    ]);

    const totalBids = dealerCarIds.length > 0
      ? await sb.from("bids").select("id", { count: 'exact', head: true }).in("car_id", dealerCarIds).then(countOf)
      : 0;

    res.json({
      success: true,
      summary: {
        totalCars,
        soldCars,
        activeCars: totalCars - soldCars,
        liveAuctions,
        totalRevenue: totalFromPayments,
        totalViews: viewsFromCars,
        totalBids,
        pendingEscrows,
        pendingBids,
        draftCars,
        totalInquiries,
        totalFavorites,
        unreadMessages,
      },
    });
  }),
);

// =============================
// ⚡ QUICK STATS (LIGHTWEIGHT) + CACHED
// =============================
router.get(
  "/quick-stats",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const sb = getSupabase();
    const [cars, sold] = await Promise.all([
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", req.user.id).then(countOf),
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", req.user.id).eq("sold", true).then(countOf),
    ]);

    res.json({
      success: true,
      stats: {
        cars,
        sold,
        active: cars - sold,
      },
    }    );
  }),
);

// =============================
// 🏆 DEALER MILESTONES + COMPLETION SCORE
// =============================
router.get(
  "/milestones",
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;

    const sb = getSupabase();
    // Raw PostgREST calls bypass utils/fieldMap, so they must use the real column names (cars.dealer_id,
    // cars.auction_status). The camelCase names made every call fail with 42703 (route answered 500).
    const { data: dealerCarIdRows } = must(await sb.from("cars").select("id").eq("dealer_id", dealerId));
    const dealerCarIds = (dealerCarIdRows || []).map((r) => r.id);
    // dealer_health_scores is an optional, display-only score; the table exists in production but no repository
    // migration creates it (docs/audits/08 SCH-101). A missing relation means "unscored", any other error surfaces.
    const optionalHealthScore = findOne("dealer_health_scores", { dealer: dealerId }).catch((e) => {
      if (/42P01|PGRST205|does not exist|schema cache/i.test(`${e?.code || ""} ${e?.message || ""}`)) return null;
      throw e;
    });

    const [totalCars, dealerProfile, verification, healthScore, totalInquiries, liveAuctions, soldAuctions] = await Promise.all([
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).then((r) => must(r).count || 0),
      findOne("dealers", { user: dealerId }),
      findOne("dealer_verifications", { user: dealerId }),
      optionalHealthScore,
      dealerCarIds.length > 0
        ? sb.from("chats").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).then((r) => must(r).count || 0)
        : 0,
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).eq("auction_status", "live").then((r) => must(r).count || 0),
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer_id", dealerId).eq("auction_status", "sold").then((r) => must(r).count || 0),
    ]);

    const milestones = [
      { key: "account_created", label: "Account Created", completed: true, icon: "🎉" },
      { key: "dealership_created", label: "Dealership Created", completed: !!(dealerProfile?.businessName), icon: "🏪" },
      { key: "first_vehicle", label: "First Vehicle Uploaded", completed: totalCars >= 1, icon: "🚗" },
      { key: "five_vehicles", label: "Five Vehicles Uploaded", completed: totalCars >= 5, icon: "🚙" },
      { key: "verification_submitted", label: "Verification Submitted", completed: !!verification, icon: "📄" },
      { key: "verification_approved", label: "Verification Approved", completed: verification?.verificationStatus === "approved", icon: "✅" },
    ];

    const completedCount = milestones.filter((m) => m.completed).length;

    res.json({
      success: true,
      milestones: {
        items: milestones,
        completionScore: Math.round((completedCount / milestones.length) * 100),
        completedCount,
        totalCount: milestones.length,
      },
      stats: {
        vehiclesCount: totalCars,
        leadsCount: totalInquiries,
        auctionsLive: liveAuctions,
        auctionsSold: soldAuctions,
        verificationStatus: verification?.verificationStatus || "none",
        profileHealth: {
          score: healthScore?.overallScore || 0,
          category: healthScore?.category || "unscored",
        },
      },
    });
  }),
);

// =============================
// ⚡ BIDS ON DEALER'S CARS
// =============================
router.get(
  "/bids",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    // Real column names (cars.dealer_id, bids.car_id/created_at); errors surface instead of becoming `null.map`.
    // Car and bidder details are read with two explicit lookups (no PostgREST embeds) so the response shape is unchanged.
    const { data: carRows } = must(await sb.from("cars").select("id,title,price,images").eq("dealer_id", req.user.id));
    const carsById = new Map((carRows || []).map((r) => [r.id, r]));
    const dealerCars = [...carsById.keys()];
    if (!dealerCars.length) return res.json({ success: true, bids: [], pagination: { page, limit, total: 0, pages: 0 } });

    let bidQuery = sb.from("bids").select("*").in("car_id", dealerCars).order("created_at", { ascending: false }).range(skip, skip + limit - 1);
    if (req.query.status) bidQuery = bidQuery.eq("status", req.query.status);
    const { data: bids } = must(await bidQuery);

    let countQuery = sb.from("bids").select("id", { count: 'exact', head: true }).in("car_id", dealerCars);
    if (req.query.status) countQuery = countQuery.eq("status", req.query.status);
    const { count: total } = must(await countQuery);

    const bidderIds = [...new Set((bids || []).map((b) => b.user_id).filter(Boolean))];
    const { data: bidders } = bidderIds.length ? must(await sb.from("users").select("id,name,email").in("id", bidderIds)) : { data: [] };
    const usersById = new Map((bidders || []).map((u) => [u.id, u]));

    const formatted = (bids || []).map((b) => {
      const car = carsById.get(b.car_id); const user = usersById.get(b.user_id);
      return {
        ...b,
        carId: car ? { title: car.title, price: car.price, images: car.images } : b.car_id,
        user: user ? { name: user.name, email: user.email } : b.user_id,
        carTitle: car?.title || "Unknown",
        carPrice: car?.price || 0,
        carImage: car?.images?.[0]?.url || null,
        bidderName: user?.name || "Anonymous",
        bidderEmail: user?.email || "",
      };
    });

    res.json({
      success: true,
      bids: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 🔒 ESCROWS WHERE DEALER IS SELLER (PAGINATED + CACHED)
// =============================
router.get(
  "/escrows",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    const { data: escrows, count: total } = await sb
      .from("escrows")
      .select("*, car:cars(title, price, images), buyer:users(name, email)", { count: 'exact' })
      .eq("seller", req.user.id)
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    res.json({
      success: true,
      escrows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 💳 DEALER SETTLEMENT CONFIG + CACHED
// =============================
// STAGE 5C: settlement details live in `dealers.payment_details` (jsonb, the same column the onboarding form fills). The previous
// handlers read/wrote users.mpesa_business / mpesa_business_name / bank_name / bank_account / payment_details, none of which exist
// in any migration (GET failed with "column not found"), and PUT called a local object named `update` as a function (TypeError),
// so no dealer could ever save settlement details. The API contract (field names) is unchanged; storage is mapped:
//   mpesaBusiness -> paymentDetails.paybillNumber   mpesaBusinessName -> paymentDetails.mpesaBusinessName
//   bankName      -> paymentDetails.bankName        bankAccount       -> paymentDetails.accountNumber
const SETTLEMENT_KEYS = ["bankName", "accountName", "accountNumber", "paybillNumber", "mpesaPhone", "mpesaBusinessName"];
const settlementView = (pd = {}) => ({
  mpesaBusiness: pd.paybillNumber || "",
  mpesaBusinessName: pd.mpesaBusinessName || "",
  paymentDetails: pd,
  bankName: pd.bankName || "",
  bankAccount: pd.accountNumber || "",
});
const cleanSettlementString = (v) => (typeof v === "string" ? v.trim().slice(0, 200) : null);

router.get(
  "/settlement",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const dealer = await findOne("dealers", { user: req.user.id });
    res.json({ success: true, settlement: settlementView(dealer?.paymentDetails || {}) });
  }),
);

router.put(
  "/settlement",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const dealer = await findOne("dealers", { user: req.user.id });
    if (!dealer) return res.status(404).json({ success: false, message: "Dealer profile not found" });

    const body = req.body || {};
    const incoming = {};
    const direct = { mpesaBusiness: "paybillNumber", mpesaBusinessName: "mpesaBusinessName", bankName: "bankName", bankAccount: "accountNumber" };
    for (const [field, key] of Object.entries(direct)) {
      if (body[field] === undefined) continue;
      const v = cleanSettlementString(body[field]);
      if (v === null) return res.status(400).json({ success: false, message: `${field} must be text` });
      incoming[key] = v;
    }
    if (body.paymentDetails !== undefined) {
      if (!body.paymentDetails || typeof body.paymentDetails !== "object" || Array.isArray(body.paymentDetails)) {
        return res.status(400).json({ success: false, message: "paymentDetails must be an object" });
      }
      for (const key of SETTLEMENT_KEYS) {
        if (body.paymentDetails[key] === undefined) continue;
        const v = cleanSettlementString(body.paymentDetails[key]);
        if (v === null) return res.status(400).json({ success: false, message: `paymentDetails.${key} must be text` });
        // explicit top-level fields win over the nested object
        if (!(key in incoming)) incoming[key] = v;
      }
    }
    if (!Object.keys(incoming).length) return res.status(400).json({ success: false, message: "No settlement fields supplied" });

    const merged = { ...(dealer.paymentDetails || {}), ...incoming };
    const saved = await update("dealers", dealer.id, { paymentDetails: merged });
    await logActionFromReq(req, "update_settlement", { details: { fields: Object.keys(incoming) } });
    res.json({ success: true, settlement: settlementView(saved?.paymentDetails || merged) });
  }),
);

// =============================
// 👤 DEALER PROFILE + CACHED
// =============================
// STAGE 5C: `users` has no businessAddress / dealerListingsCount / socialLinks / website / visibility columns (the old GET selected them,
// so it failed with "column not found"), and the old PUT shadowed `update` with a local object and then called it (TypeError). Only
// real columns are read/written; anything else the client sends is reported back as ignored instead of being silently "saved".
const DEALER_PROFILE_COLUMNS = ["name", "phone", "avatar", "businessName", "location", "bio"];
router.get(
  "/profile",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const user = await findById("users", req.user.id, [...DEALER_PROFILE_COLUMNS, "email", "dealerRating", "listingCount", "verifiedBuyer"].join(","));
    res.json({ success: true, profile: user });
  }),
);

router.put(
  "/profile",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const changes = {};
    for (const field of DEALER_PROFILE_COLUMNS) {
      if (req.body[field] !== undefined) changes[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
    const ignored = Object.keys(req.body || {}).filter((k) => !DEALER_PROFILE_COLUMNS.includes(k));
    if (!Object.keys(changes).length) {
      return res.status(400).json({ success: false, message: "No supported profile fields supplied", ignored });
    }
    const user = await update("users", req.user.id, changes);
    await logActionFromReq(req, "update_profile", { details: { fields: Object.keys(changes) } });
    res.json({ success: true, profile: user, ...(ignored.length ? { ignored } : {}) });
  }),
);

// ─────────────────────────────────────────────────────────────
// 👥 DEALER TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────
import crypto from "crypto";

// GET  /api/dealer/team          — list all team members (PAGINATED + CACHED)
router.get(
  "/team",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    const { data: members, count: total } = must(await sb
      .from("dealer_teams")
      .select("*, member:users!dealer_teams_member_fkey(name, email, phone, role, avatar)", { count: 'exact' })
      .eq("dealer", req.user.id)
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1));

    res.json({
      success: true,
      members,
      pagination: { page, limit, total: total || 0, pages: Math.ceil((total || 0) / limit) },
    });
  }),
);

// POST /api/dealer/team/invite   — invite by email (creates invite record)
router.post(
  "/team/invite",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { email, role = "sales_agent", permissions = {} } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Check if already in team

    const existing = await findOne("users", { email: email.toLowerCase().trim() });

    const token = crypto.randomBytes(24).toString("hex");
    const defaultPerms = {
      canListCars: true,
      canEditCars: true,
      canDeleteCars: false,
      canViewEarnings: role === "manager" || role === "finance_officer",
      canManageTeam: role === "manager",
      canApproveDeals: role === "manager",
      canChatBuyers: true,
      canEditSettings: false,
      ...permissions,
    };

    // Upsert — handles re-invite
    const sb = getSupabase();
    const { data: existingTeam } = await sb.from("dealer_teams").select("id").eq("dealer", req.user.id).eq("inviteEmail", email.toLowerCase().trim()).limit(1);
    const memberData = {
      dealer: req.user.id,
      member: existing?.id,
      role,
      permissions: defaultPerms,
      invitedBy: req.user.id,
      status: "invited",
      inviteEmail: email.toLowerCase().trim(),
      inviteToken: token,
    };
    let member;
    if (existingTeam && existingTeam.length > 0) {
      const { data: upd } = await sb.from("dealer_teams").update(memberData).eq("id", existingTeam[0].id).select().single();
      member = upd;
    } else {
      member = await create("dealer_teams", memberData);
    }

    deliver({
      channel: "email",
      eventType: "dealer.team_invite",
      category: "transactional",
      recipient: email.toLowerCase().trim(),
      subject: `You've been invited to ${req.user.name || "a KAYAD dealer team"}`,
      text: `You have been invited to join a KAYAD dealer team as ${role}. Use your invitation token to complete onboarding: ${token}`,
      html: `<p>You have been invited to join a KAYAD dealer team as <strong>${role}</strong>.</p><p>Use your invitation token to complete onboarding.</p>`,
      metadata: { dealerId: req.user.id, role, inviteToken: token },
    }).catch((e) => console.warn("⚠️ Team invite communication failed:", e.message));

    res.json({ success: true, member, inviteToken: token });
  }),
);

// PATCH /api/dealer/team/:memberId  — update role/permissions
router.patch(
  "/team/:memberId",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const record = await findOne("dealer_teams", { id: req.params.memberId, dealer: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Team member not found" });

    const updateData = {};
    const { role, permissions, status } = req.body;
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (status) updateData.status = status;
    const updated = await update("dealer_teams", req.params.memberId, updateData);

    await logActionFromReq(req, "team_update", {
      details: { teamMemberId: req.params.memberId, role, status },
    });

    res.json({ success: true, member: updated });
  }),
);

// DELETE /api/dealer/team/:memberId — remove from team
router.delete(
  "/team/:memberId",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const record = await findOne("dealer_teams", { id: req.params.memberId, dealer: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Not found" });
    await remove("dealer_teams", req.params.memberId);

    await logActionFromReq(req, "team_remove", {
      details: { teamMemberId: req.params.memberId, removedEmail: record.inviteEmail },
    });

    res.json({ success: true, message: "Removed from team" });
  }),
);

// =============================
// 🔄 DUPLICATE LISTING
// =============================
router.post(
  "/cars/:id/duplicate",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const { id, createdAt, updatedAt, ...carData } = car;
    const dup = await create("cars", {
      ...carData,
      title: `${car.title} (Copy)`,
      vin: undefined,
      chassisNumber: undefined,
      registrationNumber: undefined,
      views: 0,
      bidsCount: 0,
      favoritesCount: 0,
      auctionStatus: "draft",
      auctionStartTime: undefined,
      auctionEnd: undefined,
      currentBid: 0,
      winner: undefined,
      isPromoted: false,
      // STAGE 5: a duplicate is a NEW listing; it follows the owner's moderation policy.
      status: (await sellerMayPublishDirectly(req.user)) ? "available" : "pending",
    });

    await logActionFromReq(req, "duplicate_listing", {
      target: dup.id,
      targetModel: "Car",
      details: { originalId: req.params.id, newTitle: dup.title },
    });

    res.status(201).json({ success: true, car: dup });
  }),
);

// =============================
// 🗑️ BULK DELETE LISTINGS
// =============================
router.post(
  "/cars/bulk-delete",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }

    const sb = getSupabase();
    const { data: toDelete } = await sb.from("cars").select("id").in("id", ids).eq("dealer_id", req.user.id); // STAGE 5A: physical column is dealer_id
    const deleteIds = (toDelete || []).map((r) => r.id);
    if (deleteIds.length > 0) {
      await sb.from("cars").delete().in("id", deleteIds);
    }

    await logActionFromReq(req, "bulk_delete_listings", {
      details: { count: deleteIds.length, ids },
    });

    res.json({ success: true, deletedCount: deleteIds.length });
  }),
);

// =============================
// ✅ MARK LISTING AS SOLD
// =============================
router.patch(
  "/cars/:id/mark-sold",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { buyerName, buyerEmail, salePrice, saleNotes } = req.body;
    const existing = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!existing) return res.status(404).json({ success: false, message: "Car not found" });

    const car = await update("cars", req.params.id, {
      sold: true,
      status: "sold",
      saleDetails: { buyerName, buyerEmail, salePrice: salePrice || existing.price, saleNotes, soldAt: new Date().toISOString() },
    });

    await logActionFromReq(req, "mark_sold", {
      target: req.params.id,
      targetModel: "Car",
      details: { buyerName, salePrice },
    });

    res.json({ success: true, car });
  }),
);

// =============================
// 📋 BULK STATUS UPDATE
// =============================
router.patch(
  "/cars/bulk-status",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    // Seller-settable listing states. "rejected" is admin-moderation-only (it
    // freezes bidding — same rule as carController.updateCar), "reserved" belongs
    // to the sale/escrow flow, and anything else is outside the cars.status CHECK.
    // "active" is the dashboard's label for a live listing → canonical "available".
    const SELLER_SETTABLE_STATUSES = new Set(["available", "sold", "pending", "hidden", "draft"]);
    const status = req.body.status === "active" ? "available" : req.body.status;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ success: false, message: "ids (array) and status required" });
    }
    if (!SELLER_SETTABLE_STATUSES.has(status)) {
      return res.status(400).json({ success: false, code: "INVALID_LISTING_STATUS", message: "Unsupported listing status" });
    }
    // STAGE 5: sellers cannot self-publish when the owner holds listings for review.
    if (status === "available" && !(await sellerMayPublishDirectly(req.user))) {
      return res.status(403).json(PUBLICATION_REVIEW_REQUIRED);
    }
    const sb = getSupabase();
    // Own listings only; a listing rejected by moderation cannot be re-published here.
    const { data: toUpdate, error: selErr } = await sb
      .from("cars")
      .select("id,status")
      .in("id", ids)
      .eq("dealer_id", req.user.id); // STAGE 5A: physical column is dealer_id (cars.dealer does not exist)
    if (selErr) throw new Error(`Bulk status lookup failed: ${selErr.message}`);
    // STAGE 5A (Gate E): a sold listing's state belongs to the sale/escrow workflow; a seller bulk edit must not hide, re-open
    // or re-publish it (same invariant as utils/carModerationGuard.js for admin paths).
    const updateIds = (toUpdate || []).filter((r) => r.status !== "rejected" && r.status !== "sold").map((r) => r.id);
    let modified = 0;
    if (updateIds.length > 0) {
      const { error: updErr } = await sb.from("cars").update({ status }).in("id", updateIds);
      // Do not report success for a write that did not persist.
      if (updErr) throw new Error(`Bulk status update failed: ${updErr.message}`);
      modified = updateIds.length;
    }

    await logActionFromReq(req, "bulk_status_update", {
      details: { ids, status, modified },
    });

    res.json({ success: true, modified });
  }),
);

// =============================
// 🏆 ACCEPT BID (SOLD TO BIDDER)
// =============================
router.post(
  "/cars/:id/accept-bid",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    if (car.sold) return res.status(400).json({ success: false, message: "Already sold" });

    const bid = await findOne("bids", { id: bidId, carId: car.id });
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

    const result = await closeAuction(req.params.id, {
      req,
      actor: req.user,
      reason: "dealer_accept_bid",
      winnerBidId: bidId,
    });
    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: result.message || "Failed to accept bid" });
    }
    const updatedCar = await findOne("cars", { id: req.params.id });

    // Notify winner
    try {
      await sendNotification({
        userId: bid.user,
        title: "Bid Accepted!",
        message: `Your bid on ${car.title} has been accepted`,
        type: "bid",
      }).catch((e) => console.warn("Sale notif failed:", e.message));
    } catch {
      /* non-critical */
    }

    await logActionFromReq(req, "accept_bid", {
      target: req.params.id,
      targetModel: "Car",
      details: { bidId, bidder: bid.user, amount: bid.amount },
    });

    res.json({ success: true, car: updatedCar, bid, result });
  }),
);

// =============================
// ❌ REJECT BID
// =============================
router.post(
  "/cars/:id/reject-bid",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const bid = await findOne("bids", { id: bidId, carId: car.id });
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

    await update("bids", bidId, { status: "failed", isWinningBid: false });

    // Notify bidder
    try {
      if (typeof sendNotification === "function") {
        sendNotification(
          bid.user,
          `Your bid of KES ${Number(bid.amount).toLocaleString()} on ${car.title} was declined.`,
        ).catch((e) => console.warn("⚠️ Bid decline notification failed:", e.message));
      }
    } catch {
      /* non-critical */
    }

    await logActionFromReq(req, "reject_bid", {
      target: req.params.id,
      targetModel: "Car",
      details: { bidId, bidder: bid.user, amount: bid.amount },
    });

    res.json({ success: true, message: "Bid rejected" });
  }),
);

// =============================
// 🔨 DEALER AUCTION CONTROLS
// =============================
// Canonical engine only: auction state lives on the cars row, closing
// goes through services/auctionClose.service.js.

// 🚀 Start auction on dealer's own car
router.post(
  "/cars/:id/auction/start",
  requireDealerVerification,
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (car.auctionStatus === "live") {
      return res.status(400).json({ success: false, message: "Auction already live" });
    }

    const dealer = await findById("users", car.dealer, "commissionBalance,listingsLocked");
    if (dealer && dealer.listingsLocked && dealer.commissionBalance > 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot start auction — outstanding commission balance and listings are locked.",
      });
    }

    const setup = await findOne("auction_setups", { car_id: req.params.id });
    if (!setup || setup.publication_status !== "published") {
      return res.status(409).json({ success: false, message: "Auction must be published through the auction setup wizard before it can start." });
    }

    const config = setup.config || {};
    const startAt = config.startsAt ? new Date(config.startsAt) : null;
    const endAt = config.endsAt ? new Date(config.endsAt) : null;
    if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return res.status(409).json({ success: false, message: "Published auction has no valid schedule." });
    }
    if (Date.now() < startAt.getTime()) {
      return res.status(409).json({ success: false, code: "AUCTION_SCHEDULED", message: `Auction is scheduled to start at ${startAt.toISOString()}.` });
    }
    const durationMs = endAt.getTime() - Date.now();

    // Published configuration is authoritative; callers cannot override
    // economics by posting different values to the legacy start endpoint.
    const startingBidVal = Number(config.startingBid) || 0;
    const reserveVal = config.reservePrice === null || config.reservePrice === undefined ? null : Number(config.reservePrice);
    const reserveModeVal = config.reserveMode || "none";

    const result = await startAuction({
      carId: req.params.id,
      durationMs,
      scheduledEndAt: endAt.toISOString(),
      startingBid: startingBidVal,
      reservePrice: reserveVal,
      reserveMode: reserveModeVal,
      req,
    });

    res.json({
      success: true,
      message: "Auction started",
      endTime: result.auction_end,
      reservePrice: result.reserve_price,
      result,
    });
  }),
);

// 🏁 End auction on dealer's own car
router.post(
  "/cars/:id/auction/end",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (car.auctionStatus !== "live") {
      return res.status(400).json({ success: false, message: "Auction is not live" });
    }

    // Canonical close: winner determination, loser handling, audit
    // trail, and realtime notification all happen in one place.
    const result = await closeAuction(req.params.id, { req, actor: req.user, reason: "dealer_end" });

    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: "Failed to end auction" });
    }

    res.json({ success: true, result });
  }),
);

// ⏱ Extend auction (max 3 extensions per auction)
router.post(
  "/cars/:id/auction/extend",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { hours } = req.body;
    if (!hours) return res.status(400).json({ success: false, message: "hours required" });

    if (hours < 1 || hours > 72) {
      return res.status(400).json({ success: false, message: "Extension must be between 1 and 72 hours" });
    }

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id, auctionStatus: "live" });
    if (!car) return res.status(404).json({ success: false, message: "Car not found or auction not live" });

    // Published auction configuration is the source of truth for the
    // maximum extension count. The DB-atomic function re-checks it while
    // holding the auction row lock, so this is only a fast UX guard.
    const setup = await findOne("auction_setups", { car_id: req.params.id, publication_status: "published" });
    const maxExtensions = Math.max(0, Math.min(10, Number(setup?.config?.maxExtensions ?? 3)));
    const extensionCount = Number(car.extensionCount || 0);
    if (extensionCount >= maxExtensions) {
      return res.status(400).json({ success: false, message: `Maximum ${maxExtensions} extensions per auction reached` });
    }

    // Canonical atomic extension. The RPC owns extensionCount and
    // auctionEnd so concurrent extensions cannot overwrite one another.
    const result = await extendAuction({
      carId: req.params.id,
      extraMs: hours * 60 * 60 * 1000,
      req,
      reason: "auction_extend",
    });

    res.json({
      success: true,
      newEndTime: result.auction_end,
      extensionsUsed: result.extension_count,
      result,
    });
  }),
);

// =============================
// 💸 DEALER PAYOUT
// =============================
router.post(
  "/payouts/:escrowId/initiate",
  asyncHandler(async (req, res) => {
    const escrowId = req.params.escrowId;
    const escrow = await findById("escrows", escrowId);
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });
    if (String(escrow.seller) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Escrow does not belong to this dealer" });
    }

    const dealer = await findById("users", req.user.id, "phone");
    if (!dealer?.phone) return res.status(400).json({ success: false, message: "A dealer payout phone number is required" });

    const { data: prepared, error: prepareError } = await getSupabase().rpc("kayad_prepare_dealer_payout_atomic", {
      p_escrow: escrowId,
      p_dealer: req.user.id,
      p_phone: dealer.phone,
    });
    if (prepareError) throw prepareError;

    const payout = prepared?.payout;
    if (!payout?.id) return res.status(500).json({ success: false, message: "Payout preparation failed" });

    if (prepared.idempotent && ["processing", "paid"].includes(payout.status)) {
      return res.json({ success: true, payout, idempotent: true });
    }

    const result = await disburseB2C({
      phone: dealer.phone,
      amount: payout.net_amount,
      escrowId,
      payoutId: payout.id,
      sellerName: dealer.name,
      idempotencyKey: payout.id,
    });

    return res.json({ success: true, payout: result.payout || payout, provider: result });
  }),
);

// =============================
// 📦 SELF-SERVICE PLAN UPGRADE
// =============================
router.post(
  "/upgrade",
  asyncHandler(async (req, res) => {
    const { planId, phone } = req.body || {};
    if (!planId) return res.status(400).json({ success: false, message: "planId is required" });
    if (!/^2547\d{8}$/.test(String(phone || ""))) {
      return res.status(400).json({ success: false, message: "Phone must be a valid Kenyan number in 2547XXXXXXXX format" });
    }

    const result = await initiateDealerUpgrade({
      dealerId: req.user.id,
      planId: String(planId),
      phone: String(phone),
      initiatePayment,
    });

    res.status(202).json({
      success: true,
      checkoutRequestID: result.payment.checkoutRequestID,
      mode: result.payment.mode,
      message: "STK push sent. Enter PIN on your phone.",
      paymentId: result.payment.payment?.id || result.payment.id,
      plan: result.plan,
    });
  }),
);

// =============================
// 🔄 TOGGLE WHOLESALE
// =============================
router.patch(
  "/cars/:id/wholesale",
  asyncHandler(async (req, res) => {
    const existing = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!existing) return res.status(404).json({ success: false, message: "Car not found" });
    let car;
    try {
      car = await update("cars", req.params.id, { wholesale: req.body.wholesale === true });
    } catch (e) {
      if (WHOLESALE_UNSUPPORTED.test(`${e?.code || ""} ${e?.message || ""}`) || !e?.message) return res.status(503).json({ success: false, code: "TRADE_LISTINGS_UNAVAILABLE", message: "Dealer trade listings are not available on this deployment yet." });
      throw e;
    }
    res.json({ success: true, car });
  }),
);

// =============================
// 🏪 DEALER-TO-DEALER LISTINGS
// =============================
router.get(
  "/trade-listings",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const sb = getSupabase();
    // STAGE 5C: public.cars has no `wholesale` column in the repository schema, so this query used to fail inside PostgREST and the route
    // answered 200 with `cars` undefined. Say so explicitly instead of pretending the trade marketplace is empty.
    let qb = sb.from("cars").select("*, dealer:users!cars_dealer_id_fkey(name, business_name, location)", { count: 'exact' }).eq("wholesale", true).order("created_at", { ascending: false }).range(skip, skip + limit - 1);
    if (req.query.search) {
      const s = `%${req.query.search}%`;
      qb = qb.or(`title.ilike.${s},brand.ilike.${s},model.ilike.${s}`);
    }
    const { data: cars, count: total, error } = await qb;
    if (error) {
      if (WHOLESALE_UNSUPPORTED.test(`${error.code || ""} ${error.message || ""}`) || !error.message) return res.status(503).json({ success: false, code: "TRADE_LISTINGS_UNAVAILABLE", message: "Dealer trade listings are not available on this deployment yet." });
      throw error;
    }
    res.json({ success: true, cars, pagination: { page, limit, total: total || 0, pages: Math.ceil((total || 0) / limit) } });
  }),
);

// =============================
// 💰 PRICING RECOMMENDATIONS
// =============================
router.post(
  "/pricing-recommendations",
  asyncHandler(async (req, res) => {
    const result = await getPricingRecommendations(req.body);
    res.json({ success: true, ...result });
  }),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Dealer route not found",
  });
});

export default router;
