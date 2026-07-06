import FraudDetection from "../models/FraudDetection.js";
import {
  detectDuplicateAccounts,
  detectDuplicatePhone,
  detectDuplicateEmail,
  detectSelfBidding,
  detectBidRing,
  detectSuspiciousBidSpike,
  detectRepeatedDisputes,
  detectChargeback,
  detectDuplicateListing,
  detectVinReuse,
  detectPriceManipulation,
  detectAccountFarms,
  detectDuplicatePhotos,
  runFraudCheck,
} from "../services/fraudDetectionService.js";

// =============================
// 📊 GET FRAUD ANALYTICS (Phase 3 Query Optimization)
// =============================

export const getFraudAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const previousPeriod = new Date(thirtyDaysAgo - 30 * 24 * 60 * 60 * 1000);

    // Use aggregation to combine multiple count queries into a single operation
    const [stats, recentFraud, byType, severityBreakdown] = await Promise.all([
      FraudDetection.aggregate([
        {
          $facet: {
            totalDetections: [{ $count: "count" }],
            criticalCount: [{ $match: { severity: "critical" } }, { $count: "count" }],
            underReviewCount: [{ $match: { status: "under_review" } }, { $count: "count" }],
            actionTakenCount: [{ $match: { status: "action_taken" } }, { $count: "count" }],
            currentPeriodCount: [{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $count: "count" }],
            previousPeriodCount: [{ $match: { createdAt: { $gte: previousPeriod, $lt: thirtyDaysAgo } } }, { $count: "count" }],
          },
        },
      ]),
      FraudDetection.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("target", "name email")
        .select("fraudType severity status target createdAt")
        .lean(),
      FraudDetection.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$fraudType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      FraudDetection.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
    ]);

    const statsData = stats[0];
    const totalDetections = statsData.totalDetections[0]?.count || 0;
    const criticalCount = statsData.criticalCount[0]?.count || 0;
    const underReviewCount = statsData.underReviewCount[0]?.count || 0;
    const actionTakenCount = statsData.actionTakenCount[0]?.count || 0;
    const currentPeriodCount = statsData.currentPeriodCount[0]?.count || 0;
    const previousPeriodCount = statsData.previousPeriodCount[0]?.count || 0;

    const trendPercentage =
      previousPeriodCount > 0
        ? (((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      analytics: {
        totalDetections,
        criticalCount,
        underReviewCount,
        actionTakenCount,
        recentFraud: recentFraud.map((f) => ({
          ...f,
          targetName: f.target?.name || f.target?.email || "Unknown",
        })),
        byType: byType.map((item) => ({ type: item._id, count: item.count })),
        severityBreakdown,
        trendDirection: currentPeriodCount > previousPeriodCount ? "up" : "down",
        trendPercentage: Math.abs(trendPercentage),
        trendDescription:
          currentPeriodCount > previousPeriodCount
            ? `Fraud increased by ${trendPercentage}% compared to previous 30 days`
            : `Fraud decreased by ${trendPercentage}% compared to previous 30 days`,
      },
    });
  } catch (error) {
    console.error("Error getting fraud analytics:", error);
    res.status(500).json({ success: false, message: "Failed to get fraud analytics" });
  }
};

// =============================
// 🔍 RUN FRAUD CHECK
// =============================

export const runFraudCheckOnTarget = async (req, res) => {
  try {
    const { targetId, targetType } = req.body;

    if (!targetId || !targetType) {
      return res.status(400).json({ success: false, message: "Target ID and type are required" });
    }

    const results = await runFraudCheck(targetId, targetType);

    res.json({ success: true, results });
  } catch (error) {
    console.error("Error running fraud check:", error);
    res.status(500).json({ success: false, message: "Failed to run fraud check" });
  }
};

// =============================
// 👤 USER FRAUD CHECKS
// =============================

export const checkUserFraud = async (req, res) => {
  try {
    const { userId } = req.params;

    const [duplicateAccounts, repeatedDisputes] = await Promise.all([
      detectDuplicateAccounts(userId),
      detectRepeatedDisputes(userId),
    ]);

    res.json({
      success: true,
      fraudDetected: !!(duplicateAccounts || repeatedDisputes),
      results: {
        duplicateAccounts,
        repeatedDisputes,
      },
    });
  } catch (error) {
    console.error("Error checking user fraud:", error);
    res.status(500).json({ success: false, message: "Failed to check user fraud" });
  }
};

// =============================
// 🎯 AUCTION FRAUD CHECKS
// =============================

