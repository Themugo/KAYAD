// Projections. The customer projection is an allow-list: anything not named here never leaves the server.
// Internal notes, staff identities/emails, escalation targets, SLA internals and resolution authorship are staff-only.
import { slaConfig } from "./supportPolicy.js";

export const CUSTOMER_LIST_COLUMNS = "id,ticket_number,category,subject,status,created_at,updated_at,resolved_at,satisfaction_rating,message_count";
export const CUSTOMER_DETAIL_COLUMNS = "id,user_id,ticket_number,category,subject,description,status,messages,related_escrow,related_car,related_payment,related_inspection,related_auction,satisfaction_rating,satisfaction_comment,created_at,updated_at,resolved_at,closed_at";
export const STAFF_LIST_COLUMNS = "id,user_id,ticket_number,category,priority,subject,status,assigned_to,escalated_to,first_response_at,resolved_at,message_count,row_version,sla,created_at,updated_at,last_customer_message_at,last_staff_message_at,satisfaction_rating";
export const STAFF_DETAIL_COLUMNS = "*";

const publicMessages = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.isInternal !== true)
    .map((m) => ({
      id: m.id || null,
      from: m.senderKind === "staff" ? "support" : "you",
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

export function customerDetail(t) {
  const cfg = slaConfig();
  const resolved = t.status === "resolved" || t.status === "closed";
  return {
    ...customerListItem(t),
    description: t.description,
    references: references(t),
    messages: publicMessages(t.messages),
    rating: t.satisfaction_rating ?? null,
    ratingComment: t.satisfaction_comment ?? null,
    canReply: t.status !== "closed",
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

export function staffDetail(t, users) {
  return {
    ...staffListItem(t, users),
    description: t.description,
    references: references(t),
    messages: (Array.isArray(t.messages) ? t.messages : []).map((m) => ({
      id: m.id || null,
      kind: m.senderKind || (m.isInternal ? "staff" : "customer"),
      internal: m.isInternal === true,
      senderName: staffPerson(users, m.sender)?.name || null,
      content: String(m.content ?? ""),
      createdAt: m.createdAt || null,
    })),
    resolutionNote: t.resolution_notes || null,
    rating: t.satisfaction_rating ?? null,
    ratingComment: t.satisfaction_comment ?? null,
    reopenCount: t.reopen_count || 0,
  };
}
