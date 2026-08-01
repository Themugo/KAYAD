// ============================================================
// KAYAD CONTINUOUS IMPROVEMENT PLATFORM CONTROLLER
// Self-Improving Platform Engine
// ============================================================

import Improvement from "../models/Improvement.js";
import Experiment from "../models/Experiment.js";
import ProductHealth from "../models/ProductHealth.js";
import InnovationIdea from "../models/InnovationIdea.js";

// ============================================
// INNOVATION DASHBOARD
// ============================================

export async function getInnovationDashboard(req, res) {
  const dashboard = {
    timestamp: new Date().toISOString(),
    overallHealth: 87.5,
    improvementsThisMonth: 23,
    activeExperiments: 5,
    pendingIdeas: 45,
    avgImprovementImpact: 12.5,
    quickWins: 8,
  };

  res.json({ success: true, data: dashboard });
}

// ============================================
// IMPROVEMENT OPPORTUNITIES
// ============================================

export async function getImprovementOpportunities(req, res) {
  const opportunities = [
    { id: '1', type: 'ux', title: 'Simplify Vehicle Registration', priority: 'high', impact: 'high', difficulty: 'medium', estimatedBenefit: 15, confidence: 92, page: '/cars/new', description: 'Registration has 8 steps - reduce to 4 for 15% conversion increase', recommendation: 'Multi-step form with progress indicator and auto-save' },
    { id: '2', type: 'performance', title: 'Optimize Image Loading', priority: 'high', impact: 'high', difficulty: 'low', estimatedBenefit: 25, confidence: 95, page: '/cars', description: 'Vehicle images are loading slowly on mobile', recommendation: 'Implement lazy loading and WebP conversion' },
    { id: '3', type: 'conversion', title: 'Improve Search Filters', priority: 'high', impact: 'medium', difficulty: 'medium', estimatedBenefit: 10, confidence: 85, page: '/search', description: 'Search filters are confusing users', recommendation: 'Simplify to 5 key filters with smart defaults' },
    { id: '4', type: 'ux', title: 'Better Dealer Dashboard', priority: 'medium', impact: 'high', difficulty: 'high', estimatedBenefit: 20, confidence: 78, page: '/dealer/dashboard', description: 'Dealers struggle to find key metrics', recommendation: 'Redesign with KPI cards and quick actions' },
    { id: '5', type: 'process', title: 'Faster Inspection Booking', priority: 'medium', impact: 'medium', difficulty: 'low', estimatedBenefit: 18, confidence: 88, page: '/inspection/book', description: 'Inspection booking requires too many clicks', recommendation: 'One-page booking with smart scheduling' },
    { id: '6', type: 'content', title: 'Update Homepage Hero', priority: 'medium', impact: 'medium', difficulty: 'low', estimatedBenefit: 8, confidence: 72, page: '/', description: 'Homepage hero section is outdated', recommendation: 'Add animated carousel with featured vehicles' },
    { id: '7', type: 'navigation', title: 'Improve Menu Structure', priority: 'low', impact: 'medium', difficulty: 'medium', estimatedBenefit: 5, confidence: 65, page: '/', description: 'Navigation menu has too many items', recommendation: 'Group items under logical categories' },
    { id: '8', type: 'performance', title: 'Reduce API Calls', priority: 'medium', impact: 'high', difficulty: 'high', estimatedBenefit: 30, confidence: 82, page: '/cars', description: 'Vehicle list page makes 15 API calls', recommendation: 'Batch requests and implement caching' },
  ];

  res.json({ success: true, data: opportunities });
}

export async function createImprovement(req, res) {
  const improvement = await Improvement.create({
    ...req.body,
    status: 'idea',
    createdBy: req.user?.id,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: improvement });
}

export async function updateImprovement(req, res) {
  const { improvementId } = req.params;
  const improvement = await Improvement.findByIdAndUpdate(
    improvementId,
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  );

  res.json({ success: true, data: improvement });
}

// ============================================
// AI RECOMMENDATIONS
// ============================================

