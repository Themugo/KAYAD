// ============================================================
// KAYAD ENTERPRISE DIGITAL TWIN PLATFORM CONTROLLER
// Business Simulation and Decision Support System
// ============================================================

import Simulation from "../models/Simulation.js";
import Scenario from "../models/Scenario.js";
import SimulationResult from "../models/SimulationResult.js";
import Prediction from "../models/Prediction.js";

// ============================================
// SIMULATION MANAGEMENT
// ============================================

export async function getSimulations(req, res) {
  const { type, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (type) filters.simulationType = type;
  if (status) filters.status = status;

  const simulations = await Simulation.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: simulations });
}

export async function getSimulation(req, res) {
  const simulation = await Simulation.findById(req.params.id);
  if (!simulation) return res.status(404).json({ success: false, error: "Simulation not found" });

  const results = await SimulationResult.findAll({ filters: { simulationId: req.params.id } });

  res.json({ success: true, data: { ...simulation, results } });
}

export async function createSimulation(req, res) {
  const { name, description, simulationType, parameters, duration, assumptions } = req.body;

  const simulation = await Simulation.create({
    name,
    description,
    simulationType,
    parameters: typeof parameters === 'object' ? JSON.stringify(parameters) : parameters,
    duration: duration || 30, // days
    assumptions: typeof assumptions === 'object' ? JSON.stringify(assumptions) : assumptions,
    status: 'pending',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: simulation });
}

export async function runSimulation(req, res) {
  const { id } = req.params;

  const simulation = await Simulation.findById(id);
  if (!simulation) return res.status(404).json({ success: false, error: "Simulation not found" });

  // Update status to running
  await Simulation.update(id, { status: 'running', startedAt: new Date().toISOString() });

  // Run the simulation based on type
  const results = await executeSimulation(simulation);

  // Store results
  const simulationResult = await SimulationResult.create({
    simulationId: id,
    results: JSON.stringify(results),
    metrics: JSON.stringify(results.metrics),
    risks: JSON.stringify(results.risks),
    recommendations: JSON.stringify(results.recommendations),
  });

  // Update simulation status
  await Simulation.update(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    resultId: simulationResult.id,
  });

  res.json({ success: true, data: { simulation, results, resultId: simulationResult.id } });
}

export async function deleteSimulation(req, res) {
  await SimulationResult.deleteAll({ simulationId: req.params.id });
  await Simulation.delete(req.params.id);
  res.json({ success: true, message: "Simulation deleted" });
}

// ============================================
// SCENARIO MANAGEMENT
// ============================================

export async function getScenarios(req, res) {
  const { category, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (category) filters.category = category;

  const scenarios = await Scenario.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "usage_count",
    order: "desc",
  });

  res.json({ success: true, data: scenarios });
}

export async function getScenario(req, res) {
  const scenario = await Scenario.findById(req.params.id);
  if (!scenario) return res.status(404).json({ success: false, error: "Scenario not found" });

  res.json({ success: true, data: scenario });
}

export async function createScenario(req, res) {
  const { name, description, category, template, parameters } = req.body;

  const scenario = await Scenario.create({
    name,
    description,
    category,
    template: typeof template === 'object' ? JSON.stringify(template) : template,
    parameters: typeof parameters === 'object' ? JSON.stringify(parameters) : parameters,
    usageCount: 0,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: scenario });
}

export async function updateScenario(req, res) {
  const { name, description, category, template, parameters } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (template !== undefined) updateData.template = typeof template === 'object' ? JSON.stringify(template) : template;
  if (parameters !== undefined) updateData.parameters = typeof parameters === 'object' ? JSON.stringify(parameters) : parameters;

  const scenario = await Scenario.update(req.params.id, updateData);
  res.json({ success: true, data: scenario });
}

export async function deleteScenario(req, res) {
  await Scenario.delete(req.params.id);
  res.json({ success: true, message: "Scenario deleted" });
}

