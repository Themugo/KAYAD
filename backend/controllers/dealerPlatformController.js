// ============================================================
// DEALER PLATFORM - COMPLETE DEALERSHIP MANAGEMENT SYSTEM
// Digital Operating System for KAYAD Dealers
// ============================================================

import { checkPasswordStepUp } from "../utils/stepUp.js"; // Phase 14.9
import User from "../models/User.js";
import Dealer from "../models/Dealer.js";
import InspectionOrder from "../models/InspectionOrder.js";
import DealerAnalytics from "../models/DealerAnalytics.js";
import Car from "../models/Car.js";
import Escrow from "../models/Escrow.js";
import MarketingCampaign from "../models/MarketingCampaign.js";
import { listDealerReviews } from '../services/review.service.js';

import { createCar, updateCar, deleteCar } from "./carController.js";
import { logError } from "../utils/logger.js";
import { getDealerEntitlement } from "../services/dealerSubscription.service.js";
import { getDealerLeads, getLeadById, updateLeadStage as serviceUpdateLeadStage, addLeadActivity as serviceAddLeadActivity } from "../services/leadService.js";
import { create, findAll, findOne, update } from "../db/index.js";
import { logAuditEvent } from "../services/auditService.js";
import crypto from "crypto";
import { sellerMayPublishDirectly, PUBLICATION_REVIEW_REQUIRED } from "../services/onboardingPolicy.service.js"; // STAGE 5
import { sendTeamInviteEmail } from "../services/email.service.js";
import { formatPhone } from "../utils/format.js";
import { DEALER_TEAM_PERMISSIONS } from "../middleware/dealerOrgAccess.js";

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
      Car.find({ dealer: dealerId, deletedAt: { $exists: false } }),
      getDealerLeads(dealerId),
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

    const [listings, reviewSummary] = await Promise.all([
      Car.find({ dealer: dealerId, deletedAt: { $exists: false } }),
      listDealerReviews(dealerId, { page: 1, limit: 1 }),
    ]);

    const averageRating = reviewSummary.total ? reviewSummary.averageRating : null;

    res.json({
      success: true,
      data: {
        id: dealerUser.id,
        businessName: dealerRecord?.businessName || dealerUser.businessName || dealerUser.name,
        name: dealerUser.name,
        bio: dealerUser.bio || null,
        location: dealerRecord?.location || dealerUser.location || null,
        // Phase 14.5: the account phone is returned ONLY to the signed-in owner of this profile
        // (route uses optionalAuth). Anonymous callers, buyers and other dealers never receive it.
        ...(req.user && String(req.user.id) === String(dealerId) ? { phone: dealerUser.phone || null } : {}),
        approved: Boolean(dealerRecord?.approved),
        memberSince: dealerRecord?.createdAt || dealerUser.createdAt || null,
        stats: {
          activeListings: listings.filter((car) => ['available', 'active'].includes(car.status)).length,
          totalListings: listings.length,
          averageRating: averageRating === null ? null : Number(averageRating.toFixed(2)),
          totalReviews: reviewSummary.total,
        },
      },
    });
  } catch (err) {
    logError('Error fetching dealer profile:', err);
    res.status(500).json({ success: false, message: 'Failed to load dealer profile' });
  }
}

const PROFILE_TEXT_LIMITS = Object.freeze({ businessName: 120, location: 200, bio: 2000 });
// Fields that must never be set through the profile endpoint (mass-assignment / escalation guard).
const PROFILE_PROTECTED_FIELDS = Object.freeze([
  "role", "permissions", "status", "approved", "verificationStatus", "dealer", "dealerId", "user", "owner",
  "isOwner", "email", "id", "_id", "tokenVersion", "emailVerified", "phoneVerified", "password",
]);

