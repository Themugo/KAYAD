import { findById } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { listLeadOffers, performOfferAction } from "../services/offerNegotiation.service.js";

const participant = (lead, userId) => [lead?.buyer, lead?.dealer].some((value) => String(value?.id || value?._id || value || "") === String(userId));

async function authorizedLead(req) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(req.params.leadId || ""))) throw Object.assign(new Error("Invalid lead reference"), { statusCode: 400 });
  const lead = await findById("leads", req.params.leadId);
  if (!lead) throw Object.assign(new Error("Lead not found"), { statusCode: 404 });
  if (!participant(lead, req.user?.id)) throw Object.assign(new Error("Not authorized for this negotiation"), { statusCode: 403 });
  return lead;
}

export async function getOffers(req, res) {
  const lead = await authorizedLead(req);
  const result = await listLeadOffers(lead.id);
  res.json({ success: true, ...result });
}

export async function submitOffer(req, res) {
  const lead = await authorizedLead(req);
  const result = await performOfferAction({ leadId: lead.id, actorId: req.user.id, action: "submit", ...req.body });
  res.status(result?.replayed ? 200 : 201).json({ success: true, ...result });
}

export async function respondToOffer(req, res) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(req.params.offerId || ""))) throw Object.assign(new Error("Invalid offer reference"), { statusCode: 400 });
  const lead = await authorizedLead(req);
  const result = await performOfferAction({ leadId: lead.id, actorId: req.user.id, offerId: req.params.offerId, ...req.body });
  res.json({ success: true, ...result });
}


// Buyer-scoped negotiation inbox. Returns only the buyer's own canonical leads.
export async function getBuyerNegotiations(req, res) {
  const buyerId = String(req.user?.id || "");
  if (!buyerId) throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  const { data, error } = await getSupabase().from("leads")
    .select("id,vehicle,dealer,stage,created_at")
    .eq("buyer", buyerId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  res.json({ success: true, leads: data || [] });
}
