import asyncHandler from "../middleware/asyncHandler.js";
import BidLog from "../models/BidLog.js";
import Bid from "../models/Bid.js";
import crypto from "crypto";

// =============================
// 📊 GET ACTIVE BID LOGS FOR CAR
// =============================
export const getActiveBidLogs = asyncHandler(async (req, res) => {
  const { carId } = req.params;
  const { limit = 50, page = 1 } = req.query;

  const logs = await BidLog.find({
    car: carId,
    status: { $in: ["active", "outbid"] },
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user", "name verificationStatus");

  const total = await BidLog.countDocuments({
    car: carId,
    status: { $in: ["active", "outbid"] },
  });

  res.json({
    success: true,
    data: {
      logs: logs.map((log) => ({
        id: log._id,
        pseudonym: log.bidderPseudonym,
        amount: log.amount,
        formattedAmount: log.formattedAmount,
        isAutoBid: log.isAutoBid,
        status: log.status,
        createdAt: log.createdAt,
        source: log.source,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// =============================
// 📋 GET USER'S BID HISTORY
// =============================
export const getUserBidHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { carId, status, page = 1, limit = 20 } = req.query;

  const query = { user: userId };
  if (carId) query.car = carId;
  if (status) query.status = status;

  const [logs, total] = await Promise.all([
    BidLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("car", "title images price currentBid status"),
    BidLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      summary: {
        totalBids: total,
        activeBids: await BidLog.countDocuments({ user: userId, status: "active" }),
        wonAuctions: await BidLog.countDocuments({ user: userId, status: "won" }),
        outbidCount: await BidLog.countDocuments({ user: userId, status: "outbid" }),
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// =============================
// 🏆 GET WINNING BID INFO
// =============================
export const getWinningBidInfo = asyncHandler(async (req, res) => {
  const { carId } = req.params;

  const winningLog = await BidLog.findOne({
    car: carId,
    status: "active",
  })
    .sort({ amount: -1 })
    .populate("user", "name verificationStatus dealer");

  if (!winningLog) {
    return res.status(404).json({
      success: false,
      message: "No winning bid found",
    });
  }

  res.json({
    success: true,
    data: {
      pseudonym: winningLog.bidderPseudonym,
      amount: winningLog.amount,
      formattedAmount: winningLog.formattedAmount,
      isAutoBid: winningLog.isAutoBid,
      isVerified: winningLog.user?.verificationStatus === "verified",
      isDealer: !!winningLog.user?.dealer,
      timestamp: winningLog.createdAt,
    },
  });
});

// =============================
// 📈 GET BID ACTIVITY STATS
// =============================
export const getBidActivityStats = asyncHandler(async (req, res) => {
  const { carId } = req.params;
  const { period = "24h" } = req.query;

  // Calculate time range
  const now = new Date();
  let startDate;
  switch (period) {
    case "1h":
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case "24h":
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  const logs = await BidLog.find({
    car: carId,
    createdAt: { $gte: startDate },
  }).sort({ createdAt: 1 });

  // Calculate stats
  const bidAmounts = logs.map((l) => l.amount);
  const stats = {
    totalBids: logs.length,
    uniqueBidders: new Set(logs.map((l) => l.user.toString())).size,
    highestBid: Math.max(...bidAmounts, 0),
    lowestBid: Math.min(...bidAmounts, 0),
    averageBid: bidAmounts.length > 0 ? bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length : 0,
    autoBidCount: logs.filter((l) => l.isAutoBid).length,
    timeSeries: logs.map((l) => ({
      time: l.createdAt,
      amount: l.amount,
      pseudonym: l.bidderPseudonym,
    })),
  };

  res.json({
    success: true,
    data: stats,
  });
});

// =============================
// 🔍 GET BID LOG DETAIL
// =============================
export const getBidLogDetail = asyncHandler(async (req, res) => {
  const { logId } = req.params;

  const log = await BidLog.findById(logId).populate("car user");

  if (!log) {
    return res.status(404).json({
      success: false,
      message: "Bid log not found",
    });
  }

  // Check authorization
  const isOwner = log.user._id.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  res.json({
    success: true,
    data: log,
  });
});

// =============================
// 📊 ADMIN: GET ALL BID LOGS
// =============================
export const getAllBidLogs = asyncHandler(async (req, res) => {
  const { carId, userId, status, source, startDate, endDate, page = 1, limit = 50 } = req.query;

  const query = {};
  if (carId) query.car = carId;
  if (userId) query.user = userId;
  if (status) query.status = status;
  if (source) query.source = source;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    BidLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email phone")
      .populate("car", "title images"),
    BidLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// =============================
// 📊 ADMIN: BID LOG STATISTICS
// =============================
export const getBidLogStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const stats = await BidLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBids: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgBidAmount: { $avg: "$amount" },
        maxBid: { $max: "$amount" },
        minBid: { $min: "$amount" },
        autoBids: { $sum: { $cond: ["$isAutoBid", 1, 0] } },
        proxyBids: { $sum: { $cond: ["$isProxyBid", 1, 0] } },
        uniqueUsers: { $addToSet: "$user" },
        uniqueCars: { $addToSet: "$car" },
      },
    },
    {
      $project: {
        _id: 0,
        totalBids: 1,
        totalAmount: 1,
        avgBidAmount: { $round: ["$avgBidAmount", 2] },
        maxBid: 1,
        minBid: 1,
        autoBidPercentage: {
          $round: [{ $multiply: [{ $divide: ["$autoBids", "$totalBids"] }, 100] }, 1],
        },
        proxyBidPercentage: {
          $round: [{ $multiply: [{ $divide: ["$proxyBids", "$totalBids"] }, 100] }, 1],
        },
        uniqueBidders: { $size: "$uniqueUsers" },
        totalCars: { $size: "$uniqueCars" },
      },
    },
  ]);

  // Get status breakdown
  const statusBreakdown = await BidLog.aggregate([
    { $match: matchStage },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // Get source breakdown
  const sourceBreakdown = await BidLog.aggregate([
    { $match: matchStage },
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      summary: stats[0] || {},
      statusBreakdown: statusBreakdown.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      sourceBreakdown: sourceBreakdown.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
    },
  });
});

// =============================
// INTERNAL: LOG A BID (called from bidController)
// =============================
export const logBid = async (bidData) => {
  const { bid, car, user, pseudonym, amount, previousAmount, isAutoBid, isProxyBid, source, ipAddress, userAgent, location } = bidData;

  const log = await BidLog.create({
    bid: bid._id || bid,
    car: car._id || car,
    user: user._id || user,
    auction: car.auction,
    bidderPseudonym: pseudonym,
    amount,
    previousAmount,
    increment: amount - (previousAmount || 0),
    status: "active",
    isAutoBid: isAutoBid || false,
    isProxyBid: isProxyBid || false,
    source: source || "web",
    ipAddress,
    userAgent,
    location,
    displayOrder: Date.now(),
  });

  return log;
};

// =============================
// INTERNAL: UPDATE BID LOG STATUS
// =============================
export const updateBidLogStatus = async (carId, userId, newStatus) => {
  return BidLog.updateMany(
    { car: carId, user: userId, status: "active" },
    { $set: { status: newStatus } }
  );
};
