// ============================================================
// DEALER PLATFORM - COMPLETE DEALERSHIP MANAGEMENT SYSTEM
// Digital Operating System for KAYAD Dealers
// ============================================================

import User from "../models/User.js";
import Dealer from "../models/Dealer.js";
import Review from "../models/Review.js";
import InspectionOrder from "../models/InspectionOrder.js";
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
  try {
    const { dealerId } = req.params;
    const [dealerUser, dealerRecord] = await Promise.all([
      User.findById(dealerId),
      Dealer.findOne({ user: dealerId }),
    ]);
    if (!dealerUser || dealerUser.role !== 'dealer') {
      return res.status(404).json({ success: false, message: 'Dealer not found' });
    }

    const [listings, reviews] = await Promise.all([
      Car.find({ dealer: dealerId }),
      Review.find({ dealer: dealerId }),
    ]);

    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
      : null;

    res.json({
      success: true,
      data: {
        id: dealerUser.id,
        businessName: dealerRecord?.businessName || dealerUser.businessName || dealerUser.name,
        name: dealerUser.name,
        bio: dealerUser.bio || null,
        location: dealerRecord?.location || dealerUser.location || null,
        approved: Boolean(dealerRecord?.approved),
        memberSince: dealerRecord?.createdAt || dealerUser.createdAt || null,
        stats: {
          activeListings: listings.filter((car) => ['available', 'active'].includes(car.status)).length,
          totalListings: listings.length,
          averageRating: averageRating === null ? null : Number(averageRating.toFixed(2)),
          totalReviews: reviews.length,
        },
      },
    });
  } catch (err) {
    logError('Error fetching dealer profile:', err);
    res.status(500).json({ success: false, message: 'Failed to load dealer profile' });
  }
}

