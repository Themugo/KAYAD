import crypto from "crypto";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findAll, findById, findOne, create, update, count, upsert, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

const THRESHOLDS = {
  SELF_BID_MIN_AMOUNT: parseFloat(process.env.AI_SELF_BID_MIN || "1000"),
  RELATED_ACCOUNT_MIN_BIDS: parseInt(process.env.AI_RELATED_MIN_BIDS || "2"),
  BID_INFLATION_MIN_PARTICIPANTS: parseInt(process.env.AI_INFLATION_MIN_PARTICIPANTS || "2"),
  BID_INFLATION_MIN_SEQUENCE: parseInt(process.env.AI_INFLATION_MIN_SEQUENCE || "3"),
  VELOCITY_BURST_COUNT: parseInt(process.env.AI_VELOCITY_BURST_COUNT || "5"),
  VELOCITY_WINDOW_SECONDS: parseInt(process.env.AI_VELOCITY_WINDOW_SEC || "60"),
  LAST_SECOND_WINDOW_SECONDS: parseInt(process.env.AI_LAST_SECOND_WINDOW_SEC || "10"),
  LAST_SECOND_REPEAT_THRESHOLD: parseInt(process.env.AI_LAST_SECOND_REPEAT || "3"),
};

const SCORE_WEIGHTS = {
  self_bidding: { low: 30, medium: 55, high: 75, critical: 95 },
  related_account: { low: 25, medium: 50, high: 70, critical: 90 },
  bid_inflation: { low: 20, medium: 45, high: 65, critical: 85 },
  bid_velocity: { low: 15, medium: 35, high: 55, critical: 75 },
  last_second_manipulation: { low: 20, medium: 40, high: 60, critical: 80 },
};

const resolveSeverity = (score) => {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
};

const generateFlagId = (category) => {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `flag-${category}-${suffix}`;
};

const upsertRiskProfile = async (userId, role, updates) => {
  try {
    const existing = await findOne("auction_risk_profiles", {user: userId, role});
    if (!existing) {
      await create("auction_risk_profiles", {user: userId, role, ...updates, lastScoreUpdate: new Date().toISOString()});
      return;
    }
    // Increment numeric fields
    const incData = {};
    for (const [k, v] of Object.entries(updates)) {
      incData[k] = (existing[k] || 0) + v;
    }
    await update("auction_risk_profiles", existing.id, { ...incData, lastScoreUpdate: new Date().toISOString() });
  } catch (err) {
    logWarn("Risk profile upsert failed", { userId, role, error: err.message });
  }
};

const recalculateRiskScore = async (userId, role) => {
  try {
    const profile = await findOne("auction_risk_profiles", {user: userId, role});
    if (!profile) return;

    const selfWeight = profile.selfBidCount * 25;
    const relatedWeight = profile.relatedAccountCount * 20;
    const inflationWeight = profile.inflationPatternCount * 20;
    const velocityWeight = profile.velocityAbuseCount * 15;
    const lastSecondWeight = profile.lastSecondCount * 15;
    const recentBidRatio = profile.recentBids7d > 50
      ? Math.min((profile.recentBids7d / profile.totalBids) * 20, 20)
      : 0;

    let score = Math.min(
      selfWeight + relatedWeight + inflationWeight + velocityWeight + lastSecondWeight + recentBidRatio,
      100,
    );

    const tier = resolveSeverity(score);
    if (profile) {
      await update("auction_risk_profiles", profile.id, { riskScore: Math.round(score), riskTier: tier, lastScoreUpdate: new Date().toISOString() });
    }
  } catch (err) {
    logWarn("Risk profile recalc failed", { userId, role, error: err.message });
  }
};

// =============================
// 🔍 DETECTION: SELF-BIDDING
// =============================
const auctionCars = async (extraFilters = {}) => findAll("cars", {
  filters: {
    deletedAt: null,
    auctionStatus: { $in: ["live", "ended"] },
    ...extraFilters,
  },
  select: "id,dealer,auctionStatus,auctionEnd,currentBid,startingBid,reservePrice,highestBidderId,bidsCount,winner,paymentStatus,isPaid",
});

