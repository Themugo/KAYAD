// backend/services/leadService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Lead service
// Manages lead creation, updates, and analytics
// ─────────────────────────────────────────────────────────────

import { addTimelineEvent, getLeadTimeline } from "./leadTimelineService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, findOne, create, count, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// ➕ CREATE LEAD
// =============================

export const createLead = async (buyerId, dealerId, vehicleId, source, referenceId) => {
  try {
    // Check if lead already exists for this combination
    const existingLead = await findOne("leads", {
      buyer: buyerId,
      dealer: dealerId,
      vehicle: vehicleId,
      source,
      sourceReference: referenceId,
    });

    if (existingLead) {
      logInfo("Lead already exists", { buyerId, dealerId, vehicleId, source });
      return existingLead;
    }

    // Get vehicle details for estimated value
    let estimatedValue = 0;
    if (vehicleId) {
      const vehicle = await findById("cars", vehicleId);
      if (vehicle) {
        estimatedValue = vehicle.price || 0;
      }
    }

    const lead = await create("leads", {
      buyer: buyerId,
      dealer: dealerId,
      vehicle: vehicleId,
      source,
      sourceReference: referenceId,
      estimatedValue,
      lastActivityAt: new Date(),
    });

    // Add creation activity
    await addTimelineEvent(lead.id, "lead_created", buyerId, "buyer", `Lead created from ${source}`, {
      source,
      referenceId,
    });

    logInfo("Lead created", { leadId: lead.id, buyerId, dealerId, source });
    return lead;
  } catch (err) {
    logError("Failed to create lead", err, { buyerId, dealerId, source });
    throw err;
  }
};

// =============================
// 🔄 UPDATE LEAD STAGE
// =============================

export const updateLeadStage = async (leadId, newStage, actorId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.updateStage(newStage, actorId);
    logInfo("Lead stage updated", { leadId, newStage, actorId });
    return lead;
  } catch (err) {
    logError("Failed to update lead stage", err, { leadId, newStage });
    throw err;
  }
};

// =============================
// ➕ ADD LEAD ACTIVITY
// =============================

export const addLeadActivity = async (leadId, type, actorId, details) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.addActivity(type, actorId, "dealer", details.description, details.metadata);

    if (details.totalMessages) {
      lead.totalMessages = details.totalMessages;
      await lead.save();
    }

    logInfo("Lead activity added", { leadId, type, actorId });
    return lead;
  } catch (err) {
    logError("Failed to add lead activity", err, { leadId, type });
    throw err;
  }
};

// =============================
// 📋 GET DEALER LEADS
// =============================

export const getDealerLeads = async (dealerId, filters = {}) => {
  try {
    const leads = await Lead.getDealerLeads(dealerId, filters);
    return leads;
  } catch (err) {
    logError("Failed to get dealer leads", err, { dealerId });
    throw err;
  }
};

// =============================
// 🔍 GET LEAD BY ID
// =============================

export const getLeadById = async (leadId) => {
  try {
    const lead = await findById("leads", leadId);

    if (!lead) {
      throw new Error("Lead not found");
    }

    // Resolved (Phase 4, seller/dealer workflow hardening): the
    // previous 3 commented-out .populate() calls here left buyer/
    // dealer/vehicle as bare IDs on every lead - directly affecting
    // the dealer-facing "Leads" step named in this phase's own dealer
    // flow, since a dealer viewing a lead's detail needs the buyer's
    // contact info and the vehicle's title/images to actually act on
    // it, not opaque UUIDs. Fixed with the separate-query approach the
    // TODO comment itself suggested, matching the pattern already used
    // elsewhere in this backend (e.g. chatController.js's participant
    // enrichment) - real columns confirmed against the authoritative
    // schema (supabase/migrations/..._leads_and_escrow_columns.sql.sql:
    // buyer/dealer/vehicle are real UUID foreign keys to users/users/
    // cars respectively) before writing this, not guessed.
    const sb = getSupabase();
    const [buyerRes, dealerRes, vehicleRes] = await Promise.all([
      lead.buyer ? sb.from("users").select("id, name, email, phone").eq("id", lead.buyer).maybeSingle() : null,
      lead.dealer ? sb.from("users").select("id, name, email, businessName").eq("id", lead.dealer).maybeSingle() : null,
      lead.vehicle ? sb.from("cars").select("id, title, brand, model, year, price, images").eq("id", lead.vehicle).maybeSingle() : null,
    ]);

    return {
      ...lead,
      buyer: buyerRes?.data || lead.buyer,
      dealer: dealerRes?.data || lead.dealer,
      vehicle: vehicleRes?.data || lead.vehicle,
    };
  } catch (err) {
    logError("Failed to get lead by id", err, { leadId });
    throw err;
  }
};