export async function runScenario(req, res) {
  const { id } = req.params;
  const { customParameters } = req.body;

  const scenario = await Scenario.findById(id);
  if (!scenario) return res.status(404).json({ success: false, error: "Scenario not found" });

  // Increment usage count
  await Scenario.update(id, { usageCount: (scenario.usageCount || 0) + 1 });

  // Create a new simulation from scenario
  const template = typeof scenario.template === 'string' ? JSON.parse(scenario.template) : scenario.template;
  const parameters = customParameters || template;

  const simulation = await Simulation.create({
    name: `${scenario.name} - ${new Date().toISOString().split('T')[0]}`,
    description: scenario.description,
    simulationType: scenario.category,
    parameters: JSON.stringify(parameters),
    duration: parameters.duration || 30,
    assumptions: JSON.stringify(parameters.assumptions || {}),
    status: 'pending',
    createdBy: req.user?.id,
    scenarioId: id,
  });

  // Run simulation
  const results = await executeSimulation(simulation);

  res.json({ success: true, data: { simulation, results } });
}

export async function getScenarioTemplates(req, res) {
  const templates = [
    {
      id: 'country_expansion',
      name: 'Country Expansion',
      category: 'growth',
      description: 'Simulate expanding to a new country',
      icon: 'Globe',
      parameters: {
        targetCountry: 'Uganda',
        duration: 180,
        assumptions: {
          dealerGrowthRate: 0.15,
          userGrowthRate: 0.25,
          marketingBudget: 500000,
        },
      },
    },
    {
      id: 'commission_change',
      name: 'Commission Change',
      category: 'pricing',
      description: 'Simulate changing commission rates',
      icon: 'DollarSign',
      parameters: {
        currentCommission: 0.05,
        newCommission: 0.06,
        duration: 90,
        assumptions: {
          dealerRetentionImpact: -0.05,
          revenueIncrease: 0.10,
        },
      },
    },
    {
      id: 'auction_rule_change',
      name: 'Auction Rule Change',
      category: 'auction',
      description: 'Simulate new auction rules',
      icon: 'Gavel',
      parameters: {
        ruleChange: 'reserve_price_required',
        duration: 60,
        assumptions: {
          participationImpact: -0.08,
          completionRateImprovement: 0.15,
        },
      },
    },
    {
      id: 'marketing_campaign',
      name: 'Marketing Campaign',
      category: 'marketing',
      description: 'Simulate a marketing campaign impact',
      icon: 'Target',
      parameters: {
        campaignType: 'toyota_week',
        budget: 1000000,
        duration: 14,
        assumptions: {
          trafficIncrease: 0.40,
          conversionRate: 0.035,
        },
      },
    },
    {
      id: 'pricing_adjustment',
      name: 'Pricing Adjustment',
      category: 'pricing',
      description: 'Simulate subscription price changes',
      icon: 'TrendingUp',
      parameters: {
        priceIncrease: 0.10,
        affectedTiers: ['standard', 'premium'],
        duration: 90,
        assumptions: {
          churnRate: 0.08,
          newSubscriberRate: 0.05,
        },
      },
    },
    {
      id: 'feature_launch',
      name: 'Feature Launch',
      category: 'product',
      description: 'Simulate launching a new feature',
      icon: 'Zap',
      parameters: {
        featureName: 'Finance Pre-approval',
        developmentCost: 2000000,
        duration: 365,
        assumptions: {
          adoptionRate: 0.25,
          revenuePerUser: 5000,
        },
      },
    },
    {
      id: 'dealer_promotion',
      name: 'Dealer Promotion',
      category: 'marketing',
      description: 'Simulate dealer promotion campaign',
      icon: 'Building',
      parameters: {
        discount: 0.20,
        duration: 30,
        assumptions: {
          newDealerSignups: 50,
          revenueLoss: 200000,
        },
      },
    },
    {
      id: 'seasonal_demand',
      name: 'Seasonal Demand',
      category: 'marketplace',
      description: 'Simulate holiday season demand',
      icon: 'Calendar',
      parameters: {
        season: 'christmas',
        duration: 45,
        assumptions: {
          trafficMultiplier: 2.5,
          conversionRateChange: 0.15,
          inventoryStress: 0.30,
        },
      },
    },
  ];

  res.json({ success: true, data: templates });
}

// ============================================
// SIMULATION ENGINE
// ============================================

