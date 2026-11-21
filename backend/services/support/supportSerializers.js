// Projections. The customer projection is an allow-list: anything not named here never leaves the server.
// Internal notes, staff identities/emails, escalation targets, SLA internals and resolution authorship are staff-only.
import { slaConfig } from "./supportPolicy.js";

export const CUSTOMER_LIST_COLUMNS = "id,ticket_number,category,subject,status,created_at,updated_at,resolved_at,satisfaction_rating,message_count";
export const CUSTOMER_DETAIL_COLUMNS = "id,user_id,ticket_number,category,subject,description,status,messages,related_escrow,related_car,related_payment,related_inspection,related_auction,satisfaction_rating,satisfaction_comment,created_at,updated_at,resolved_at,closed_at";
export const STAFF_LIST_COLUMNS = "id,user_id,ticket_number,category,priority,subject,status,assigned_to,escalated_to,first_response_at,resolved_at,message_count,row_version,sla,created_at,updated_at,last_customer_message_at,last_staff_message_at,satisfaction_rating";
export const STAFF_DETAIL_COLUMNS = "*";

// Messages written before the hardening migration carry no senderKind: they are the customer's when the sender is the
// case owner (or the recorded role is a customer role), otherwise staff.
const CUSTOMER_ROLES = new Set(["user", "customer", "buyer", "dealer", "individual_seller", "broker"]);
export const messageKind = (m, ownerId) => {
  if (m?.senderKind === "customer" || m?.senderKind === "staff") return m.senderKind;
  if (ownerId && m?.sender && String(m.sender) === String(ownerId)) return "customer";
  return CUSTOMER_ROLES.has(String(m?.senderRole || "").toLowerCase()) ? "customer" : "staff";
};

const publicMessages = (messages, ownerId) =>
  (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.isInternal !== true)
    .map((m) => ({
      id: m.id || null,
      from: messageKind(m, ownerId) === "staff" ? "support" : "you",
      content: String(m.content ?? ""),
      createdAt: m.createdAt || null,
    }));

const references = (t) => {
  const refs = [];
  if (t.related_car) refs.push({ kind: "vehicle", id: t.related_car });
  if (t.related_escrow) refs.push({ kind: "escrow", id: t.related_escrow });
  if (t.related_payment) refs.push({ kind: "payment", id: t.related_payment });
  if (t.related_inspection) refs.push({ kind: "inspection", id: t.related_inspection });
  if (t.related_auction) refs.push({ kind: "auction", id: t.related_auction });
  return refs;
};

export function customerListItem(t) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    category: t.category,
    subject: t.subject,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    resolvedAt: t.resolved_at || null,
    rated: t.satisfaction_rating != null,
    messageCount: Number(t.message_count || 0),
  };
}

const withinReopenWindow = (t, days) => {
  if (t.status !== "resolved") return true;
  if (!t.resolved_at) return true;
  return Date.now() - new Date(t.resolved_at).getTime() <= Math.max(Number(days) || 0, 0) * 86400000;
};

export function customerDetail(t, { reopenWindowDays = 14 } = {}) {
  const cfg = slaConfig();
  const resolved = t.status === "resolved" || t.status === "closed";
  return {
    ...customerListItem(t),
    description: t.description,
    references: references(t),
    messages: publicMessages(t.messages, t.user_id),
    rating: t.satisfaction_rating ?? null,
    ratingComment: t.satisfaction_comment ?? null,
    // Mirrors the database rule: closed never accepts replies; resolved only inside the reopen window.
    canReply: t.status !== "closed" && withinReopenWindow(t, reopenWindowDays),
    reopenWindowDays: t.status === "resolved" ? reopenWindowDays : null,
    canRate: resolved && t.satisfaction_rating == null,
    // Timing is only stated when operations configured a target; otherwise no promise is made.
    expectations: {
      firstResponseMinutes: cfg.firstResponseMinutes,
      resolutionMinutes: cfg.resolutionMinutes,
    },
  };
}

const staffPerson = (users, id) => {
  if (!id) return null;
  const u = users?.get?.(String(id));
  return u ? { id: u.id, name: u.name || null, role: u.role || null } : { id, name: null, role: null };
};

export function staffListItem(t, users) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    category: t.category,
    priority: t.priority,
    subject: t.subject,
    status: t.status,
    customer: staffPerson(users, t.user_id),
    assignedTo: staffPerson(users, t.assigned_to),
    escalatedTo: staffPerson(users, t.escalated_to),
    firstResponseAt: t.first_response_at || null,
    resolvedAt: t.resolved_at || null,
    messageCount: Number(t.message_count || 0),
    rowVersion: t.row_version,
    sla: t.sla || {},
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    awaitingStaff: t.status !== "resolved" && t.status !== "closed" && (!t.last_staff_message_at || (t.last_customer_message_at && t.last_customer_message_at > t.last_staff_message_at)),
  };
}

export function staffDetail(t, users, { redactInternal = false } = {}) {
  return {
    ...staffListItem(t, users),
    description: t.description,
    references: references(t),
    readOnly: redactInternal,
    messages: (Array.isArray(t.messages) ? t.messages : []).filter((m) => !(redactInternal && m?.isInternal === true)).map((m) => ({
      id: m.id || null,
      kind: messageKind(m, t.user_id),
      internal: m.isInternal === true,
      senderName: staffPerson(users, m.sender)?.name || null,
      content: String(m.content ?? ""),
      createdAt: m.createdAt || null,
    })),
    resolutionNote: redactInternal ? null : t.resolution_notes || null,
    rating: t.satisfaction_rating ?? null,
    ratingComment: t.satisfaction_comment ?? null,
    reopenCount: t.reopen_count || 0,
  };
}
