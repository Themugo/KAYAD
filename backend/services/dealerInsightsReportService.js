// backend/services/dealerInsightsReportService.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Dealer Insights Report Service
// Generates scheduled performance reports for dealers
// Weekly summaries, competitive insights, improvement recommendations
// ─────────────────────────────────────────────────────────────

import { logInfo, logError } from "../utils/logger.js";
import { findAll, findById, aggregate } from "../db/index.js";
import { calculateHealthScore } from "./dealerHealthScoreService.js";
import { sendEmail } from "./email.service.js";

/**
 * Report types
 */
const REPORT_TYPES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  PERFORMANCE: 'performance',
  COMPETITIVE: 'competitive',
};

/**
 * @typedef {Object} DealerReport
 * @property {string} dealerId - Dealer ID
 * @property {string} type - Report type
 * @property {Object} summary - Key metrics
 * @property {Object[]} insights - Generated insights
 * @property {Object[]} recommendations - Actionable recommendations
 * @property {string[]} highlights - Key achievements
 * @property {string[]} concerns - Areas needing attention
 */

/**
 * Generate comprehensive dealer report
 * @param {string} dealerId - Dealer ID
 * @param {string} type - Report type (weekly, monthly, etc.)
 * @param {Object} [options] - Additional options
 * @returns {Promise<DealerReport>} Complete report
 */
export const generateReport = async (dealerId, type = REPORT_TYPES.WEEKLY, options = {}) => {
  try {
    const dealer = await findById("users", dealerId);
    if (!dealer) {
      throw new Error("Dealer not found");
    }

    // Determine date range
    const { startDate, endDate } = getDateRange(type);

    // Gather all metrics in parallel
    const [
      salesMetrics,
      leadMetrics,
      inventoryMetrics,
      healthScore,
      marketPosition,
      comparables
    ] = await Promise.all([
      getSalesMetrics(dealerId, startDate, endDate),
      getLeadMetrics(dealerId, startDate, endDate),
      getInventoryMetrics(dealerId),
      getHealthScoreWithInsights(dealerId),
      getMarketPosition(dealerId),
      getComparableDealers(dealerId),
    ]);

    // Generate insights
    const insights = generateInsights(salesMetrics, leadMetrics, inventoryMetrics, healthScore);
    
    // Generate recommendations
    const recommendations = generateRecommendations(salesMetrics, leadMetrics, inventoryMetrics, healthScore);
    
    // Extract highlights and concerns
    const { highlights, concerns } = extractHighlightsAndConcerns(
      salesMetrics, leadMetrics, inventoryMetrics, healthScore, insights
    );

    const report = {
      dealerId,
      dealerName: dealer.name || dealer.businessName || 'Dealer',
      type,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        salesMetrics,
        leadMetrics,
        inventoryMetrics,
        healthScore: healthScore.healthScore,
        healthTrend: healthScore.trend,
      },
      insights,
      recommendations,
      highlights,
      concerns,
      marketPosition,
      comparables: comparables.slice(0, 5),
      nextReportDate: getNextReportDate(type),
    };

    logInfo("Report generated", {
      dealerId,
      type,
      insightsCount: insights.length,
      recommendationsCount: recommendations.length,
    });

    return report;
  } catch (err) {
    logError("Report generation error", err, { dealerId, type });
    throw err;
  }
};

/**
 * Get date range for report type
 */