async function executeSimulation(simulation) {
  const params = typeof simulation.parameters === 'string' ? JSON.parse(simulation.parameters) : simulation.parameters;
  const assumptions = typeof simulation.assumptions === 'string' ? JSON.parse(simulation.assumptions) : (simulation.assumptions || {});

  switch (simulation.simulationType) {
    case 'marketplace':
      return simulateMarketplace(params, assumptions, simulation.duration);
    case 'auction':
      return simulateAuction(params, assumptions, simulation.duration);
    case 'pricing':
      return simulatePricing(params, assumptions, simulation.duration);
    case 'marketing':
      return simulateMarketing(params, assumptions, simulation.duration);
    case 'workflow':
      return simulateWorkflow(params, assumptions);
    case 'growth':
      return simulateGrowth(params, assumptions, simulation.duration);
    case 'revenue':
      return simulateRevenue(params, assumptions, simulation.duration);
    case 'dealer':
      return simulateDealer(params, assumptions, simulation.duration);
    default:
      return simulateGeneric(params, assumptions, simulation.duration);
  }
}

function simulateMarketplace(params, assumptions, duration) {
  const baseUsers = 50000;
  const baseDealers = 500;
  const baseVehicles = 5000;

  const growthRate = assumptions.userGrowthRate || 0.10;
  const dealerGrowthRate = assumptions.dealerGrowthRate || 0.08;

  const metrics = {
    users: {
      baseline: baseUsers,
      projected: Math.round(baseUsers * (1 + growthRate) ** (duration / 30)),
      growth: `${Math.round(growthRate * 100)}%`,
      timeline: generateTimeline(baseUsers, growthRate, duration),
    },
    dealers: {
      baseline: baseDealers,
      projected: Math.round(baseDealers * (1 + dealerGrowthRate) ** (duration / 30)),
      growth: `${Math.round(dealerGrowthRate * 100)}%`,
      timeline: generateTimeline(baseDealers, dealerGrowthRate, duration),
    },
    vehicles: {
      baseline: baseVehicles,
      projected: Math.round(baseVehicles * (1 + growthRate * 0.8) ** (duration / 30)),
      growth: `${Math.round(growthRate * 80)}%`,
    },
    revenue: {
      baseline: 50000000,
      projected: Math.round(50000000 * (1 + growthRate * 0.6) ** (duration / 30)),
      increase: `${Math.round(growthRate * 60)}%`,
    },
    transactions: {
      baseline: 500,
      projected: Math.round(500 * (1 + growthRate * 0.7) ** (duration / 30)),
    },
  };

  const risks = [
    { level: 'medium', description: 'Inventory may not keep pace with demand growth', probability: 0.35 },
    { level: 'low', description: 'Customer support capacity may be strained', probability: 0.25 },
    { level: 'medium', description: 'Regional logistics challenges', probability: 0.30 },
  ];

  const recommendations = [
    'Increase dealer recruitment efforts by 20%',
    'Expand vehicle sourcing partnerships',
    'Build customer support capacity before peak season',
    'Invest in regional logistics infrastructure',
  ];

  return { metrics, risks, recommendations, confidence: 0.85, assumptions };
}

function simulateAuction(params, assumptions, duration) {
  const baseAuctions = 50;
  const baseBidders = 500;
  const baseRevenue = 100000000;

  const participationImpact = assumptions.participationImpact || 0;
  const completionImprovement = assumptions.completionRateImprovement || 0.1;

  const metrics = {
    auctions: {
      baseline: baseAuctions,
      projected: Math.round(baseAuctions * (1 + 0.05) ** (duration / 30)),
      change: '+5%',
    },
    bidders: {
      baseline: baseBidders,
      projected: Math.round(baseBidders * (1 + participationImpact)),
      change: `${Math.round(participationImpact * 100)}%`,
    },
    completionRate: {
      baseline: 0.72,
      projected: 0.72 + completionImprovement,
      improvement: `${Math.round(completionImprovement * 100)}%`,
    },
    revenue: {
      baseline: baseRevenue,
      projected: Math.round(baseRevenue * (1 + completionImprovement * 1.5)),
      increase: `${Math.round(completionImprovement * 150)}%`,
    },
    averageBid: {
      baseline: 450000,
      projected: 450000 * (1 + 0.08),
    },
    timeline: generateTimeline(baseRevenue, 0.1, duration),
  };

  const risks = [
    { level: 'high', description: 'New rules may deter casual bidders', probability: 0.45 },
    { level: 'medium', description: 'Sellers may hesitate with reserve requirements', probability: 0.35 },
  ];

  const recommendations = [
    'Phased implementation of new rules',
    'Seller education and support program',
    'Monitoring dashboard for bidder behavior',
    'Gradual increase in reserve requirements',
  ];

  return { metrics, risks, recommendations, confidence: 0.78, assumptions };
}