export async function getAIRecommendations(req, res) {
  const recommendations = [
    { id: '1', category: 'homepage', title: 'Homepage CTA should be moved higher', reasoning: 'Heatmap shows 40% of users miss the current CTA position', expectedImpact: '+8% conversion', confidence: 89, effort: 'low' },
    { id: '2', category: 'registration', title: 'Reduce registration from 8 steps to 4', reasoning: 'Drop-off analysis shows 65% abandon at step 5', expectedImpact: '+25% completion', confidence: 94, effort: 'medium' },
    { id: '3', category: 'vehicles', title: 'Vehicle cards should emphasize financing', reasoning: 'Finance questions are top search term', expectedImpact: '+12% inquiries', confidence: 87, effort: 'low' },
    { id: '4', category: 'search', title: 'Search filters should be simplified', reasoning: 'User testing shows confusion with current 12 filters', expectedImpact: '+15% search completion', confidence: 85, effort: 'medium' },
    { id: '5', category: 'inspection', title: 'Inspection booking should require fewer clicks', reasoning: 'Average booking takes 7 clicks, industry benchmark is 3', expectedImpact: '+20% bookings', confidence: 91, effort: 'low' },
    { id: '6', category: 'dealer', title: 'Add quick actions to dealer dashboard', reasoning: 'Top dealers use 3 specific actions 80% of the time', expectedImpact: '+30% efficiency', confidence: 83, effort: 'low' },
    { id: '7', category: 'auction', title: 'Improve auction timer visibility', reasoning: 'Users report missing auction end times', expectedImpact: '+10% bid participation', confidence: 86, effort: 'low' },
    { id: '8', category: 'support', title: 'Add live chat for instant support', reasoning: 'Response time expectations increasing', expectedImpact: '+15% satisfaction', confidence: 80, effort: 'high' },
  ];

  res.json({ success: true, data: recommendations });
}

// ============================================
// CUSTOMER EXPERIENCE
// ============================================

export async function getCustomerExperience(req, res) {
  const experience = {
    overallScore: 87.3,
    netPromoterScore: 45,
    customerSatisfaction: 4.3,
    customerEffortScore: 2.1,
    journeys: [
      { name: 'Buyer Journey', completionRate: 72, avgTime: '12 min', dropOffRate: 28 },
      { name: 'Dealer Journey', completionRate: 85, avgTime: '8 min', dropOffRate: 15 },
      { name: 'Auction Journey', completionRate: 68, avgTime: '15 min', dropOffRate: 32 },
      { name: 'Inspection Journey', completionRate: 91, avgTime: '5 min', dropOffRate: 9 },
      { name: 'Finance Journey', completionRate: 45, avgTime: '20 min', dropOffRate: 55 },
    ],
    painPoints: [
      { stage: 'Registration', issue: 'Too many steps', severity: 'high', affected: 2345 },
      { stage: 'Search', issue: 'Confusing filters', severity: 'medium', affected: 1234 },
      { stage: 'Payment', issue: 'Limited options', severity: 'high', affected: 890 },
      { stage: 'Support', issue: 'Slow response', severity: 'medium', affected: 567 },
    ],
    dropOffPoints: [
      { page: '/registration/step-5', dropOff: 35, reason: 'Too much information required' },
      { page: '/checkout/payment', dropOff: 22, reason: 'Payment options unclear' },
      { page: '/search/results', dropOff: 18, reason: 'Too many results' },
    ],
  };

  res.json({ success: true, data: experience });
}

// ============================================
// UX ANALYTICS
// ============================================

export async function getUXAnalytics(req, res) {
  const analytics = {
    pageAnalytics: [
      { page: '/', views: 456789, bounceRate: 32.5, avgTime: '2:30', conversionRate: 4.5 },
      { page: '/cars', views: 234567, bounceRate: 28.3, avgTime: '3:45', conversionRate: 6.2 },
      { page: '/dealers', views: 89234, bounceRate: 35.1, avgTime: '2:15', conversionRate: 3.8 },
      { page: '/auctions', views: 156789, bounceRate: 25.6, avgTime: '4:20', conversionRate: 8.9 },
    ],
    heatmaps: [
      { page: '/', clicks: { cta: 23456, menu: 12345, search: 9876 } },
      { page: '/cars', clicks: { filter: 34567, card: 45678, image: 23456 } },
    ],
    scrollDepth: [
      { page: '/', depth: 75, avgTime: '2:30' },
      { page: '/cars', depth: 85, avgTime: '3:45' },
      { page: '/dealer/dashboard', depth: 60, avgTime: '1:45' },
    ],
    formAnalytics: [
      { form: 'Vehicle Registration', completions: 2345, abandons: 890, avgTime: '8:30' },
      { form: 'Dealer Registration', completions: 156, abandons: 34, avgTime: '12:15' },
      { form: 'Auction Bid', completions: 5678, abandons: 234, avgTime: '1:30' },
    ],
  };

  res.json({ success: true, data: analytics });
}