export async function updateDealerProfile(req, res) {
  try {
    const { dealerId } = req.params;

    // 1. Identity + role BEFORE anything is read for update or written.
    if (!req.user || String(req.user.id) !== String(dealerId)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own dealer profile",
      });
    }
    if (req.user.role !== "dealer") {
      return res.status(403).json({ success: false, message: "Dealer access only" });
    }

    // 2. Validate the whole body before any write.
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: "Request body must be an object" });
    }
    const forbidden = PROFILE_PROTECTED_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(body, f));
    if (forbidden.length) {
      return res.status(400).json({ success: false, code: "PROFILE_FIELD_NOT_ALLOWED", message: "These fields cannot be changed here", fields: forbidden });
    }
    const updates = {};
    const fieldErrors = {};
    for (const field of Object.keys(PROFILE_TEXT_LIMITS)) {
      if (body[field] === undefined) continue; // omitted = unchanged
      if (typeof body[field] !== "string") { fieldErrors[field] = "Must be text"; continue; }
      const value = body[field].trim();
      if (field === "businessName" && !value) { fieldErrors[field] = "Business name is required"; continue; }
      if (value.length > PROFILE_TEXT_LIMITS[field]) { fieldErrors[field] = `Must be ${PROFILE_TEXT_LIMITS[field]} characters or fewer`; continue; }
      updates[field] = value; // "" clears location / bio
    }
    let normalizedPhone;
    if (body.phone !== undefined) {
      if (typeof body.phone !== "string" || !body.phone.trim()) fieldErrors.phone = "Enter a valid Kenyan phone number";
      else {
        normalizedPhone = formatPhone(body.phone);
        if (!normalizedPhone) fieldErrors.phone = "Enter a valid Kenyan phone number";
      }
    }
    if (Object.keys(fieldErrors).length) {
      return res.status(400).json({ success: false, code: "VALIDATION_FAILED", message: "Profile details are invalid", errors: fieldErrors });
    }
    if (!Object.keys(updates).length && normalizedPhone === undefined) {
      return res.status(400).json({ success: false, message: "No valid profile changes supplied" });
    }

    // 3. Confirm the dealer account exists (read only) before the first write.
    const existingUser = await User.findById(dealerId);
    if (!existingUser || existingUser.role !== "dealer") {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }
    const dealerRecord = await Dealer.findOne({ user: dealerId });

    const userUpdates = { ...updates };
    if (normalizedPhone !== undefined && normalizedPhone !== existingUser.phone) {
      // Phase 14.9: the account phone is the payout destination - a changed number needs password step-up (before any write).
      const refusal = await checkPasswordStepUp(req.user.id, body.currentPassword);
      if (refusal) return res.status(403).json(refusal);
      userUpdates.phone = normalizedPhone;
      // A changed number is a new, unverified number: never carry the old verification across.
      userUpdates.phoneVerified = false;
    }

    // 4. Write. Dealer record first, user second; if the second write fails, restore the first.
    const dealerUpdates = {};
    if (updates.businessName !== undefined) dealerUpdates.businessName = updates.businessName;
    if (updates.location !== undefined) dealerUpdates.location = updates.location;
    let dealerWritten = false;
    if (dealerRecord && Object.keys(dealerUpdates).length) {
      await Dealer.findByIdAndUpdate(dealerRecord.id, dealerUpdates, { new: true, runValidators: true });
      dealerWritten = true;
    }
    let user;
    try {
      user = Object.keys(userUpdates).length
        ? await User.findByIdAndUpdate(dealerId, userUpdates, { new: true, runValidators: true })
        : existingUser;
    } catch (writeErr) {
      if (dealerWritten) {
        await Dealer.findByIdAndUpdate(dealerRecord.id, { businessName: dealerRecord.businessName, location: dealerRecord.location }).catch(() => {});
      }
      throw writeErr;
    }
    if (!user) {
      if (dealerWritten) {
        await Dealer.findByIdAndUpdate(dealerRecord.id, { businessName: dealerRecord.businessName, location: dealerRecord.location }).catch(() => {});
      }
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    await logAuditEvent({
      action: "dealer_profile_updated", actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email,
      target: dealerId, targetModel: "User", details: { fields: Object.keys(userUpdates).filter((f) => f !== "phoneVerified") },
      ipAddress: req.ip, userAgent: req.get?.("user-agent"), requestId: req.id,
    }).catch(() => {});

    return res.json({
      success: true,
      data: {
        id: user.id,
        businessName: user.businessName || dealerRecord?.businessName || null,
        location: user.location || dealerRecord?.location || null,
        phone: user.phone || null,
        bio: user.bio || null,
        approved: Boolean(dealerRecord?.approved),
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
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const filter = { dealer: req.user.id, deletedAt: { $exists: false } }; // 14.8: soft-deleted listings are not inventory
    if (status) filter.status = status;
    const all = await Car.find(filter).sort({ createdAt: -1 });
    const total = all.length;
    const items = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    const stats = { total: all.length, published: 0, draft: 0, pending: 0, reserved: 0, sold: 0, archived: 0 };
    for (const car of all) {
      if (Object.prototype.hasOwnProperty.call(stats, car.status)) stats[car.status]++;
    }
    res.json({ success: true, data: { items, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }, stats } });
  } catch (err) {
    logError("Error fetching dealer inventory:", err);
    res.status(500).json({ success: false, message: "Failed to load dealer inventory" });
  }
}

// Listing mutations use the canonical car controller so dealer inventory
// cannot drift into a second persistence implementation.
export async function createListing(req, res) { return createCar(req, res); }
export async function updateListing(req, res) { req.params.id = req.params.listingId; return updateCar(req, res); }
export async function deleteListing(req, res) { req.params.id = req.params.listingId; return deleteCar(req, res); }

export async function bulkUpdateListings(req, res) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const action = req.body?.action;
    const allowedStatuses = new Set(["available", "active", "draft", "pending", "reserved", "sold", "archived"]);
    if (!ids.length || !action) return res.status(400).json({ success: false, message: "ids and action are required" });
    if (action !== "status") return res.status(400).json({ success: false, message: "Only status bulk updates are supported" });
    const status = req.body?.data?.status;
    if (!allowedStatuses.has(status)) return res.status(400).json({ success: false, message: "Invalid listing status" });
    // STAGE 5: no self-publication while listings are held for owner review.
    if ((status === "available" || status === "active") && !(await sellerMayPublishDirectly(req.user))) {
      return res.status(403).json(PUBLICATION_REVIEW_REQUIRED);
    }
    const owned = await Car.find({ id: { $in: ids }, dealer: req.user.id, deletedAt: { $exists: false } });
    if (owned.length !== ids.length) return res.status(403).json({ success: false, message: "One or more listings are not owned by this dealer" });
    // STAGE 5A (Gate E): sold listings are governed by the sale/escrow workflow, never by a seller bulk status edit.
    if (owned.some((c) => c.status === "sold" || c.sold === true)) {
      return res.status(409).json({ success: false, code: "LISTING_MODERATION_BLOCKED", message: "Sold listings cannot be changed in bulk." });
    }
    for (const car of owned) {
      car.status = status;
      await car.save();
    }
    res.json({ success: true, data: { updated: owned.length, status } });
  } catch (err) {
    logError("Error bulk updating dealer inventory:", err);
    res.status(500).json({ success: false, message: "Failed to update dealer inventory" });
  }
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
    const all = await getDealerLeads(dealerId, stage ? { stage } : {});
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const items = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    const stats = { total: all.length, new: 0, contacted: 0, negotiating: 0, inspectionBooked: 0, reserved: 0, sold: 0, lost: 0 };
    for (const lead of all) if (Object.prototype.hasOwnProperty.call(stats, lead.stage)) stats[lead.stage]++;
    return res.json({ success: true, data: { items, pagination: { page: pageNum, limit: limitNum, total: all.length, pages: Math.ceil(all.length / limitNum) }, stats } });
  } catch (err) { logError("Error fetching leads:", err); return res.status(500).json({ success: false, message: "Failed to load leads" }); }
}