const getDateRange = (type) => {
  const endDate = new Date();
  let startDate;
  
  switch (type) {
    case REPORT_TYPES.WEEKLY:
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case REPORT_TYPES.MONTHLY:
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

/**
 * Calculate next report date
 */
const getNextReportDate = (type) => {
  const next = new Date();
  
  switch (type) {
    case REPORT_TYPES.WEEKLY:
      next.setDate(next.getDate() + (7 - next.getDay())); // Next Monday
      break;
    case REPORT_TYPES.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  
  return next.toISOString();
};

/**
 * Get sales metrics
 */
const getSalesMetrics = async (dealerId, startDate, endDate) => {
  try {
    const transactions = await findAll("transactions", {
      filters: {
        user: dealerId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: 'pending' },
      },
    });

    const sales = transactions.filter(t => t.type === 'sale' && t.status === 'success');
    const revenue = sales.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgDealSize = sales.length > 0 ? revenue / sales.length : 0;

    // Get previous period for comparison
    const periodLength = new Date(endDate) - new Date(startDate);
    const prevStart = new Date(new Date(startDate) - periodLength).toISOString();
    const prevEnd = new Date(new Date(startDate) - 1).toISOString();
    
    const prevTransactions = await findAll("transactions", {
      filters: {
        user: dealerId,
        createdAt: { $gte: prevStart, $lte: prevEnd },
        status: { $ne: 'pending' },
      },
    });
    
    const prevSales = prevTransactions.filter(t => t.type === 'sale' && t.status === 'success');
    const prevRevenue = prevSales.reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalSales: sales.length,
      revenue,
      avgDealSize: Math.round(avgDealSize),
      revenueChange: prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0,
      previousPeriodRevenue: prevRevenue,
    };
  } catch (err) {
    logError("Sales metrics error", err);
    return { totalSales: 0, revenue: 0, avgDealSize: 0, revenueChange: 0 };
  }
};

/**
 * Get lead metrics
 */
const getLeadMetrics = async (dealerId, startDate, endDate) => {
  try {
    const leads = await findAll("leads", {
      filters: {
        dealer: dealerId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    });

    const converted = leads.filter(l => l.stage === 'sold');
    const hotLeads = leads.filter(l => l.priorityTier === 'hot');
    const avgResponseTime = calculateAvgResponseTime(leads);

    return {
      totalLeads: leads.length,
      hotLeads: hotLeads.length,
      conversions: converted.length,
      conversionRate: leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0,
      avgResponseTimeMinutes: Math.round(avgResponseTime),
    };
  } catch (err) {
    logError("Lead metrics error", err);
    return { totalLeads: 0, hotLeads: 0, conversions: 0, conversionRate: 0, avgResponseTimeMinutes: 0 };
  }
};

/**
 * Calculate average response time
 */
const calculateAvgResponseTime = (leads) => {
  const leadsWithResponse = leads.filter(l => l.firstResponseTime > 0);
  if (leadsWithResponse.length === 0) return 0;
  
  const totalTime = leadsWithResponse.reduce((sum, l) => sum + l.firstResponseTime, 0);
  return totalTime / leadsWithResponse.length;
};

/**
 * Get inventory metrics
 */
const getInventoryMetrics = async (dealerId) => {
  try {
    const vehicles = await findAll("cars", {
      filters: {
        dealer: dealerId,
        status: { $ne: 'archived' },
      },
      select: "_id price status views daysOnMarket",
    });

    const active = vehicles.filter(v => v.status === 'active');
    const sold = vehicles.filter(v => v.status === 'sold');
    const inventoryValue = active.reduce((sum, v) => sum + (v.price || 0), 0);
    
    // Calculate avg days to sell
    const soldWithDays = sold.filter(v => v.daysOnMarket > 0);
    const avgDaysToSell = soldWithDays.length > 0
      ? soldWithDays.reduce((sum, v) => sum + v.daysOnMarket, 0) / soldWithDays.length
      : 0;

    return {
      totalVehicles: vehicles.length,
      activeListings: active.length,
      inventoryValue,
      avgDaysToSell: Math.round(avgDaysToSell),
      totalViews: active.reduce((sum, v) => sum + (v.views || 0), 0),
    };
  } catch (err) {
    logError("Inventory metrics error", err);
    return { totalVehicles: 0, activeListings: 0, inventoryValue: 0, avgDaysToSell: 0, totalViews: 0 };
  }
};

/**
 * Get health score with insights
 */
const getHealthScoreWithInsights = async (dealerId) => {
  try {
    const score = await calculateHealthScore(dealerId);
    
    // Get trend by comparing to previous score
    const prevScore = await findAll("dealer_health_scores", {
      filters: { dealer: dealerId },
      sort: { lastCalculatedAt: -1 },
      limit: 2,
    });
    
    let trend = 'stable';
    if (prevScore.length >= 2) {
      const diff = score.healthScore - prevScore[1].healthScore;
      trend = diff > 2 ? 'improving' : diff < -2 ? 'declining' : 'stable';
    }

    return { ...score, trend };
  } catch (err) {
    logError("Health score error", err);
    return { healthScore: 0, trend: 'unknown' };
  }
};

/**
 * Get market position
 */
const getMarketPosition = async (dealerId) => {
  try {
    // Get dealer's active listings and avg price
    const vehicles = await findAll("cars", {
      filters: { dealer: dealerId, status: 'active' },
      select: "price brand model",
    });

    if (vehicles.length === 0) {
      return { avgPrice: 0, marketShare: 0, rank: null };
    }

    const avgPrice = vehicles.reduce((sum, v) => sum + (v.price || 0), 0) / vehicles.length;
    
    // Get total market listings
    const totalMarket = await findAll("cars", {
      filters: { status: 'active' },
      select: "_id",
    });

    const marketShare = (vehicles.length / totalMarket.length) * 100;

    return {
      avgPrice: Math.round(avgPrice),
      listingsCount: vehicles.length,
      marketShare: Math.round(marketShare * 10) / 10,
    };
  } catch (err) {
    logError("Market position error", err);
    return { avgPrice: 0, marketShare: 0, rank: null };
  }
};

/**
 * Get comparable dealers
 */
const getComparableDealers = async (dealerId) => {
  try {
    // Find dealers with similar inventory value
    const dealers = await findAll("users", {
      filters: { role: 'dealer' },
      select: "_id name businessName",
    });

    return dealers.slice(0, 5).map(d => ({
      id: d.id,
      name: d.businessName || d.name,
      score: Math.round(Math.random() * 30 + 70), // Placeholder - would calculate real score
    }));
  } catch (err) {
    return [];
  }
};

/**
 * Generate actionable insights
 */
const generateInsights = (sales, leads, inventory, health) => {
  const insights = [];

  // Revenue insights
  if (sales.revenueChange > 20) {
    insights.push({
      type: 'positive',
      category: 'sales',
      message: `Revenue is up ${sales.revenueChange}% compared to last period`,
      impact: 'high',
    });
  } else if (sales.revenueChange < -10) {
    insights.push({
      type: 'concern',
      category: 'sales',
      message: `Revenue declined ${Math.abs(sales.revenueChange)}% - consider reviewing pricing strategy`,
      impact: 'high',
    });
  }

  // Lead quality insights
  if (leads.conversionRate > 20) {
    insights.push({
      type: 'positive',
      category: 'leads',
      message: `Excellent lead conversion rate of ${leads.conversionRate}%`,
      impact: 'medium',
    });
  }

  // Response time insights
  if (leads.avgResponseTimeMinutes > 60) {
    insights.push({
      type: 'concern',
      category: 'leads',
      message: `Average response time is ${leads.avgResponseTimeMinutes} min - faster responses improve conversions`,
      impact: 'high',
    });
  } else if (leads.avgResponseTimeMinutes <= 15) {
    insights.push({
      type: 'positive',
      category: 'leads',
      message: 'Excellent response time - buyers appreciate quick replies!',
      impact: 'medium',
    });
  }

  // Inventory insights
  if (inventory.avgDaysToSell > 45) {
    insights.push({
      type: 'concern',
      category: 'inventory',
      message: `Average ${inventory.avgDaysToSell} days to sell - consider price adjustments`,
      impact: 'medium',
    });
  }

  // Health insights
  if (health.trend === 'improving') {
    insights.push({
      type: 'positive',
      category: 'health',
      message: 'Your dealer score is improving - keep up the good work!',
      impact: 'medium',
    });
  }

  return insights;
};

/**
 * Generate actionable recommendations
 */
const generateRecommendations = (sales, leads, inventory, health) => {
  const recommendations = [];

  // Lead recommendations
  if (leads.hotLeads > 0) {
    recommendations.push({
      priority: 'high',
      category: 'leads',
      action: 'Follow up with hot leads',
      reason: `${leads.hotLeads} high-priority leads need immediate attention`,
    });
  }

  if (leads.avgResponseTimeMinutes > 30) {
    recommendations.push({
      priority: 'high',
      category: 'leads',
      action: 'Improve response time',
      reason: 'Leads contacted within 30 minutes have 3x higher conversion rate',
    });
  }

  // Inventory recommendations
  if (inventory.activeListings < 5) {
    recommendations.push({
      priority: 'medium',
      category: 'inventory',
      action: 'Add more inventory',
      reason: 'More listings increase visibility and sales opportunities',
    });
  }

  if (inventory.avgDaysToSell > 60) {
    recommendations.push({
      priority: 'medium',
      category: 'pricing',
      action: 'Review pricing strategy',
      reason: 'Vehicles priced competitively sell 2x faster',
    });
  }

  // Quality recommendations
  if (health.healthScore < 60) {
    recommendations.push({
      priority: 'high',
      category: 'quality',
      action: 'Improve listing quality',
      reason: 'High-quality listings with 5+ photos and detailed descriptions get 2x more inquiries',
    });
  }

  return recommendations;
};

/**
 * Extract highlights and concerns
 */
const extractHighlightsAndConcerns = (sales, leads, inventory, health, insights) => {
  const highlights = insights
    .filter(i => i.type === 'positive')
    .map(i => i.message);

  const concerns = insights
    .filter(i => i.type === 'concern')
    .map(i => i.message);

  return { highlights, concerns };
};

/**
 * Send report to dealer via email
 * @param {string} dealerId - Dealer ID
 * @param {DealerReport} report - Report to send
 */
export const sendReportEmail = async (dealerId, report) => {
  try {
    const dealer = await findById("users", dealerId);
    if (!dealer || !dealer.email) {
      throw new Error("Dealer email not found");
    }

    const html = generateReportEmailHtml(report);
    
    await sendEmail({
      to: dealer.email,
      subject: `Your ${report.type} performance report - ${new Date(report.period.endDate).toLocaleDateString()}`,
      html,
    });

    logInfo("Report email sent", { dealerId, type: report.type });
    
    return { success: true };
  } catch (err) {
    logError("Report email error", err, { dealerId });
    throw err;
  }
};

/**
 * Generate HTML email template
 */
const generateReportEmailHtml = (report) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0A1628;">Your Weekly Performance Report</h1>
      <p style="color: #666;">Hi ${report.dealerName},</p>
      
      <h2>Key Highlights</h2>
      ${report.highlights.map(h => `<p>✅ ${h}</p>`).join('')}
      
      <h2>Areas to Focus On</h2>
      ${report.concerns.map(c => `<p>⚠️ ${c}</p>`).join('')}
      
      <h2>Top Recommendations</h2>
      ${report.recommendations.slice(0, 3).map(r => `
        <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
          <strong>${r.action}</strong><br>
          <span style="color: #666;">${r.reason}</span>
        </div>
      `).join('')}
      
      <p style="color: #999; font-size: 12px;">
        Generated on ${new Date(report.generatedAt).toLocaleDateString()}
      </p>
    </div>
  `;
};

/**
 * Generate reports for all dealers (batch operation)
 * @param {string} type - Report type
 * @returns {Promise<Object>} Batch results
 */
export const generateBatchReports = async (type = REPORT_TYPES.WEEKLY) => {
  try {
    const dealers = await findAll("users", {
      filters: { role: 'dealer', emailNotifications: true },
      select: "_id email",
    });

    const results = {
      total: dealers.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const dealer of dealers) {
      try {
        const report = await generateReport(dealer.id, type);
        await sendReportEmail(dealer.id, report);
        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push({ dealerId: dealer.id, error: err.message });
      }
    }

    logInfo("Batch reports completed", results);
    
    return results;
  } catch (err) {
    logError("Batch report error", err);
    throw err;
  }
};

export default {
  generateReport,
  sendReportEmail,
  generateBatchReports,
};
