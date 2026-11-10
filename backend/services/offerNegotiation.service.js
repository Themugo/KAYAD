import { getSupabase } from "../utils/supabase.js";

export async function listLeadOffers(leadId) {
  const { data, error } = await getSupabase().from("marketplace_offers")
    .select("id,lead_id,parent_offer_id,vehicle_id,buyer_id,seller_id,sender_id,recipient_id,amount,currency,status,message,expires_at,created_at,updated_at")
    .eq("lead_id", leadId).order("created_at", { ascending: true });
  if (error) throw error;
  const { data: events, error: eventError } = await getSupabase().from("marketplace_offer_events")
    .select("id,offer_id,actor_id,event_type,amount,message,created_at")
    .eq("lead_id", leadId).order("created_at", { ascending: true });
  if (eventError) throw eventError;
  return { offers: data || [], events: events || [] };
}

export async function performOfferAction({ leadId, actorId, action, amount, message, offerId, idempotencyKey }) {
  const { data, error } = await getSupabase().rpc("kayad_offer_action", {
    p_lead_id: leadId, p_actor_id: actorId, p_action: action,
    p_amount: amount ?? null, p_message: message ?? null,
    p_offer_id: offerId ?? null, p_idempotency_key: idempotencyKey,
  });
  if (error) {
    const statusCode = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : error.code === "23505" || error.code === "23514" ? 409 : 400;
    throw Object.assign(new Error(error.message || "Offer action failed"), { statusCode });
  }
  if (data?.expired) throw Object.assign(new Error("Offer has expired"), { statusCode: 409 });
  return data;
}
