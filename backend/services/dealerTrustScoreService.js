import DealerTrustScore from "../models/DealerTrustScore.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Escrow from "../models/Escrow.js";
import Dispute from "../models/Dispute.js";
import Bid from "../models/Bid.js";

// =============================
// 📊 CALCULATE DEALER TRUST SCORE
// =============================

export const calculateDealerTrustScore = async (dealerId) => {
  try {
    const dealer = await User.findById(dealerId);
    if (!dealer) {
      throw new Error("Dealer not found");
    }

    // Get existing score or create new
    let trustScore = await DealerTrustScore.findOne({ dealer: dealerId });
    if (!trustScore) {
      trustScore = new DealerTrustScore({ dealer: dealerId });
    }

    // Calculate component scores
    const completedSalesScore = await calculateCompletedSalesScore(dealerId);
    const escrowSuccessScore = await calculateEscrowSuccessScore(dealerId);
    const responseTimeScore = await calculateResponseTimeScore(dealerId);
    const disputesScore = await calculateDisputesScore(dealerId);
    const vehicleAccuracyScore = await calculateVehicleAccuracyScore(dealerId);

    // Update components
    trustScore.components.completedSales = completedSalesScore;
    trustScore.components.escrowSuccess = escrowSuccessScore;
    trustScore.components.responseTime = responseTimeScore;
    trustScore.components.disputes = disputesScore;
    trustScore.components.vehicleAccuracy = vehicleAccuracyScore;

    // Calculate overall weighted score
    const overallScore =
      completedSalesScore.score * completedSalesScore.weight +
      escrowSuccessScore.score * escrowSuccessScore.weight +
      responseTimeScore.score * responseTimeScore.weight +
      disputesScore.score * disputesScore.weight +
      vehicleAccuracyScore.score * vehicleAccuracyScore.weight;

    trustScore.overallScore = Math.round(overallScore);

    // Determine tier
    trustScore.tier = determineTier(trustScore.overallScore);

    // Update metadata
    trustScore.lastCalculatedAt = new Date();
    trustScore.nextCalculationAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Add to history
    trustScore.scoreHistory.push({
      score: trustScore.overallScore,
      tier: trustScore.tier,
      calculatedAt: new Date(),
      reason: "Scheduled calculation",
    });

    // Keep only last 30 history entries
    if (trustScore.scoreHistory.length > 30) {
      trustScore.scoreHistory = trustScore.scoreHistory.slice(-30);
    }

    await trustScore.save();
    return trustScore;
  } catch (error) {
    console.error("Error calculating dealer trust score:", error);
    throw error;
  }
};

// =============================
// 📦 COMPLETED SALES SCORE
// =============================

const calculateCompletedSalesScore = async (dealerId) => {
  const cars = await Car.find({ dealer: dealerId, status: "sold" });
  const totalSales = cars.length;

  if (totalSales === 0) {
    return {
      score: 50,
      weight: 0.25,
      data: { totalSales: 0, successfulSales: 0, successRate: 0 },
    };
  }

  const successfulSales = cars.filter(car => !car.disputed).length;
  const successRate = (successfulSales / totalSales) * 100;

  // Score based on success rate and volume
  let score = 0;
  if (successRate >= 95) score = 100;
  else if (successRate >= 90) score = 90;
  else if (successRate >= 80) score = 80;
  else if (successRate >= 70) score = 70;
  else if (successRate >= 60) score = 60;
  else score = 50;

  // Bonus for high volume
  if (totalSales >= 50) score += 5;
  else if (totalSales >= 20) score += 3;
  else if (totalSales >= 10) score += 1;

  score = Math.min(score, 100);

  return {
    score,
    weight: 0.25,
    data: { totalSales, successfulSales, successRate: Math.round(successRate) },
  };
};

// =============================
// 🔒 ESCROW SUCCESS SCORE
// =============================

const calculateEscrowSuccessScore = async (dealerId) => {
  const escrows = await Escrow.find({ seller: dealerId });
  const totalEscrows = escrows.length;

  if (totalEscrows === 0) {
    return {
      score: 75,
      weight: 0.25,
      data: { totalEscrows: 0, successfulEscrows: 0, disputedEscrows: 0, escrowSuccessRate: 0 },
    };
  }

  const successfulEscrows = escrows.filter(e => e.status === "released").length;
  const disputedEscrows = escrows.filter(e => e.status === "disputed").length;
  const escrowSuccessRate = (successfulEscrows / totalEscrows) * 100;

  let score = 0;
  if (escrowSuccessRate >= 95) score = 100;
  else if (escrowSuccessRate >= 90) score = 90;
  else if (escrowSuccessRate >= 80) score = 80;
  else if (escrowSuccessRate >= 70) score = 70;
  else if (escrowSuccessRate >= 60) score = 60;
  else score = 50;

  // Penalty for high dispute rate
  const disputeRate = (disputedEscrows / totalEscrows) * 100;
  if (disputeRate > 10) score -= 20;
  else if (disputeRate > 5) score -= 10;
  else if (disputeRate > 2) score -= 5;

  score = Math.max(score, 0);

  return {
    score,
    weight: 0.25,
    data: {
      totalEscrows,
      successfulEscrows,
      disputedEscrows,
      escrowSuccessRate: Math.round(escrowSuccessRate),
    },
  };
};