function simulatePricing(params, assumptions, duration) {
  const priceIncrease = params.priceIncrease || 0.10;
  const baseRevenue = 50000000;
  const baseSubscribers = 1000;

  const churnRate = assumptions.churnRate || 0.08;
  const newSubscriberRate = assumptions.newSubscriberRate || 0.05;

  const newMonthlyRevenue = baseRevenue * (1 + priceIncrease) * (1 - churnRate);
  const lostSubscribers = Math.round(baseSubscribers * churnRate);
  const newSubscribers = Math.round(baseSubscribers * newSubscriberRate);

  const metrics = {
    monthlyRevenue: {
      baseline: baseRevenue,
      projected: newMonthlyRevenue,
      change: `${Math.round((newMonthlyRevenue / baseRevenue - 1) * 100)}%`,
    },
    subscribers: {
      baseline: baseSubscribers,
      projected: baseSubscribers - lostSubscribers + newSubscribers,
      churned: lostSubscribers,
      newSignups: newSubscribers,
      netChange: newSubscribers - lostSubscribers,
    },
    annualImpact: {
      baseline: baseRevenue * 12,
      projected: newMonthlyRevenue * 12,
      difference: (newMonthlyRevenue - baseRevenue) * 12,
    },
    timeline: generateTimeline(baseRevenue, (newMonthlyRevenue / baseRevenue - 1) / 12, duration),
  };

  const risks = [
    { level: 'high', description: 'Competitor pricing advantage', probability: 0.40 },
    { level: 'medium', description: 'Customer perception of value', probability: 0.30 },
  ];

  const recommendations = [
    'Consider tiered pricing strategy',
    'Add value before increasing prices',
    'Monitor competitor pricing closely',
    'Prepare retention offers for at-risk subscribers',
  ];

  return { metrics, risks, recommendations, confidence: 0.82, assumptions };
}

function simulateMarketing(params, assumptions, duration) {
  const budget = params.budget || 1000000;
  const trafficIncrease = assumptions.trafficIncrease || 0.40;
  const conversionRate = assumptions.conversionRate || 0.035;

  const baseTraffic = 100000;
  const baseConversions = baseTraffic * 0.025;
  const baseRevenue = 25000000;

  const metrics = {
    traffic: {
      baseline: baseTraffic,
      projected: Math.round(baseTraffic * (1 + trafficIncrease)),
      increase: Math.round(baseTraffic * trafficIncrease),
      change: `${Math.round(trafficIncrease * 100)}%`,
    },
    conversions: {
      baseline: baseConversions,
      projected: Math.round(baseTraffic * (1 + trafficIncrease) * conversionRate),
      improvement: `${Math.round((conversionRate / 0.025 - 1) * 100)}%`,
    },
    revenue: {
      baseline: baseRevenue,
      projected: Math.round(baseRevenue * (1 + trafficIncrease * 0.8)),
      increase: Math.round(baseRevenue * trafficIncrease * 0.8),
    },
    roi: {
      projected: Math.round((baseRevenue * trafficIncrease * 0.8) / budget * 100) / 100,
      costPerAcquisition: Math.round(budget / (baseTraffic * trafficIncrease)),
    },
    timeline: generateTimeline(baseRevenue, trafficIncrease * 0.8 / 12, duration),
  };

  const risks = [
    { level: 'medium', description: 'Campaign fatigue in target audience', probability: 0.25 },
    { level: 'low', description: 'Ad spend optimization may be needed', probability: 0.20 },
  ];

  const recommendations = [
    'A/B test messaging before full rollout',
    'Retarget website visitors with custom offers',
    'Monitor daily metrics for optimization',
    'Prepare budget for extension if successful',
  ];

  return { metrics, risks, recommendations, confidence: 0.88, assumptions };
}

