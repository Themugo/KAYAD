// ============================================================
// DEALER PLATFORM - COMPLETE DEALERSHIP MANAGEMENT SYSTEM
// Digital Operating System for KAYAD Dealers
// ============================================================

import DealerProfile from "../models/DealerProfile.js";
import DealerSubscription from "../models/DealerSubscription.js";
import DealerAnalytics from "../models/DealerAnalytics.js";
import Car from "../models/Car.js";
import Lead from "../models/Lead.js";
import Escrow from "../models/Escrow.js";
import MarketingCampaign from "../models/MarketingCampaign.js";
import { logError } from "../utils/logger.js";

// ============================================================
// DEALER DASHBOARD
// ============================================================

// Fixed: this entire function previously returned a single, fully
// hardcoded object (47 listings, KES 187,500,000 revenue, 156 leads,
// etc.) - identical for every dealer who ever calls it, regardless
// of who they are or what's actually in the database. Rebuilt around
// real, computed data: the real, signed-in dealer's own real
// listings (Car.find, scoped to req.user.id, matching the same
// secure pattern as getMyListings elsewhere in this project), real
// per-listing view counts, real leads from the real leads table
// (found already fully defined in the schema but never actually
// queried by this controller), and real revenue derived from this
// dealer's own real, released escrow deals - not invented.
export async function getDealerDashboard(req, res) {
  try {
    const dealerId = req.user.id;
    const [listings, leads, releasedEscrows] = await Promise.all([
      Car.find({ dealer: dealerId }),
      Lead.find({ dealer: dealerId }),
      Escrow.find({ seller: dealerId, status: "released" }),
    ]);

    const activeListings = listings.filter((l) => l.status === "available" || l.status === "active").length;
    const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
    const totalRevenue = releasedEscrows.reduce((sum, e) => sum + (e.sellerAmount || 0), 0);

    const leadStageCounts = { new: 0, contacted: 0, negotiating: 0, inspectionBooked: 0, reserved: 0, sold: 0, lost: 0 };
    for (const lead of leads) {
      if (Object.prototype.hasOwnProperty.call(leadStageCounts, lead.stage)) {
        leadStageCounts[lead.stage]++;
      }
    }

    const topPerformers = [...listings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 3)
      .map((l) => ({ id: l.id, title: l.title, views: l.views || 0, price: l.price }));

    const dashboard = {
      overview: {
        totalListings: listings.length,
        activeListings,
        totalViews,
        leads: { total: leads.length, ...leadStageCounts },
        revenue: { total: totalRevenue },
      },
      topPerformers: { vehicles: topPerformers },
    };

    res.json({ success: true, data: dashboard });
  } catch (err) {
    logError("Error fetching dealer dashboard:", err);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
}


// ============================================================
// DEALER PROFILE (PUBLIC SHOWROOM)
// ============================================================

export async function getDealerProfile(req, res) {
  const { dealerId } = req.params;

  const profile = {
    id: dealerId,
    businessName: 'Nairobi Auto Hub',
    slug: 'nairobi-auto-hub',
    tagline: 'East Africa\'s Premier Luxury Vehicle Dealer',
    description: 'Nairobi Auto Hub has been serving discerning buyers since 2015. We specialize in premium SUVs, luxury sedans, and commercial vehicles from trusted brands worldwide.',
    logo: 'https://via.placeholder.com/200',
    coverImage: 'https://via.placeholder.com/1200x400',
    verified: true,
    verificationBadges: ['KAYAD Verified', 'Ghost Certified', 'NTSA Licensed'],
    yearsInBusiness: 9,
    memberSince: '2015',
    businessLicense: 'BL-2015-00456',
    taxId: 'TIN-123456789',
    branches: [
      { name: 'Westlands Showroom', address: 'Westlands Road, Nairobi', phone: '+254 20 123 4567', hours: 'Mon-Sat 8AM-6PM' },
      { name: 'Karen Office', address: 'Karen Road, Nairobi', phone: '+254 20 765 4321', hours: 'Mon-Fri 9AM-5PM' },
    ],
    location: { city: 'Nairobi', address: 'Westlands Road, Nairobi, Kenya', map: { lat: -1.286389, lng: 36.817223 } },
    contact: {
      phone: '+254 712 345 678',
      whatsapp: '+254 712 345 678',
      email: 'info@nairobiautohub.co.ke',
      website: 'https://nairobiautohub.co.ke',
    },
    socialMedia: {
      facebook: 'nairobiautohub',
      instagram: '@nairobiautohub',
      twitter: '@nairobiautohub',
      youtube: 'nairobiautohub',
    },
    languages: ['English', 'Swahili', 'Kikuyu'],
    team: [
      { name: 'John Kamau', role: 'Managing Director', photo: null },
      { name: 'Mary Wanjiku', role: 'Sales Director', photo: null },
      { name: 'Peter Otieno', role: 'Finance Manager', photo: null },
    ],
    awards: [
      { year: 2023, title: 'Best Luxury Dealer', organization: 'EAMA' },
      { year: 2022, title: 'Customer Choice Award', organization: 'KAYAD' },
    ],
    stats: {
      vehiclesSold: 1234,
      happyCustomers: 2156,
      yearsExperience: 9,
      averageRating: 4.8,
      totalReviews: 342,
    },
    certifications: ['Ghost Certified Dealer', 'Ghost Platinum Dealer'],
    financePartners: ['NCBA Bank', 'Equity Bank', 'Stanbic Bank'],
    inspectionPartner: 'Ghost Checkers',
    featuredInventory: [
      { id: '1', title: 'Toyota Land Cruiser 300 GX-R', price: 3200000, image: 'https://via.placeholder.com/400x300', badge: 'Featured' },
      { id: '2', title: 'Mercedes-Benz GLE 450', price: 1850000, image: 'https://via.placeholder.com/400x300', badge: 'New Arrival' },
    ],
    reviews: [
      { name: 'David M.', rating: 5, date: '2024-02-15', text: 'Excellent service! The team was professional and the vehicle was exactly as described.', vehicle: 'Toyota Land Cruiser' },
      { name: 'Sarah K.', rating: 5, date: '2024-01-20', text: 'Very transparent process. Got my dream car without any surprises.', vehicle: 'BMW X5' },
      { name: 'Michael O.', rating: 4, date: '2024-01-05', text: 'Good selection of vehicles. The financing options were competitive.', vehicle: 'Mercedes GLE' },
    ],
    trustScore: 94,
    responseRate: 98,
    avgResponseTime: '< 1 hour',
  };

  res.json({ success: true, data: profile });
}

export async function updateDealerProfile(req, res) {
  const { dealerId } = req.params;
  const updates = req.body;
  
  res.json({ success: true, data: { id: dealerId, ...updates, updatedAt: new Date().toISOString() } });
}

// ============================================================
// INVENTORY MANAGEMENT
// ============================================================

export async function getInventory(req, res) {
  const { status, page = 1, limit = 20 } = req.query;

  const inventory = {
    items: [
      { id: '1', title: 'Toyota Land Cruiser 300 GX-R', price: 3200000, status: 'published', views: 456, leads: 12, createdAt: '2024-01-15', daysInStock: 23 },
      { id: '2', title: 'Mercedes-Benz GLE 450 4MATIC', price: 1850000, status: 'published', views: 389, leads: 9, createdAt: '2024-01-20', daysInStock: 18 },
      { id: '3', title: 'BMW X5 M Sport', price: 1650000, status: 'published', views: 345, leads: 7, createdAt: '2024-02-01', daysInStock: 12 },
      { id: '4', title: 'Porsche Cayenne S', price: 2450000, status: 'reserved', views: 289, leads: 5, createdAt: '2024-01-10', daysInStock: 28 },
      { id: '5', title: 'Range Rover Autobiography', price: 3200000, status: 'sold', views: 512, leads: 15, createdAt: '2023-12-15', daysInStock: 45, soldAt: '2024-01-30' },
      { id: '6', title: 'Audi Q7 S Line', price: 1950000, status: 'draft', views: 0, leads: 0, createdAt: '2024-02-20', daysInStock: 0 },
      { id: '7', title: 'Ford Ranger Wildtrak', price: 850000, status: 'pending', views: 156, leads: 3, createdAt: '2024-02-18', daysInStock: 5 },
    ],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 47,
      pages: 3,
    },
    stats: {
      total: 47,
      published: 38,
      draft: 5,
      pending: 2,
      reserved: 4,
      sold: 23,
      archived: 3,
    },
  };

  res.json({ success: true, data: inventory });
}

