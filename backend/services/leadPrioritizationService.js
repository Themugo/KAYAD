// backend/services/leadPrioritizationService.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Lead Prioritization Service
// Auto-scores leads by engagement and conversion probability
// Helps dealers focus on high-value leads first
// ─────────────────────────────────────────────────────────────

import { logInfo, logError } from "../utils/logger.js";
import { findAll, findById, update } from "../db/index.js";

/**
 * Scoring weights for lead priority calculation
 */
const WEIGHTS = {
  // Engagement signals (40% total)
  engagement: {
    hasMessages: 15,
    hasViewedCar: 10,
    hasFavorite: 5,
    sharedListing: 5,
    viewedMultipleTimes: 5,
  },
  // Intent signals (35% total)
  intent: {
    highValue: 15,      // Budget > 5M KES
    financingInterest: 10,
    inspectionRequested: 10,
    auctionBidder: 10,
  },
  // Urgency signals (15% total)
  urgency: {
    contactedRecently: 10,
    viewedRecently: 5,
  },
  // Quality signals (10% total)
  quality: {
    verifiedBuyer: 5,
    completedProfile: 3,
    hasPhone: 2,
  },
};

/**
 * @typedef {Object} LeadScore
 * @property {string} leadId - Lead ID
 * @property {number} totalScore - 0-100 priority score
 * @property {string} tier - 'hot' | 'warm' | 'cold'
 * @property {Object} breakdown - Score breakdown by category
 * @property {string[]} signals - Key positive signals
 * @property {string[]} gaps - Areas for improvement
 */

/**
 * Calculate priority score for a lead
 * @param {string} leadId - Lead ID
 * @returns {Promise<LeadScore>} Priority score with breakdown
 */
export const scoreLead = async (leadId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const breakdown = {
      engagement: 0,
      intent: 0,
      urgency: 0,
      quality: 0,
    };
    const signals = [];
    const gaps = [];

    // Calculate engagement score
    breakdown.engagement = calculateEngagementScore(lead, signals, gaps);
    
    // Calculate intent score
    breakdown.intent = calculateIntentScore(lead, signals, gaps);
    
    // Calculate urgency score
    breakdown.urgency = calculateUrgencyScore(lead, signals, gaps);
    
    // Calculate quality score
    breakdown.quality = calculateQualityScore(lead, signals, gaps);

    // Calculate total
    const totalScore = breakdown.engagement + breakdown.intent + breakdown.urgency + breakdown.quality;

    // Determine tier
    let tier;
    if (totalScore >= 70) {
      tier = 'hot';
    } else if (totalScore >= 40) {
      tier = 'warm';
    } else {
      tier = 'cold';
    }

    // Update lead with score
    await update("leads", leadId, {
      priorityScore: totalScore,
      priorityTier: tier,
      priorityCalculatedAt: new Date().toISOString(),
    });

    const result = {
      leadId,
      totalScore,
      tier,
      breakdown,
      signals,
      gaps,
      nextAction: suggestNextAction(totalScore, tier, lead),
    };

    logInfo("Lead scored", { leadId, totalScore, tier });

    return result;
  } catch (err) {
    logError("Lead scoring error", err, { leadId });
    throw err;
  }
};

/**
 * Calculate engagement score based on user actions
 */
