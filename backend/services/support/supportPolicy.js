// Single source of truth for support-case vocabulary, lifecycle and limits.
// Mirrored by the SQL functions in 20261009150000_support_resolution_hardening.sql (which enforce it atomically).

export const SUPPORT_CATEGORIES = Object.freeze([
  { value: "marketplace", label: "Buying or listing a vehicle", reference: "vehicle" },
  { value: "seller", label: "Selling or my listings", reference: "vehicle" },
  { value: "auction", label: "Auctions and bidding", reference: "auction" },
  { value: "inspection", label: "Inspections", reference: "inspection" },
  { value: "service_provider", label: "Automotive service providers", reference: "inspection" },
  { value: "escrow", label: "Escrow and payment protection", reference: "escrow" },
  { value: "financing", label: "Financing", reference: null },
  { value: "transfer", label: "Ownership transfer", reference: "vehicle" },
  { value: "account", label: "My account and verification", reference: null },
  { value: "technical", label: "Something is not working", reference: null },
  { value: "general", label: "Something else", reference: null },
]);

export const SUPPORT_CATEGORY_VALUES = new Set(SUPPORT_CATEGORIES.map((c) => c.value));
export const SUPPORT_REFERENCE_KINDS = Object.freeze(["vehicle", "escrow", "payment", "inspection", "auction"]);
export const SUPPORT_STATUSES = Object.freeze(["open", "in_progress", "waiting_on_user", "waiting_on_internal", "escalated", "resolved", "closed"]);
export const SUPPORT_PRIORITIES = Object.freeze(["low", "medium", "high", "urgent"]);

export const SUPPORT_LIMITS = Object.freeze({ subject: 200, description: 5000, message: 5000, comment: 1000, resolutionNote: 2000, idempotencyKey: 100 });

const TRANSITIONS = {
  open: ["in_progress", "waiting_on_user", "waiting_on_internal", "escalated", "resolved"],
  in_progress: ["waiting_on_user", "waiting_on_internal", "escalated", "resolved"],
  waiting_on_user: ["in_progress", "waiting_on_internal", "escalated", "resolved"],
  waiting_on_internal: ["in_progress", "waiting_on_user", "escalated", "resolved"],
  escalated: ["in_progress", "waiting_on_user", "waiting_on_internal", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export const isTransitionAllowed = (from, to) => (TRANSITIONS[from] || []).includes(to);

export const reopenWindowDays = () => {
  const n = Number(process.env.SUPPORT_REOPEN_WINDOW_DAYS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 14;
};

// SLA targets exist only when operations configured them. Unset => KAYAD makes no timing promise.
const positiveMinutes = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};
export const slaConfig = () => ({
  firstResponseMinutes: positiveMinutes(process.env.SUPPORT_SLA_FIRST_RESPONSE_MINUTES),
  resolutionMinutes: positiveMinutes(process.env.SUPPORT_SLA_RESOLUTION_MINUTES),
});
export const buildSlaTargets = (now = new Date()) => {
  const cfg = slaConfig();
  const out = {};
  if (cfg.firstResponseMinutes) out.firstResponseTarget = new Date(now.getTime() + cfg.firstResponseMinutes * 60000).toISOString();
  if (cfg.resolutionMinutes) out.resolutionTarget = new Date(now.getTime() + cfg.resolutionMinutes * 60000).toISOString();
  return out;
};

export class SupportError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const clean = (v) => (typeof v === "string" ? v.replace(/\u0000/g, "").trim() : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === "string" && UUID.test(v);

export function validateCreateInput(body = {}) {
  const category = clean(body.category) || "general";
  if (!SUPPORT_CATEGORY_VALUES.has(category)) throw new SupportError(400, "SUPPORT_CATEGORY_INVALID", "Choose one of the listed topics.");
  const subject = clean(body.subject);
  const description = clean(body.description);
  if (subject.length < 3) throw new SupportError(400, "SUPPORT_SUBJECT_REQUIRED", "Add a short subject (at least 3 characters).");
  if (subject.length > SUPPORT_LIMITS.subject) throw new SupportError(400, "SUPPORT_SUBJECT_TOO_LONG", `Subject must be ${SUPPORT_LIMITS.subject} characters or fewer.`);
  if (description.length < 10) throw new SupportError(400, "SUPPORT_DESCRIPTION_REQUIRED", "Describe the issue in at least 10 characters.");
  if (description.length > SUPPORT_LIMITS.description) throw new SupportError(400, "SUPPORT_DESCRIPTION_TOO_LONG", `Description must be ${SUPPORT_LIMITS.description} characters or fewer.`);
  if (Array.isArray(body.attachments) && body.attachments.length) throw new SupportError(400, "SUPPORT_ATTACHMENTS_UNSUPPORTED", "Attachments are not supported yet. Describe the issue in text.");
  const reference = body.reference && typeof body.reference === "object" ? body.reference : null;
  let ref = null;
  if (reference && (reference.id || reference.kind)) {
    const kind = clean(reference.kind);
    const id = clean(String(reference.id ?? ""));
    if (!SUPPORT_REFERENCE_KINDS.includes(kind) || !id || id.length > 64) throw new SupportError(400, "SUPPORT_REFERENCE_INVALID", "The reference you entered is not valid.");
    ref = { kind, id };
  }
  const key = body.idempotencyKey == null ? null : clean(String(body.idempotencyKey));
  if (key && (key.length > SUPPORT_LIMITS.idempotencyKey || !/^[A-Za-z0-9_.:-]+$/.test(key))) throw new SupportError(400, "SUPPORT_IDEMPOTENCY_INVALID", "Invalid request key.");
  // priority, status, assignment, sla and any staff field from a customer body are deliberately ignored.
  return { category, subject, description, reference: ref, idempotencyKey: key || null };
}

export function validateMessageInput(body = {}) {
  const content = clean(body.content);
  if (!content) throw new SupportError(400, "SUPPORT_MESSAGE_EMPTY", "Write a message first.");
  if (content.length > SUPPORT_LIMITS.message) throw new SupportError(400, "SUPPORT_MESSAGE_TOO_LONG", `Messages must be ${SUPPORT_LIMITS.message} characters or fewer.`);
  if (Array.isArray(body.attachments) && body.attachments.length) throw new SupportError(400, "SUPPORT_ATTACHMENTS_UNSUPPORTED", "Attachments are not supported yet.");
  return { content, isInternal: body.isInternal === true || body.isInternal === "true" };
}

export function validateRatingInput(body = {}) {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new SupportError(400, "SUPPORT_RATING_INVALID", "Rating must be a whole number from 1 to 5.");
  const comment = clean(body.comment ?? "").slice(0, SUPPORT_LIMITS.comment);
  return { rating, comment: comment || null };
}

export function validateStaffUpdate(body = {}) {
  const out = {};
  if (body.status !== undefined) {
    if (!SUPPORT_STATUSES.includes(body.status)) throw new SupportError(400, "SUPPORT_STATUS_INVALID", "Invalid case status.");
    out.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!SUPPORT_PRIORITIES.includes(body.priority)) throw new SupportError(400, "SUPPORT_PRIORITY_INVALID", "Invalid case priority.");
    out.priority = body.priority;
  }
  for (const f of ["assignedTo", "escalatedTo"]) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== "") {
      if (!isUuid(String(body[f]))) throw new SupportError(400, "SUPPORT_ASSIGNEE_INVALID", "Invalid staff member.");
      out[f] = String(body[f]);
    }
  }
  if (body.assignedTo === null) out.clearAssignee = true;
  const note = clean(body.resolutionNote ?? body.resolutionNotes ?? "");
  if (note.length > SUPPORT_LIMITS.resolutionNote) throw new SupportError(400, "SUPPORT_RESOLUTION_NOTE_TOO_LONG", "Resolution note is too long.");
  if (note) out.resolutionNote = note;
  if (body.expectedVersion !== undefined && body.expectedVersion !== null) {
    const v = Number(body.expectedVersion);
    if (!Number.isInteger(v) || v < 1) throw new SupportError(400, "SUPPORT_VERSION_INVALID", "Invalid case version.");
    out.expectedVersion = v;
  }
  if (out.status === "resolved" && !out.resolutionNote) throw new SupportError(400, "SUPPORT_RESOLUTION_NOTE_REQUIRED", "Add a resolution note before resolving.");
  if (!Object.keys(out).length) throw new SupportError(400, "SUPPORT_UPDATE_EMPTY", "Nothing to update.");
  return out;
}