// ============================================
// PERFORMANCE LAB
// ============================================

export async function getPerformanceMetrics(req, res) {
  const metrics = {
    overall: { score: 78, grade: 'B' },
    frontend: {
      firstContentfulPaint: { value: 1.8, target: 1.5, unit: 's' },
      largestContentfulPaint: { value: 3.2, target: 2.5, unit: 's' },
      timeToInteractive: { value: 4.5, target: 3.5, unit: 's' },
      cumulativeLayoutShift: { value: 0.12, target: 0.1, unit: '' },
    },
    backend: {
      apiLatency: { value: 125, target: 100, unit: 'ms' },
      dbQueryTime: { value: 45, target: 30, unit: 'ms' },
      errorRate: { value: 0.3, target: 0.1, unit: '%' },
      uptime: { value: 99.98, target: 99.99, unit: '%' },
    },
    resources: {
      bundleSize: { value: 2.4, target: 2.0, unit: 'MB' },
      imageOptimization: { value: 65, target: 80, unit: '%' },
      cachingEfficiency: { value: 78, target: 85, unit: '%' },
    },
    slowPages: [
      { page: '/cars', loadTime: 4.5, issue: 'Unoptimized images' },
      { page: '/dealer/inventory', loadTime: 3.8, issue: 'Too many API calls' },
      { page: '/search', loadTime: 2.9, issue: 'Complex filtering' },
    ],
  };

  res.json({ success: true, data: metrics });
}

// ============================================
// EXPERIMENT CENTER
// ============================================

export async function getExperiments(req, res) {
  const experiments = [
    { id: '1', name: 'Homepage Hero CTA Position', status: 'running', variant: 'A', control: 'B', traffic: 50, conversion: { control: 4.5, variant: 5.2 }, confidence: 94, winner: 'B', lift: 15.6 },
    { id: '2', name: 'Vehicle Card Layout', status: 'running', variant: 'Image Left', control: 'Image Top', traffic: 100, conversion: { control: 6.2, variant: 6.8 }, confidence: 78 },
    { id: '3', name: 'Search Filter Style', status: 'draft', variant: 'Dropdown', control: 'Sidebar', traffic: 0 },
    { id: '4', name: 'Dealer Dashboard Widgets', status: 'completed', variant: 'New Layout', control: 'Old Layout', traffic: 100, conversion: { control: 12, variant: 15 }, confidence: 99, winner: 'variant', lift: 25 },
    { id: '5', name: 'Auction Timer Style', status: 'paused', variant: 'Countdown', control: 'End Time', traffic: 25 },
  ];

  res.json({ success: true, data: experiments });
}

export async function createExperiment(req, res) {
  const experiment = await Experiment.create({
    ...req.body,
    status: 'draft',
    createdBy: req.user?.id,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: experiment });
}

export async function updateExperiment(req, res) {
  const { experimentId } = req.params;
  const experiment = await Experiment.findByIdAndUpdate(
    experimentId,
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  );

  res.json({ success: true, data: experiment });
}

export async function startExperiment(req, res) {
  const { experimentId } = req.params;
  const experiment = await Experiment.findByIdAndUpdate(
    experimentId,
    { status: 'running', startedAt: new Date().toISOString() },
    { new: true }
  );

  res.json({ success: true, data: experiment });
}

export async function stopExperiment(req, res) {
  const { experimentId } = req.params;
  const experiment = await Experiment.findByIdAndUpdate(
    experimentId,
    { status: 'completed', endedAt: new Date().toISOString() },
    { new: true }
  );

  res.json({ success: true, data: experiment });
}

// ============================================
// PRODUCT HEALTH SCORE
// ============================================