const calculateEngagementScore = (lead, signals, gaps) => {
  let score = 0;

  // Has sent/received messages
  if (lead.totalMessages > 0) {
    score += WEIGHTS.engagement.hasMessages;
    signals.push(`${lead.totalMessages} message(s) exchanged`);
  } else {
    gaps.push('No engagement yet - needs follow-up');
  }

  // Has viewed the car
  if (lead.viewCount > 3) {
    score += WEIGHTS.engagement.hasViewedCar + WEIGHTS.engagement.viewedMultipleTimes;
    signals.push(`Viewed car ${lead.viewCount} times`);
  } else if (lead.viewCount > 0) {
    score += WEIGHTS.engagement.hasViewedCar;
    signals.push('Viewed the car');
  }

  // Has favorited
  if (lead.isFavorited) {
    score += WEIGHTS.engagement.hasFavorite;
    signals.push('Added to favorites');
  }

  // Has shared
  if (lead.hasShared) {
    score += WEIGHTS.engagement.sharedListing;
    signals.push('Shared the listing');
  }

  return Math.min(WEIGHTS.engagement.hasMessages + WEIGHTS.engagement.hasViewedCar + 
    WEIGHTS.engagement.hasFavorite + WEIGHTS.engagement.sharedListing + 
    WEIGHTS.engagement.viewedMultipleTimes, score);
};

/**
 * Calculate intent score based on buying signals
 */
const calculateIntentScore = (lead, signals, gaps) => {
  let score = 0;

  // High value lead (budget indicator)
  if (lead.estimatedValue > 5000000) {
    score += WEIGHTS.intent.highValue;
    signals.push(`High value lead (KES ${(lead.estimatedValue / 1000000).toFixed(1)}M)`);
  }

  // Showed financing interest
  if (lead.showedFinancingInterest) {
    score += WEIGHTS.intent.financingInterest;
    signals.push('Interested in financing');
  }

  // Requested inspection
  if (lead.inspectionRequested) {
    score += WEIGHTS.intent.inspectionRequested;
    signals.push('Requested inspection');
  }

  // Auction bidder
  if (lead.source === 'auction' && lead.bidsCount > 0) {
    score += WEIGHTS.intent.auctionBidder;
    signals.push(`Placed ${lead.bidsCount} bid(s)`);
  }

  return score;
};

/**
 * Calculate urgency score based on recency
 */
const calculateUrgencyScore = (lead, signals, gaps) => {
  let score = 0;
  const now = Date.now();

  // Last activity recency
  if (lead.lastActivityAt) {
    const daysSinceActivity = (now - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActivity <= 1) {
      score += WEIGHTS.urgency.contactedRecently;
      signals.push('Active in last 24 hours');
    } else if (daysSinceActivity <= 3) {
      score += WEIGHTS.urgency.contactedRecently / 2;
      signals.push('Active in last 3 days');
    } else if (daysSinceActivity > 7) {
      gaps.push(`No activity in ${Math.round(daysSinceActivity)} days`);
    }
  }

  // Last viewed
  if (lead.lastViewedAt) {
    const daysSinceView = (now - new Date(lead.lastViewedAt).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceView <= 1) {
      score += WEIGHTS.urgency.viewedRecently;
    }
  }

  return score;
};

/**
 * Calculate quality score based on buyer profile completeness
 */
const calculateQualityScore = (lead, signals, gaps) => {
  let score = 0;

  // Verified buyer
  if (lead.buyerVerified) {
    score += WEIGHTS.quality.verifiedBuyer;
    signals.push('Verified buyer');
  } else {
    gaps.push('Buyer not verified');
  }

  // Profile completeness
  if (lead.buyerProfileComplete) {
    score += WEIGHTS.quality.completedProfile;
  }

  // Has phone number
  if (lead.buyerPhone) {
    score += WEIGHTS.quality.hasPhone;
  }

  return score;
};

/**
 * Suggest next action based on lead score
 */
const suggestNextAction = (totalScore, tier, lead) => {
  if (tier === 'hot') {
    return 'Immediate follow-up recommended - high priority lead';
  }
  
  if (tier === 'warm') {
    if (!lead.totalMessages || lead.totalMessages === 0) {
      return 'Send personalized message to nurture lead';
    }
    return 'Continue engagement - send additional info or offer inspection';
  }
  
  // Cold lead
  if (lead.viewCount > 0) {
    return 'Send re-engagement message with new inventory or special offer';
  }
  return 'Monitor for future activity - not ready for sales push';
};

