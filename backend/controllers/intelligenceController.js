// ============================================================
// KAYAD EXECUTIVE INTELLIGENCE PLATFORM CONTROLLER
// Business Intelligence for Executive Decision-Making
// ============================================================

import ExecutiveMetric from "../models/ExecutiveMetric.js";
import IntelligenceReport from "../models/IntelligenceReport.js";
import Forecast from "../models/Forecast.js";
import Benchmark from "../models/Benchmark.js";

// ============================================
// EXECUTIVE DASHBOARD
// ============================================

export async function getExecutiveDashboard(req, res) {
  const dashboard = {
    timestamp: new Date().toISOString(),
    kpis: {
      revenueToday: { value: 45890000, change: 12.5, trend: 'up' },
      revenueMonth: { value: 892450000, change: 8.3, trend: 'up' },
      vehiclesListed: { value: 1245, change: 15.2, trend: 'up' },
      vehiclesSold: { value: 89, change: 5.8, trend: 'up' },
      avgSellingPrice: { value: 2850000, change: 3.2, trend: 'up' },
      activeDealers: { value: 456, change: 7.1, trend: 'up' },
      verifiedDealers: { value: 312, change: 12.3, trend: 'up' },
      inspectionRequests: { value: 234, change: -2.1, trend: 'down' },
      financeApplications: { value: 67, change: 18.5, trend: 'up' },
      auctionRevenue: { value: 12340000, change: 22.1, trend: 'up' },
      adRevenue: { value: 3456000, change: 5.4, trend: 'up' },
      subscriptionRevenue: { value: 5678900, change: 3.8, trend: 'up' },
      customerSatisfaction: { value: 94.2, change: 1.5, trend: 'up' },
      marketplaceGrowth: { value: 18.5, change: 4.2, trend: 'up' },
    },
    quickInsights: [
      { type: 'opportunity', text: 'Toyota Corolla demand up 35% this week' },
      { type: 'alert', text: 'Auction participation dropped in Mombasa' },
      { type: 'trend', text: 'SUV segment growing 2x faster than sedan' },
    ],
    alerts: [
      { severity: 'warning', message: 'Finance approval rate below target (65% vs 75%)' },
      { severity: 'info', message: 'New dealer registration spike in Nakuru' },
    ],
  };

  res.json({ success: true, data: dashboard });
}

// ============================================
// MARKETPLACE INTELLIGENCE
// ============================================