const recentAuctionBids = async (carId, scanUntil) => findAll("bids", {
  filters: {
    carId,
    createdAt: { $gte: scanUntil },
    status: { $in: ["paid", "pending"] },
  },
  orderBy: "createdAt",
  ascending: true,
});

// =============================
// 🔍 DETECTION: SELF-BIDDING
// =============================
const detectSelfBidding = async (scanUntil) => {
  const anomalies = [];
  const cars = await auctionCars();
  const seen = new Set();

  for (const car of cars) {
    if (!car.dealer) continue;
    const bids = await recentAuctionBids(car.id, scanUntil);
    for (const bid of bids) {
      const bidderId = bid.user?.id || bid.user;
      if (!bidderId || String(bidderId) !== String(car.dealer)) continue;
      const dedupKey = `${bidderId}-${car.id}-self_bid`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const existing = await findOne("auction_integrity_flags", { targetUser: bidderId, auction: car.id, category: "self_bidding", status: { $in: ["detected", "under_review", "confirmed"] } });
      if (existing) continue;
      anomalies.push({
        flagId: generateFlagId("self_bidding"), category: "self_bidding", severity: "high",
        riskScore: SCORE_WEIGHTS.self_bidding.high, status: "detected", targetUser: bidderId,
        targetUserRole: "seller", auction: car.id,
        summary: `Seller bid on own auction — KES ${Number(bid.amount || 0).toLocaleString("en-KE")}`,
        evidence: { bidderId, dealerId: car.dealer, carId: car.id, bidAmount: bid.amount, bidId: bid.id },
        riskFactors: [{ factor: "seller_bid_on_own_auction", score: SCORE_WEIGHTS.self_bidding.high, detail: "Seller bid detected on the canonical vehicle auction" }],
        detectionRules: ["self_bidding_seller_check"],
      });
      await upsertRiskProfile(bidderId, "seller", { selfBidCount: 1 });
    }
  }
  return anomalies;
};

// =============================
// 🔍 DETECTION: RELATED-ACCOUNT BIDDING
// =============================
const detectRelatedAccountBidding = async (scanUntil) => {
  const anomalies = [];
  const groups = await aggregate("bids", [
    { $match: { createdAt: { $gte: scanUntil }, status: { $in: ["paid", "pending"] } } },
    { $group: { _id: "$carId", bidders: { $addToSet: "$user" }, bidCount: { $sum: 1 } } },
    { $match: { bidCount: { $gte: 2 } } },
  ]);

  for (const group of groups) {
    const bidders = (group.bidders || []).filter(Boolean);
    if (bidders.length < 2) continue;
    const users = await findAll("users", { filters: { id: { $in: bidders } }, select: "id,name,email,phone,referredBy" });
    const phoneMap = {}, referralMap = {};
    for (const u of users) {
      const uid = String(u.id);
      if (u.phone) {
        const phone = String(u.phone).replace(/[^0-9]/g, "").slice(-9);
        if (!phoneMap[phone]) phoneMap[phone] = [];
        phoneMap[phone].push(uid);
      }
      if (u.referredBy) {
        const ref = String(u.referredBy);
        if (!referralMap[ref]) referralMap[ref] = [];
        referralMap[ref].push(uid);
      }
    }
    for (const [type, map] of [["shared_phone", phoneMap], ["shared_referrer", referralMap]]) {
      for (const values of Object.values(map)) {
        if (values.length < 2) continue;
        for (const uid of values) {
          const existing = await findOne("auction_integrity_flags", { targetUser: uid, auction: group.id, category: "related_account", status: { $in: ["detected", "under_review", "confirmed"] } });
          if (existing) continue;
          anomalies.push({
            flagId: generateFlagId("related_account"), category: "related_account", severity: "medium",
            riskScore: SCORE_WEIGHTS.related_account.medium, status: "detected", targetUser: uid,
            targetUserRole: "bidder", auction: group.id,
            summary: `Bidder account relationship detected (${type.replace("_", " ")})`,
            evidence: { auctionId: group.id, users: values, relationship: type },
            riskFactors: [{ factor: "related_account_bidding", score: SCORE_WEIGHTS.related_account.medium, detail: `Accounts share ${type.replace("_", " ")}` }],
            detectionRules: ["related_account_relationship_check"],
          });
          await upsertRiskProfile(uid, "bidder", { relatedAccountCount: 1 });
        }
      }
    }
  }
  return anomalies;
};