export async function updateDealerProfile(req, res) {
  try {
    const { dealerId } = req.params;

    if (req.user.id !== dealerId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own dealer profile",
      });
    }

    const allowed = ["businessName", "location", "phone", "bio"];
    const updates = {};
    for (const field of allowed) {
      if (req.body?.[field] !== undefined) {
        updates[field] = String(req.body[field]).trim();
      }
    }

    const user = await User.findByIdAndUpdate(dealerId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user || user.role !== "dealer") {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    const dealerUpdates = {};
    if (updates.businessName !== undefined) dealerUpdates.businessName = updates.businessName;
    if (updates.location !== undefined) dealerUpdates.location = updates.location;

    let dealer = await Dealer.findOne({ user: dealerId });
    if (dealerUpdates.businessName !== undefined || dealerUpdates.location !== undefined) {
      if (dealer) {
        dealer = await Dealer.findByIdAndUpdate(dealer.id, dealerUpdates, {
          new: true,
          runValidators: true,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        businessName: user.businessName || dealer?.businessName || null,
        location: user.location || dealer?.location || null,
        phone: user.phone || null,
        bio: user.bio || null,
        approved: Boolean(dealer?.approved),
        updatedAt: user.updatedAt || new Date().toISOString(),
      },
    });
  } catch (err) {
    logError("Error updating dealer profile:", err);
    return res.status(500).json({ success: false, message: "Failed to update dealer profile" });
  }
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
  try {
    const dealerId = req.user.id;
    const [leads, releasedEscrows] = await Promise.all([
      Lead.find({ dealer: dealerId }),
      Escrow.find({ seller: dealerId, status: "released" }),
    ]);

    const stages = [
      ["new", "New Leads"],
      ["contacted", "Contacted"],
      ["negotiating", "Negotiating"],
      ["inspectionBooked", "Inspection Booked"],
      ["reserved", "Reserved"],
      ["sold", "Sold"],
    ];

    const pipelineStages = stages.map(([id, name]) => {
      const stageLeads = leads.filter((lead) => lead.stage === id);
      const value = stageLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0);
      return { id, name, count: stageLeads.length, value };
    });

    const soldValue = releasedEscrows.reduce((sum, escrow) => sum + Number(escrow.sellerAmount || escrow.amount || 0), 0);
    const total = leads.length;
    const contacted = leads.filter((lead) => ["contacted", "negotiating", "inspectionBooked", "reserved", "sold"].includes(lead.stage)).length;
    const negotiating = leads.filter((lead) => ["negotiating", "inspectionBooked", "reserved", "sold"].includes(lead.stage)).length;
    const reserved = leads.filter((lead) => ["reserved", "sold"].includes(lead.stage)).length;

    const rate = (num, den) => den > 0 ? Math.round((num / den) * 100) : 0;

    res.json({
      success: true,
      data: {
        stages: pipelineStages,
        deals: [],
        forecast: { thisMonth: 0, nextMonth: 0, thisQuarter: soldValue },
        conversionRates: {
          leadToContacted: rate(contacted, total),
          contactedToNegotiating: rate(negotiating, contacted),
          negotiatingToReserved: rate(reserved, negotiating),
          reservedToSold: rate(releasedEscrows.length, reserved),
        },
      },
    });
  } catch (err) {
    logError("Error fetching sales pipeline:", err);
    res.status(500).json({ success: false, message: "Failed to load sales pipeline" });
  }
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
  try {
    const dealerId = req.user.id;
    const [listings, leads, releasedEscrows] = await Promise.all([
      Car.find({ dealer: dealerId }),
      Lead.find({ dealer: dealerId }),
      Escrow.find({ seller: dealerId, status: "released" }),
    ]);

    const totalViews = listings.reduce((sum, car) => sum + Number(car.views || 0), 0);
    const totalSales = releasedEscrows.length;
    const totalRevenue = releasedEscrows.reduce((sum, escrow) => sum + Number(escrow.sellerAmount || escrow.amount || 0), 0);
    const avgDealSize = totalSales ? Math.round(totalRevenue / totalSales) : 0;
    const activeListings = listings.filter((car) => ["available", "active"].includes(car.status)).length;
    const slowMoving = listings.filter((car) => Number(car.views || 0) < 5).length;
    const fastMoving = listings.filter((car) => Number(car.views || 0) >= 20).length;

    const byMonth = new Map();
    for (const escrow of releasedEscrows) {
      const date = new Date(escrow.createdAt || escrow.updatedAt || Date.now());
      const month = date.toLocaleString("en-US", { month: "short" });
      const current = byMonth.get(month) || { month, sales: 0, revenue: 0 };
      current.sales += 1;
      current.revenue += Number(escrow.sellerAmount || escrow.amount || 0);
      byMonth.set(month, current);
    }

    const topVehicles = [...listings]
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, 5)
      .map((car) => ({
        id: car.id,
        title: car.title,
        views: Number(car.views || 0),
        leads: leads.filter((lead) => lead.vehicle === car.id).length,
      }));

    res.json({
      success: true,
      data: {
        overview: { totalViews, totalLeads: leads.length, totalSales, totalRevenue },
        performance: {
          avgDealSize,
          leadConversion: leads.length ? Math.round((totalSales / leads.length) * 100) : 0,
        },
        inventoryHealth: { total: listings.length, active: activeListings, fastMoving, slowMoving },
        topVehicles: topVehicles,
        salesTrend: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (err) {
    logError("Error fetching dealer analytics:", err);
    res.status(500).json({ success: false, message: "Failed to load dealer analytics" });
  }
}

// ============================================================
// TEAM MANAGEMENT
// ============================================================

export async function getTeamMembers(req, res) {
  // dealer_teams is referenced by legacy routes/models but is not defined
  // by the authoritative migration chain. Keep the endpoint explicit
  // rather than returning invented members or making an unbacked query.
  return res.status(501).json({
    success: false,
    code: "DEALER_TEAM_UNAVAILABLE",
    message: "Dealer team management is not available because no canonical dealer-scoped team data contract exists yet.",
  });
}

export async function inviteTeamMember(req, res) {
  return res.status(501).json({
    success: false,
    code: "DEALER_TEAM_UNAVAILABLE",
    message: "Dealer team invitations are not available because no canonical dealer-scoped team data contract exists yet.",
  });
}

export async function updateTeamMember(req, res) {
  return res.status(501).json({
    success: false,
    code: "DEALER_TEAM_UNAVAILABLE",
    message: "Dealer team management is not available because no canonical dealer-scoped team data contract exists yet.",
  });
}

// ============================================================
// SUBSCRIPTIONS & BILLING
// ============================================================

export async function getSubscription(req, res) {
  return res.status(501).json({
    success: false,
    code: "DEALER_SUBSCRIPTION_UNAVAILABLE",
    message: "Dealer subscription management is not available because the authoritative migration chain does not define a dealer subscription contract.",
  });
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

// Customer records are derived from real released escrow deals.
// No lender identity is inferred or advertised by this endpoint.
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
  try {
    const dealerId = req.user.id;
    const cars = await Car.find({ dealer: dealerId, auctionStatus: { $ne: "none" } }).sort({ auctionEnd: 1 });
    const items = cars.map((car) => {
      const end = car.auctionEnd ? new Date(car.auctionEnd) : null;
      let status = car.auctionStatus || "none";
      if (status === "live" && end && end <= new Date()) status = "ended";
      return {
        id: car.id,
        title: car.title,
        startingBid: Number(car.startingBid || 0),
        reservePrice: Number(car.reservePrice || 0),
        currentBid: Number(car.currentBid || 0),
        bidsCount: Number(car.bidsCount || 0),
        auctionEnd: car.auctionEnd || null,
        status,
        views: Number(car.views || 0),
      };
    });
    const live = items.filter((item) => item.status === "live").length;
    const upcoming = items.filter((item) => item.status === "upcoming").length;
    const ended = items.filter((item) => item.status === "ended").length;
    const totalRevenue = items.filter((item) => item.status === "ended").reduce((sum, item) => sum + item.currentBid, 0);
    res.json({ success: true, data: { items, stats: { total: items.length, live, upcoming, ended, totalRevenue } } });
  } catch (err) {
    logError("Error fetching dealer auctions:", err);
    res.status(500).json({ success: false, message: "Failed to load auctions" });
  }
}

// ============================================================
// FINANCE CENTER
// ============================================================

export async function getFinanceApplications(req, res) {
  // The repository's authoritative migration chain does not define a
  // loan_applications table. Do not query the compatibility model here:
  // doing so would turn an unavailable capability into a misleading 500
  // or, worse, fabricated dealer finance records.
  return res.status(501).json({
    success: false,
    code: "DEALER_FINANCE_UNAVAILABLE",
    message: "Dealer finance is not available because no canonical dealer-scoped finance data contract exists yet.",
  });
}

// ============================================================
// INSPECTION CENTER
// ============================================================

export async function getInspectionOrders(req, res) {
  try {
    const dealerId = req.user.id;
    const cars = await Car.find({ dealer: dealerId });
    const carIds = cars.map((car) => car.id);
    if (!carIds.length) {
      return res.json({ success: true, data: { items: [], stats: { total: 0, completed: 0, inProgress: 0, scheduled: 0 } } });
    }
    const inspections = await InspectionOrder.find({ carId: { $in: carIds } }).sort({ createdAt: -1 });
    const items = inspections.map((inspection) => ({
      id: inspection.id,
      vehicleId: inspection.carId,
      vehicle: cars.find((car) => car.id === inspection.carId)?.title || "Vehicle",
      status: inspection.status,
      scheduledAt: inspection.scheduledAt || null,
      completedAt: inspection.completedAt || null,
      report: inspection.report || null,
      notes: inspection.notes || null,
      createdAt: inspection.createdAt,
    }));
    res.json({
      success: true,
      data: {
        items,
        stats: {
          total: items.length,
          completed: items.filter((item) => item.status === "completed").length,
          inProgress: items.filter((item) => ["in_progress", "in-progress", "started"].includes(item.status)).length,
          scheduled: items.filter((item) => ["requested", "booked", "scheduled"].includes(item.status)).length,
        },
      },
    });
  } catch (err) {
    logError("Error fetching dealer inspections:", err);
    res.status(500).json({ success: false, message: "Failed to load inspections" });
  }
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