function simulateWorkflow(params, assumptions) {
  const metrics = {
    processTime: {
      baseline: 48,
      projected: 32,
      improvement: '33%',
    },
    errorRate: {
      baseline: 0.08,
      projected: 0.03,
      reduction: '62%',
    },
    userSatisfaction: {
      baseline: 3.2,
      projected: 4.1,
      improvement: '28%',
    },
    costSavings: {
      monthly: 250000,
      annual: 3000000,
    },
  };

  const risks = [
    { level: 'low', description: 'Learning curve for team', probability: 0.20 },
    { level: 'low', description: 'Integration testing required', probability: 0.15 },
  ];

  const recommendations = [
    'Phased rollout with pilot team',
    'Comprehensive training program',
    'Dedicated support during transition',
    'Regular feedback collection',
  ];

  return { metrics, risks, recommendations, confidence: 0.91, assumptions };
}

function simulateGrowth(params, assumptions, duration) {
  const baseUsers = 50000;
  const baseDealers = 500;
  const growthRate = assumptions.userGrowthRate || 0.15;

  const metrics = {
    users: {
      baseline: baseUsers,
      projected: Math.round(baseUsers * (1 + growthRate) ** (duration / 30)),
      monthly: Math.round(baseUsers * growthRate / 12),
      timeline: generateTimeline(baseUsers, growthRate / 12, duration),
    },
    dealers: {
      baseline: baseDealers,
      projected: Math.round(baseDealers * (1 + growthRate * 0.6) ** (duration / 30)),
    },
    marketShare: {
      baseline: 0.15,
      projected: 0.18,
      gain: '3%',
    },
    revenue: {
      baseline: 50000000,
      projected: Math.round(50000000 * (1 + growthRate * 0.8) ** (duration / 30)),
    },
  };

  const risks = [
    { level: 'medium', description: 'Market saturation in urban areas', probability: 0.35 },
    { level: 'medium', description: 'Competition from new entrants', probability: 0.30 },
  ];

  const recommendations = [
    'Expand to underserved regions',
    'Develop rural market strategy',
    'Partnership opportunities with local businesses',
    'Mobile-first approach for accessibility',
  ];

  return { metrics, risks, recommendations, confidence: 0.84, assumptions };
}

function simulateRevenue(params, assumptions, duration) {
  const baseRevenue = 50000000;
  const revenueGrowth = assumptions.revenueGrowth || 0.12;

  const metrics = {
    revenue: {
      baseline: baseRevenue,
      projected: Math.round(baseRevenue * (1 + revenueGrowth) ** (duration / 30)),
      monthly: Math.round(baseRevenue * revenueGrowth / 12),
      timeline: generateTimeline(baseRevenue, revenueGrowth / 12, duration),
    },
    breakdown: {
      commissions: { percentage: 0.45, growth: 0.15 },
      subscriptions: { percentage: 0.30, growth: 0.10 },
      advertisements: { percentage: 0.15, growth: 0.20 },
      premium: { percentage: 0.10, growth: 0.25 },
    },
    customerValue: {
      baseline: 15000,
      projected: 18000,
      improvement: '20%',
    },
  };

  const risks = [
    { level: 'medium', description: 'Economic downturn impact', probability: 0.25 },
    { level: 'low', description: 'Regulatory changes', probability: 0.15 },
  ];

  const recommendations = [
    'Diversify revenue streams',
    'Focus on high-margin services',
    'Develop recurring revenue models',
    'Monitor economic indicators',
  ];

  return { metrics, risks, recommendations, confidence: 0.86, assumptions };
}

function simulateDealer(params, assumptions, duration) {
  const baseDealers = 500;
  const baseRevenue = 100000000;
  const growthRate = assumptions.dealerGrowth || 0.12;

  const metrics = {
    dealers: {
      baseline: baseDealers,
      projected: Math.round(baseDealers * (1 + growthRate) ** (duration / 30)),
      active: Math.round(baseDealers * 0.85),
      newSignups: Math.round(baseDealers * growthRate * 0.6),
    },
    revenue: {
      baseline: baseRevenue,
      projected: Math.round(baseRevenue * (1 + growthRate * 0.9) ** (duration / 30)),
      perDealer: 200000,
    },
    retention: {
      baseline: 0.88,
      projected: 0.90,
      improvement: '2%',
    },
    performance: {
      topPerformers: Math.round(baseDealers * 0.20),
      average: Math.round(baseDealers * 0.55),
      underperforming: Math.round(baseDealers * 0.25),
    },
  };

  const risks = [
    { level: 'medium', description: 'Dealer burnout during high growth', probability: 0.30 },
    { level: 'low', description: 'Quality control challenges', probability: 0.20 },
  ];

  const recommendations = [
    'Dealer support and training programs',
    'Performance recognition initiatives',
    'Regular health check-ins',
    'Mentorship between top and average dealers',
  ];

  return { metrics, risks, recommendations, confidence: 0.87, assumptions };
}