// =============================
// 🔍 DETECTION: BID INFLATION
// =============================
const detectBidInflation = async (scanUntil) => {
  const anomalies = [];
  const cars = await auctionCars();
  for (const car of cars) {
    const bids = await recentAuctionBids(car.id, scanUntil);
    if (bids.length < THRESHOLDS.BID_INFLATION_MIN_SEQUENCE) continue;
    const bidderCounts = {};
    bids.forEach((b) => { const uid = b.user?.id || b.user; if (uid) bidderCounts[uid] = (bidderCounts[uid] || 0) + 1; });
    const sorted = Object.entries(bidderCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length < 2) continue;
    const topRatio = sorted[0][1] / bids.length;
    if (topRatio <= 0.5) continue;
    const severity = topRatio > 0.8 ? "high" : "medium";
    const scoreVal = topRatio > 0.8 ? SCORE_WEIGHTS.bid_inflation.high : SCORE_WEIGHTS.bid_inflation.medium;
    const existing = await findOne("auction_integrity_flags", { auction: car.id, category: "bid_inflation", status: { $in: ["detected", "under_review", "confirmed"] } });
    if (existing) continue;
    const first = Number(car.startingBid || car.price || 0);
    const last = Number(car.currentBid || bids[bids.length - 1]?.amount || 0);
    anomalies.push({
      flagId: generateFlagId("bid_inflation"), category: "bid_inflation", severity, riskScore: scoreVal, status: "detected",
      targetUser: sorted[0][0], targetUserRole: "bidder", auction: car.id,
      summary: `Bid concentration risk on auction ${car.id}`,
      evidence: { auctionId: car.id, bidCount: bids.length, topBidder: sorted[0][0], topBidCount: sorted[0][1], concentration: topRatio, startingBid: first, highestBid: last },
      riskFactors: [{ factor: "bid_inflation", score: scoreVal, detail: `${Math.round(topRatio * 100)}% of recent bids came from one bidder` }],
      detectionRules: ["bid_concentration_check"],
    });
    await upsertRiskProfile(sorted[0][0], "bidder", { inflationPatternCount: 1 });
  }
  return anomalies;
};

