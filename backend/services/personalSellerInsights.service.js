import { getSupabase } from "../utils/supabase.js";

const asNumber = (value) => Math.max(0, Number(value) || 0);

export async function getPersonalSellerEnquiries(ownerId, { limit = 100 } = {}) {
  const sb = getSupabase();
  const { data: cars, error: carsError } = await sb.from("cars")
    .select("id,title,brand,model,year,price,images,status")
    .eq("dealer_id", ownerId).is("deleted_at", null).order("created_at", { ascending: false });
  if (carsError) throw carsError;
  const listings = cars || [];
  if (!listings.length) return { enquiries: [], count: 0, listingCount: 0 };
  const ids = listings.map((car) => car.id);
  const { data: rows, error } = await sb.from("leads")
    .select("id,vehicle,source,source_reference,stage,is_hot,archived,last_activity_at,created_at,estimated_value")
    .eq("dealer", ownerId).in("vehicle", ids)
    .order("last_activity_at", { ascending: false }).limit(Math.min(Math.max(Number(limit) || 100, 1), 200));
  if (error) throw error;
  const byId = new Map(listings.map((car) => [car.id, car]));
  const enquiries = (rows || []).map((lead) => ({
    id: lead.id,
    listing: byId.get(lead.vehicle) ? {
      id: lead.vehicle, title: byId.get(lead.vehicle).title,
      brand: byId.get(lead.vehicle).brand, model: byId.get(lead.vehicle).model,
      year: byId.get(lead.vehicle).year, price: asNumber(byId.get(lead.vehicle).price),
      image: Array.isArray(byId.get(lead.vehicle).images) ? byId.get(lead.vehicle).images[0] || null : null,
      status: byId.get(lead.vehicle).status,
    } : null,
    source: lead.source || "Marketplace",
    chatId: lead.source === "chat" && typeof lead.source_reference === "string" ? lead.source_reference : null,
    stage: lead.stage || "new",
    isHot: lead.is_hot === true,
    archived: lead.archived === true,
    lastActivityAt: lead.last_activity_at || lead.created_at,
    createdAt: lead.created_at,
  }));
  return { enquiries, count: enquiries.length, listingCount: listings.length };
}

export async function getPersonalSellerPerformance(ownerId, { days = 30 } = {}) {
  const sb = getSupabase();
  const boundedDays = Math.min(Math.max(Number(days) || 30, 1), 90);
  const from = new Date(Date.now() - boundedDays * 86400_000).toISOString();
  const { data: cars, error: carsError } = await sb.from("cars")
    .select("id,title,status,views,clicks,created_at").eq("dealer_id", ownerId).is("deleted_at", null);
  if (carsError) throw carsError;
  const listings = cars || [];
  if (!listings.length) return { periodDays: boundedDays, from, to: new Date().toISOString(), totals: { listings: 0, listingViews: 0, uniqueVisitors: 0, clicks: 0, enquiries: 0 }, listings: [], definitions: { listingViews: "Deduplicated first-party listing_view events during the selected period.", uniqueVisitors: "Distinct privacy-hashed visitors who viewed an owned listing during the selected period.", clicks: "Existing lifetime clicks counter on each owned listing; not period-attributed.", enquiries: "Lead records tied to an owned listing; lifetime count, not a conversion count." } };
  const ids = listings.map((car) => car.id);
  const [eventsResult, leadsResult] = await Promise.all([
    sb.from("analytics_events").select("listing_id,visitor_hash,occurred_at", { count: "exact" })
      .in("listing_id", ids).eq("event_type", "listing_view").gte("occurred_at", from).limit(10000),
    sb.from("leads").select("id,vehicle", { count: "exact", head: false }).eq("dealer", ownerId).in("vehicle", ids).limit(10000),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (leadsResult.error) throw leadsResult.error;
  const events = eventsResult.data || [];
  const leads = leadsResult.data || [];
  const byListing = new Map(listings.map((car) => [car.id, { id: car.id, title: car.title, status: car.status, views: 0, uniqueVisitors: 0, clicksLifetime: asNumber(car.clicks), enquiriesLifetime: 0 }]));
  const visitors = new Set();
  for (const event of events) {
    const item = byListing.get(event.listing_id);
    if (!item) continue;
    item.views += 1;
    item._visitors ||= new Set();
    item._visitors.add(event.visitor_hash);
    visitors.add(event.visitor_hash);
  }
  for (const item of byListing.values()) {
    item.uniqueVisitors = item._visitors?.size || 0;
    delete item._visitors;
  }
  for (const lead of leads) {
    const item = byListing.get(lead.vehicle);
    if (item) item.enquiriesLifetime += 1;
  }
  const output = [...byListing.values()];
  const truncated = events.length >= 10000 || leads.length >= 10000;
  if (events.length >= 10000) output.forEach((item) => { item.uniqueVisitors = null; });
  return {
    periodDays: boundedDays, from, to: new Date().toISOString(),
    totals: {
      listings: output.length,
      listingViews: eventsResult.count ?? events.length,
      uniqueVisitors: events.length >= 10000 ? null : visitors.size,
      clicks: output.reduce((sum, item) => sum + item.clicksLifetime, 0),
      enquiries: leadsResult.count ?? leads.length,
    },
    truncated,
    listings: output,
    definitions: {
      listingViews: `Deduplicated first-party listing_view events during the last ${boundedDays} days.`,
      uniqueVisitors: "Distinct privacy-hashed visitors who viewed an owned listing during the selected period.",
      clicks: "Existing lifetime clicks counter on each owned listing; not period-attributed.",
      enquiries: "Lead records tied to an owned listing; lifetime count, not a conversion count.",
      conversion: "Not reported: no verified attribution joins an enquiry to a completed purchase.",
    },
  };
}