// =============================
// ⏱️ RESPONSE TIME SCORE
// =============================

const calculateResponseTimeScore = async (dealerId) => {
  // This would require chat message data
  // For now, using a placeholder calculation
  // In production, this would calculate average response time from chat messages

  const totalMessages = 0; // Placeholder
  const responseCount = 0; // Placeholder
  const averageResponseTime = 0; // Placeholder in minutes

  let score = 75; // Default score

  if (averageResponseTime <= 30) score = 100;
  else if (averageResponseTime <= 60) score = 90;
  else if (averageResponseTime <= 120) score = 80;
  else if (averageResponseTime <= 240) score = 70;
  else if (averageResponseTime <= 480) score = 60;
  else score = 50;

  return {
    score,
    weight: 0.20,
    data: { averageResponseTime, totalMessages, responseCount },
  };
};

// =============================
// ⚖️ DISPUTES SCORE
// =============================

const calculateDisputesScore = async (dealerId) => {
  const disputes = await Dispute.find({
    $or: [{ openedBy: dealerId }, { openedAgainst: dealerId }],
  });
  const totalDisputes = disputes.length;

  const resolvedDisputes = disputes.filter(d => d.status === "resolved").length;
  const disputeRate = totalDisputes > 0 ? (resolvedDisputes / totalDisputes) * 100 : 0;

  let score = 100;

  // Penalty for having disputes
  if (totalDisputes > 10) score -= 30;
  else if (totalDisputes > 5) score -= 20;
  else if (totalDisputes > 3) score -= 10;
  else if (totalDisputes > 1) score -= 5;

  // Bonus for high resolution rate
  if (disputeRate >= 90) score += 10;
  else if (disputeRate >= 80) score += 5;

  score = Math.max(score, 0);

  return {
    score,
    weight: 0.15,
    data: { totalDisputes, resolvedDisputes, disputeRate: Math.round(disputeRate) },
  };
};

// =============================
// 🚗 VEHICLE ACCURACY SCORE
// =============================

const calculateVehicleAccuracyScore = async (dealerId) => {
  const cars = await Car.find({ dealer: dealerId });
  const totalListings = cars.length;

  if (totalListings === 0) {
    return {
      score: 75,
      weight: 0.15,
      data: { totalListings: 0, accurateListings: 0, accuracyRate: 0 },
    };
  }

  // Count listings with complete information
  const accurateListings = cars.filter(car => {
    return (
      car.title &&
      car.description &&
      car.price &&
      car.year &&
      car.make &&
      car.model &&
      car.images &&
      car.images.length > 0
    );
  }).length;

  const accuracyRate = (accurateListings / totalListings) * 100;

  let score = 0;
  if (accuracyRate >= 95) score = 100;
  else if (accuracyRate >= 90) score = 90;
  else if (accuracyRate >= 80) score = 80;
  else if (accuracyRate >= 70) score = 70;
  else if (accuracyRate >= 60) score = 60;
  else score = 50;

  return {
    score,
    weight: 0.15,
    data: { totalListings, accurateListings, accuracyRate: Math.round(accuracyRate) },
  };
};

// =============================
// 🏆 DETERMINE TIER
// =============================

const determineTier = (score) => {
  if (score >= 95) return "elite";
  if (score >= 90) return "platinum";
  if (score >= 80) return "gold";
  if (score >= 70) return "silver";
  return "bronze";
};

// =============================
// 📊 GET DEALER TRUST SCORE
// =============================

export const getDealerTrustScore = async (dealerId) => {
  const trustScore = await DealerTrustScore.findOne({ dealer: dealerId });
  
  if (!trustScore) {
    return await calculateDealerTrustScore(dealerId);
  }

  // Check if recalculation is needed
  if (new Date() > trustScore.nextCalculationAt) {
    return await calculateDealerTrustScore(dealerId);
  }

  return trustScore;
};

// =============================
// 🔄 BATCH CALCULATE SCORES
// =============================

export const batchCalculateScores = async (dealerIds) => {
  const results = [];
  
  for (const dealerId of dealerIds) {
    try {
      const score = await calculateDealerTrustScore(dealerId);
      results.push({ dealerId, success: true, score });
    } catch (error) {
      results.push({ dealerId, success: false, error: error.message });
    }
  }
  
  return results;
};
