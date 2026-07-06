import crypto from "crypto";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import AuctionIntegrityFlag from "../models/AuctionIntegrityFlag.js";
import AuctionRiskProfile from "../models/AuctionRiskProfile.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

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
    const existing = await AuctionRiskProfile.findOne({ user: userId, role });
    if (!existing) {
      await AuctionRiskProfile.create({ user: userId, role, ...updates, lastScoreUpdate: new Date() });
      return;
    }
    await AuctionRiskProfile.findOneAndUpdate(
      { user: userId, role },
      { $inc: updates, lastScoreUpdate: new Date() },
      { upsert: true },
    );
  } catch (err) {
    logWarn("Risk profile upsert failed", { userId, role, error: err.message });
  }
};

const recalculateRiskScore = async (userId, role) => {
  try {
    const profile = await AuctionRiskProfile.findOne({ user: userId, role });
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
    await AuctionRiskProfile.findOneAndUpdate(
      { user: userId, role },
      { riskScore: Math.round(score), riskTier: tier, lastScoreUpdate: new Date() },
    );
  } catch (err) {
    logWarn("Risk profile recalc failed", { userId, role, error: err.message });
  }
};

// =============================
// 🔍 DETECTION: SELF-BIDDING
// =============================
const detectSelfBidding = async (scanUntil) => {
  const anomalies = [];

  const recentBids = await Bid.find({
    createdAt: { $gte: scanUntil },
    status: { $in: ["paid", "pending"] },
  })
    .populate({ path: "carId", select: "dealer" })
    .populate({ path: "user", select: "name email phone" })
    .lean();

  const auctionOwners = {};
  const activeAuctions = await Auction.find({
    status: { $in: ["active", "ended"] },
  })
    .select("carId createdBy")
    .lean();

  for (const a of activeAuctions) {
    auctionOwners[a._id.toString()] = a.createdBy;
  }

  const carDealers = {};
  for (const a of activeAuctions) {
    if (a.carId) {
      const carId = a.carId.toString();
      try {
        const car = await Car.findById(a.carId).select("dealer").lean();
        if (car && car.dealer) {
          carDealers[carId] = car.dealer.toString();
        }
      } catch {
        continue;
      }
    }
  }

  const seen = new Set();

  for (const bid of recentBids) {
    const carId = bid.carId?._id?.toString() || bid.carId?.toString();
    const bidderId = bid.user?._id?.toString() || bid.user?.toString();
    const dealerId = carDealers[carId];

    if (!bidderId || !dealerId || bidderId !== dealerId) continue;

    const dedupKey = `${bidderId}-${carId}-self_bid`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const existing = await AuctionIntegrityFlag.findOne({
      targetUser: bidderId,
      category: "self_bidding",
      status: { $in: ["detected", "under_review", "confirmed"] },
    });
    if (existing) continue;

    anomalies.push({
      flagId: generateFlagId("self_bidding"),
      category: "self_bidding",
      severity: "high",
      riskScore: SCORE_WEIGHTS.self_bidding.high,
      status: "detected",
      targetUser: bidderId,
      targetUserRole: "seller",
      summary: `Seller bid on own auction — KES ${bid.amount.toLocaleString("en-KE")}`,
      evidence: {
        bidderId,
        dealerId,
        carId,
        bidAmount: bid.amount,
        bidId: bid._id,
        bidderName: bid.user?.name,
        bidderPhone: bid.user?.phone,
      },
      riskFactors: [
        { factor: "seller_bid_on_own_auction", score: SCORE_WEIGHTS.self_bidding.high, detail: `User ${bid.user?.name} bid on their own listing` },
      ],
      detectionRules: ["self_bidding_seller_check"],
    });

    await upsertRiskProfile(bidderId, "seller", { selfBidCount: 1 });
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: RELATED-ACCOUNT BIDDING
// =============================
const detectRelatedAccountBidding = async (scanUntil) => {
  const anomalies = [];

  const auctionBidGroups = await Bid.aggregate([
    { $match: { createdAt: { $gte: scanUntil }, status: { $in: ["paid", "pending"] } } },
    { $group: { _id: "$carId", bidders: { $addToSet: "$user" }, bidCount: { $sum: 1 } } },
    { $match: { bidCount: { $gte: 2 } } },
  ]);

  for (const group of auctionBidGroups) {
    const bidders = group.bidders;
    if (bidders.length < 2) continue;

    const users = await User.find({ _id: { $in: bidders } })
      .select("_id name email phone referredBy")
      .lean();

    const phoneMap = {};
    const referralMap = {};
    for (const u of users) {
      const uid = u._id.toString();
      if (u.phone) {
        const normalizedPhone = u.phone.replace(/[^0-9]/g, "").slice(-9);
        if (!phoneMap[normalizedPhone]) phoneMap[normalizedPhone] = [];
        phoneMap[normalizedPhone].push(uid);
      }
      if (u.referredBy) {
        const refBy = u.referredBy.toString();
        if (!referralMap[refBy]) referralMap[refBy] = [];
        referralMap[refBy].push(uid);
      }
    }

    const relatedPairs = [];

    for (const phone of Object.keys(phoneMap)) {
      if (phoneMap[phone].length >= 2) {
        relatedPairs.push({ type: "shared_phone", phone, users: phoneMap[phone] });
      }
    }

    for (const ref of Object.keys(referralMap)) {
      if (referralMap[ref].length >= 2) {
        relatedPairs.push({ type: "shared_referrer", referrerId: ref, users: referralMap[ref] });
      }
    }

    for (const pair of relatedPairs) {
      const seen = new Set();
      for (const uid of pair.users) {
        const dedupKey = `${uid}-${group._id}-related_account`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const existing = await AuctionIntegrityFlag.findOne({
          targetUser: uid,
          category: "related_account",
          status: { $in: ["detected", "under_review", "confirmed"] },
        });
        if (existing) continue;

        anomalies.push({
          flagId: generateFlagId("related_account"),
          category: "related_account",
          severity: "medium",
          riskScore: SCORE_WEIGHTS.related_account.medium,
          status: "detected",
          targetUser: uid,
          targetUserRole: "bidder",
          auction: group._id,
          summary: `Related accounts bidding in same auction (${pair.type})`,
          evidence: {
            relationship: pair.type,
            phone: pair.phone || null,
            referrerId: pair.referrerId || null,
            relatedUserIds: pair.users.filter((u) => u !== uid),
            auctionId: group._id,
            allBidders: bidders,
          },
          riskFactors: [
            { factor: "related_account_bidding", score: SCORE_WEIGHTS.related_account.medium, detail: `Accounts share ${pair.type.replace("_", " ")}` },
          ],
          detectionRules: ["related_account_relationship_check"],
        });

        await upsertRiskProfile(uid, "bidder", { relatedAccountCount: 1 });
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

  const activeAuctions = await Auction.find({
    status: { $in: ["active", "ended"] },
    endTime: { $gte: new Date(Date.now() - 7 * 86400000) },
  })
    .select("_id carId bidHistory startTime endTime highestBid startingBid")
    .lean();

  for (const auction of activeAuctions) {
    const history = auction.bidHistory || [];
    if (history.length < THRESHOLDS.BID_INFLATION_MIN_SEQUENCE) continue;

    const recentBids = history
      .filter((b) => new Date(b.time) >= scanUntil)
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    if (recentBids.length < THRESHOLDS.BID_INFLATION_MIN_SEQUENCE) continue;

    const bidderSequence = recentBids.map((b) => b.userId);
    const uniqueBidders = new Set(bidderSequence);

    if (uniqueBidders.size < 2) continue;

    const bidderCounts = {};
    for (const uid of bidderSequence) {
      bidderCounts[uid] = (bidderCounts[uid] || 0) + 1;
    }

    const sortedCounts = Object.entries(bidderCounts).sort((a, b) => b[1] - a[1]);

    if (sortedCounts.length >= 2) {
      const topBidder = sortedCounts[0];
      const secondBidder = sortedCounts[1];
      const topRatio = topBidder[1] / recentBids.length;

      if (topRatio > 0.5) {
        let severity = "medium";
        let scoreVal = SCORE_WEIGHTS.bid_inflation.medium;
        if (topRatio > 0.8) {
          severity = "high";
          scoreVal = SCORE_WEIGHTS.bid_inflation.high;
        }

        const priceIncrease = auction.highestBid - auction.startingBid;
        const inflationRate = auction.startingBid > 0
          ? ((auction.highestBid - auction.startingBid) / auction.startingBid) * 100
          : 0;

        const existing = await AuctionIntegrityFlag.findOne({
          auction: auction._id,
          category: "bid_inflation",
          status: { $in: ["detected", "under_review", "confirmed"] },
        });
        if (existing) continue;

        anomalies.push({
          flagId: generateFlagId("bid_inflation"),
          category: "bid_inflation",
          severity,
          riskScore: scoreVal,
          status: "detected",
          targetUser: topBidder[0],
          targetUserRole: "bidder",
          auction: auction._id,
          summary: `Bid inflation pattern — ${topBidder[1]}/${recentBids.length} bids by one account`,
          evidence: {
            auctionId: auction._id,
            bidderDistribution: sortedCounts.map(([u, c]) => ({ userId: u, count: c })),
            totalBids: recentBids.length,
            dominantBidder: topBidder[0],
            dominantBidderShare: topRatio,
            dominantBidderCount: topBidder[1],
            secondBidder: secondBidder[0],
            secondBidderCount: secondBidder[1],
            priceIncrease,
            inflationRate: Math.round(inflationRate * 10) / 10,
            startingBid: auction.startingBid,
            highestBid: auction.highestBid,
          },
          riskFactors: [
            { factor: "dominant_bidder_share", score: scoreVal, detail: `${(topRatio * 100).toFixed(0)}% of bids by single account` },
            { factor: "price_inflation", score: Math.min(20, priceIncrease / 10000), detail: `Price increased by KES ${priceIncrease.toLocaleString("en-KE")}` },
          ],
          detectionRules: ["bid_inflation_dominant_bidder_check"],
        });

        await upsertRiskProfile(topBidder[0], "bidder", { inflationPatternCount: 1 });
      }
    }
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: BID VELOCITY ABUSE
// =============================
const detectBidVelocityAbuse = async (scanUntil) => {
  const anomalies = [];
  const burstCount = THRESHOLDS.VELOCITY_BURST_COUNT;
  const windowSec = THRESHOLDS.VELOCITY_WINDOW_SECONDS;

  const userBidWindows = await Bid.aggregate([
    {
      $match: {
        createdAt: { $gte: scanUntil },
        status: { $in: ["paid", "pending"] },
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: { user: "$user", carId: "$carId" },
        bids: {
          $push: {
            _id: "$_id",
            amount: "$amount",
            createdAt: "$createdAt",
          },
        },
        bidCount: { $sum: 1 },
      },
    },
    { $match: { bidCount: { $gte: burstCount } } },
  ]);

  for (const group of userBidWindows) {
    const bids = group.bids.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (let i = 0; i <= bids.length - burstCount; i++) {
      const window = bids.slice(i, i + burstCount);
      const firstTime = new Date(window[0].createdAt).getTime();
      const lastTime = new Date(window[window.length - 1].createdAt).getTime();
      const elapsedSec = (lastTime - firstTime) / 1000;

      if (elapsedSec <= windowSec) {
        const userId = group._id.user;

        const existing = await AuctionIntegrityFlag.findOne({
          targetUser: userId,
          auction: group._id.carId,
          category: "bid_velocity",
          status: { $in: ["detected", "under_review", "confirmed"] },
        });
        if (existing) continue;

        let severity = "medium";
        let scoreVal = SCORE_WEIGHTS.bid_velocity.medium;
        if (elapsedSec <= 10) {
          severity = "critical";
          scoreVal = SCORE_WEIGHTS.bid_velocity.critical;
        } else if (elapsedSec <= 30) {
          severity = "high";
          scoreVal = SCORE_WEIGHTS.bid_velocity.high;
        }

        anomalies.push({
          flagId: generateFlagId("bid_velocity"),
          category: "bid_velocity",
          severity,
          riskScore: scoreVal,
          status: "detected",
          targetUser: userId,
          targetUserRole: "bidder",
          auction: group._id.carId,
          summary: `${burstCount} bids in ${elapsedSec.toFixed(0)}s — velocity abuse`,
          evidence: {
            userId,
            auctionId: group._id.carId,
            bidCount: burstCount,
            windowSeconds: elapsedSec,
            timeWindowMs: lastTime - firstTime,
            bidSequence: window.map((b) => ({
              bidId: b._id,
              amount: b.amount,
              time: b.createdAt,
            })),
          },
          riskFactors: [
            { factor: "bid_velocity", score: scoreVal, detail: `${burstCount} bids in ${elapsedSec.toFixed(0)}s (threshold: ${windowSec}s)` },
          ],
          detectionRules: ["bid_velocity_burst_check"],
        });

        await upsertRiskProfile(userId, "bidder", { velocityAbuseCount: 1, recentBids24h: burstCount });

        break;
      }
    }
  }

  return anomalies;
};

// =============================
// 🔍 DETECTION: LAST-SECOND MANIPULATION
// =============================
const detectLastSecondManipulation = async (scanUntil) => {
  const anomalies = [];
  const windowSec = THRESHOLDS.LAST_SECOND_WINDOW_SECONDS;
  const repeatThreshold = THRESHOLDS.LAST_SECOND_REPEAT_THRESHOLD;

  const endingAuctions = await Auction.find({
    status: { $in: ["active", "ended"] },
  })
    .select("_id carId endTime bidHistory")
    .lean();

  for (const auction of endingAuctions) {
    if (!auction.endTime) continue;
    const endMs = new Date(auction.endTime).getTime();

    const lateBids = (auction.bidHistory || []).filter((b) => {
      const bidTime = new Date(b.time).getTime();
      const secBeforeEnd = (endMs - bidTime) / 1000;
      return bidTime >= scanUntil.getTime() && secBeforeEnd >= 0 && secBeforeEnd <= windowSec;
    });

    if (lateBids.length === 0) continue;

    const userLateCount = {};
    for (const lb of lateBids) {
      userLateCount[lb.userId] = (userLateCount[lb.userId] || 0) + 1;
    }

    for (const [userId, count] of Object.entries(userLateCount)) {
      const secBeforeEnd = Math.round(
        (endMs - new Date(lateBids.find((b) => b.userId === userId).time).getTime()) / 1000,
      );

      let severity = "medium";
      let scoreVal = SCORE_WEIGHTS.last_second_manipulation.medium;
      if (secBeforeEnd <= 3) {
        severity = "critical";
        scoreVal = SCORE_WEIGHTS.last_second_manipulation.critical;
      } else if (secBeforeEnd <= 5) {
        severity = "high";
        scoreVal = SCORE_WEIGHTS.last_second_manipulation.high;
      }

      if (count >= repeatThreshold) {
        severity = severity === "medium" ? "high" : severity;
        scoreVal = Math.min(scoreVal + 10, 100);
      }

      const existing = await AuctionIntegrityFlag.findOne({
        targetUser: userId,
        auction: auction._id,
        category: "last_second_manipulation",
        status: { $in: ["detected", "under_review", "confirmed"] },
      });
      if (existing) continue;

      anomalies.push({
        flagId: generateFlagId("last_second_manipulation"),
        category: "last_second_manipulation",
        severity,
        riskScore: scoreVal,
        status: "detected",
        targetUser: userId,
        targetUserRole: "bidder",
        auction: auction._id,
        summary: `Bid placed ${secBeforeEnd}s before auction end — manipulation risk`,
        evidence: {
          userId,
          auctionId: auction._id,
          secondsBeforeEnd: secBeforeEnd,
          endTime: auction.endTime,
          lateBidCount: count,
          lateBids: lateBids.filter((b) => b.userId === userId),
        },
        riskFactors: [
          { factor: "last_second_bid", score: scoreVal, detail: `${secBeforeEnd}s before end (threshold: ${windowSec}s)` },
          { factor: "repeat_late_bids", score: 10, detail: `${count} late bids in this auction` },
        ],
        detectionRules: ["last_second_bid_window_check"],
      });

      await upsertRiskProfile(userId, "bidder", { lastSecondCount: count, lastSecondBids30d: count });
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
      await AuctionIntegrityFlag.insertMany(allFlags, { ordered: false });
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
  const auction = await Auction.findById(auctionId).populate("carId").lean();
  if (!auction) throw new Error("Auction not found");

  const flags = [];

  const selfBidCheck = await AuctionIntegrityFlag.findOne({
    auction: auctionId,
    category: "self_bidding",
    status: { $in: ["detected", "under_review", "confirmed"] },
  });
  if (!selfBidCheck && auction.carId?.dealer) {
    const car = await Car.findById(auction.carId).select("dealer").lean();
    if (car?.dealer) {
      const recentBids = await Bid.find({ carId: auction.carId, status: "paid" })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      for (const bid of recentBids) {
        const bidderId = bid.user?.toString();
        if (bidderId && bidderId === car.dealer.toString()) {
          flags.push({
            flagId: generateFlagId("self_bidding"),
            category: "self_bidding",
            severity: "high",
            riskScore: SCORE_WEIGHTS.self_bidding.high,
            targetUser: bidderId,
            targetUserRole: "seller",
            auction: auctionId,
            summary: `Seller bid on own auction — KES ${bid.amount.toLocaleString("en-KE")}`,
            evidence: { bidderId, dealerId: car.dealer.toString(), carId: auction.carId, bidAmount: bid.amount },
            riskFactors: [{ factor: "seller_bid_on_own_auction", score: SCORE_WEIGHTS.self_bidding.high, detail: "Self-bid detected" }],
            detectionRules: ["realtime_self_bid_check"],
          });
          break;
        }
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
      AuctionIntegrityFlag.countDocuments(),
      AuctionIntegrityFlag.countDocuments({ status: { $in: ["detected", "under_review"] } }),
      AuctionIntegrityFlag.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuctionIntegrityFlag.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuctionIntegrityFlag.countDocuments({ createdAt: { $gte: todayStart } }),
      AuctionIntegrityFlag.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AuctionRiskProfile.find({})
        .populate("user", "name email")
        .sort({ riskScore: -1 })
        .limit(10)
        .lean(),
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