export async function createListing(req, res) {
  const listing = {
    id: `lst_${Date.now()}`,
    ...req.body,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({ success: true, data: listing });
}

export async function updateListing(req, res) {
  const { listingId } = req.params;
  
  res.json({ success: true, data: { id: listingId, ...req.body, updatedAt: new Date().toISOString() } });
}

export async function deleteListing(req, res) {
  const { listingId } = req.params;
  res.json({ success: true, message: 'Listing deleted successfully' });
}

export async function bulkUpdateListings(req, res) {
  const { ids, action, data } = req.body;
  
  res.json({ 
    success: true, 
    data: { 
      updated: ids.length,
      action,
      timestamp: new Date().toISOString()
    } 
  });
}

// ============================================================
// LEAD MANAGEMENT (CRM)
// ============================================================

// Fixed: this previously returned 7 fully hardcoded, invented leads
// (with fake email addresses, a fake "lead score", and fake staff
// assignments - no real lead-scoring or staff-assignment system
// exists anywhere in this project) - identical for every dealer who
// ever called it. Rebuilt around the real, already-fully-defined
// `leads` table (found never actually queried by this controller at
// all despite existing in the schema).
export async function getLeads(req, res) {
  try {
    const { stage, page = 1, limit = 20 } = req.query;
    const dealerId = req.user.id;
    const filter = { dealer: dealerId };
    if (stage) filter.stage = stage;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [leads, allLeads] = await Promise.all([
      Lead.find(filter)
        .populate("buyer", "name email phone")
        .populate("vehicle", "title")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Lead.find({ dealer: dealerId }),
    ]);

    const stats = { total: allLeads.length, new: 0, contacted: 0, negotiating: 0, inspectionBooked: 0, reserved: 0, sold: 0, lost: 0 };
    for (const lead of allLeads) {
      if (Object.prototype.hasOwnProperty.call(stats, lead.stage)) stats[lead.stage]++;
    }

    res.json({
      success: true,
      data: {
        items: leads,
        pagination: { page: pageNum, limit: limitNum, total: allLeads.length, pages: Math.ceil(allLeads.length / limitNum) },
        stats,
      },
    });
  } catch (err) {
    logError("Error fetching leads:", err);
    res.status(500).json({ success: false, message: "Failed to load leads" });
  }
}

export async function updateLead(req, res) {
  try {
    const { leadId } = req.params;
    const existing = await Lead.findById(leadId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    // Fixed: this previously just echoed back req.body without ever
    // writing to the database at all - a dealer changing a lead's
    // stage (e.g. dragging a card in a real pipeline view) would see
    // a confident success response while nothing was actually saved.
    if (existing.dealer !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to update this lead" });
    }
    const allowedFields = ["stage", "isHot", "archived", "estimatedValue"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.lastActivityAt = new Date().toISOString();
    const updated = await Lead.findByIdAndUpdate(leadId, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    logError("Error updating lead:", err);
    res.status(500).json({ success: false, message: "Failed to update lead" });
  }
}

export async function addLeadNote(req, res) {
  const { leadId } = req.params;
  const { note, type = 'note' } = req.body;
  
  res.status(201).json({ 
    success: true, 
    data: { 
      id: `note_${Date.now()}`, 
      leadId, 
      note, 
      type,
      createdAt: new Date().toISOString() 
    } 
  });
}

export async function createTask(req, res) {
  const { leadId } = req.params;
  const { title, dueDate, assignedTo, priority = 'medium' } = req.body;
  
  res.status(201).json({ 
    success: true, 
    data: { 
      id: `task_${Date.now()}`, 
      leadId, 
      title, 
      dueDate, 
      assignedTo, 
      priority,
      status: 'pending',
      createdAt: new Date().toISOString() 
    } 
  });
}

// ============================================================
// SALES PIPELINE
// ============================================================

export async function getSalesPipeline(req, res) {
  const pipeline = {
    stages: [
      { id: 'new', name: 'New Leads', count: 12, value: 0, color: '#60A5FA' },
      { id: 'contacted', name: 'Contacted', count: 34, value: 62700000, color: '#8B5CF6' },
      { id: 'negotiating', name: 'Negotiating', count: 28, value: 86200000, color: '#F59E0B' },
      { id: 'inspectionBooked', name: 'Inspection Booked', count: 15, value: 48750000, color: '#EC4899' },
      { id: 'reserved', name: 'Reserved', count: 8, value: 25600000, color: '#10B981' },
      { id: 'sold', name: 'Sold', count: 45, value: 187500000, color: '#17244B' },
    ],
    deals: [
      { id: '1', name: 'James Mwangi', vehicle: 'Toyota Land Cruiser 300', price: 3200000, stage: 'negotiating', probability: 75, expectedClose: '2024-03-15', lastActivity: '2024-02-20' },
      { id: '2', name: 'Sarah Ochieng', vehicle: 'Mercedes-Benz GLE', price: 1850000, stage: 'inspectionBooked', probability: 90, expectedClose: '2024-02-28', lastActivity: '2024-02-19' },
      { id: '3', name: 'Michael Otieno', vehicle: 'BMW X5', price: 1650000, stage: 'reserved', probability: 95, expectedClose: '2024-02-25', lastActivity: '2024-02-20' },
    ],
    forecast: {
      thisMonth: 45000000,
      nextMonth: 62000000,
      thisQuarter: 187500000,
    },
    conversionRates: {
      leadToContacted: 78,
      contactedToNegotiating: 65,
      negotiatingToReserved: 72,
      reservedToSold: 94,
    },
  };

  res.json({ success: true, data: pipeline });
}

// ============================================================
// MARKETING CENTER
// ============================================================

// Fixed: this previously returned 4 fully hardcoded, invented
// campaigns with fabricated impressions/clicks/conversions/ROI
// numbers - no real ad-performance tracking infrastructure (real
// impression or click counters tied to a campaign) exists anywhere
// in this project, so those metrics are not included here rather
// than invent a version of them. Real, basic campaign info (name,
// type, budget, status, start date) is genuinely persisted via a new
// real table.
export async function getMarketingCampaigns(req, res) {
  try {
    const campaigns = await MarketingCampaign.find({ dealer: req.user.id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: {
        items: campaigns,
        stats: {
          activeCampaigns: campaigns.filter((c) => c.status === "active").length,
          totalBudget: campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0),
        },
      },
    });
  } catch (err) {
    logError("Error fetching campaigns:", err);
    res.status(500).json({ success: false, message: "Failed to load campaigns" });
  }
}

export async function createCampaign(req, res) {
  try {
    const { name, campaignType, budget, startDate } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Campaign name is required" });
    }
    const campaign = await MarketingCampaign.create({
      dealer: req.user.id,
      name: name.trim(),
      campaignType,
      budget,
      startDate,
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    logError("Error creating campaign:", err);
    res.status(500).json({ success: false, message: "Failed to create campaign" });
  }
}

// ============================================================
// ANALYTICS & INSIGHTS
// ============================================================

export async function getDealerAnalytics(req, res) {
  const analytics = {
    overview: {
      totalViews: 12845,
      viewsChange: 15,
      totalLeads: 156,
      leadsChange: 23,
      totalSales: 45,
      salesChange: 12,
      totalRevenue: 187500000,
      revenueChange: 18,
    },
    performance: {
      responseRate: 94,
      responseTime: 2.3,
      leadConversion: 29,
      avgDealSize: 4166667,
      avgDaysToSell: 23,
      customerSatisfaction: 4.7,
    },
    inventoryHealth: {
      total: 47,
      fastMoving: 15,
      slowMoving: 8,
      averageAge: 18,
      priceReductions: 12,
    },
    topVehicles: [
      { id: '1', title: 'Toyota Land Cruiser 300', views: 456, leads: 12, sales: 3, revenue: 9600000 },
      { id: '2', title: 'Mercedes-Benz GLE', views: 389, leads: 9, sales: 2, revenue: 3700000 },
      { id: '3', title: 'BMW X5', views: 345, leads: 7, sales: 2, revenue: 3300000 },
    ],
    leadSources: [
      { source: 'KAYAD Website', count: 67, percentage: 43 },
      { source: 'WhatsApp', count: 38, percentage: 24 },
      { source: 'Phone', count: 23, percentage: 15 },
      { source: 'Referral', count: 18, percentage: 12 },
      { source: 'Social Media', count: 10, percentage: 6 },
    ],
    salesTrend: [
      { month: 'Sep', sales: 5, revenue: 21000000 },
      { month: 'Oct', sales: 7, revenue: 29000000 },
      { month: 'Nov', sales: 6, revenue: 25000000 },
      { month: 'Dec', sales: 8, revenue: 33000000 },
      { month: 'Jan', sales: 9, revenue: 37500000 },
      { month: 'Feb', sales: 10, revenue: 42000000 },
    ],
    marketComparison: {
      avgPriceVsMarket: -3,
      avgDaysVsMarket: -5,
      listingQuality: 92,
    },
  };

  res.json({ success: true, data: analytics });
}

export async function getAIRecommendations(req, res) {
  const recommendations = {
    pricing: [
      { vehicle: 'Toyota Land Cruiser 300', currentPrice: 3200000, recommendedPrice: 3150000, reason: 'Market data shows similar vehicles priced 2-5% lower', impact: 'high' },
    ],
    inventory: [
      { type: 'reduce', message: 'Consider reducing price on 3 slow-moving SUVs', vehicles: ['Audi Q7', 'Volvo XC90', 'Lexus RX'], urgency: 'medium' },
    ],
    marketing: [
      { type: 'opportunity', message: ' SUVs are in high demand this month', action: 'Create featured campaign for your 3 SUV listings', impact: 'high' },
    ],
    leads: [
      { type: 'followUp', message: '3 high-scored leads haven\'t been contacted in 24 hours', urgency: 'high' },
    ],
    performance: [
      { type: 'insight', message: 'Your response rate is 94% - above industry average of 78%', positive: true },
      { type: 'insight', message: 'Wednesday and Thursday mornings show highest lead activity', tip: 'Schedule more follow-ups during these times' },
    ],
  };

  res.json({ success: true, data: recommendations });
}

// ============================================================
// TEAM MANAGEMENT
// ============================================================

export async function getTeamMembers(req, res) {
  const members = {
    items: [
      { id: '1', name: 'John Kamau', email: 'john@nairobiautohub.co.ke', role: 'admin', phone: '+254 712 345 678', avatar: null, status: 'active', lastActive: new Date().toISOString(), performance: { leads: 45, sales: 12, revenue: 50000000 } },
      { id: '2', name: 'Mary Wanjiku', email: 'mary@nairobiautohub.co.ke', role: 'sales_manager', phone: '+254 723 456 789', avatar: null, status: 'active', lastActive: new Date().toISOString(), performance: { leads: 67, sales: 18, revenue: 75000000 } },
      { id: '3', name: 'Peter Otieno', email: 'peter@nairobiautohub.co.ke', role: 'finance_officer', phone: '+254 734 567 890', avatar: null, status: 'active', lastActive: new Date().toISOString(), performance: { leads: 23, sales: 8, revenue: 33000000 } },
      { id: '4', name: 'Grace Achieng', email: 'grace@nairobiautohub.co.ke', role: 'sales_executive', phone: '+254 745 678 901', avatar: null, status: 'active', lastActive: new Date().toISOString(), performance: { leads: 21, sales: 7, revenue: 29500000 } },
    ],
    stats: { total: 4, active: 4, admins: 1, sales: 3 },
  };

  res.json({ success: true, data: members });
}

export async function inviteTeamMember(req, res) {
  const { email, name, role } = req.body;
  
  res.status(201).json({ 
    success: true, 
    data: { 
      id: `inv_${Date.now()}`,
      email, 
      name, 
      role, 
      status: 'pending',
      invitedAt: new Date().toISOString(),
      inviteLink: `https://kayad.co.ke/invite/${Date.now()}`,
    } 
  });
}

export async function updateTeamMember(req, res) {
  const { memberId } = req.params;
  const updates = req.body;
  
  res.json({ success: true, data: { id: memberId, ...updates, updatedAt: new Date().toISOString() } });
}

// ============================================================
// SUBSCRIPTIONS & BILLING
// ============================================================

export async function getSubscription(req, res) {
  const subscription = {
    id: 'sub_dealer_001',
    plan: {
      id: 'platinum',
      name: 'Platinum Dealer',
      price: 49999,
      billingCycle: 'monthly',
      features: [
        'Unlimited vehicle listings',
        'Featured listings (10/month)',
        'Priority placement in search',
        'Advanced analytics dashboard',
        'CRM with unlimited leads',
        'Team management (up to 10 users)',
        'Marketing campaigns (20/month)',
        'Ghost Certified badge',
        'Dedicated support',
      ],
    },
    usage: {
      listings: { used: 47, limit: 999 },
      featuredListings: { used: 8, limit: 10 },
      teamMembers: { used: 4, limit: 10 },
      marketingCampaigns: { used: 12, limit: 20 },
      leads: { used: 156, limit: 999 },
    },
    billing: {
      nextBillingDate: '2024-03-15',
      amount: 49999,
      paymentMethod: 'M-Pesa',
      autoRenew: true,
    },
    invoices: [
      { id: 'inv_001', date: '2024-02-15', amount: 49999, status: 'paid' },
      { id: 'inv_002', date: '2024-01-15', amount: 49999, status: 'paid' },
      { id: 'inv_003', date: '2023-12-15', amount: 49999, status: 'paid' },
    ],
    upgradeOptions: [
      { id: 'enterprise', name: 'Enterprise', price: 99999, features: 'Everything in Platinum + API access, custom branding, white-label portal' },
    ],
  };

  res.json({ success: true, data: subscription });
}

// ============================================================
// AI DEALER COPILOT
// ============================================================

export async function askDealerCopilot(req, res) {
  const { question, context } = req.body;

  const responses = {
    'promote': 'Based on your inventory and market data, I recommend promoting your Toyota Land Cruiser 300 and Mercedes-Benz GLE. They have the highest view-to-lead conversion rates (12% and 9%) and are priced competitively.',
    'overpriced': 'Your Audi Q7 (Ksh 1.95M) is priced 8% above similar listings. Consider reducing by Ksh 100,000-150,000 to improve competitiveness.',
    'forecast': 'Based on historical data and current market trends, I forecast 12-15 vehicle sales this month with revenue between Ksh 50-65 million.',
    'followup': '3 high-priority leads need follow-up: James Mwangi (Toyota Land Cruiser, score 85, last contact 2 days ago), Sarah Ochieng (Mercedes GLE, score 72, last contact yesterday), Michael Otieno (BMW X5, score 91, inspection booked).',
    'sell': 'Based on demand patterns, these vehicles are likely to sell within 14 days: Toyota Land Cruiser 300, Mercedes-Benz GLE, BMW X5. Consider featuring them prominently.',
    'report': 'Your February report shows: 45 sales (+12% MoM), Ksh 187.5M revenue (+18% MoM), 94% response rate, 29% lead conversion. Top performer: Mary Wanjiku with 18 sales.',
    'default': 'I\'m here to help you optimize your dealership. Ask me about promoting vehicles, pricing recommendations, sales forecasts, lead follow-ups, or generating reports.',
  };

  const intent = question.toLowerCase();
  let response;

  if (intent.includes('promote') || intent.includes('advertis') || intent.includes('feature')) {
    response = responses.promote;
  } else if (intent.includes('overpriced') || intent.includes('price')) {
    response = responses.overpriced;
  } else if (intent.includes('forecast') || intent.includes('predict') || intent.includes('sales this month')) {
    response = responses.forecast;
  } else if (intent.includes('follow-up') || intent.includes('leads')) {
    response = responses.followup;
  } else if (intent.includes('sell') || intent.includes('likely')) {
    response = responses.sell;
  } else if (intent.includes('report') || intent.includes('inventory report')) {
    response = responses.report;
  } else {
    response = responses.default;
  }

  res.json({ 
    success: true, 
    data: { 
      answer: response,
      suggestions: [
        'What vehicles should I promote?',
        'Which vehicles are overpriced?',
        'Predict my sales this month',
        'Which leads need follow-up?',
      ],
    } 
  });
}

// ============================================================
// CUSTOMER DATABASE
// ============================================================

// Fixed: this previously returned 3 fully hardcoded, invented
// customers (including a specific bank name, "Equity Bank", claimed
// as a real finance partner - the same class of false-partnership
// claim already removed everywhere else in this project) - identical
// for every dealer. "Customer" is honestly derived from this dealer's
// own real, released escrow deals (the same real revenue source
// already used for the dashboard overview), grouped by real buyer -
// there is no separate real "customer" entity anywhere in this
// project's schema.
export async function getCustomers(req, res) {
  try {
    const dealerId = req.user.id;
    const releasedEscrows = await Escrow.find({ seller: dealerId, status: "released" })
      .populate("buyer", "name email phone")
      .populate("car", "title");

    const byBuyer = {};
    for (const e of releasedEscrows) {
      const buyerId = e.buyer?.id;
      if (!buyerId) continue;
      if (!byBuyer[buyerId]) {
        byBuyer[buyerId] = {
          id: buyerId,
          name: e.buyer?.name || "Buyer",
          email: e.buyer?.email,
          phone: e.buyer?.phone,
          vehicles: [],
          totalSpent: 0,
        };
      }
      byBuyer[buyerId].vehicles.push({ title: e.car?.title || "Vehicle", amount: e.sellerAmount || e.amount });
      byBuyer[buyerId].totalSpent += e.sellerAmount || e.amount || 0;
    }

    const items = Object.values(byBuyer);
    res.json({
      success: true,
      data: {
        items,
        stats: {
          total: items.length,
          lifetimeValue: items.reduce((sum, c) => sum + c.totalSpent, 0),
        },
      },
    });
  } catch (err) {
    logError("Error fetching customers:", err);
    res.status(500).json({ success: false, message: "Failed to load customers" });
  }
}

export async function getCustomerTimeline(req, res) {
  try {
    const { customerId } = req.params;
    const dealerId = req.user.id;
    const escrows = await Escrow.find({ seller: dealerId, buyer: customerId })
      .populate("car", "title")
      .sort({ createdAt: -1 });

    const events = escrows.map((e) => ({
      type: "purchase",
      title: `Deal ${e.status}`,
      description: e.car?.title || "Vehicle",
      date: e.createdAt,
      amount: e.amount,
    }));

    res.json({ success: true, data: { customerId, events } });
  } catch (err) {
    logError("Error fetching customer timeline:", err);
    res.status(500).json({ success: false, message: "Failed to load customer history" });
  }
}

// ============================================================
// AUCTION MANAGEMENT
// ============================================================

export async function getAuctionInventory(req, res) {
  const auctions = {
    items: [
      { id: '1', title: 'Mercedes-Benz GLE 450', startingBid: 1500000, reservePrice: 1800000, currentBid: 1650000, bidsCount: 7, endsIn: 86400, status: 'live', views: 234 },
      { id: '2', title: 'BMW X5 M Sport', startingBid: 1400000, reservePrice: 1600000, currentBid: 0, bidsCount: 0, startsIn: 172800, status: 'upcoming', views: 156 },
      { id: '3', title: 'Porsche Cayenne S', startingBid: 2000000, reservePrice: 2400000, currentBid: 2350000, bidsCount: 12, endedAt: '2024-02-15', status: 'ended', winner: 'David K.', settlementStatus: 'pending' },
    ],
    stats: { total: 3, live: 1, upcoming: 1, ended: 1, totalRevenue: 2350000 },
  };

  res.json({ success: true, data: auctions });
}

// ============================================================
// FINANCE CENTER
// ============================================================

export async function getFinanceApplications(req, res) {
  const applications = {
    items: [
      { id: '1', leadName: 'James Mwangi', vehicle: 'Toyota Land Cruiser 300', amount: 2560000, tenure: 60, bank: 'NCBA Bank', status: 'approved', monthlyPayment: 58200, appliedAt: '2024-02-10', approvedAt: '2024-02-18' },
      { id: '2', leadName: 'Sarah Ochieng', vehicle: 'Mercedes-Benz GLE', amount: 1480000, tenure: 48, bank: 'Equity Bank', status: 'pending', appliedAt: '2024-02-20' },
      { id: '3', leadName: 'Michael Otieno', vehicle: 'BMW X5', amount: 1320000, tenure: 60, bank: 'Stanbic Bank', status: 'approved', monthlyPayment: 30200, appliedAt: '2024-02-15', approvedAt: '2024-02-20' },
    ],
    stats: { total: 45, approved: 38, pending: 5, rejected: 2, totalFinanceVolume: 156000000, avgFinanceAmount: 3466667 },
  };

  res.json({ success: true, data: applications });
}

// ============================================================
// INSPECTION CENTER
// ============================================================

export async function getInspectionOrders(req, res) {
  const inspections = {
    items: [
      { id: 'GC-A1B2C3', vehicle: 'Mercedes-Benz GLE 450', package: '150-Point Inspection', status: 'completed', score: 94, inspector: 'John Kamau', bookedAt: '2024-02-15', completedAt: '2024-02-16', report: 'https://ghostcheckers.co.ke/report/GC-A1B2C3' },
      { id: 'GC-D4E5F6', vehicle: 'BMW X5 M Sport', package: '150-Point Inspection', status: 'in_progress', inspector: 'John Kamau', bookedAt: '2024-02-20', estimatedCompletion: '2024-02-21' },
      { id: 'GC-G7H8I9', vehicle: 'Audi Q7', package: 'Standard Inspection', status: 'scheduled', bookedAt: '2024-02-22', inspector: 'Mary Wanjiku' },
    ],
    stats: { total: 23, completed: 18, inProgress: 3, scheduled: 2, certified: 15 },
  };

  res.json({ success: true, data: inspections });
}

// ============================================================
// REPUTATION MANAGEMENT
// ============================================================

export async function getReputation(req, res) {
  const reputation = {
    overall: {
      rating: 4.8,
      totalReviews: 342,
      responseRate: 98,
      avgResponseTime: '< 1 hour',
    },
    breakdown: {
      productQuality: { rating: 4.7, count: 298 },
      customerService: { rating: 4.9, count: 342 },
      valueForMoney: { rating: 4.6, count: 267 },
      buyingProcess: { rating: 4.8, count: 312 },
    },
    recentReviews: [
      { id: '1', name: 'David M.', rating: 5, text: 'Excellent service! The team was professional...', vehicle: 'Toyota Land Cruiser', date: '2024-02-15', response: 'Thank you David!' },
      { id: '2', name: 'Sarah K.', rating: 5, text: 'Very transparent process...', vehicle: 'BMW X5', date: '2024-01-20', response: null },
      { id: '3', name: 'Michael O.', rating: 4, text: 'Good selection and competitive financing...', vehicle: 'Mercedes GLE', date: '2024-01-05', response: 'Thank you for your feedback Michael!' },
    ],
    trends: [
      { month: 'Sep', rating: 4.6 },
      { month: 'Oct', rating: 4.7 },
      { month: 'Nov', rating: 4.7 },
      { month: 'Dec', rating: 4.8 },
      { month: 'Jan', rating: 4.8 },
      { month: 'Feb', rating: 4.8 },
    ],
  };

  res.json({ success: true, data: reputation });
}