export const checkAuctionFraud = async (req, res) => {
  try {
    const { carId } = req.params;

    const [selfBidding, bidRing, bidSpike] = await Promise.all([
      detectSelfBidding(carId),
      detectBidRing(carId),
      detectSuspiciousBidSpike(carId),
    ]);

    res.json({
      success: true,
      fraudDetected: !!(selfBidding || bidRing || bidSpike),
      results: {
        selfBidding,
        bidRing,
        bidSpike,
      },
    });
  } catch (error) {
    console.error("Error checking auction fraud:", error);
    res.status(500).json({ success: false, message: "Failed to check auction fraud" });
  }
};

// =============================
// 🔒 ESCROW FRAUD CHECKS
// =============================

export const checkEscrowFraud = async (req, res) => {
  try {
    const { escrowId } = req.params;

    const chargeback = await detectChargeback(escrowId);

    res.json({
      success: true,
      fraudDetected: !!chargeback,
      results: {
        chargeback,
      },
    });
  } catch (error) {
    console.error("Error checking escrow fraud:", error);
    res.status(500).json({ success: false, message: "Failed to check escrow fraud" });
  }
};

// =============================
// 🚗 DEALER FRAUD CHECKS
// =============================

export const checkDealerFraud = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const [duplicateListings, vinReuse] = await Promise.all([
      detectDuplicateListing(dealerId),
      detectVinReuse(null), // Would need VIN parameter
    ]);

    res.json({
      success: true,
      fraudDetected: !!(duplicateListings || vinReuse),
      results: {
        duplicateListings,
        vinReuse,
      },
    });
  } catch (error) {
    console.error("Error checking dealer fraud:", error);
    res.status(500).json({ success: false, message: "Failed to check dealer fraud" });
  }
};

// =============================
// 💰 PRICE MANIPULATION CHECK
// =============================

export const checkPriceManipulation = async (req, res) => {
  try {
    const { carId } = req.params;

    const priceManipulation = await detectPriceManipulation(carId);

    res.json({
      success: true,
      fraudDetected: !!priceManipulation,
      results: {
        priceManipulation,
      },
    });
  } catch (error) {
    console.error("Error checking price manipulation:", error);
    res.status(500).json({ success: false, message: "Failed to check price manipulation" });
  }
};

// =============================
// 👥 ACCOUNT FARMS CHECK
// =============================

export const checkAccountFarms = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const accountFarms = await detectAccountFarms(dealerId);

    res.json({
      success: true,
      fraudDetected: !!accountFarms,
      results: {
        accountFarms,
      },
    });
  } catch (error) {
    console.error("Error checking account farms:", error);
    res.status(500).json({ success: false, message: "Failed to check account farms" });
  }
};

// =============================
// 🖼️ DUPLICATE PHOTOS CHECK
// =============================

export const checkDuplicatePhotos = async (req, res) => {
  try {
    const { carId } = req.params;

    const duplicatePhotos = await detectDuplicatePhotos(carId);

    res.json({
      success: true,
      fraudDetected: !!duplicatePhotos,
      results: {
        duplicatePhotos,
      },
    });
  } catch (error) {
    console.error("Error checking duplicate photos:", error);
    res.status(500).json({ success: false, message: "Failed to check duplicate photos" });
  }
};

// =============================
// ⚖️ UPDATE FRAUD STATUS
// =============================

export const updateFraudStatus = async (req, res) => {
  try {
    const { fraudId } = req.params;
    const { status, actionTaken, actionNotes } = req.body;
    const adminId = req.user.id;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const fraud = await FraudDetection.findById(fraudId);
    if (!fraud) {
      return res.status(404).json({ success: false, message: "Fraud detection not found" });
    }

    fraud.status = status;
    fraud.actionTaken = actionTaken || "none";
    fraud.actionTakenBy = adminId;
    fraud.actionTakenAt = new Date();
    fraud.actionNotes = actionNotes;
    fraud.reviewedBy = adminId;
    fraud.reviewedAt = new Date();

    await fraud.save();

    res.json({ success: true, fraud });
  } catch (error) {
    console.error("Error updating fraud status:", error);
    res.status(500).json({ success: false, message: "Failed to update fraud status" });
  }
};

// =============================
// 📋 GET ALL FRAUD DETECTIONS (Phase 3 Query Optimization)
// =============================

export const getAllFraudDetections = async (req, res) => {
  try {
    const { status, severity, fraudType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (fraudType) filter.fraudType = fraudType;

    const frauds = await FraudDetection.find(filter)
      .populate("target", "name email")
      .populate("actionTakenBy", "name email")
      .populate("reviewedBy", "name email")
      .select("fraudType severity status target actionTaken actionTakenBy actionTakenAt actionNotes reviewedBy reviewedAt createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, frauds });
  } catch (error) {
    console.error("Error getting fraud detections:", error);
    res.status(500).json({ success: false, message: "Failed to get fraud detections" });
  }
};