// =============================
// 📦 ARCHIVE LEAD
// =============================

export const archiveLead = async (leadId, actorId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.archive(actorId);
    logInfo("Lead archived", { leadId, actorId });
    return lead;
  } catch (err) {
    logError("Failed to archive lead", err, { leadId });
    throw err;
  }
};

// =============================
// 🔥 MARK LEAD AS HOT
// =============================

export const markLeadAsHot = async (leadId, actorId) => {
  try {
    const lead = await findById("leads", leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.markAsHot(actorId);
    logInfo("Lead hot status updated", { leadId, actorId });
    return lead;
  } catch (err) {
    logError("Failed to mark lead as hot", err, { leadId });
    throw err;
  }
};

// =============================
// 📊 CALCULATE CONVERSION RATE
// =============================

export const calculateConversionRate = async (dealerId, startDate, endDate) => {
  try {
    const matchQuery = {
      dealer: dealerId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const totalLeads = await count("leads", matchQuery);
    const soldLeads = await count("leads", {
      ...matchQuery,
      stage: "sold",
    });

    const conversionRate = totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      soldLeads,
      conversionRate,
    };
  } catch (err) {
    logError("Failed to calculate conversion rate", err, { dealerId });
    throw err;
  }
};

// =============================
// ⏱️ CALCULATE RESPONSE TIME
// =============================

export const calculateResponseTime = async (dealerId, startDate, endDate) => {
  try {
    const leads = await findAll("leads", { 
      filters: {
        dealer: dealerId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        firstResponseTime: { $gt: 0 },
      }
    });

    if (leads.length === 0) {
      return {
        averageResponseTime: 0,
        totalLeads: 0,
      };
    }

    const totalResponseTime = leads.reduce((sum, lead) => sum + lead.firstResponseTime, 0);
    const averageResponseTime = totalResponseTime / leads.length;

    return {
      averageResponseTime,
      totalLeads: leads.length,
    };
  } catch (err) {
    logError("Failed to calculate response time", err, { dealerId });
    throw err;
  }
};

// =============================
// 📊 GET LEAD PIPELINE
// =============================

export const getLeadPipeline = async (dealerId) => {
  try {
    const pipeline = await Lead.getLeadPipeline(dealerId);
    return pipeline;
  } catch (err) {
    logError("Failed to get lead pipeline", err, { dealerId });
    throw err;
  }
};

// =============================
// 📈 GET LEAD ANALYTICS
// =============================

export const getLeadAnalytics = async (dealerId, startDate, endDate) => {
  try {
    const matchQuery = {
      dealer: dealerId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    // Total leads by source
    const leadsBySource = await aggregate("leads", [{ $match: matchQuery },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },]);

    // Total leads by stage
    const leadsByStage = await aggregate("leads", [{ $match: matchQuery },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },]);

    // Conversion metrics
    const conversionMetrics = await calculateConversionRate(dealerId, startDate, endDate);

    // Response time metrics
    const responseTimeMetrics = await calculateResponseTime(dealerId, startDate, endDate);

    // Hot leads
    const hotLeadsCount = await count("leads", {
      ...matchQuery,
      isHot: true,
    });

    return {
      leadsBySource,
      leadsByStage,
      conversionMetrics,
      responseTimeMetrics,
      hotLeadsCount,
    };
  } catch (err) {
    logError("Failed to get lead analytics", err, { dealerId });
    throw err;
  }
};

// =============================
// 🔄 FIND OR CREATE LEAD FROM CHAT
// =============================