export async function getProductHealthScores(req, res) {
  const scores = {
    overall: 87.5,
    modules: [
      { name: 'Marketplace', score: 92, trend: 'up', features: 95, stability: 90, performance: 92, scalability: 88, security: 95 },
      { name: 'Auction', score: 88, trend: 'up', features: 92, stability: 88, performance: 85, scalability: 90, security: 92 },
      { name: 'Inspection', score: 85, trend: 'stable', features: 88, stability: 85, performance: 82, scalability: 85, security: 90 },
      { name: 'Finance', score: 82, trend: 'down', features: 85, stability: 80, performance: 85, scalability: 78, security: 88 },
      { name: 'Dealer Portal', score: 90, trend: 'up', features: 92, stability: 90, performance: 88, scalability: 92, security: 94 },
      { name: 'Support', score: 78, trend: 'stable', features: 80, stability: 78, performance: 75, scalability: 80, security: 85 },
      { name: 'Admin', score: 88, trend: 'stable', features: 90, stability: 88, performance: 85, scalability: 88, security: 92 },
      { name: 'Mobile', score: 75, trend: 'up', features: 78, stability: 72, performance: 75, scalability: 78, security: 82 },
    ],
    technicalDebt: {
      score: 72,
      outdatedLibraries: 8,
      deprecatedAPIs: 3,
      duplicateCode: 12,
      unusedAssets: 45,
      securityWarnings: 2,
    },
    maintainability: {
      score: 85,
      codeQuality: 88,
      testCoverage: 72,
      documentation: 78,
      complexity: 82,
    },
  };

  res.json({ success: true, data: scores });
}

// ============================================
// INNOVATION PIPELINE
// ============================================

export async function getInnovationIdeas(req, res) {
  const ideas = [
    { id: '1', title: 'AI Vehicle Valuation', source: 'ai', status: 'idea', priority: 'high', expectedValue: 'High', estimatedCost: 'Medium', owner: 'Engineering', votes: 45 },
    { id: '2', title: 'WhatsApp Integration', source: 'dealer', status: 'research', priority: 'high', expectedValue: 'High', estimatedCost: 'Low', owner: 'Product', votes: 38 },
    { id: '3', title: 'Video Inspections', source: 'customer', status: 'design', priority: 'medium', expectedValue: 'Medium', estimatedCost: 'High', owner: 'Product', votes: 32 },
    { id: '4', title: 'Subscription Plans', source: 'executive', status: 'development', priority: 'high', expectedValue: 'High', estimatedCost: 'Medium', owner: 'Engineering', votes: 28 },
    { id: '5', title: 'Instant Payment', source: 'buyer', status: 'idea', priority: 'medium', expectedValue: 'High', estimatedCost: 'High', owner: 'TBD', votes: 25 },
    { id: '6', title: 'Dealer CRM', source: 'dealer', status: 'pilot', priority: 'high', expectedValue: 'High', estimatedCost: 'Medium', owner: 'Product', votes: 22 },
    { id: '7', title: 'Virtual Showroom', source: 'ai', status: 'idea', priority: 'low', expectedValue: 'Medium', estimatedCost: 'High', owner: 'TBD', votes: 18 },
    { id: '8', title: 'Auction Live Streaming', source: 'customer', status: 'testing', priority: 'medium', expectedValue: 'Medium', estimatedCost: 'Medium', owner: 'Engineering', votes: 15 },
  ];

  res.json({ success: true, data: ideas });
}

export async function createInnovationIdea(req, res) {
  const idea = await InnovationIdea.create({
    ...req.body,
    status: 'idea',
    createdBy: req.user?.id,
    createdAt: new Date().toISOString(),
    votes: 0,
  });

  res.status(201).json({ success: true, data: idea });
}

export async function voteIdea(req, res) {
  const { ideaId } = req.params;
  const idea = await InnovationIdea.findByIdAndUpdate(
    ideaId,
    { $inc: { votes: 1 } },
    { new: true }
  );

  res.json({ success: true, data: idea });
}

export async function updateIdeaStatus(req, res) {
  const { ideaId } = req.params;
  const { status } = req.body;
  
  const idea = await InnovationIdea.findByIdAndUpdate(
    ideaId,
    { status, updatedAt: new Date().toISOString() },
    { new: true }
  );

  res.json({ success: true, data: idea });
}

// ============================================
// ROADMAP MANAGER
// ============================================

export async function getRoadmap(req, res) {
  const roadmap = {
    quarters: [
      {
        name: 'Q1 2024',
        items: [
          { id: '1', title: 'AI Vehicle Valuation', status: 'development', progress: 75, priority: 'high' },
          { id: '2', title: 'WhatsApp Integration', status: 'testing', progress: 90, priority: 'high' },
          { id: '3', title: 'Dealer CRM', status: 'pilot', progress: 60, priority: 'medium' },
        ],
      },
      {
        name: 'Q2 2024',
        items: [
          { id: '4', title: 'Subscription Plans', status: 'design', progress: 30, priority: 'high' },
          { id: '5', title: 'Instant Payment', status: 'research', progress: 15, priority: 'medium' },
          { id: '6', title: 'Video Inspections', status: 'planning', progress: 10, priority: 'low' },
        ],
      },
      {
        name: 'Q3 2024',
        items: [
          { id: '7', title: 'Virtual Showroom', status: 'idea', progress: 0, priority: 'low' },
          { id: '8', title: 'Auction Live Streaming', status: 'idea', progress: 0, priority: 'medium' },
        ],
      },
    ],
    completed: [
      { id: '9', title: 'Homepage Redesign', completedAt: new Date(Date.now() - 2592000000).toISOString(), impact: '+12% conversion' },
      { id: '10', title: 'Mobile Optimization', completedAt: new Date(Date.now() - 5184000000).toISOString(), impact: '+25% mobile traffic' },
    ],
  };

  res.json({ success: true, data: roadmap });
}

