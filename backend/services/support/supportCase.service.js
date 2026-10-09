// Canonical support-case service. Controllers stay thin; every write goes through an atomic kayad_support_* RPC.
import { getSupabase } from "../../utils/supabase.js";
import { logError } from "../../infrastructure/logging/index.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "../communicationEvents.service.js";
import {
  SupportError, mapDbError, validateCreateInput, validateMessageInput, validateRatingInput, validateStaffUpdate,
  buildSlaTargets, reopenWindowDays, slaConfig, SUPPORT_STATUSES, SUPPORT_PRIORITIES, SUPPORT_CATEGORY_VALUES, isUuid,
} from "./supportPolicy.js";
import { resolveReference, relatedForRpc } from "./supportReferences.js";
import {
  CUSTOMER_LIST_COLUMNS, CUSTOMER_DETAIL_COLUMNS, STAFF_LIST_COLUMNS, STAFF_DETAIL_COLUMNS,
  customerListItem, customerDetail, staffListItem, staffDetail,
} from "./supportSerializers.js";

const uid = (user) => String(user?.id || user?._id || "");
const notFound = () => new SupportError(404, "SUPPORT_TICKET_NOT_FOUND", "Case not found.");

async function rpc(name, args) {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) {
    const mapped = mapDbError(error);
    if (mapped) throw mapped;
    throw error;
  }
  return data;
}

async function loadTicket(id, columns) {
  if (!isUuid(id)) throw notFound();
  const { data, error } = await getSupabase().from("support_tickets").select(columns).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return data;
}

// Customer-owned lookup: a non-owner gets the same 404 as a missing case (no existence oracle).
async function loadOwned(id, userId, columns) {
  const t = await loadTicket(id, columns);
  if (String(t.user_id) !== String(userId)) throw notFound();
  return t;
}

async function userMap(ids) {
  const list = [...new Set(ids.filter(Boolean).map(String))];
  const map = new Map();
  if (!list.length) return map;
  const { data, error } = await getSupabase().from("users").select("id,name,role").in("id", list);
  if (error) throw error;
  for (const u of data || []) map.set(String(u.id), u);
  return map;
}

const notify = (args) => emitCommunication(args).catch((e) => logError("Support notification failed", { message: e?.message }));

// ---------------------------------------------------------------- customer
export async function createCase(user, body) {
  const input = validateCreateInput(body);
  const userId = uid(user);
  const { linked, columns } = await resolveReference(input.reference, userId);
  const result = await rpc("kayad_support_create_case", {
    p_user_id: userId,
    p_category: input.category,
    p_priority: "medium",
    p_subject: input.subject,
    p_description: input.description,
    p_related: relatedForRpc(columns),
    p_idempotency_key: input.idempotencyKey,
    p_sla: buildSlaTargets(),
  });
  if (!result?.deduplicated) {
    await notify({
      userId, eventType: COMMUNICATION_EVENTS.SUPPORT_CASE_CREATED, title: "Support case received",
      message: `We received your support case ${result.ticket_number}. You can follow it from Support in your account.`,
      channels: ["in_app", "email"], metadata: { idempotencyKey: `support-created:${result.id}`, ticketId: result.id },
    });
  }
  const t = await loadOwned(result.id, userId, CUSTOMER_DETAIL_COLUMNS);
  return { case: customerDetail(t), referenceLinked: linked, deduplicated: Boolean(result.deduplicated) };
}