// =============================
// 🔍 DETECTION: BID VELOCITY ABUSE
// =============================
const detectBidVelocityAbuse = async (scanUntil) => {
  const anomalies = [];
  const groups = await aggregate("bids", [
    { $match: { createdAt: { $gte: scanUntil }, status: { $in: ["paid", "pending"] } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: { user: "$user", carId: "$carId" }, bids: { $push: { _id: "$id", amount: "$amount", createdAt: "$createdAt" } }, bidCount: { $sum: 1 } } },
    { $match: { bidCount: { $gte: THRESHOLDS.VELOCITY_BURST_COUNT } } },
  ]);
  for (const group of groups) {
    const bids = (group.bids || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (let i = 0; i <= bids.length - THRESHOLDS.VELOCITY_BURST_COUNT; i++) {
      const window = bids.slice(i, i + THRESHOLDS.VELOCITY_BURST_COUNT);
      const first = new Date(window[0].createdAt).getTime(), last = new Date(window[window.length - 1].createdAt).getTime();
      const elapsedSec = (last - first) / 1000;
      if (elapsedSec > THRESHOLDS.VELOCITY_WINDOW_SECONDS) continue;
      const userId = group.id.user, auctionId = group.id.carId;
      const existing = await findOne("auction_integrity_flags", { targetUser: userId, auction: auctionId, category: "bid_velocity", status: { $in: ["detected", "under_review", "confirmed"] } });
      if (existing) break;
      const severity = elapsedSec <= 10 ? "critical" : elapsedSec <= 30 ? "high" : "medium";
      const scoreVal = SCORE_WEIGHTS.bid_velocity[severity];
      anomalies.push({ flagId: generateFlagId("bid_velocity"), category: "bid_velocity", severity, riskScore: scoreVal, status: "detected", targetUser: userId, targetUserRole: "bidder", auction: auctionId, summary: `${THRESHOLDS.VELOCITY_BURST_COUNT} bids in ${elapsedSec.toFixed(0)}s — velocity abuse`, evidence: { userId, auctionId, bidCount: THRESHOLDS.VELOCITY_BURST_COUNT, windowSeconds: elapsedSec, bidSequence: window }, riskFactors: [{ factor: "bid_velocity", score: scoreVal, detail: `${THRESHOLDS.VELOCITY_BURST_COUNT} bids in ${elapsedSec.toFixed(0)}s` }], detectionRules: ["bid_velocity_burst_check"] });
      await upsertRiskProfile(userId, "bidder", { velocityAbuseCount: 1, recentBids24h: THRESHOLDS.VELOCITY_BURST_COUNT });
      break;
    }
  }
  return anomalies;
};

// =============================
// 🔍 DETECTION: LAST-SECOND MANIPULATION
// =============================
const detectLastSecondManipulation = async (scanUntil) => {
  const anomalies = [];
  const cars = await auctionCars();
  for (const car of cars) {
    if (!car.auctionEnd) continue;
    const endMs = new Date(car.auctionEnd).getTime();
    const bids = await recentAuctionBids(car.id, scanUntil);
    const lateBids = bids.filter((b) => {
      const bidMs = new Date(b.createdAt).getTime();
      const secBeforeEnd = (endMs - bidMs) / 1000;
      return bidMs >= scanUntil.getTime() && secBeforeEnd >= 0 && secBeforeEnd <= THRESHOLDS.LAST_SECOND_WINDOW_SECONDS;
    });
    const byUser = {};
    for (const bid of lateBids) { const uid = bid.user?.id || bid.user; if (uid) (byUser[uid] ||= []).push(bid); }
    for (const [userId, userBids] of Object.entries(byUser)) {
      const secBeforeEnd = Math.round((endMs - new Date(userBids[0].createdAt).getTime()) / 1000);
      let severity = secBeforeEnd <= 3 ? "critical" : secBeforeEnd <= 5 ? "high" : "medium";
      let scoreVal = SCORE_WEIGHTS.last_second_manipulation[severity];
      if (userBids.length >= THRESHOLDS.LAST_SECOND_REPEAT_THRESHOLD) { severity = severity === "medium" ? "high" : severity; scoreVal = Math.min(scoreVal + 10, 100); }
      const existing = await findOne("auction_integrity_flags", { targetUser: userId, auction: car.id, category: "last_second_manipulation", status: { $in: ["detected", "under_review", "confirmed"] } });
      if (existing) continue;
      anomalies.push({ flagId: generateFlagId("last_second_manipulation"), category: "last_second_manipulation", severity, riskScore: scoreVal, status: "detected", targetUser: userId, targetUserRole: "bidder", auction: car.id, summary: `Bid placed ${secBeforeEnd}s before auction end — manipulation risk`, evidence: { userId, auctionId: car.id, secondsBeforeEnd: secBeforeEnd, endTime: car.auctionEnd, lateBidCount: userBids.length, lateBids: userBids }, riskFactors: [{ factor: "last_second_bid", score: scoreVal, detail: `${secBeforeEnd}s before end` }, { factor: "repeat_late_bids", score: 10, detail: `${userBids.length} late bids in this auction` }], detectionRules: ["last_second_bid_window_check"] });
      await upsertRiskProfile(userId, "bidder", { lastSecondCount: userBids.length, lastSecondBids30d: userBids.length });
    }
  }
  return anomalies;
};

// =============================
// 🚀 RUN ALL DETECTIONS
// =============================
export const runIntegrityScan = async ({ scanWindowHours = 24, saveResults = true } = {}) => {
  const scanUntil = new Date(Date.now() - scanWindowHours * 3600000);
  const allFlags = [];
  const results = { detected: 0, categories: {} };

  logInfo("Integrity scan started", { scanWindowHours, from: scanUntil.toISOString() });

  try {
    const detections = await Promise.allSettled([
      detectSelfBidding(scanUntil),
      detectRelatedAccountBidding(scanUntil),
      detectBidInflation(scanUntil),
      detectBidVelocityAbuse(scanUntil),
      detectLastSecondManipulation(scanUntil),
    ]);

    for (const result of detections) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allFlags.push(...result.value);
      } else if (result.status === "rejected") {
        logError("Integrity detector failed", { error: result.reason?.message });
      }
    }

    if (saveResults && allFlags.length > 0) {
      await (await Promise.all(allFlags, { ordered: false }.map(item => create("auction_integrity_flags", item))));
    }

    for (const flag of allFlags) {
      results.categories[flag.category] = (results.categories[flag.category] || 0) + 1;
      await recalculateRiskScore(flag.targetUser, flag.targetUserRole || "bidder");
    }

    results.detected = allFlags.length;
    logInfo("Integrity scan complete", { detected: results.detected, categories: results.categories });
    return results;
  } catch (err) {
    logError("Integrity scan engine failed", err);
    throw err;
  }
};

