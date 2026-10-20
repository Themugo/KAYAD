// Stage 5F.10 — thin application wrapper over the ONLY writers of private-seller auction proposal state:
// kayad_psap_create / kayad_psap_apply_event / kayad_vcc_apply (SECURITY DEFINER, service_role only).
// The route decides which capacity the caller is *claiming* (seller / provider / admin) from the mounted
// endpoint; the database independently verifies that the authenticated user actually holds that capacity.
// Nothing here trusts a client-supplied role, user id, or state.
import { getSupabase } from "../utils/supabase.js";
import { findAll, findById } from "../db/index.js";
import { evaluatePrivateSellerAuctionEligibility } from "./privateSellerAuctionEligibility.service.js";

export const SELLER_EVENTS = Object.freeze(["evidence_submitted", "proposal_submitted", "proposal_withdrawn", "inspection_assigned", "reinspection_requested", "appeal_submitted"]);
export const PROVIDER_EVENTS = Object.freeze(["inspection_result", "custody_received", "custody_refused", "custody_incident", "vehicle_released"]);
export const ADMIN_EVENTS = Object.freeze(["authority_verified", "custody_assigned", "custody_incident", "custody_hold_released", "admin_decision", "appeal_decision", "release_authorized", "inspection_expired"]);
const EVENTS_BY_ROLE = { seller: SELLER_EVENTS, provider: PROVIDER_EVENTS, admin: ADMIN_EVENTS };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEM_RE = /^[A-Za-z0-9._:-]{8,128}$/;

// Database exception tag -> HTTP status. Unknown tags are never echoed back verbatim as 200s.
const STATUS_BY_TAG = {
  NOT_A_ADMIN: 403, NOT_AN_ADMIN: 403, NOT_THE_SELLER: 403, NOT_PROPOSAL_SELLER: 403, NOT_VEHICLE_OWNER: 403, NOT_A_PRIVATE_SELLER: 403, NOT_AUTHORIZED: 403, NOT_PROVIDER_REPRESENTATIVE: 403, NOT_ASSIGNED_PROVIDER: 403, NOT_ASSIGNED_CUSTODY_PARTNER: 403, NOT_ASSIGNED_INSPECTION_PROVIDER: 403,
  FORBIDDEN_EVENT_FOR_ROLE: 403, SELF_REVIEW_FORBIDDEN: 403,
  VEHICLE_NOT_FOUND: 404, PROPOSAL_NOT_FOUND: 404,
  INVALID_TRANSITION: 409, BOOKING_ALREADY_USED: 409, EVIDENCE_LOCKED: 409, PROPOSAL_ALREADY_OPEN: 409, PAYMENT_NOT_CONFIRMED: 409,
};

export function mapDbError(err) {
  const msg = String(err?.message || "");
  const tag = Object.keys(STATUS_BY_TAG).find((t) => msg.includes(t));
  const status = tag ? STATUS_BY_TAG[tag] : (err?.code === "42501" ? 403 : (/^[A-Z_]{4,}$/.test(msg.trim()) ? 422 : 500));
  return Object.assign(new Error(status === 500 ? "Request could not be completed" : msg.trim()), { status, code: tag || (status === 500 ? "INTERNAL" : msg.trim()), cause: err });
}

export function requireIdempotencyKey(req) {
  const key = String(req.get?.("Idempotency-Key") || req.headers?.["idempotency-key"] || "").trim();
  if (!IDEM_RE.test(key)) throw Object.assign(new Error("A valid Idempotency-Key header (8-128 chars) is required"), { status: 400, code: "IDEMPOTENCY_KEY_REQUIRED" });
  return key;
}

export async function createProposal({ carId, sellerUserId, idem }) {
  if (!UUID_RE.test(String(carId))) throw Object.assign(new Error("Invalid vehicle"), { status: 400, code: "INVALID_VEHICLE" });
  const { data, error } = await getSupabase().rpc("kayad_psap_create", { p_car_id: carId, p_seller_user_id: sellerUserId, p_idem: idem });
  if (error) throw mapDbError(error);
  return data;
}

