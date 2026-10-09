import { logError } from "../infrastructure/logging/index.js";
import { SupportError } from "../services/support/supportPolicy.js";
import * as svc from "../services/support/supportCase.service.js";
import { SUPPORT_CATEGORIES, reopenWindowDays } from "../services/support/supportPolicy.js";

const wrap = (fn, failure) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof SupportError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    logError(`Support: ${failure}`, { message: error?.message, code: error?.code });
    res.status(500).json({ success: false, message: failure });
  }
};

// ---- customer ----
export const getSupportConfig = wrap(async (_req, res) => {
  res.json({ success: true, categories: SUPPORT_CATEGORIES, reopenWindowDays: reopenWindowDays(), attachments: false });
}, "Failed to load support options");

export const createTicket = wrap(async (req, res) => {
  const out = await svc.createCase(req.user, { ...(req.body || {}), idempotencyKey: req.body?.idempotencyKey ?? req.get("Idempotency-Key") });
  res.status(out.deduplicated ? 200 : 201).json({ success: true, ...out, ticket: out.case });
}, "Failed to create support case");

export const getUserTickets = wrap(async (req, res) => {
  const out = await svc.listOwnCases(req.user, req.query);
  res.json({ success: true, ...out, tickets: out.cases });
}, "Failed to load your support cases");

export const getTicket = wrap(async (req, res) => {
  const c = await svc.getOwnCase(req.user, req.params.id);
  res.json({ success: true, case: c, ticket: c });
}, "Failed to load support case");

export const addMessage = wrap(async (req, res) => {
  const out = await svc.customerReply(req.user, req.params.id, req.body);
  res.json({ success: true, ...out, ticket: out.case });
}, "Failed to send message");

export const rateTicket = wrap(async (req, res) => {
  const out = await svc.rateCase(req.user, req.params.id, req.body);
  res.json({ success: true, ...out, ticket: out.case });
}, "Failed to save rating");

// ---- staff ----
export const staffQueue = wrap(async (req, res) => {
  const out = await svc.listQueue(req.query);
  res.json({ success: true, ...out, tickets: out.cases, capability: req.supportCapability });
}, "Failed to load the support queue");

export const staffMetrics = wrap(async (req, res) => {
  res.json({ success: true, metrics: await svc.supportMetrics({ days: req.query.days }) });
}, "Failed to load support metrics");

export const staffTeam = wrap(async (_req, res) => {
  res.json({ success: true, staff: await svc.listAssignableStaff() });
}, "Failed to load support staff");

export const staffGetCase = wrap(async (req, res) => {
  const c = await svc.getStaffCase(req.params.id, req.user, req.supportCapability, req.query.reason);
  res.json({ success: true, case: c, ticket: c, capability: req.supportCapability });
}, "Failed to load support case");

export const staffReply = wrap(async (req, res) => {
  const out = await svc.staffReply(req.user, req.params.id, req.body);
  res.json({ success: true, ...out, ticket: out.case });
}, "Failed to send reply");

export const staffUpdate = wrap(async (req, res) => {
  const out = await svc.staffUpdate(req.user, req.params.id, req.body);
  res.json({ success: true, ...out, ticket: out.case });
}, "Failed to update support case");

// Legacy aliases (kept so existing callers do not break); same service, same authorization.
export const getAllTickets = staffQueue;
export const getSupportAnalytics = staffMetrics;
export const updateTicketStatus = staffUpdate;