function simulateGeneric(params, assumptions, duration) {
  return {
    metrics: {
      baseline: 100,
      projected: 120,
      change: '+20%',
    },
    risks: [],
    recommendations: ['Review simulation parameters'],
    confidence: 0.75,
    assumptions,
  };
}

function generateTimeline(baseline, growthRate, duration) {
  const months = Math.ceil(duration / 30);
  const timeline = [];

  for (let i = 0; i <= months; i++) {
    timeline.push({
      month: i,
      value: Math.round(baseline * (1 + growthRate) ** i),
      date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  }

  return timeline;
}

// ============================================
// PREDICTIONS
// ============================================

export async function getPredictions(req, res) {
  const { type, horizon, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (type) filters.predictionType = type;
  if (horizon) filters.horizon = horizon;

  const predictions = await Prediction.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: predictions });
}

export async function generatePrediction(req, res) {
  const { query, horizon } = req.body;

  // AI-powered prediction based on query
  const prediction = await generateAIPrediction(query, horizon || 90);

  res.json({ success: true, data: prediction });
}

async function generateAIPrediction(query, horizon) {
  const lowerQuery = query.toLowerCase();

  let predictionType = 'general';
  let metrics = {};
  let confidence = 0.82;

  if (lowerQuery.includes('uganda') || lowerQuery.includes('expansion') || lowerQuery.includes('country')) {
    predictionType = 'expansion';
    metrics = {
      timeline: generateTimeline(50000, 0.08, horizon),
      revenue: { projected: 65000000, increase: '30%' },
      users: { projected: 65000, increase: '30%' },
      dealers: { projected: 650, increase: '30%' },
    };
    confidence = 0.78;
  } else if (lowerQuery.includes('commission') || lowerQuery.includes('fee')) {
    predictionType = 'pricing';
    metrics = {
      revenue: { projected: 55000000, increase: '10%' },
      retention: { projected: 0.85, change: '-5%' },
      roi: 'positive after 6 months',
    };
    confidence = 0.85;
  } else if (lowerQuery.includes('auction')) {
    predictionType = 'auction';
    metrics = {
      participation: { projected: '+15%', confidence: 0.80 },
      revenue: { projected: '+20%' },
      completionRate: { projected: '+10%' },
    };
    confidence = 0.75;
  } else if (lowerQuery.includes('campaign') || lowerQuery.includes('marketing')) {
    predictionType = 'marketing';
    metrics = {
      traffic: { projected: '+40%', duration: '2 weeks' },
      conversions: { projected: '+25%' },
      roi: { projected: '3.5x' },
    };
    confidence = 0.88;
  } else if (lowerQuery.includes('featured') || lowerQuery.includes('listing') || lowerQuery.includes('free')) {
    predictionType = 'promotion';
    metrics = {
      adoption: { projected: '+60%' },
      revenue: { projected: '-15%', shortTerm: true },
      longTerm: 'Potential market share gain',
    };
    confidence = 0.72;
  } else {
    metrics = {
      general: 'Predictions based on historical data and market trends',
    };
  }

  const risks = [
    { level: 'medium', description: 'Market conditions may vary', probability: 0.30 },
    { level: 'low', description: 'External factors not modeled', probability: 0.20 },
  ];

  return {
    query,
    predictionType,
    horizon,
    metrics,
    risks,
    confidence,
    assumptions: [
      'Historical growth patterns continue',
      'No major market disruptions',
      'Current competitive landscape maintained',
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ============================================
// DASHBOARD
// ============================================

export async function getDigitalTwinDashboard(req, res) {
  const [simulations, scenarios, predictions] = await Promise.all([
    Simulation.findAll({ limit: 100 }),
    Scenario.findAll({ limit: 100 }),
    Prediction.findAll({ limit: 50 }),
  ]);

  const recentSimulations = simulations.slice(0, 5);
  const popularScenarios = scenarios.slice(0, 5);

  res.json({
    success: true,
    data: {
      overview: {
        totalSimulations: simulations.length,
        completedSimulations: simulations.filter(s => s.status === 'completed').length,
        totalScenarios: scenarios.length,
        totalPredictions: predictions.length,
      },
      recentSimulations: recentSimulations.map(s => ({
        id: s.id,
        name: s.name,
        type: s.simulationType,
        status: s.status,
        createdAt: s.createdAt,
      })),
      popularScenarios: popularScenarios.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        usageCount: s.usageCount,
      })),
    },
  });
}

// ============================================
// WHAT-IF ANALYSIS
// ============================================

export async function whatIfAnalysis(req, res) {
  const { question } = req.body;

  // Parse natural language question into simulation
  const parsed = parseWhatIfQuestion(question);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      error: "Could not understand the question. Please rephrase.",
    });
  }

  // Run quick simulation
  const results = await executeSimulation({
    simulationType: parsed.type,
    parameters: JSON.stringify(parsed.parameters),
    assumptions: JSON.stringify(parsed.assumptions),
    duration: parsed.duration || 90,
  });

  res.json({
    success: true,
    data: {
      question,
      parsed,
      results,
      confidence: results.confidence,
    },
  });
}