/**
 * Score all leads for a dealer
 * @param {string} dealerId - Dealer ID
 * @returns {Promise<LeadScore[]>} All lead scores sorted by priority
 */
export const scoreAllDealerLeads = async (dealerId) => {
  try {
    const leads = await findAll("leads", {
      filters: {
        dealer: dealerId,
        archived: { $ne: true },
      },
      select: "_id",
    });

    const scores = [];
    
    for (const lead of leads) {
      try {
        const score = await scoreLead(lead.id);
        scores.push(score);
      } catch (err) {
        logError("Lead scoring failed", err, { leadId: lead.id });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    logInfo("Dealer leads scored", {
      dealerId,
      totalLeads: scores.length,
      hotLeads: scores.filter(s => s.tier === 'hot').length,
    });

    return scores;
  } catch (err) {
    logError("Score all leads error", err, { dealerId });
    throw err;
  }
};

/**
 * Get leads requiring immediate attention
 * @param {string} dealerId - Dealer ID
 * @returns {Promise<Object>} Hot leads and stale leads
 */
export const getLeadsRequiringAttention = async (dealerId) => {
  try {
    // Get hot leads
    const hotLeads = await findAll("leads", {
      filters: {
        dealer: dealerId,
        priorityTier: 'hot',
        archived: { $ne: true },
      },
      sort: { priorityScore: -1 },
      limit: 10,
    });

    // Get leads with no response in 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const staleLeads = await findAll("leads", {
      filters: {
        dealer: dealerId,
        createdAt: { $lt: twoDaysAgo },
        totalMessages: 0,
        archived: { $ne: true },
      },
      sort: { createdAt: 1 },
      limit: 10,
    });

    // Get leads not contacted in 3+ days
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const needsFollowUp = await findAll("leads", {
      filters: {
        dealer: dealerId,
        lastActivityAt: { $lt: threeDaysAgo },
        priorityTier: { $in: ['hot', 'warm'] },
        archived: { $ne: true },
      },
      sort: { lastActivityAt: 1 },
      limit: 10,
    });

    return {
      hotLeads,
      staleLeads,
      needsFollowUp,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logError("Attention leads error", err, { dealerId });
    throw err;
  }
};

/**
 * Get lead analytics summary
 * @param {string} dealerId - Dealer ID
 * @returns {Promise<Object>} Lead analytics
 */
export const getLeadAnalytics = async (dealerId) => {
  try {
    const allLeads = await findAll("leads", {
      filters: { dealer: dealerId },
      select: "_id priorityTier stage source estimatedValue createdAt",
    });

    const stats = {
      total: allLeads.length,
      byTier: {
        hot: allLeads.filter(l => l.priorityTier === 'hot').length,
        warm: allLeads.filter(l => l.priorityTier === 'warm').length,
        cold: allLeads.filter(l => l.priorityTier === 'cold').length,
      },
      byStage: {},
      bySource: {},
      avgLeadValue: 0,
      conversionRate: 0,
    };

    // Count by stage
    allLeads.forEach(lead => {
      stats.byStage[lead.stage] = (stats.byStage[lead.stage] || 0) + 1;
      stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
    });

    // Calculate average value
    const leadsWithValue = allLeads.filter(l => l.estimatedValue > 0);
    if (leadsWithValue.length > 0) {
      stats.avgLeadValue = Math.round(
        leadsWithValue.reduce((sum, l) => sum + l.estimatedValue, 0) / leadsWithValue.length
      );
    }

    // Calculate conversion rate (sold / total)
    const sold = allLeads.filter(l => l.stage === 'sold').length;
    if (allLeads.length > 0) {
      stats.conversionRate = Math.round((sold / allLeads.length) * 100);
    }

    return {
      ...stats,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logError("Lead analytics error", err, { dealerId });
    throw err;
  }
};

export default {
  scoreLead,
  scoreAllDealerLeads,
  getLeadsRequiringAttention,
  getLeadAnalytics,
};