export const findOrCreateLeadFromChat = async (chatId) => {
  try {
    const chat = await findById("chats", chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Fixed (Phase 4, seller/dealer workflow hardening): this was a
    // real, confirmed, severe bug, not just a missing-enrichment
    // cosmetic gap like the other TODOs in this file. chat.car was
    // treated as if it were a populated object (chat.car?.dealer,
    // chat.car?._id), but the .populate("car") call was commented out
    // - chat.car is actually a bare UUID string, which has no .dealer
    // or ._id property, so dealerId was ALWAYS undefined and this
    // function ALWAYS threw "Invalid chat participants". This directly
    // broke the inquiry-to-lead pipeline named in this phase's own
    // seller/dealer flows (a buyer's chat inquiry is supposed to
    // create a lead here). Fixed by fetching the car separately, per
    // the TODO's own suggestion, and using its real dealer/id fields.
    const car = chat.car ? await findById("cars", chat.car) : null;
    const buyerId = chat.participants.find((p) => p.toString() !== car?.dealer?.toString());
    const dealerId = car?.dealer;
    const vehicleId = car?.id;

    if (!buyerId || !dealerId) {
      throw new Error("Invalid chat participants");
    }

    return await createLead(buyerId, dealerId, vehicleId, "chat", chatId);
  } catch (err) {
    logError("Failed to find or create lead from chat", err, { chatId });
    throw err;
  }
};

// =============================
// 🔄 FIND OR CREATE LEAD FROM AUCTION
// =============================

export const findOrCreateLeadFromAuction = async (auctionId, buyerId) => {
  try {
    // Note (Phase 4): this find/populate comment previously looked
    // like the same class of bug as the chat/escrow cases above, but
    // checked directly and confirmed it isn't - auction.carId below is
    // already used as a plain ID (never treated as a populated
    // object), and the real vehicle is correctly fetched separately
    // right after. No fix needed here; the misleading stale comment
    // is removed rather than left implying a problem that isn't real.
    // (Separately, and not fixed here: this "auctions" table doesn't
    // exist in the real, authoritative schema per
    // docs/PHASE8.md/phase-05-schema-correction.md - auction state is
    // denormalized onto cars. That's a distinct, already-tracked issue
    // from a different phase, not this comment-cleanup.)
    const auction = await findById("auctions", auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    const vehicle = await findById("cars", auction.carId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const dealerId = vehicle.dealer;

    return await createLead(buyerId, dealerId, vehicle.id, "auction", auctionId);
  } catch (err) {
    logError("Failed to find or create lead from auction", err, { auctionId });
    throw err;
  }
};

// =============================
// 🔄 FIND OR CREATE LEAD FROM ESCROW
// =============================

export const findOrCreateLeadFromEscrow = async (escrowId) => {
  try {
    const escrow = await findById("escrows", escrowId);
    if (!escrow) {
      throw new Error("Escrow not found");
    }

    const buyerId = escrow.buyer;
    const dealerId = escrow.seller;
    // Fixed (Phase 4): escrow.car is already the plain vehicle ID
    // (confirmed against the real escrows table schema - a UUID
    // foreign key, not an embedded object), so no separate query is
    // actually needed here, unlike the chat case above. The previous
    // `escrow.car?._id` treated it as a populated object it never was
    // - ._id on a bare UUID string is always undefined, meaning every
    // lead created from an escrow silently had no vehicle reference at
    // all. Fixed by using the ID directly.
    const vehicleId = escrow.car;

    const lead = await createLead(buyerId, dealerId, vehicleId, "chat", null);

    // Update lead stage to escrow_started
    await updateLeadStage(lead.id, "escrow_started", dealerId);

    return lead;
  } catch (err) {
    logError("Failed to find or create lead from escrow", err, { escrowId });
    throw err;
  }
};

export default {
  createLead,
  updateLeadStage,
  addLeadActivity,
  getDealerLeads,
  getLeadById,
  archiveLead,
  markLeadAsHot,
  calculateConversionRate,
  calculateResponseTime,
  getLeadPipeline,
  getLeadAnalytics,
  findOrCreateLeadFromChat,
  findOrCreateLeadFromAuction,
  findOrCreateLeadFromEscrow,
};