export async function listOwnCases(user, { limit = 50, offset = 0 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const { data, error, count } = await getSupabase().from("support_tickets")
    .select(CUSTOMER_LIST_COLUMNS, { count: "exact" }).eq("user_id", uid(user))
    .order("created_at", { ascending: false }).range(off, off + lim - 1);
  if (error) throw error;
  return { cases: (data || []).map(customerListItem), total: count ?? (data || []).length };
}

export async function getOwnCase(user, id) {
  return customerDetail(await loadOwned(id, uid(user), CUSTOMER_DETAIL_COLUMNS));
}

export async function customerReply(user, id, body) {
  const { content } = validateMessageInput({ ...body, isInternal: false });
  const userId = uid(user);
  await loadOwned(id, userId, "id,user_id"); // ownership before any write
  const r = await rpc("kayad_support_append_message", {
    p_ticket_id: id, p_actor_id: userId, p_actor_kind: "customer", p_content: content,
    p_is_internal: false, p_reopen_window_days: reopenWindowDays(),
  });
  const t = await loadOwned(id, userId, CUSTOMER_DETAIL_COLUMNS);
  const assignee = await getSupabase().from("support_tickets").select("assigned_to,ticket_number").eq("id", id).maybeSingle();
  if (assignee?.data?.assigned_to) {
    await notify({
      userId: assignee.data.assigned_to, eventType: COMMUNICATION_EVENTS.SUPPORT_CASE_UPDATED, title: "Customer replied",
      message: `New customer reply on ${assignee.data.ticket_number}.`, channels: ["in_app"],
      metadata: { idempotencyKey: `support-customer-reply:${r.message.id}`, ticketId: id },
    });
  }
  return { case: customerDetail(t), reopened: Boolean(r.reopened) };
}

export async function rateCase(user, id, body) {
  const { rating, comment } = validateRatingInput(body);
  const userId = uid(user);
  await rpc("kayad_support_rate_case", { p_ticket_id: id, p_user_id: userId, p_rating: rating, p_comment: comment });
  return { case: customerDetail(await loadOwned(id, userId, CUSTOMER_DETAIL_COLUMNS)) };
}

// ------------------------------------------------------------------- staff
export async function listQueue(query = {}) {
  const lim = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
  const off = Math.max(Number(query.offset) || 0, 0);
  let q = getSupabase().from("support_tickets").select(STAFF_LIST_COLUMNS, { count: "exact" });
  if (query.status) {
    if (query.status === "active") q = q.in("status", ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "escalated"]);
    else if (SUPPORT_STATUSES.includes(query.status)) q = q.eq("status", query.status);
    else throw new SupportError(400, "SUPPORT_STATUS_INVALID", "Invalid status filter.");
  }
  if (query.priority) {
    if (!SUPPORT_PRIORITIES.includes(query.priority)) throw new SupportError(400, "SUPPORT_PRIORITY_INVALID", "Invalid priority filter.");
    q = q.eq("priority", query.priority);
  }
  if (query.category) {
    if (!SUPPORT_CATEGORY_VALUES.has(query.category)) throw new SupportError(400, "SUPPORT_CATEGORY_INVALID", "Invalid category filter.");
    q = q.eq("category", query.category);
  }
  if (query.assignedTo === "unassigned") q = q.is("assigned_to", null);
  else if (query.assignedTo) {
    if (!isUuid(query.assignedTo)) throw new SupportError(400, "SUPPORT_ASSIGNEE_INVALID", "Invalid assignee filter.");
    q = q.eq("assigned_to", query.assignedTo);
  }
  if (query.q) {
    const term = String(query.q).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
    if (term) q = q.ilike("ticket_number", `%${term}%`);
  }
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(off, off + lim - 1);
  if (error) throw error;
  const rows = data || [];
  const users = await userMap(rows.flatMap((t) => [t.user_id, t.assigned_to, t.escalated_to]));
  return { cases: rows.map((t) => staffListItem(t, users)), total: count ?? rows.length, limit: lim, offset: off };
}

export async function getStaffCase(id) {
  const t = await loadTicket(id, STAFF_DETAIL_COLUMNS);
  const users = await userMap([t.user_id, t.assigned_to, t.escalated_to, ...(t.messages || []).map((m) => m?.sender)]);
  return staffDetail(t, users);
}

export async function staffReply(actor, id, body) {
  const { content, isInternal } = validateMessageInput(body);
  const before = await loadTicket(id, "id,user_id,ticket_number");
  const r = await rpc("kayad_support_append_message", {
    p_ticket_id: id, p_actor_id: uid(actor), p_actor_kind: "staff", p_content: content,
    p_is_internal: isInternal, p_reopen_window_days: reopenWindowDays(),
  });
  if (!isInternal) {
    await notify({
      userId: before.user_id, eventType: COMMUNICATION_EVENTS.SUPPORT_CASE_UPDATED, title: "New reply on your support case",
      message: `Support replied to your case ${before.ticket_number}. Open Support in your account to read it.`,
      channels: ["in_app", "email"], metadata: { idempotencyKey: `support-staff-reply:${r.message.id}`, ticketId: id },
    });
  }
  return { case: await getStaffCase(id) };
}

export async function staffUpdate(actor, id, body) {
  const u = validateStaffUpdate(body);
  const r = await rpc("kayad_support_update_case", {
    p_ticket_id: id, p_actor_id: uid(actor), p_expected_version: u.expectedVersion ?? null,
    p_status: u.status ?? null, p_priority: u.priority ?? null,
    p_assigned_to: u.assignedTo ?? null, p_escalated_to: u.escalatedTo ?? null,
    p_resolution_note: u.resolutionNote ?? null, p_clear_assignee: Boolean(u.clearAssignee),
  });
  if (u.status && r.status !== r.previousStatus && r.userId) {
    const label = { resolved: "marked as resolved", closed: "closed", in_progress: "being worked on", waiting_on_user: "waiting for your reply" }[r.status];
    if (label) {
      const t = await loadTicket(id, "ticket_number");
      await notify({
        userId: r.userId, eventType: COMMUNICATION_EVENTS.SUPPORT_CASE_UPDATED, title: "Support case update",
        message: `Your support case ${t.ticket_number} is ${label}.`, channels: ["in_app", "email"],
        metadata: { idempotencyKey: `support-status:${id}:${r.rowVersion}`, ticketId: id },
      });
    }
  }
  return { case: await getStaffCase(id) };
}

export async function supportMetrics({ days = 30 } = {}) {
  const d = Math.min(Math.max(Number(days) || 30, 1), 365);
  const cfg = slaConfig();
  const data = await rpc("kayad_support_metrics", {
    p_since: new Date(Date.now() - d * 86400000).toISOString(),
    p_first_target_minutes: cfg.firstResponseMinutes, p_resolution_target_minutes: cfg.resolutionMinutes,
  });
  return { ...data, windowDays: d, slaConfigured: Boolean(cfg.firstResponseMinutes || cfg.resolutionMinutes), targets: cfg };
}

export async function listAssignableStaff() {
  const { data, error } = await getSupabase().from("users").select("id,name,role")
    .in("role", ["technical_support", "admin", "superadmin"]).is("deleted_at", null).limit(100);
  if (error) throw error;
  return (data || []).map((u) => ({ id: u.id, name: u.name, role: u.role }));
}
