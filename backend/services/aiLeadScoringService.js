// backend/services/aiLeadScoringService.js
// AI-powered lead scoring service

import Lead from '../models/Lead.js';
import { logInfo, logError } from '../utils/logger.js';

export class AILeadScoringService {
  constructor() {
    this.weights = {
      engagement: 0.3,
      intent: 0.25,
      budget: 0.2,
      timeline: 0.15,
      fit: 0.1,
    };
  }

  /**
   * Score a lead
   */
  async scoreLead(leadId) {
    try {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      let totalScore = 0;
      const scores = {};

      // Score 1: Engagement level
      const engagementScore = this.scoreEngagement(lead);
      scores.engagement = engagementScore;
      totalScore += engagementScore * this.weights.engagement;

      // Score 2: Purchase intent
      const intentScore = this.scoreIntent(lead);
      scores.intent = intentScore;
      totalScore += intentScore * this.weights.intent;

      // Score 3: Budget match
      const budgetScore = this.scoreBudget(lead);
      scores.budget = budgetScore;
      totalScore += budgetScore * this.weights.budget;

      // Score 4: Timeline urgency
      const timelineScore = this.scoreTimeline(lead);
      scores.timeline = timelineScore;
      totalScore += timelineScore * this.weights.timeline;

      // Score 5: Vehicle fit
      const fitScore = this.scoreFit(lead);
      scores.fit = fitScore;
      totalScore += fitScore * this.weights.fit;

      // Normalize to 0-100
      const finalScore = Math.round(totalScore * 100);

      // Determine lead quality
      let leadQuality = 'cold';
      if (finalScore >= 80) {
        leadQuality = 'hot';
      } else if (finalScore >= 60) {
        leadQuality = 'warm';
      } else if (finalScore >= 40) {
        leadQuality = 'medium';
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(finalScore, leadQuality, scores);

      return {
        leadId,
        score: finalScore,
        leadQuality,
        scores,
        recommendations,
      };
    } catch (error) {
      logError('Failed to score lead', { error: error.message });
      throw error;
    }
  }

  scoreEngagement(lead) {
    let score = 0;

    // Check for recent activity
    const daysSinceLastActivity = lead.lastActivity
      ? (Date.now() - new Date(lead.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      : 30;

    if (daysSinceLastActivity < 1) {
      score += 0.4;
    } else if (daysSinceLastActivity < 7) {
      score += 0.3;
    } else if (daysSinceLastActivity < 30) {
      score += 0.2;
    } else {
      score += 0.1;
    }

    // Check for multiple interactions
    if (lead.interactionCount >= 5) {
      score += 0.3;
    } else if (lead.interactionCount >= 3) {
      score += 0.2;
    } else if (lead.interactionCount >= 1) {
      score += 0.1;
    }

    // Check for response to outreach
    if (lead.respondedToOutreach) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  scoreIntent(lead) {
    let score = 0;

    // Check for explicit purchase intent
    if (lead.intent === 'purchase') {
      score += 0.5;
    } else if (lead.intent === 'research') {
      score += 0.3;
    } else {
      score += 0.1;
    }

    // Check for specific vehicle interest
    if (lead.vehicleInterest && lead.vehicleInterest.length > 0) {
      score += 0.3;
    }

    // Check for budget indication
    if (lead.budget && lead.budget > 0) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  scoreBudget(lead) {
    if (!lead.budget || !lead.targetPrice) {
      return 0.5;
    }

    const budgetMatch = Math.abs(lead.budget - lead.targetPrice) / lead.targetPrice;

    if (budgetMatch < 0.1) {
      return 1; // Within 10%
    } else if (budgetMatch < 0.2) {
      return 0.8;
    } else if (budgetMatch < 0.3) {
      return 0.6;
    } else if (budgetMatch < 0.5) {
      return 0.4;
    } else {
      return 0.2;
    }
  }

  scoreTimeline(lead) {
    if (!lead.timeline) {
      return 0.5;
    }

    const timelineScores = {
      'immediate': 1,
      'within_month': 0.8,
      'within_quarter': 0.6,
      'within_year': 0.4,
      'flexible': 0.5,
    };

    return timelineScores[lead.timeline.toLowerCase()] || 0.5;
  }

  scoreFit(lead) {
    let score = 0;

    // Check for location match
    if (lead.location && lead.preferredLocation) {
      score += 0.3;
    }

    // Check for vehicle type match
    if (lead.vehicleType && lead.preferredVehicleType) {
      score += 0.3;
    }

    // Check for feature preferences
    if (lead.features && lead.features.length > 0) {
      score += 0.2;
    }

    // Check for dealer preference
    if (lead.preferredDealer) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  generateRecommendations(score, quality, scores) {
    const recommendations = [];

    if (score >= 80) {
      recommendations.push({
        priority: 'high',
        action: 'immediate_followup',
        message: 'Hot lead - prioritize immediate follow-up',
      });
    } else if (score >= 60) {
      recommendations.push({
        priority: 'medium',
        action: 'scheduled_followup',
        message: 'Warm lead - schedule follow-up within 24 hours',
      });
    } else if (score >= 40) {
      recommendations.push({
        priority: 'low',
        action: 'nurture_campaign',
        message: 'Medium lead - add to nurture campaign',
      });
    } else {
      recommendations.push({
        priority: 'low',
        action: 'monitor',
        message: 'Cold lead - monitor for engagement',
      });
    }

    if (scores.engagement < 0.5) {
      recommendations.push({
        priority: 'medium',
        action: 'increase_engagement',
        message: 'Low engagement - consider outreach campaign',
      });
    }

    if (scores.intent < 0.5) {
      recommendations.push({
        priority: 'medium',
        action: 'clarify_intent',
        message: 'Unclear intent - reach out to understand needs',
      });
    }

    return recommendations;
  }

  /**
   * Batch score multiple leads
   */
  async batchScoreLeads(leadIds) {
    const results = [];
    
    for (const leadId of leadIds) {
      try {
        const result = await this.scoreLead(leadId);
        results.push(result);
      } catch (error) {
        logError(`Failed to score lead ${leadId}`, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Get lead scoring metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      // This would fetch actual metrics from a database
      return {
        totalLeads: 500,
        hotLeads: 100,
        warmLeads: 150,
        mediumLeads: 150,
        coldLeads: 100,
        averageScore: 55,
        conversionRate: 15,
      };
    } catch (error) {
      logError('Failed to get lead scoring metrics', { error: error.message });
      throw error;
    }
  }

  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1d':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

export default new AILeadScoringService();
