/**
 * Enterprise Auction Intelligence & Market Analytics Platform
 * Comprehensive analytics for organizers, administrators and marketplace operations
 */

// ============================================================
// Types & Interfaces
// ============================================================

export type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

export type UserRole = 'buyer' | 'organizer' | 'admin' | 'compliance_officer';

export interface DateRange {
  start: string;
  end: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  activeAuctions: number;
  completedAuctions: number;
  upcomingAuctions: number;
  averageBiddersPerAuction: number;
  auctionCompletionRate: number;
  averageSellingPrice: number;
  reserveAchievementRate: number;
  winningPaymentCompletion: number;
  averageAuctionDuration: number;
  totalBids: number;
  totalValue: number;
}

// Time Series Data
export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  series: TimeSeriesPoint[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  changeAbsolute: number;
}

// Market Demand Analytics
export interface MarketDemandData {
  dimension: string;
  dimensionLabel: string;
  count: number;
  percentage: number;
  averagePrice: number;
  trend: TimeSeriesData;
}

// Bidder Analytics
export interface BidderMetrics {
  registeredBidders: number;
  qualifiedBidders: number;
  averageBidsPerUser: number;
  winningPercentage: number;
  repeatBidders: number;
  newBidders: number;
  bidFrequency: number;
  bidAbandonmentRate: number;
}

// Organizer Performance
export interface OrganizerPerformance {
  organizerId: string;
  organizerName: string;
  auctionsConducted: number;
  vehiclesSold: number;
  sellThroughRate: number;
  averageSellingTime: number;
  averageBiddersPerAuction: number;
  reserveAchievement: number;
  buyerSatisfaction: number;
  inspectionUsage: number;
  responseTime: string;
  customerRating: number;
  cancellationRate: number;
  marketplaceAverage?: number;
  benchmarkPercentile?: number;
}

// Vehicle Performance
export interface VehiclePerformance {
  vehicleId: string;
  vehicleTitle: string;
  make: string;
  model: string;
  views: number;
  watchlistAdds: number;
  bids: number;
  highestBid: number;
  sellingTime: number;
  sold: boolean;
  reserveMet: boolean;
}

// Price Intelligence
export interface PriceIntelligence {
  averageWinningPrice: number;
  reserveSuccessRate: number;
  marketValueComparison: number;
  priceAppreciation: number;
  priceDepreciation: number;
  demandByPriceBand: MarketDemandData[];
  priceTrends: TimeSeriesData;
  suggestedReserveRange: { min: number; max: number };
  suggestedOpeningBid: number;
}

// Time Intelligence
export interface TimeIntelligence {
  bestAuctionDays: { day: string; avgBids: number }[];
  bestAuctionHours: { hour: number; avgBids: number }[];
  peakActivityPeriods: TimeSeriesData;
  viewingAttendance: number;
  registrationTrends: TimeSeriesData;
  winningBidTiming: { hour: number; percentage: number }[];
}

// Geographic Analytics
export interface GeographicData {
  country: string;
  county?: string;
  city?: string;
  region?: string;
  auctions: number;
  bidders: number;
  totalValue: number;
  averagePrice: number;
  demandHeatLevel?: number; // 1-10
}

// Conversion Funnel
export interface ConversionFunnel {
  stage: string;
  stageLabel: string;
  count: number;
  percentage: number;
  dropoff: number;
  avgTimeSpent?: string;
}

// Market Recommendation
export interface MarketRecommendation {
  id: string;
  category: 'timing' | 'pricing' | 'category' | 'inspection' | 'marketing';
  title: string;
  description: string;
  insight: string;
  data: string;
  confidence: 'high' | 'medium' | 'low';
  potentialImpact: 'high' | 'medium' | 'low';
}

// Administrator Analytics
export interface AdminAnalytics {
  marketplaceGrowth: TimeSeriesData;
  organizerGrowth: TimeSeriesData;
  revenue: TimeSeriesData;
  complianceTrends: TimeSeriesData;
  riskTrends: TimeSeriesData;
  fraudReviews: number;
  auctionSuccess: number;
  customerSatisfaction: number;
  inspectionActivity: number;
  escrowUsage: number;
  marketplaceHealth: number;
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
    backgroundColor?: string;
  }[];
}

// ============================================================
// Mock Data Generators
// ============================================================

export function generateTimeSeriesData(
  points: number,
  baseValue: number,
  variance: number = 0.1
): TimeSeriesData {
  const series: TimeSeriesPoint[] = [];
  const now = new Date();
  let currentValue = baseValue;

  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const change = (Math.random() - 0.5) * 2 * variance * baseValue;
    currentValue = Math.max(0, currentValue + change);
    
    series.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue * 100) / 100,
    });
  }

  const firstValue = series[0]?.value || baseValue;
  const lastValue = series[series.length - 1]?.value || baseValue;
  const changePercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

  return {
    series,
    trend,
    changePercent: Math.round(changePercent * 10) / 10,
    changeAbsolute: Math.round((lastValue - firstValue) * 100) / 100,
  };
}