export async function updateLead(req, res) {
  try {
    const lead = await getLeadById(req.params.leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (String(lead.dealer) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized to update this lead" });
    let updated = lead;
    if (req.body?.stage !== undefined) updated = await serviceUpdateLeadStage(lead.id, req.body.stage, req.user.id);
    const updates = {};
    for (const field of ["isHot", "archived", "estimatedValue"]) if (req.body?.[field] !== undefined) updates[field] = req.body[field];
    if (Object.keys(updates).length) updated = await update("leads", lead.id, { ...updates, lastActivityAt: new Date().toISOString() });
    return res.json({ success: true, data: updated });
  } catch (err) { logError("Error updating lead:", err); return res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : "Failed to update lead" }); }
}

export async function addLeadNote(req, res) {
  const lead = await getLeadById(req.params.leadId);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  if (String(lead.dealer) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized to access this lead" });
  const text = String(req.body?.note || req.body?.description || "").trim();
  if (text.length < 1 || text.length > 4000) return res.status(400).json({ success: false, message: "Note must be between 1 and 4000 characters" });
  const updated = await serviceAddLeadActivity(lead.id, "note", req.user.id, { description: text, metadata: {} });
  return res.status(201).json({ success: true, data: updated });
}

export async function getLeadActivities(req, res) {
  const lead = await getLeadById(req.params.leadId);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  if (String(lead.dealer) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized to access this lead" });
  const rows = await findAll("lead_activities", { filters: { lead: lead.id }, orderBy: "createdAt", ascending: false, limit: 100 });
  return res.json({ success: true, data: { items: rows } });
}

export async function createTask(req, res) {
  const lead = await getLeadById(req.params.leadId);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  if (String(lead.dealer) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized to access this lead" });
  const title = String(req.body?.title || req.body?.task || "").trim();
  if (title.length < 2 || title.length > 200) return res.status(400).json({ success: false, message: "Task title must be between 2 and 200 characters" });
  const dueAt = req.body?.dueAt ? new Date(req.body.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, message: "Invalid due date" });
  const updated = await serviceAddLeadActivity(lead.id, "task", req.user.id, { description: title, metadata: { dueAt: dueAt?.toISOString() || null, priority: ["low","normal","high"].includes(req.body?.priority) ? req.body.priority : "normal", status: "open" } });
  return res.status(201).json({ success: true, data: updated });
}

// ============================================================
// SALES PIPELINE
// ============================================================

export async function getSalesPipeline(req, res) {
  try {
    const dealerId = req.user.id;
    const [leads, releasedEscrows] = await Promise.all([
      getDealerLeads(dealerId),
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
  const campaigns = await findAll("marketing_campaigns", { filters: { dealer: req.user.id }, orderBy: "createdAt", ascending: false, limit: 100 });
  const stats = { total: campaigns.length, draft: 0, scheduled: 0, active: 0, paused: 0, completed: 0, archived: 0, budget: 0 };
  for (const campaign of campaigns) {
    if (stats[campaign.status] !== undefined) stats[campaign.status] += 1;
    stats.budget += Number(campaign.budget || 0);
  }
  return res.json({ success: true, data: { items: campaigns, stats, metricsSource: "campaign_configuration_only" } });
}

export async function createCampaign(req, res) {
  const name = String(req.body?.name || "").trim();
  const campaignType = String(req.body?.campaignType || "promotion").trim();
  const allowedTypes = new Set(["promotion", "listing", "brand", "event", "social"]);
  if (name.length < 2 || name.length > 160) return res.status(400).json({ success: false, message: "Campaign name must be between 2 and 160 characters" });
  if (!allowedTypes.has(campaignType)) return res.status(400).json({ success: false, message: "Invalid campaign type" });
  const budget = Number(req.body?.budget || 0);
  if (!Number.isFinite(budget) || budget < 0) return res.status(400).json({ success: false, message: "Budget must be a non-negative number" });
  const status = ["draft","scheduled","active","paused","completed","archived"].includes(req.body?.status) ? req.body.status : "draft";
  const row = await create("marketing_campaigns", { dealer: req.user.id, name, campaignType, budget, status, startDate: req.body?.startDate || null, endDate: req.body?.endDate || null, description: String(req.body?.description || "").trim().slice(0, 2000), metadata: {} });
  await logAuditEvent({ action: "dealer_marketing_campaign_created", actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email, target: row.id, targetModel: "MarketingCampaign", details: { name, campaignType }, ipAddress: req.ip, userAgent: req.get("user-agent"), requestId: req.id });
  return res.status(201).json({ success: true, data: row });
}

export async function updateCampaign(req, res) {
  const existing = await findOne("marketing_campaigns", { id: req.params.campaignId, dealer: req.user.id });
  if (!existing) return res.status(404).json({ success: false, message: "Campaign not found" });
  const updates = {};
  for (const field of ["name","description","startDate","endDate"]) if (req.body?.[field] !== undefined) updates[field] = String(req.body[field]).trim();
  if (req.body?.budget !== undefined) { const budget = Number(req.body.budget); if (!Number.isFinite(budget) || budget < 0) return res.status(400).json({ success: false, message: "Budget must be a non-negative number" }); updates.budget = budget; }
  if (req.body?.status !== undefined) { if (!["draft","scheduled","active","paused","completed","archived"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid campaign status" }); updates.status = req.body.status; }
  if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid campaign changes supplied" });
  const row = await update("marketing_campaigns", existing.id, updates);
  await logAuditEvent({ action: "dealer_marketing_campaign_updated", actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email, target: row.id, targetModel: "MarketingCampaign", oldValue: existing, newValue: row, ipAddress: req.ip, userAgent: req.get("user-agent"), requestId: req.id });
  return res.json({ success: true, data: row });
}

export async function getDealerAnalytics(req, res) {
  try {
    const dealerId = req.user.id;
    const [listings, leads, releasedEscrows] = await Promise.all([
      Car.find({ dealer: dealerId, deletedAt: { $exists: false } }),
      getDealerLeads(dealerId),
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


export async function getAIRecommendations(req, res) {
  const dealerId = req.user.id;
  const [listings, leads, entitlement] = await Promise.all([Car.find({ dealer: dealerId, deletedAt: { $exists: false } }), getDealerLeads(dealerId), getDealerEntitlement(dealerId)]);
  const recommendations = [];
  const slow = listings.filter((car) => Number(car.views || 0) < 5 && ["available","active"].includes(car.status));
  const hot = leads.filter((lead) => lead.isHot && !["sold","lost"].includes(lead.stage));
  const stale = leads.filter((lead) => { const at = new Date(lead.lastActivityAt || lead.createdAt || 0); return at.getTime() && Date.now() - at.getTime() > 7 * 86400000 && !["sold","lost"].includes(lead.stage); });
  if (slow.length) recommendations.push({ key: "slow_inventory", priority: "high", title: "Review slow-moving inventory", reason: `${slow.length} active listing(s) have fewer than 5 recorded views.`, evidence: { listingIds: slow.slice(0,10).map(x => x.id) } });
  if (hot.length) recommendations.push({ key: "hot_leads", priority: "high", title: "Follow up hot leads", reason: `${hot.length} hot lead(s) remain open.`, evidence: { leadIds: hot.slice(0,10).map(x => x.id) } });
  if (stale.length) recommendations.push({ key: "stale_leads", priority: "medium", title: "Refresh stale leads", reason: `${stale.length} open lead(s) have had no recorded activity for more than 7 days.`, evidence: { leadIds: stale.slice(0,10).map(x => x.id) } });
  const max = Number(entitlement?.entitlement?.listingLimit ?? entitlement?.listingLimit ?? 0);
  const active = listings.filter((car) => ["available","active"].includes(car.status)).length;
  if (max > 0 && active >= max) recommendations.push({ key: "listing_capacity", priority: "medium", title: "Review listing capacity", reason: `Active inventory is at or above the current subscription limit (${active}/${max}).`, evidence: { activeListings: active, listingLimit: max } });
  return res.json({ success: true, data: recommendations, source: "dealer_operational_records", generatedAt: new Date().toISOString() });
}

// ============================================================
// TEAM MANAGEMENT
// ============================================================

// Never send invitation token material to a client.
const publicTeamRow = (row) => {
  if (!row || typeof row !== "object") return row;
  // 14.8: the data layer returns BOTH the snake_case column and a camelCase alias, so strip every spelling.
  const { inviteTokenHash, inviteToken, invite_token_hash, invite_token, ...safe } = row; // eslint-disable-line no-unused-vars
  return safe;
};
// Phase 14.7 team least-privilege rules (non-owner actors only; the dealership owner and admin/superadmin are unrestricted):
//  * only the owner may create or promote a "manager" (a manager could otherwise mint peers);
//  * a non-owner may not modify, suspend or remove a "manager", nor a member holding any permission the actor does not hold.
const isUnrestrictedTeamActor = (req) => Boolean(req.dealerOrg?.isOwner) || ["admin", "superadmin"].includes(req.user?.role);
const TEAM_PROTECTED = (res, code, message) => res.status(403).json({ success: false, code, message });
const grantedKeys = (perms) => Object.keys(perms && typeof perms === "object" ? perms : {}).filter((k) => perms[k] === true);
function teamActorMayManage(req, target) {
  if (isUnrestrictedTeamActor(req)) return null;
  if (target.role === "manager") return { code: "TEAM_TARGET_PROTECTED", message: "Only the dealership owner can change or remove a manager." };
  const own = req.dealerOrg?.permissions || {};
  if (grantedKeys(target.permissions).some((k) => !own[k])) return { code: "TEAM_TARGET_PROTECTED", message: "You cannot change a member who holds permissions you do not hold." };
  return null;
}

const TEAM_ROLES = Object.freeze(["manager", "sales_agent", "lot_agent", "finance_officer", "viewer"]);
// Server-enforced lifecycle: from -> allowed targets. "invited" is never a client-selectable target and a
// pending invitation can only become active through POST /team/accept (invitee proves the token + email).
const TEAM_TRANSITIONS = Object.freeze({
  active: ["suspended", "removed"],
  suspended: ["active", "removed"],
  invited: ["removed"],
  removed: [],
});

export async function getTeamMembers(req, res) {
  const dealerId = req.dealerId || req.user.id;
  const rows = await findAll("dealer_teams", { filters: { dealer: dealerId }, orderBy: "createdAt", ascending: false, limit: 200 });
  const memberIds = rows.map(r => r.member).filter(Boolean);
  const users = memberIds.length ? await User.find({ id: { $in: memberIds } }) : [];
  const byId = new Map(users.map(u => [u.id, u]));
  return res.json({ success: true, data: { items: rows.map(r => ({ ...publicTeamRow(r), memberProfile: r.member ? { id: r.member, name: byId.get(r.member)?.name || null, email: byId.get(r.member)?.email || r.inviteEmail } : null })), stats: { total: rows.length, active: rows.filter(r => r.status === "active").length, invited: rows.filter(r => r.status === "invited").length, suspended: rows.filter(r => r.status === "suspended").length } } });
}

export async function inviteTeamMember(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const role = String(req.body?.role || "sales_agent");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ success: false, message: "Valid email is required" });
  if (!TEAM_ROLES.includes(role)) return res.status(400).json({ success: false, message: "Invalid team role" });
  if (role === "manager" && !isUnrestrictedTeamActor(req)) return TEAM_PROTECTED(res, "TEAM_ROLE_OWNER_ONLY", "Only the dealership owner can invite a manager.");
  const dealerId = req.dealerId || req.user.id;
  if (email === String(req.user.email || "").trim().toLowerCase()) return res.status(400).json({ success: false, message: "You cannot invite your own account" });
  const existing = await findOne("dealer_teams", { dealer: dealerId, inviteEmail: email });
  if (existing && existing.status !== "removed") return res.status(409).json({ success: false, message: "An active or pending invitation already exists for this email" });
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const row = existing ? await update("dealer_teams", existing.id, { member: null, role, permissions: {}, status: "invited", inviteEmail: email, inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), invitedBy: req.user.id }) : await create("dealer_teams", { dealer: dealerId, role, permissions: {}, status: "invited", inviteEmail: email, inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), invitedBy: req.user.id });
  await sendTeamInviteEmail(email, req.user.name || "KAYAD Dealer", role, token).catch(() => {});
  await logAuditEvent({ action: "dealer_team_invitation_created", actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email, target: row.id, targetModel: "DealerTeam", details: { email, role }, ipAddress: req.ip, userAgent: req.get("user-agent"), requestId: req.id });
  return res.status(201).json({ success: true, data: publicTeamRow(row) });
}

export async function updateTeamMember(req, res) {
  const dealerId = req.dealerId || req.user.id;
  const existing = await findOne("dealer_teams", { id: req.params.memberId, dealer: dealerId });
  if (!existing) return res.status(404).json({ success: false, message: "Team member not found" });
  if (String(existing.member || "") === String(req.user.id)) {
    return res.status(403).json({ success: false, message: "You cannot change your own role, permissions, or status" });
  }
  const protectedTarget = teamActorMayManage(req, existing);
  if (protectedTarget) return TEAM_PROTECTED(res, protectedTarget.code, protectedTarget.message);
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const updates = {};
  if (body.role === "manager" && existing.role !== "manager" && !isUnrestrictedTeamActor(req)) return TEAM_PROTECTED(res, "TEAM_ROLE_OWNER_ONLY", "Only the dealership owner can promote a member to manager.");
  if (existing.status === "removed") return res.status(409).json({ success: false, code: "INVALID_TEAM_TRANSITION", message: "This team member has been removed" });
  if (body.role !== undefined) { if (!TEAM_ROLES.includes(body.role)) return res.status(400).json({ success: false, message: "Invalid team role" }); updates.role = body.role; }
  if (body.status !== undefined) {
    if (!["invited","active","suspended","removed"].includes(body.status)) return res.status(400).json({ success: false, message: "Invalid team status" });
    if (body.status !== existing.status) {
      if (!(TEAM_TRANSITIONS[existing.status] || []).includes(body.status)) return res.status(409).json({ success: false, code: "INVALID_TEAM_TRANSITION", message: `A ${existing.status} team member cannot be set to ${body.status}` });
      // reactivation requires an accepted membership
      if (body.status === "active" && !existing.member) return res.status(409).json({ success: false, code: "INVALID_TEAM_TRANSITION", message: "A pending invitation can only be activated by the invitee accepting it" });
      updates.status = body.status;
      if (body.status === "removed") { updates.inviteTokenHash = null; updates.inviteExpiresAt = null; }
    }
  }
  if (body.permissions !== undefined) {
    const perms = body.permissions;
    if (!perms || typeof perms !== "object" || Array.isArray(perms)) return res.status(400).json({ success: false, message: "Permissions must be an object" });
    const keys = Object.keys(perms);
    const unknown = keys.filter((k) => !DEALER_TEAM_PERMISSIONS.includes(k));
    if (unknown.length) return res.status(400).json({ success: false, code: "UNKNOWN_PERMISSION", message: "Unknown permission keys", fields: unknown });
    if (keys.some((k) => typeof perms[k] !== "boolean")) return res.status(400).json({ success: false, message: "Permission values must be true or false" });
    // No privilege expansion: a non-owner may only grant permissions they hold themselves.
    const actor = req.dealerOrg || {};
    const unrestricted = actor.isOwner || ["admin", "superadmin"].includes(req.user.role);
    const overreach = unrestricted ? [] : keys.filter((k) => perms[k] === true && !actor.permissions?.[k]);
    if (overreach.length) return res.status(403).json({ success: false, code: "PERMISSION_GRANT_FORBIDDEN", message: "You cannot grant permissions you do not hold", fields: overreach });
    updates.permissions = perms;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No valid team changes supplied" });
  const row = await update("dealer_teams", existing.id, updates);
  await logAuditEvent({ action: "dealer_team_member_updated", actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email, target: row.id, targetModel: "DealerTeam", oldValue: publicTeamRow(existing), newValue: publicTeamRow(row), ipAddress: req.ip, userAgent: req.get("user-agent"), requestId: req.id });
  return res.json({ success: true, data: publicTeamRow(row) });
}

export async function removeTeamMember(req, res) {
  const dealerId = req.dealerId || req.user.id;
  const existing = await findOne("dealer_teams", { id: req.params.memberId, dealer: dealerId });
  if (!existing) return res.status(404).json({ success: false, message: "Team member not found" });
  if (String(existing.member || "") === String(req.user.id)) {
    return res.status(403).json({ success: false, message: "You cannot remove yourself from the dealer team" });
  }
  const protectedTarget = teamActorMayManage(req, existing);
  if (protectedTarget) return TEAM_PROTECTED(res, protectedTarget.code, protectedTarget.message);
  if (existing.status === "removed") return res.status(409).json({ success: false, code: "INVALID_TEAM_TRANSITION", message: "This team member has already been removed" });
  const row = await update("dealer_teams", existing.id, { status: "removed", inviteTokenHash: null, inviteExpiresAt: null });
  await logAuditEvent({
    action: "dealer_team_member_removed",
    actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email,
    target: row.id, targetModel: "DealerTeam", oldValue: publicTeamRow(existing), newValue: publicTeamRow(row),
    ipAddress: req.ip, userAgent: req.get("user-agent"), requestId: req.id,
  });
  return res.json({ success: true, data: publicTeamRow(row) });
}

export async function acceptTeamInvite(req, res) {
  const token = String(req.body?.token || "").trim();
  if (token.length !== 64) return res.status(400).json({ success: false, message: "Invalid invitation token" });
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await findOne("dealer_teams", { inviteTokenHash: hash, status: "invited" });
  if (!row) return res.status(404).json({ success: false, message: "Invitation not found or already used" });
  if (row.inviteExpiresAt && new Date(row.inviteExpiresAt) <= new Date()) return res.status(410).json({ success: false, message: "Invitation has expired" });
  if (String(req.user.email || "").trim().toLowerCase() !== String(row.inviteEmail || "").trim().toLowerCase()) return res.status(403).json({ success: false, message: "Invitation email does not match the authenticated account" });
  const activeMembership = await findOne("dealer_teams", { dealer: row.dealer, member: req.user.id, status: "active" });
  if (activeMembership) return res.status(409).json({ success: false, message: "You are already an active member of this dealer team" });
  const updated = await update("dealer_teams", row.id, { member: req.user.id, status: "active", inviteTokenHash: null, inviteExpiresAt: null });
  await logAuditEvent({ action: "dealer_team_invitation_accepted", actor: req.user.id, actorRole: req.user.role, actorName: req.user.name, actorEmail: req.user.email, target: updated.id, targetModel: "DealerTeam", details: { dealerId: row.dealer }, ipAddress: req.ip, userAgent: req.get("user-agent"), requestId: req.id });
  return res.json({ success: true, data: publicTeamRow(updated) });
}

// ============================================================
// SUBSCRIPTIONS & BILLING
// ============================================================

export async function getSubscription(req, res) {
  const entitlement = await getDealerEntitlement(req.user.id);
  return res.json({ success: true, subscription: entitlement.subscription, entitlement });
}

// ============================================================
// AI DEALER COPILOT
// ============================================================

export async function askDealerCopilot(req, res) {
  const question = String(req.body?.question || "").trim();
  if (question.length < 3 || question.length > 1000) return res.status(400).json({ success: false, message: "Question must be between 3 and 1000 characters" });
  const dealerId = req.user.id;
  const [listings, leads, escrows, entitlement] = await Promise.all([Car.find({ dealer: dealerId, deletedAt: { $exists: false } }), getDealerLeads(dealerId), Escrow.find({ seller: dealerId, status: "released" }), getDealerEntitlement(dealerId)]);
  const q = question.toLowerCase();
  let answer;
  if (q.includes("listing") || q.includes("inventory")) answer = { type: "inventory", totalListings: listings.length, activeListings: listings.filter(x => ["available","active"].includes(x.status)).length, totalViews: listings.reduce((n,x) => n + Number(x.views || 0), 0) };
  else if (q.includes("lead")) answer = { type: "leads", total: leads.length, open: leads.filter(x => !["sold","lost"].includes(x.stage)).length, hot: leads.filter(x => x.isHot && !["sold","lost"].includes(x.stage)).length };
  else if (q.includes("revenue") || q.includes("sales")) answer = { type: "sales", releasedDeals: escrows.length, revenue: escrows.reduce((n,x) => n + Number(x.sellerAmount || x.amount || 0), 0) };
  else if (q.includes("subscription") || q.includes("plan") || q.includes("limit")) answer = { type: "subscription", subscription: entitlement.subscription, entitlement: entitlement.entitlement };
  else answer = { type: "supported_topics", topics: ["inventory", "leads", "sales/revenue", "subscription/limits"], message: "Ask about one of the supported operational topics; responses are derived from your dealer records." };
  return res.json({ success: true, data: { question, answer, source: "dealer_operational_records", generatedAt: new Date().toISOString() } });
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
    const cars = await Car.find({ dealer: dealerId, deletedAt: { $exists: false }, auctionStatus: { $ne: "none" } }).sort({ auctionEnd: 1 });
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
  const applications = await findAll("loan_applications", { filters: { dealer: req.user.id }, orderBy: "createdAt", ascending: false, limit: 100 });
  const stats = { total: applications.length, submitted: 0, under_review: 0, approved: 0, declined: 0, disbursed: 0 };
  for (const application of applications) if (stats[application.status] !== undefined) stats[application.status] += 1;
  // Phase 12 fix: `loan_applications` rows only carry raw `vehicle`/`applicant`
  // UUIDs (see supabase/migrations/20260908043000_dealer_platform_domain_end_to_end.sql),
  // no join. The dashboard's Finance tab needs a human-readable vehicle title
  // and applicant name, not a bare UUID, so resolve both the same way
  // getInspectionOrders already resolves vehicle titles for this dealer.
  const vehicleIds = [...new Set(applications.map((a) => a.vehicle).filter(Boolean))];
  const applicantIds = [...new Set(applications.map((a) => a.applicant).filter(Boolean))];
  const [cars, applicants] = await Promise.all([
    vehicleIds.length ? Car.find({ id: { $in: vehicleIds } }) : [],
    applicantIds.length ? User.find({ id: { $in: applicantIds } }) : [],
  ]);
  const items = applications.map((application) => ({
    ...application,
    vehicle: cars.find((car) => car.id === application.vehicle)?.title || "Vehicle",
    applicantName: applicants.find((person) => person.id === application.applicant)?.name || "Buyer",
  }));
  return res.json({ success: true, data: { items, stats, source: "loan_applications" } });
}

// ============================================================
// INSPECTION CENTER
// ============================================================

export async function getInspectionOrders(req, res) {
  try {
    const dealerId = req.user.id;
    const cars = await Car.find({ dealer: dealerId, deletedAt: { $exists: false } });
    const carIds = cars.map((car) => car.id);
    if (!carIds.length) {
      return res.json({ success: true, data: { items: [], stats: { total: 0, completed: 0, inProgress: 0, scheduled: 0 } } });
    }
    const inspections = await InspectionOrder.find({ car: { $in: carIds } }).sort({ createdAt: -1 });
    // PRIVACY: the sellers' view is deliberately minimal. `notes` holds the BUYER's request details
    // (phone, location, fee) and the report belongs to the requester, so neither is exposed here.
    // A seller learns only that an inspection of their vehicle exists, its stage and its dates.
    const items = inspections.map((inspection) => ({
      id: inspection.id,
      vehicleId: inspection.car,
      vehicle: cars.find((car) => car.id === inspection.car)?.title || "Vehicle",
      status: inspection.status,
      scheduledAt: inspection.scheduledAt || null,
      completedAt: inspection.completedAt || null,
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
  try {
    const result = await listDealerReviews(req.user.id, { page: 1, limit: 10 });
    res.json({ success: true, data: { overall: { rating: result.averageRating || null, totalReviews: result.total }, recentReviews: result.reviews.map((r) => ({ id: r.id, name: r.user?.name || "Buyer", rating: Number(r.rating), text: r.comment || null, vehicle: r.car?.title || null, date: r.createdAt || null, status: r.status })) } });
  } catch (err) {
    logError("Error fetching dealer reputation:", err);
    res.status(500).json({ success: false, message: "Failed to load dealer reputation" });
  }
}