export async function applyEvent({ proposalId, event, actorUserId, actorRole, payload = {}, idem }) {
  if (!EVENTS_BY_ROLE[actorRole]) throw Object.assign(new Error("Unknown actor capacity"), { status: 403, code: "FORBIDDEN_EVENT_FOR_ROLE" });
  if (!EVENTS_BY_ROLE[actorRole].includes(event)) throw Object.assign(new Error("This action is not available to this role"), { status: 403, code: "FORBIDDEN_EVENT_FOR_ROLE" });
  if (!UUID_RE.test(String(proposalId))) throw Object.assign(new Error("Invalid proposal"), { status: 400, code: "INVALID_PROPOSAL" });
  const safePayload = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const { data, error } = await getSupabase().rpc("kayad_psap_apply_event", {
    p_proposal_id: proposalId, p_event: event, p_actor_user_id: actorUserId, p_actor_role: actorRole, p_payload: safePayload, p_idem: idem,
  });
  if (error) throw mapDbError(error);
  return data;
}

export async function applyCapabilityAction({ providerId, providerKind, action, actorUserId, actorRole, payload = {} }) {
  if (!UUID_RE.test(String(providerId))) throw Object.assign(new Error("Invalid partner"), { status: 400, code: "INVALID_PARTNER" });
  if (!["garage", "dealer"].includes(providerKind)) throw Object.assign(new Error("Only garages and dealers can hold vehicles"), { status: 422, code: "INVALID_PARTNER_KIND" });
  if (!["request", "approve", "suspend", "revoke"].includes(action)) throw Object.assign(new Error("Unknown capability action"), { status: 400, code: "INVALID_ACTION" });
  if (action === "request" && actorRole !== "provider") throw Object.assign(new Error("Only the partner can request custody capability"), { status: 403, code: "FORBIDDEN_EVENT_FOR_ROLE" });
  if (action !== "request" && actorRole !== "admin") throw Object.assign(new Error("Only an administrator can change custody capability"), { status: 403, code: "FORBIDDEN_EVENT_FOR_ROLE" });
  const { data, error } = await getSupabase().rpc("kayad_vcc_apply", {
    p_provider_id: providerId, p_provider_kind: providerKind, p_action: action, p_actor_user_id: actorUserId, p_actor_role: actorRole, p_payload: payload && typeof payload === "object" ? payload : {},
  });
  if (error) throw mapDbError(error);
  return data;
}

const hide = (p) => p; // proposal rows hold no secrets; RLS/field-level exposure is decided by the route (seller sees own only).

export async function listSellerProposals(sellerUserId) {
  const rows = await findAll("private_seller_auction_proposals", { filters: { seller_user_id: sellerUserId }, limit: 100 });
  return rows.map(hide);
}

export async function getSellerProposalDetail({ proposalId, sellerUserId }) {
  const p = await findById("private_seller_auction_proposals", proposalId);
  if (!p || String(p.seller_user_id) !== String(sellerUserId)) return null; // 404, not 403: do not reveal other sellers' cases
  const events = await findAll("private_seller_auction_evidence_events", { filters: { proposal_id: p.id }, limit: 200 });
  const eligibility = await evaluatePrivateSellerAuctionEligibility(p.car_id);
  return { proposal: hide(p), events, eligibility: { eligible: eligibility.eligible, blockers: eligibility.blockers } };
}

export async function listProviderProposals(userId) {
  const { data, error } = await getSupabase().rpc("kayad_psap_provider_ids", { p_user: userId });
  if (error) throw mapDbError(error);
  const ids = Array.isArray(data) ? data : [];
  if (!ids.length) return [];
  const out = [];
  for (const id of ids) {
    out.push(...(await findAll("private_seller_auction_proposals", { filters: { inspection_provider_id: id }, limit: 100 })));
    out.push(...(await findAll("private_seller_auction_proposals", { filters: { assigned_provider_id: id }, limit: 100 })));
  }
  const seen = new Set();
  return out.filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
}

export async function listAdminQueue({ status } = {}) {
  const filters = status ? { proposal_status: status } : {};
  return findAll("private_seller_auction_proposals", { filters, limit: 200 });
}

export async function getAdminProposalDetail(proposalId) {
  const p = await findById("private_seller_auction_proposals", proposalId);
  if (!p) return null;
  const events = await findAll("private_seller_auction_evidence_events", { filters: { proposal_id: p.id }, limit: 500 });
  const eligibility = await evaluatePrivateSellerAuctionEligibility(p.car_id);
  return { proposal: p, events, eligibility };
}