export function generateDashboardMetrics(): DashboardMetrics {
  return {
    activeAuctions: 156,
    completedAuctions: 1247,
    upcomingAuctions: 43,
    averageBiddersPerAuction: 8.3,
    auctionCompletionRate: 87.5,
    averageSellingPrice: 1850000,
    reserveAchievementRate: 72.3,
    winningPaymentCompletion: 94.8,
    averageAuctionDuration: 4.2,
    totalBids: 45892,
    totalValue: 2345678900,
  };
}

export function generateMarketDemandData(): MarketDemandData[] {
  return [
    { dimension: 'toyota', dimensionLabel: 'Toyota', count: 342, percentage: 24.5, averagePrice: 1650000, trend: generateTimeSeriesData(30, 12) },
    { dimension: 'nissan', dimensionLabel: 'Nissan', count: 198, percentage: 14.2, averagePrice: 1450000, trend: generateTimeSeriesData(30, 7) },
    { dimension: 'mercedes', dimensionLabel: 'Mercedes-Benz', count: 156, percentage: 11.2, averagePrice: 2850000, trend: generateTimeSeriesData(30, 5) },
    { dimension: 'bmw', dimensionLabel: 'BMW', count: 134, percentage: 9.6, averagePrice: 2650000, trend: generateTimeSeriesData(30, 4) },
    { dimension: 'honda', dimensionLabel: 'Honda', count: 112, percentage: 8.0, averagePrice: 1350000, trend: generateTimeSeriesData(30, 4) },
    { dimension: 'suv', dimensionLabel: 'SUV', count: 287, percentage: 20.6, averagePrice: 2150000, trend: generateTimeSeriesData(30, 10) },
    { dimension: 'sedan', dimensionLabel: 'Sedan', count: 234, percentage: 16.8, averagePrice: 1550000, trend: generateTimeSeriesData(30, 8) },
    { dimension: 'pickup', dimensionLabel: 'Pickup', count: 189, percentage: 13.5, averagePrice: 1950000, trend: generateTimeSeriesData(30, 6) },
    { dimension: 'hybrid', dimensionLabel: 'Hybrid', count: 89, percentage: 6.4, averagePrice: 2350000, trend: generateTimeSeriesData(30, 3) },
    { dimension: 'automatic', dimensionLabel: 'Automatic', count: 756, percentage: 54.2, averagePrice: 1850000, trend: generateTimeSeriesData(30, 25) },
  ];
}

export function generateBidderMetrics(): BidderMetrics {
  return {
    registeredBidders: 12458,
    qualifiedBidders: 8234,
    averageBidsPerUser: 4.7,
    winningPercentage: 8.2,
    repeatBidders: 3421,
    newBidders: 1234,
    bidFrequency: 2.3,
    bidAbandonmentRate: 34.5,
  };
}

export function generateOrganizerPerformance(): OrganizerPerformance[] {
  return [
    {
      organizerId: 'org-ncba',
      organizerName: 'NCBA Bank Kenya',
      auctionsConducted: 156,
      vehiclesSold: 312,
      sellThroughRate: 89.5,
      averageSellingTime: 3.2,
      averageBiddersPerAuction: 12.4,
      reserveAchievement: 82.3,
      buyerSatisfaction: 96.2,
      inspectionUsage: 78.5,
      responseTime: '< 2 hours',
      customerRating: 4.8,
      cancellationRate: 1.2,
      marketplaceAverage: 78.3,
      benchmarkPercentile: 92,
    },
    {
      organizerId: 'org-crown',
      organizerName: 'Crown Motors Kenya',
      auctionsConducted: 89,
      vehiclesSold: 156,
      sellThroughRate: 85.4,
      averageSellingTime: 4.1,
      averageBiddersPerAuction: 9.8,
      reserveAchievement: 76.8,
      buyerSatisfaction: 94.1,
      inspectionUsage: 82.3,
      responseTime: '< 4 hours',
      customerRating: 4.6,
      cancellationRate: 2.1,
      marketplaceAverage: 78.3,
      benchmarkPercentile: 78,
    },
    {
      organizerId: 'org-gok',
      organizerName: 'Kenya Government Disposal',
      auctionsConducted: 234,
      vehiclesSold: 456,
      sellThroughRate: 91.2,
      averageSellingTime: 2.8,
      averageBiddersPerAuction: 14.7,
      reserveAchievement: 88.9,
      buyerSatisfaction: 98.4,
      inspectionUsage: 65.2,
      responseTime: '< 1 day',
      customerRating: 4.9,
      cancellationRate: 0.5,
      marketplaceAverage: 78.3,
      benchmarkPercentile: 96,
    },
  ];
}