export function validateOversightReason(raw) {
  const why = clean(typeof raw === "string" ? raw : "");
  if (why.length < 10) throw new SupportError(400, "SUPPORT_REASON_REQUIRED", "State why you need to view this case (at least 10 characters). The reason is recorded in the audit log.");
  if (why.length > 300) throw new SupportError(400, "SUPPORT_REASON_TOO_LONG", "Keep the reason under 300 characters.");
  return why;
}

const DB_ERROR_MAP = {
  SUPPORT_TICKET_NOT_FOUND: [404, "Case not found."],
  SUPPORT_TICKET_CLOSED: [409, "This case is closed. Open a new case if you still need help."],
  SUPPORT_REOPEN_WINDOW_EXPIRED: [409, "This case was resolved too long ago to reply. Open a new case."],
  SUPPORT_INTERNAL_FORBIDDEN: [403, "Not allowed."],
  SUPPORT_TRANSITION_INVALID: [409, "That status change is not allowed from the current status."],
  SUPPORT_RESOLUTION_NOTE_REQUIRED: [400, "Add a resolution note before resolving."],
  SUPPORT_ASSIGNEE_INVALID: [400, "Choose an active support staff member."],
  SUPPORT_VERSION_CONFLICT: [409, "This case changed while you were editing. Reload and try again."],
  SUPPORT_RATING_INVALID: [400, "Rating must be a whole number from 1 to 5."],
  SUPPORT_RATING_NOT_ALLOWED: [409, "You can rate a case once it is resolved."],
  SUPPORT_ALREADY_RATED: [409, "You have already rated this case."],
  SUPPORT_MESSAGE_EMPTY: [400, "Write a message first."],
  SUPPORT_MESSAGE_TOO_LONG: [400, "Message is too long."],
  SUPPORT_PRIORITY_INVALID: [400, "Invalid case priority."],
  SUPPORT_STATUS_INVALID: [400, "Invalid case status."],
  SUPPORT_CASE_INVALID: [400, "Subject and description are required."],
  SUPPORT_CATEGORY_INVALID: [400, "Choose one of the listed topics."],
  SUPPORT_CASE_TOO_LONG: [400, "Subject or description is too long."],
};

export function mapDbError(error) {
  const text = String(error?.message || "");
  for (const code of Object.keys(DB_ERROR_MAP)) {
    if (text.includes(code)) return new SupportError(DB_ERROR_MAP[code][0], code, DB_ERROR_MAP[code][1]);
  }
  return null;
}