// ============================================
// OPTIMIZATION MODULES
// ============================================

export async function getMarketplaceOptimization(req, res) {
  const optimization = {
    conversion: { current: 6.5, target: 8.0, opportunity: '+23%' },
    listingQuality: { score: 78, factors: { photos: 85, description: 72, price: 80 } },
    pricing: { avgDaysToSell: 14, marketAvg: 18, opportunity: '-22% faster' },
    recommendations: [
      { type: 'pricing', text: 'Toyota Corolla prices 5% above market average', impact: 'medium' },
      { type: 'quality', text: 'Add requirement for 10+ photos per listing', impact: 'high' },
      { type: 'conversion', text: 'Simplify inquiry form', impact: 'high' },
    ],
  };

  res.json({ success: true, data: optimization });
}

export async function getSearchOptimization(req, res) {
  const search = {
    metrics: {
      searchVolume: 45678,
      zeroResults: 2.3,
      avgSession: '2:30',
      conversionRate: 8.5,
    },
    topQueries: [
      { query: 'toyota corolla', results: 1234, clicks: 567, ctr: 46 },
      { query: 'land cruiser', results: 456, clicks: 234, ctr: 51 },
      { query: 'suv', results: 2345, clicks: 678, ctr: 29 },
    ],
    improvements: [
      { type: 'relevance', text: 'Add synonyms for common misspellings', impact: 'medium' },
      { type: 'filter', text: 'Add "verified dealer" filter', impact: 'high' },
      { type: 'autocomplete', text: 'Improve autocomplete suggestions', impact: 'low' },
    ],
  };

  res.json({ success: true, data: search });
}

export async function getRevenueOptimization(req, res) {
  const revenue = {
    metrics: {
      avgOrderValue: 2850000,
      conversionRate: 6.5,
      customerLifetimeValue: 2450000,
      revenuePerUser: 45678,
    },
    opportunities: [
      { type: 'upsell', text: 'Offer extended warranties on high-value vehicles', potential: '+5% AOV' },
      { type: 'subscription', text: 'Introduce premium dealer subscription', potential: '+12% MRR' },
      { type: 'advertising', text: 'Expand premium ad placements', potential: '+8% ad revenue' },
    ],
  };

  res.json({ success: true, data: revenue });
}

// ============================================
// EXECUTIVE IMPROVEMENT REPORT
// ============================================

export async function getImprovementReport(req, res) {
  const report = {
    generatedAt: new Date().toISOString(),
    period: 'Weekly',
    topImprovements: [
      { id: '1', title: 'Homepage CTA Repositioning', roi: 340, effort: 'low', status: 'completed' },
      { id: '2', title: 'Search Filter Simplification', roi: 280, effort: 'medium', status: 'in_progress' },
      { id: '3', title: 'Mobile Image Optimization', roi: 220, effort: 'low', status: 'completed' },
    ],
    highestRisks: [
      { id: '1', title: 'Finance Approval Rate', severity: 'high', impact: '-15% conversions' },
      { id: '2', title: 'Mobile Performance', severity: 'medium', impact: '-8% mobile traffic' },
    ],
    customerPainPoints: [
      { point: 'Registration Complexity', affected: 2345, trend: 'stable' },
      { point: 'Slow Image Loading', affected: 1890, trend: 'improving' },
      { point: 'Limited Payment Options', affected: 1234, trend: 'worsening' },
    ],
    engineeringPriorities: [
      { task: 'Performance Optimization', effort: '2 weeks', impact: 'high' },
      { task: 'Mobile Improvements', effort: '3 weeks', impact: 'high' },
      { task: 'Search Enhancement', effort: '1 week', impact: 'medium' },
    ],
    businessRecommendations: [
      'Invest in mobile-first experience',
      'Simplify registration to 4 steps',
      'Add instant payment options',
      'Expand dealer financing partnerships',
    ],
  };

  res.json({ success: true, data: report });
}