export function generateConversionFunnel(): ConversionFunnel[] {
  return [
    { stage: 'views', stageLabel: 'Auction Views', count: 45678, percentage: 100, dropoff: 0 },
    { stage: 'watchlist', stageLabel: 'Added to Watchlist', count: 12345, percentage: 27, dropoff: 73 },
    { stage: 'registration', stageLabel: 'Registered', count: 8234, percentage: 18, dropoff: 9 },
    { stage: 'verified', stageLabel: 'Verified', count: 6789, percentage: 14.9, dropoff: 3.1 },
    { stage: 'participated', stageLabel: 'Participated', count: 4521, percentage: 9.9, dropoff: 5 },
    { stage: 'winning', stageLabel: 'Winning Bid', count: 1245, percentage: 2.7, dropoff: 7.2 },
    { stage: 'payment', stageLabel: 'Payment Completed', count: 1189, percentage: 2.6, dropoff: 0.1 },
    { stage: 'collected', stageLabel: 'Vehicle Collected', count: 1123, percentage: 2.5, dropoff: 0.1 },
  ];
}

export function generateMarketRecommendations(): MarketRecommendation[] {
  return [
    {
      id: 'rec-001',
      category: 'category',
      title: 'Hybrid SUV Demand in Nairobi',
      description: 'Hybrid SUVs in Nairobi attract significantly more bidders',
      insight: 'Analysis shows 32% higher bidder participation for hybrid SUVs in Nairobi compared to other categories',
      data: 'Based on 234 auctions over 6 months',
      confidence: 'high',
      potentialImpact: 'high',
    },
    {
      id: 'rec-002',
      category: 'timing',
      title: 'Saturday Morning Auctions',
      description: 'Auctions starting Saturday mornings receive higher participation',
      insight: 'Saturday 9AM auctions show 28% higher bidder participation than weekday auctions',
      data: 'Based on 890 auctions over 12 months',
      confidence: 'high',
      potentialImpact: 'medium',
    },
    {
      id: 'rec-003',
      category: 'inspection',
      title: 'Certified Inspection Impact',
      description: 'Vehicles with certified inspections achieve stronger bidding',
      insight: 'Auctions with inspection reports receive 45% more bids on average',
      data: 'Based on 1,247 completed auctions',
      confidence: 'high',
      potentialImpact: 'high',
    },
    {
      id: 'rec-004',
      category: 'pricing',
      title: 'Reserve Price Strategy',
      description: 'Optimizing reserve price can improve sell-through rate',
      insight: 'Vehicles with reserve within 10% of market value have 23% higher sell-through',
      data: 'Based on 890 completed auctions',
      confidence: 'medium',
      potentialImpact: 'medium',
    },
    {
      id: 'rec-005',
      category: 'marketing',
      title: 'Premium Vehicle Promotion',
      description: 'Vehicles priced above Ksh 5M benefit from extended marketing',
      insight: 'Premium vehicles with 14+ day auctions achieve 18% higher selling prices',
      data: 'Based on 156 premium auctions',
      confidence: 'medium',
      potentialImpact: 'low',
    },
  ];
}

export function generateGeographicData(): GeographicData[] {
  return [
    { country: 'Kenya', county: 'Nairobi', auctions: 456, bidders: 2345, totalValue: 890000000, averagePrice: 1950000, demandHeatLevel: 9 },
    { country: 'Kenya', county: 'Mombasa', auctions: 234, bidders: 1234, totalValue: 456000000, averagePrice: 1950000, demandHeatLevel: 7 },
    { country: 'Kenya', county: 'Kisumu', auctions: 123, bidders: 567, totalValue: 234000000, averagePrice: 1900000, demandHeatLevel: 6 },
    { country: 'Kenya', county: 'Nakuru', auctions: 98, bidders: 456, totalValue: 187000000, averagePrice: 1910000, demandHeatLevel: 5 },
    { country: 'Kenya', county: 'Eldoret', auctions: 67, bidders: 234, totalValue: 123000000, averagePrice: 1840000, demandHeatLevel: 4 },
    { country: 'Kenya', county: 'Mombasa', region: 'Coast', auctions: 289, bidders: 1456, totalValue: 545000000, averagePrice: 1885000, demandHeatLevel: 6 },
  ];
}

// ============================================================
// Helper Functions
// ============================================================

export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `Ksh ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `Ksh ${(amount / 1000).toFixed(0)}K`;
  }
  return `Ksh ${amount.toLocaleString()}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${hours.toFixed(1)} hours`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '#10B981';
    case 'down':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'trending-up';
    case 'down':
      return 'trending-down';
    default:
      return 'minus';
  }
}

export function getDateRange(range: TimeRange): DateRange {
  const end = new Date();
  const start = new Date();
  
  switch (range) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2020);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function canAccessAnalytics(
  userRole: UserRole,
  requestedScope: 'public' | 'own' | 'platform'
): boolean {
  switch (requestedScope) {
    case 'public':
      return true;
    case 'own':
      return ['organizer', 'admin', 'compliance_officer'].includes(userRole);
    case 'platform':
      return ['admin', 'compliance_officer'].includes(userRole);
    default:
      return false;
  }
}

export default {
  generateTimeSeriesData,
  generateDashboardMetrics,
  generateMarketDemandData,
  generateBidderMetrics,
  generateOrganizerPerformance,
  generateConversionFunnel,
  generateMarketRecommendations,
  generateGeographicData,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDuration,
  getTrendColor,
  getTrendIcon,
  getDateRange,
  canAccessAnalytics,
};