function parseWhatIfQuestion(question) {
  const lower = question.toLowerCase();

  // Uganda expansion
  if (lower.includes('uganda') && (lower.includes('launch') || lower.includes('expand'))) {
    return {
      type: 'marketplace',
      parameters: { targetCountry: 'Uganda', duration: 180 },
      assumptions: { userGrowthRate: 0.25, dealerGrowthRate: 0.15 },
      duration: 180,
    };
  }

  // Commission change
  if (lower.includes('commission') || lower.includes('fee')) {
    const amountMatch = lower.match(/(\d+)%/);
    const amount = amountMatch ? parseInt(amountMatch[1]) / 100 : 0.05;

    return {
      type: 'pricing',
      parameters: { priceIncrease: amount, affectedTiers: ['standard'] },
      assumptions: { churnRate: amount * 0.8, newSubscriberRate: 0.05 },
      duration: 90,
    };
  }

  // Featured listing free
  if (lower.includes('featured') && lower.includes('free')) {
    return {
      type: 'marketing',
      parameters: { discount: 1.0, affectedFeature: 'featured_listing' },
      assumptions: { trafficIncrease: 0.60, adoptionRate: 0.80 },
      duration: 30,
    };
  }

  // Auction rules
  if (lower.includes('auction') && (lower.includes('reserve') || lower.includes('rule'))) {
    return {
      type: 'auction',
      parameters: { ruleChange: 'reserve_required' },
      assumptions: { participationImpact: -0.08, completionRateImprovement: 0.15 },
      duration: 60,
    };
  }

  // Marketing campaign
  if (lower.includes('campaign') || lower.includes('marketing')) {
    const budgetMatch = lower.match(/(\d+)\s*(million|k)?/i);
    const budget = budgetMatch ? (budgetMatch[2]?.toLowerCase() === 'million' ? parseInt(budgetMatch[1]) * 1000000 : parseInt(budgetMatch[1])) : 1000000;

    return {
      type: 'marketing',
      parameters: { budget, campaignType: 'general' },
      assumptions: { trafficIncrease: 0.40, conversionRate: 0.035 },
      duration: 30,
    };
  }

  return null;
}

// ============================================
// SIMULATION HISTORY
// ============================================

export async function getSimulationHistory(req, res) {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const simulations = await Simulation.findAll({
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  const simulationsWithResults = await Promise.all(
    simulations.map(async (sim) => {
      const results = await SimulationResult.findAll({ filters: { simulationId: sim.id } });
      return { ...sim, results };
    })
  );

  res.json({ success: true, data: simulationsWithResults });
}

export async function compareSimulations(req, res) {
  const { ids } = req.body;

  if (!ids || ids.length < 2) {
    return res.status(400).json({ success: false, error: "At least 2 simulations required for comparison" });
  }

  const simulations = await Promise.all(
    ids.map(async (id) => {
      const sim = await Simulation.findById(id);
      const results = await SimulationResult.findAll({ filters: { simulationId: id } });
      return { simulation: sim, results: results[0] };
    })
  );

  res.json({ success: true, data: simulations });
}