// ============================================
// TECHNICAL DEBT
// ============================================

export async function getTechnicalDebt(req, res) {
  const debt = {
    overall: { score: 72, trend: 'improving' },
    categories: [
      { category: 'Outdated Libraries', count: 8, severity: 'medium', effort: '2 weeks' },
      { category: 'Deprecated APIs', count: 3, severity: 'high', effort: '1 week' },
      { category: 'Duplicate Code', count: 12, severity: 'low', effort: '3 weeks' },
      { category: 'Unused Assets', count: 45, severity: 'low', effort: '1 week' },
      { category: 'Security Warnings', count: 2, severity: 'high', effort: '2 days' },
    ],
    maintainability: {
      score: 85,
      testCoverage: 72,
      codeQuality: 88,
      documentation: 78,
    },
    recommendations: [
      { item: 'Update React to v18', priority: 'high', reason: 'Security and performance improvements' },
      { item: 'Remove unused npm packages', priority: 'medium', reason: 'Reduce bundle size by 15%' },
      { item: 'Fix 2 security warnings', priority: 'high', reason: 'Security compliance' },
    ],
  };

  res.json({ success: true, data: debt });
}

// ============================================
// AI DIGITAL ASSISTANT
// ============================================

export async function askAssistant(req, res) {
  const { question } = req.body;
  const lowerQ = question.toLowerCase();

  let response = {
    answer: '',
    actions: [],
    insights: [],
  };

  if (lowerQ.includes('approval') || lowerQ.includes('pending')) {
    response = {
      answer: 'You have 5 dealer approvals pending and 12 finance applications awaiting review. Finance approval rate is at 65%, below the 75% target.',
      actions: [
        { label: 'Review Dealer Approvals', path: '/admin/sellers?filter=pending' },
        { label: 'View Finance Queue', path: '/admin/finance?filter=pending' },
      ],
      insights: ['NCBA has highest approval rate at 75.6%', 'Most rejections due to incomplete documentation'],
    };
  } else if (lowerQ.includes('risk')) {
    response = {
      answer: 'Top risks identified: Finance approval rate below target, Mombasa inspection capacity at 85%, mobile performance below benchmark.',
      actions: [
        { label: 'View All Risks', path: '/admin/improvement?tab=risks' },
      ],
      insights: ['Finance issues affect 35% of buyers', 'Mobile bounce rate 15% higher than desktop'],
    };
  } else if (lowerQ.includes('auction') && lowerQ.includes('conversion')) {
    response = {
      answer: 'Auction conversion has dropped from 80% to 72% in the past month. Primary issue: reserve prices set too high relative to market.',
      actions: [
        { label: 'Analyze Auctions', path: '/admin/auctions?filter=low_performance' },
        { label: 'Review Reserve Guidelines', path: '/admin/governance?type=auction' },
      ],
      insights: ['Average reserve is 12% above market value', 'Auctions with video get 20% higher bids'],
    };
  } else if (lowerQ.includes('dealer')) {
    response = {
      answer: '8 dealers are at risk with health scores below 60. Top issues: low ratings, slow response times, failing inspections.',
      actions: [
        { label: 'View At-Risk Dealers', path: '/admin/sellers?filter=at_risk' },
        { label: 'Send Health Alerts', path: '/admin/sellers?action=alert' },
      ],
      insights: ['Dealers with <4.0 rating have 30% lower conversion', 'Response time >4 hours correlates with negative reviews'],
    };
  } else if (lowerQ.includes('summary') || lowerQ.includes('briefing')) {
    response = {
      answer: 'Weekly Summary: Revenue up 8.3%, 23 improvements implemented, 5 active experiments. Top opportunity: mobile optimization could increase revenue by 12%.',
      actions: [
        { label: 'View Full Report', path: '/admin/improvement?tab=report' },
      ],
      insights: ['Mobile traffic represents 45% of visits', 'Quick wins available in search and registration'],
    };
  } else {
    response = {
      answer: 'I can help with improvement recommendations, risk analysis, experiment results, and optimization suggestions. Try asking about approvals, risks, conversion, or dealer health.',
      actions: [],
      insights: ['Most impactful improvement: Simplify registration to 4 steps', 'Highest ROI change: Homepage CTA repositioning'],
    };
  }

  res.json({ success: true, data: response });
}