export async function getMarketplaceIntelligence(req, res) {
  const data = {
    overview: {
      totalListings: 45678,
      activeListings: 12456,
      avgDaysToSell: 14,
      conversionRate: 8.5,
    },
    topSearches: [
      { term: 'Toyota', count: 12456 },
      { term: 'Toyota Corolla', count: 8934 },
      { term: 'Nissan', count: 7234 },
      { term: 'SUV', count: 6789 },
      { term: 'Toyota Landcruiser', count: 5678 },
      { term: 'Saloon', count: 4567 },
      { term: 'Subaru', count: 3456 },
      { term: 'Honda', count: 2987 },
    ],
    topBrands: [
      { brand: 'Toyota', vehicles: 12456, share: 32.5 },
      { brand: 'Nissan', vehicles: 7890, share: 20.6 },
      { brand: 'Subaru', vehicles: 4567, share: 11.9 },
      { brand: 'Honda', vehicles: 3456, share: 9.0 },
      { brand: 'Mitsubishi', vehicles: 2890, share: 7.5 },
    ],
    mostViewed: [
      { vehicle: 'Toyota Corolla 2023', views: 45678, leads: 234 },
      { vehicle: 'Toyota Landcruiser GX', views: 38901, leads: 189 },
      { vehicle: 'Nissan X-Trail', views: 32456, leads: 167 },
    ],
    priceTrends: [
      { month: 'Sep', avgPrice: 2650000 },
      { month: 'Oct', avgPrice: 2720000 },
      { month: 'Nov', avgPrice: 2780000 },
      { month: 'Dec', avgPrice: 2850000 },
      { month: 'Jan', avgPrice: 2890000 },
    ],
    inventoryAging: [
      { bucket: '0-7 days', count: 3456, percentage: 28 },
      { bucket: '8-14 days', count: 2890, percentage: 23 },
      { bucket: '15-30 days', count: 3456, percentage: 28 },
      { bucket: '31-60 days', count: 1678, percentage: 13 },
      { bucket: '60+ days', count: 976, percentage: 8 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// DEALER INTELLIGENCE
// ============================================

export async function getDealerIntelligence(req, res) {
  const data = {
    overview: {
      totalDealers: 456,
      activeDealers: 412,
      verifiedDealers: 312,
      avgResponseTime: '2.3 hours',
      avgRating: 4.5,
    },
    topDealers: [
      { name: 'Auto Kenya Ltd', sales: 234, revenue: 678900000, rating: 4.8, status: 'excellent' },
      { name: 'Prime Motors', sales: 198, revenue: 567890000, rating: 4.7, status: 'excellent' },
      { name: 'Nairobi Auto Gallery', sales: 167, revenue: 456700000, rating: 4.6, status: 'good' },
      { name: 'Coast Vehicles', sales: 145, revenue: 398700000, rating: 4.5, status: 'good' },
      { name: 'Kisumu Motors', sales: 123, revenue: 345600000, rating: 4.4, status: 'good' },
    ],
    dealerHealthScores: [
      { score: '90-100', label: 'Excellent', count: 45, color: '#10B981' },
      { score: '75-89', label: 'Good', count: 123, color: '#60A5FA' },
      { score: '60-74', label: 'Fair', count: 89, color: '#FBBF24' },
      { score: 'Below 60', label: 'At Risk', count: 23, color: '#EF4444' },
    ],
    performanceMetrics: {
      avgListToSaleTime: 12.5,
      avgInspectionPassRate: 87.5,
      avgCustomerRating: 4.5,
      avgResponseTime: 2.3,
    },
    dealerGrowth: [
      { month: 'Sep', new: 12, suspended: 2 },
      { month: 'Oct', new: 18, suspended: 1 },
      { month: 'Nov', new: 15, suspended: 3 },
      { month: 'Dec', new: 8, suspended: 2 },
      { month: 'Jan', new: 22, suspended: 1 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// AUCTION INTELLIGENCE
// ============================================

export async function getAuctionIntelligence(req, res) {
  const data = {
    overview: {
      activeAuctions: 45,
      totalBidders: 2345,
      avgBidCount: 8.5,
      successRate: 78.5,
      avgDuration: '4.2 days',
    },
    topAuctions: [
      { vehicle: 'Toyota Landcruiser V8 2022', bids: 24, finalPrice: 12500000, vsReserve: 15 },
      { vehicle: 'Mercedes GLE 2023', bids: 18, finalPrice: 8900000, vsReserve: 8 },
      { vehicle: 'Range Rover 2022', bids: 15, finalPrice: 11200000, vsReserve: 12 },
    ],
    auctionTrends: [
      { month: 'Sep', auctions: 45, revenue: 89000000, successRate: 72 },
      { month: 'Oct', auctions: 52, revenue: 102000000, successRate: 75 },
      { month: 'Nov', auctions: 48, revenue: 98000000, successRate: 78 },
      { month: 'Dec', auctions: 55, revenue: 118000000, successRate: 80 },
      { month: 'Jan', auctions: 62, revenue: 123400000, successRate: 78 },
    ],
    bidAnalysis: {
      avgBids: 8.5,
      avgParticipants: 12,
      depositConversion: 85,
      avgTimeToFirstBid: '2.3 hours',
    },
    regionalPerformance: [
      { region: 'Nairobi', auctions: 25, revenue: 56000000 },
      { region: 'Mombasa', auctions: 12, revenue: 28000000 },
      { region: 'Kisumu', auctions: 8, revenue: 18000000 },
      { region: 'Nakuru', auctions: 5, revenue: 12000000 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// FINANCE INTELLIGENCE
// ============================================

export async function getFinanceIntelligence(req, res) {
  const data = {
    overview: {
      applications: 456,
      approved: 312,
      approvalRate: 68.4,
      avgLoanAmount: 1850000,
      avgProcessingTime: '3.2 days',
    },
    topBanks: [
      { bank: 'NCBA', applications: 156, approved: 118, approvalRate: 75.6 },
      { bank: 'Co-op Bank', applications: 134, approved: 98, approvalRate: 73.1 },
      { bank: 'Stanbic', applications: 89, approved: 58, approvalRate: 65.2 },
      { bank: 'KCB', applications: 45, approved: 28, approvalRate: 62.2 },
    ],
    loanDistribution: [
      { range: 'Under 1M', count: 89, percentage: 19.5 },
      { range: '1M-2M', count: 178, percentage: 39.0 },
      { range: '2M-3M', count: 123, percentage: 27.0 },
      { range: '3M-5M', count: 45, percentage: 9.9 },
      { range: 'Over 5M', count: 21, percentage: 4.6 },
    ],
    financeTrends: [
      { month: 'Sep', applications: 78, approved: 52, volume: 89000000 },
      { month: 'Oct', applications: 92, approved: 65, volume: 112000000 },
      { month: 'Nov', applications: 88, approved: 60, volume: 98000000 },
      { month: 'Dec', applications: 102, approved: 72, volume: 125000000 },
      { month: 'Jan', applications: 96, approved: 63, volume: 108000000 },
    ],
    regionalAdoption: [
      { region: 'Nairobi', adoptionRate: 72 },
      { region: 'Mombasa', adoptionRate: 58 },
      { region: 'Kisumu', adoptionRate: 45 },
      { region: 'Nakuru', adoptionRate: 38 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// INSPECTION INTELLIGENCE
// ============================================

export async function getInspectionIntelligence(req, res) {
  const data = {
    overview: {
      requests: 1234,
      completed: 1089,
      avgCompletionTime: '4.5 hours',
      passRate: 78.5,
      revenue: 45678900,
    },
    inspectorPerformance: [
      { name: 'John K.', completed: 234, avgTime: 3.5, rating: 4.8 },
      { name: 'Mary W.', completed: 198, avgTime: 4.2, rating: 4.7 },
      { name: 'Peter N.', completed: 176, avgTime: 4.8, rating: 4.6 },
    ],
    failureCategories: [
      { category: 'Engine', count: 89, percentage: 22.5 },
      { category: 'Brakes', count: 67, percentage: 16.9 },
      { category: 'Suspension', count: 56, percentage: 14.1 },
      { category: 'Electrical', count: 45, percentage: 11.4 },
      { category: 'Body', count: 34, percentage: 8.6 },
      { category: 'Other', count: 104, percentage: 26.3 },
    ],
    regionalCoverage: [
      { region: 'Nairobi', coverage: 95, requests: 456 },
      { region: 'Mombasa', coverage: 78, requests: 234 },
      { region: 'Kisumu', coverage: 65, requests: 123 },
      { region: 'Nakuru', coverage: 52, requests: 89 },
    ],
    inspectionTrends: [
      { month: 'Sep', requests: 198, completed: 176 },
      { month: 'Oct', requests: 234, completed: 212 },
      { month: 'Nov', requests: 245, completed: 218 },
      { month: 'Dec', requests: 278, completed: 245 },
      { month: 'Jan', requests: 279, completed: 238 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// MARKETING INTELLIGENCE
// ============================================

export async function getMarketingIntelligence(req, res) {
  const data = {
    overview: {
      totalVisits: 456789,
      uniqueVisitors: 234567,
      bounceRate: 32.5,
      avgSessionDuration: '5.2 min',
    },
    campaignPerformance: [
      { campaign: 'New Year Sale', leads: 2345, conversions: 234, ctr: 4.5 },
      { campaign: 'Dealer Promo', leads: 1234, conversions: 156, ctr: 3.2 },
      { campaign: 'Brand Awareness', leads: 5678, conversions: 0, ctr: 2.1 },
    ],
    trafficSources: [
      { source: 'Organic Search', visits: 156789, percentage: 34.3 },
      { source: 'Direct', visits: 123456, percentage: 27.0 },
      { source: 'Social Media', visits: 89012, percentage: 19.5 },
      { source: 'Paid Search', visits: 45678, percentage: 10.0 },
      { source: 'Referral', visits: 42345, percentage: 9.3 },
    ],
    seoMetrics: {
      keywordsRanked: 12345,
      avgPosition: 8.5,
      organicTrafficGrowth: 18.5,
    },
    socialMedia: {
      followers: { facebook: 125000, twitter: 45000, instagram: 78000 },
      engagement: 4.5,
      postsThisMonth: 45,
    },
    emailCampaigns: [
      { campaign: 'Weekly Digest', sent: 45000, openRate: 28.5, clickRate: 4.2 },
      { campaign: 'New Listings', sent: 23000, openRate: 32.1, clickRate: 6.8 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// CUSTOMER INTELLIGENCE
// ============================================

export async function getCustomerIntelligence(req, res) {
  const data = {
    overview: {
      totalBuyers: 23456,
      totalSellers: 5678,
      activeBuyers: 12345,
      avgLifetimeValue: 2450000,
      retentionRate: 78.5,
    },
    buyerJourney: [
      { stage: 'Visit', count: 100000 },
      { stage: 'Search', count: 45000 },
      { stage: 'View Listing', count: 23000 },
      { stage: 'Contact', count: 8900 },
      { stage: 'Visit', count: 4500 },
      { stage: 'Purchase', count: 2345 },
    ],
    dropOffPoints: [
      { stage: 'Contact to Visit', dropOff: 49.4 },
      { stage: 'View to Contact', dropOff: 61.3 },
      { stage: 'Search to View', dropOff: 48.9 },
    ],
    repeatBuyers: {
      oneTime: 65,
      repeat: 25,
      loyal: 10,
    },
    satisfactionMetrics: {
      nps: 45,
      csat: 4.3,
      responseTime: '2.5 hours',
      resolutionRate: 92,
    },
    complaintTrends: [
      { category: 'Vehicle Quality', count: 45, trend: 'down' },
      { category: 'Delivery Delays', count: 34, trend: 'stable' },
      { category: 'Documentation', count: 23, trend: 'up' },
      { category: 'Pricing', count: 18, trend: 'down' },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// COUNTRY INTELLIGENCE
// ============================================

export async function getCountryIntelligence(req, res) {
  const data = {
    countries: [
      {
        name: 'Kenya',
        code: 'KE',
        status: 'active',
        metrics: {
          revenue: 892450000,
          dealers: 312,
          vehicles: 45678,
          auctions: 62,
          finance: 456,
          inspections: 1089,
        },
        growth: {
          revenue: 18.5,
          dealers: 12.3,
          vehicles: 15.2,
        },
      },
      {
        name: 'Uganda',
        code: 'UG',
        status: 'active',
        metrics: {
          revenue: 234500000,
          dealers: 89,
          vehicles: 12345,
          auctions: 18,
          finance: 123,
          inspections: 345,
        },
        growth: {
          revenue: 25.3,
          dealers: 18.7,
          vehicles: 22.1,
        },
      },
      {
        name: 'Tanzania',
        code: 'TZ',
        status: 'planning',
        metrics: {
          revenue: 0,
          dealers: 12,
          vehicles: 2345,
          auctions: 0,
          finance: 0,
          inspections: 0,
        },
        growth: {
          revenue: 0,
          dealers: 5.2,
          vehicles: 8.9,
        },
      },
    ],
    comparison: {
      revenue: { kenya: 892, uganda: 234, tanzania: 0 },
      dealers: { kenya: 312, uganda: 89, tanzania: 12 },
      vehicles: { kenya: 45678, uganda: 12345, tanzania: 2345 },
    },
  };

  res.json({ success: true, data });
}

// ============================================
// REVENUE INTELLIGENCE
// ============================================

export async function getRevenueIntelligence(req, res) {
  const data = {
    summary: {
      totalRevenue: 1456789000,
      today: 45890000,
      thisMonth: 892450000,
      thisYear: 4567890000,
    },
    revenueBreakdown: [
      { category: 'Vehicle Sales', amount: 892450000, percentage: 61.3 },
      { category: 'Auction Fees', amount: 123400000, percentage: 8.5 },
      { category: 'Finance Processing', amount: 89000000, percentage: 6.1 },
      { category: 'Inspections', amount: 45678900, percentage: 3.1 },
      { category: 'Advertisements', amount: 156789000, percentage: 10.8 },
      { category: 'Subscriptions', amount: 89000000, percentage: 6.1 },
      { category: 'Other', amount: 62134000, percentage: 4.3 },
    ],
    revenueTrend: [
      { month: 'Sep', amount: 234567000 },
      { month: 'Oct', amount: 267890000 },
      { month: 'Nov', amount: 256789000 },
      { month: 'Dec', amount: 312456000 },
      { month: 'Jan', amount: 298123000 },
    ],
    revenueByRegion: [
      { region: 'Nairobi', amount: 567890000 },
      { region: 'Mombasa', amount: 189000000 },
      { region: 'Kisumu', amount: 78000000 },
      { region: 'Nakuru', amount: 45000000 },
      { region: 'Other', amount: 12345000 },
    ],
  };

  res.json({ success: true, data });
}

// ============================================
// FORECASTING
// ============================================

export async function getForecasts(req, res) {
  const data = {
    revenue: {
      prediction: 5678900000,
      confidence: 0.85,
      trend: 'up',
      factors: ['Market growth', 'New dealer acquisition', 'Regional expansion'],
    },
    dealerGrowth: {
      prediction: 512,
      current: 456,
      growth: 12.3,
      confidence: 0.82,
    },
    vehicleVolume: {
      prediction: 67890,
      current: 45678,
      growth: 48.6,
      confidence: 0.88,
    },
    financeDemand: {
      prediction: 789,
      current: 456,
      growth: 73.0,
      confidence: 0.78,
    },
    forecasts: [
      { metric: 'Revenue Q1', current: 892, predicted: 1050, growth: 17.7 },
      { metric: 'Revenue Q2', current: 892, predicted: 1180, growth: 32.3 },
      { metric: 'Dealers by June', current: 456, predicted: 485, growth: 6.4 },
      { metric: 'Vehicles Listed', current: 45678, predicted: 55000, growth: 20.4 },
    ],
    scenarios: {
      optimistic: { revenue: 6200000000, probability: 0.25 },
      baseline: { revenue: 5678900000, probability: 0.55 },
      conservative: { revenue: 5100000000, probability: 0.20 },
    },
  };

  res.json({ success: true, data });
}

// ============================================
// AI INSIGHTS
// ============================================

export async function getAIInsights(req, res) {
  const insights = [
    {
      type: 'opportunity',
      title: 'SUV Market Growing Fast',
      description: 'SUV searches up 45% MoM, but supply only up 12%. Consider encouraging SUV listings.',
      impact: 'high',
      confidence: 0.89,
      recommendation: 'Launch SUV dealer recruitment campaign',
    },
    {
      type: 'trend',
      title: 'New Buyer Acquisition',
      description: 'First-time buyers increased 23% this month, driven by social media campaigns.',
      impact: 'medium',
      confidence: 0.85,
      recommendation: 'Continue social media investment',
    },
    {
      type: 'risk',
      title: 'Inspection Capacity Gap',
      description: 'Mombasa showing 40% increase in requests but inspector capacity unchanged.',
      impact: 'high',
      confidence: 0.92,
      recommendation: 'Add 2 inspectors in Mombasa region',
    },
    {
      type: 'opportunity',
      title: 'Finance Cross-Sell',
      description: 'Only 45% of vehicle buyers use finance. Industry benchmark is 65%.',
      impact: 'medium',
      confidence: 0.78,
      recommendation: 'Partner with banks for better rates',
    },
    {
      type: 'trend',
      title: 'Premium Segment Growth',
      description: 'Vehicles over 5M showing 35% higher growth than budget segment.',
      impact: 'medium',
      confidence: 0.82,
      recommendation: 'Focus on premium dealer partnerships',
    },
    {
      type: 'alert',
      title: 'Auction Conversion Drop',
      description: 'Auction success rate dropped from 80% to 72% in Nakuru.',
      impact: 'medium',
      confidence: 0.88,
      recommendation: 'Review reserve price guidelines',
    },
  ];

  res.json({ success: true, data: insights });
}

// ============================================
// BENCHMARKING
// ============================================

export async function getBenchmarks(req, res) {
  const data = {
    periodComparison: {
      revenue: { current: 892450000, previous: 823450000, change: 8.4 },
      vehicles: { current: 45678, previous: 39645, change: 15.2 },
      dealers: { current: 456, previous: 425, change: 7.3 },
      satisfaction: { current: 94.2, previous: 92.8, change: 1.5 },
    },
    dealerComparison: [
      { name: 'Auto Kenya Ltd', sales: 234, rank: 1 },
      { name: 'Prime Motors', sales: 198, rank: 2 },
      { name: 'Nairobi Auto Gallery', sales: 167, rank: 3 },
      { name: 'Coast Vehicles', sales: 145, rank: 4 },
      { name: 'Kisumu Motors', sales: 123, rank: 5 },
    ],
    regionComparison: [
      { region: 'Nairobi', revenue: 567890000, dealers: 156, index: 100 },
      { region: 'Mombasa', revenue: 189000000, dealers: 89, index: 78 },
      { region: 'Kisumu', revenue: 78000000, dealers: 45, index: 65 },
      { region: 'Nakuru', revenue: 45000000, dealers: 34, index: 58 },
    ],
    industryBenchmarks: {
      avgDaysToSell: { kayad: 14, industry: 18 },
      conversionRate: { kayad: 8.5, industry: 6.2 },
      customerSatisfaction: { kayad: 94.2, industry: 85 },
    },
  };

  res.json({ success: true, data });
}

// ============================================
// REPORTS
// ============================================

export async function getReports(req, res) {
  const reports = [
    { id: '1', name: 'Daily Brief', type: 'daily', lastGenerated: new Date().toISOString() },
    { id: '2', name: 'Weekly Executive Report', type: 'weekly', lastGenerated: new Date(Date.now() - 604800000).toISOString() },
    { id: '3', name: 'Monthly Business Review', type: 'monthly', lastGenerated: new Date(Date.now() - 2592000000).toISOString() },
    { id: '4', name: 'Quarterly Board Report', type: 'quarterly', lastGenerated: new Date(Date.now() - 7776000000).toISOString() },
    { id: '5', name: 'Dealer Performance Report', type: 'monthly', lastGenerated: new Date(Date.now() - 2592000000).toISOString() },
    { id: '6', name: 'Country Performance Report', type: 'monthly', lastGenerated: new Date(Date.now() - 2592000000).toISOString() },
  ];

  res.json({ success: true, data: reports });
}

export async function generateReport(req, res) {
  const { reportType, format, dateRange } = req.body;

  const report = {
    id: 'rpt_' + Date.now(),
    type: reportType,
    format: format || 'pdf',
    status: 'generating',
    estimatedTime: '2-5 minutes',
    downloadUrl: `/api/intelligence/reports/download/${Date.now()}`,
  };

  res.status(202).json({ success: true, data: report });
}

export async function downloadReport(req, res) {
  const { reportId } = req.params;

  res.json({
    success: true,
    message: 'Report download started',
    data: {
      reportId,
      fileName: `report_${reportId}.pdf`,
      size: '2.4 MB',
    },
  });
}

// ============================================
// SELF-SERVICE ANALYTICS
// ============================================

export async function queryIntelligence(req, res) {
  const { query } = req.body;

  const result = await processNaturalLanguageQuery(query);

  res.json({ success: true, data: result });
}

async function processNaturalLanguageQuery(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('dealer growth') || lowerQuery.includes('dealers growing')) {
    return {
      query,
      visualization: 'line',
      data: {
        labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
        values: [425, 438, 445, 451, 456],
      },
      insights: ['Dealer growth steady at 7.3% YoY', 'Nairobi leads with 45% of new registrations'],
    };
  }

  if (lowerQuery.includes('toyota') && lowerQuery.includes('sales')) {
    return {
      query,
      visualization: 'bar',
      data: {
        labels: ['Toyota Corolla', 'Toyota Landcruiser', 'Toyota Rav4', 'Toyota Premio'],
        values: [4567, 2345, 1234, 987],
      },
      insights: ['Toyota commands 32.5% of market', 'Corolla fastest selling model'],
    };
  }

  if (lowerQuery.includes('average selling price') || lowerQuery.includes('avg price')) {
    return {
      query,
      visualization: 'metric',
      data: {
        current: 2850000,
        previous: 2720000,
        change: 4.8,
      },
      insights: ['Average price up 4.8% MoM', 'Premium segment driving growth'],
    };
  }

  if (lowerQuery.includes('inspector') || lowerQuery.includes('inspection')) {
    return {
      query,
      visualization: 'table',
      data: [
        { region: 'Nairobi', inspectors: 12, requests: 456, capacity: 'OK' },
        { region: 'Mombasa', inspectors: 6, requests: 234, capacity: 'STRESSED' },
        { region: 'Kisumu', inspectors: 3, requests: 123, capacity: 'LOW' },
      ],
      insights: ['Mombasa needs 2 more inspectors', 'Kisumu needs 1 more inspector'],
    };
  }

  return {
    query,
    visualization: 'text',
    data: { response: 'I can help with dealer growth, sales comparisons, pricing analysis, and resource allocation. Try asking in plain English!' },
    suggestions: [
      'Show dealer growth in Nairobi',
      'Compare Toyota vs Subaru sales',
      'Average selling price of SUVs',
      'Which counties need more inspectors?',
    ],
  };
}

// ============================================
// EXPORTS
// ============================================

export async function exportData(req, res) {
  const { type, format, dateRange } = req.body;

  const exportJob = {
    id: 'exp_' + Date.now(),
    type,
    format: format || 'csv',
    status: 'processing',
    estimatedTime: '30 seconds',
    downloadUrl: `/api/intelligence/exports/download/${Date.now()}`,
  };

  res.status(202).json({ success: true, data: exportJob });
}

// ============================================
// SCHEDULED REPORTS
// ============================================

export async function getScheduledReports(req, res) {
  const schedules = [
    { id: '1', report: 'Daily Brief', schedule: 'daily', time: '07:00', recipients: ['ceo@kayad.com', 'cfo@kayad.com'] },
    { id: '2', report: 'Weekly Executive', schedule: 'weekly', day: 'Monday', time: '08:00', recipients: ['executive@kayad.com'] },
    { id: '3', report: 'Dealer Report', schedule: 'weekly', day: 'Friday', time: '17:00', recipients: ['dealer-manager@kayad.com'] },
  ];

  res.json({ success: true, data: schedules });
}

export async function createScheduledReport(req, res) {
  const { report, schedule, time, day, recipients } = req.body;

  const scheduledReport = await IntelligenceReport.create({
    report,
    schedule,
    time,
    day,
    recipients: typeof recipients === 'object' ? JSON.stringify(recipients) : recipients,
    status: 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: scheduledReport });
}