// =============================
// 🔍 SINGLE AUCTION CHECK
// =============================
export const checkAuctionForIntegrity = async (auctionId) => {
  const car = await findById("cars", auctionId);
  if (!car || !["live", "ended"].includes(car.auctionStatus)) throw new Error("Auction not found");
  const flags = [];
  const existing = await findOne("auction_integrity_flags", { auction: auctionId, category: "self_bidding", status: { $in: ["detected", "under_review", "confirmed"] } });
  if (!existing && car.dealer) {
    const recentBids = await findAll("bids", { filters: { carId: auctionId, status: "paid" }, orderBy: "createdAt", ascending: false, limit: 10 });
    for (const bid of recentBids) {
      const bidderId = bid.user?.id || bid.user;
      if (bidderId && String(bidderId) === String(car.dealer)) {
        flags.push({ flagId: generateFlagId("self_bidding"), category: "self_bidding", severity: "high", riskScore: SCORE_WEIGHTS.self_bidding.high, targetUser: bidderId, targetUserRole: "seller", auction: auctionId, summary: `Seller bid on own auction — KES ${Number(bid.amount || 0).toLocaleString("en-KE")}`, evidence: { bidderId, dealerId: car.dealer, carId: auctionId, bidAmount: bid.amount }, riskFactors: [{ factor: "seller_bid_on_own_auction", score: SCORE_WEIGHTS.self_bidding.high, detail: "Self-bid detected" }], detectionRules: ["realtime_self_bid_check"] });
        break;
      }
    }
  }
  return flags;
};

// =============================
// 📊 DASHBOARD AGGREGATION
// =============================
export const getIntegrityDashboard = async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [totalFlags, openFlags, categoryCounts, severityCounts, todayCount, weekTrend, topRisks] =
    await Promise.all([
      count("auction_integrity_flags", ),
      count("auction_integrity_flags", { status: { $in: ["detected", "under_review"] } }),
      aggregate("auction_integrity_flags", [
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      aggregate("auction_integrity_flags", [
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      count("auction_integrity_flags", { createdAt: { $gte: todayStart } }),
      aggregate("auction_integrity_flags", [
        { $match: { createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      findAll("auction_risk_profiles", { orderBy: "riskScore", ascending: false, limit: 10 }),
    ]);

  return {
    totalFlags,
    openFlags,
    todayCount,
    categoryBreakdown: categoryCounts,
    severityBreakdown: severityCounts,
    weeklyTrend: weekTrend,
    topRiskProfiles: topRisks,
    scanStatus: {
      lastScan: now.toISOString(),
      nextScheduledScan: new Date(now.getTime() + 4 * 3600000).toISOString(),
    },
  };
};
