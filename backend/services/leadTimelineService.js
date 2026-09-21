// KAYAD canonical lead timeline service.
// Persistence is exclusively through the Supabase DB adapter.
import { logInfo, logError } from "../utils/logger.js";
import { findAll, findById, update, create } from "../db/index.js";

export const getLeadTimeline = async (leadId) => {
  try {
    return await findAll("lead_activities", { filters: { lead: leadId }, orderBy: "createdAt", ascending: false, limit: 500 });
  } catch (err) {
    logError("Failed to get lead timeline", err, { leadId });
    throw err;
  }
};

export const addTimelineEvent = async (leadId, type, actorId, actorType, description, metadata = {}) => {
  try {
    const activity = await create("lead_activities", {
      lead: leadId, type, actor: actorId || null, actorType: actorType || "system",
      description, metadata,
    });
    await update("leads", leadId, { lastActivityAt: new Date().toISOString() });
    logInfo("Timeline event added", { leadId, type, actorId });
    return activity;
  } catch (err) {
    logError("Failed to add timeline event", err, { leadId, type });
    throw err;
  }
};

export const getLeadHistory = async (leadId) => {
  const lead = await findById("leads", leadId);
  if (!lead) throw new Error("Lead not found");
  const timeline = await getLeadTimeline(leadId);
  return {
    currentStage: lead.stage,
    stageHistory: timeline.filter((a) => a.type === "stage_changed").map((a) => ({
      stage: a.metadata?.newStage,
      previousStage: a.metadata?.oldStage,
      changedAt: a.createdAt,
      changedBy: a.actor,
    })),
    createdAt: lead.createdAt,
    convertedAt: lead.convertedAt,
    lostAt: lead.lostAt,
  };
};

export const getActivitySummary = async (leadId) => {
  const activities = await getLeadTimeline(leadId);
  const summary = { totalActivities: activities.length, byType: {}, byActor: {} };
  for (const activity of activities) {
    summary.byType[activity.type] = (summary.byType[activity.type] || 0) + 1;
    const actor = String(activity.actor || "system");
    summary.byActor[actor] = (summary.byActor[actor] || 0) + 1;
  }
  return summary;
};

export default { getLeadTimeline, addTimelineEvent, getLeadHistory, getActivitySummary };
