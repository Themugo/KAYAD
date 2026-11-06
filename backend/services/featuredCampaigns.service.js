// Homepage featured-vehicle campaigns. A campaign = one listing + an absolute period + a display order.
// Status is DERIVED from the period and the paused flag, never stored: current | upcoming | expired | inactive (paused).
// Times are absolute instants; the admin screen enters/shows Africa/Nairobi (UTC+3, no DST).
import { getSupabase } from "../utils/supabase.js";

const fail = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, code, expose: true, ...extra });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const db = () => getSupabase();
export const MAX_PERIOD_DAYS = 366;
export const PUBLIC_LIMIT = 12;

export const assertId = (id) => { if (!UUID.test(String(id))) throw fail(400, "CAMPAIGN_ID_INVALID", "Invalid campaign id."); };
const check = ({ data, error }, what) => {
  if (error) throw fail(500, "CAMPAIGN_STORE_ERROR", `Could not ${what}.`, { cause: error.message });
  return data;
};

export function campaignState(row, now = new Date()) {
  if (row.paused) return "inactive";
  const t = now.getTime();
  if (t < new Date(row.starts_at).getTime()) return "upcoming";
  if (t >= new Date(row.ends_at).getTime()) return "expired";
  return "current";
}

// Accept only an ISO-8601 instant that carries an explicit offset (Z or ±hh:mm): a bare local time is ambiguous.
function parseInstant(v, label) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v)) {
    throw fail(400, "CAMPAIGN_TIME_INVALID", `${label} must be a date and time with a time zone.`);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw fail(400, "CAMPAIGN_TIME_INVALID", `${label} is not a valid date and time.`);
  return d;
}
function parseOrder(v) {
  if (v === undefined || v === null || v === "") return 1;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 99) throw fail(400, "CAMPAIGN_ORDER_INVALID", "Display order must be a whole number from 1 to 99.");
  return n;
}
function validatePeriod(startsAt, endsAt, { now = new Date(), allowPast = false } = {}) {
  const s = parseInstant(startsAt, "Start"), e = parseInstant(endsAt, "End");
  if (e <= s) throw fail(400, "CAMPAIGN_PERIOD_INVALID", "The end must be after the start.");
  if ((e - s) / 86400000 > MAX_PERIOD_DAYS) throw fail(400, "CAMPAIGN_PERIOD_TOO_LONG", `A campaign can run for at most ${MAX_PERIOD_DAYS} days.`);
  if (!allowPast && e <= now) throw fail(400, "CAMPAIGN_ALREADY_ENDED", "The end must be in the future.");
  return { s, e };
}

const firstImage = (images) => {
  const list = Array.isArray(images) ? images : [];
  const f = list[0];
  return typeof f === "string" ? f : f?.url || null;
};
const carView = (c) => c && ({ id: c.id, title: c.title || `${c.brand || ""} ${c.model || ""}`.trim(), make: c.brand, model: c.model, year: c.year, price: c.price, status: c.status, image: firstImage(c.images), deleted: !!c.deleted_at });
const view = (r, car, now) => ({
  id: r.id, carId: r.car_id, startsAt: r.starts_at, endsAt: r.ends_at, displayOrder: r.display_order, paused: !!r.paused,
  state: campaignState(r, now), vehicle: carView(car) || null, updatedAt: r.updated_at,
});

async function loadCars(ids) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const rows = check(await db().from("cars").select("id,title,brand,model,year,price,status,images,deleted_at").in("id", uniq), "read vehicles") || [];
  return new Map(rows.map((c) => [c.id, c]));
}
async function assertCarFeaturable(carId) {
  if (!UUID.test(String(carId))) throw fail(400, "CAMPAIGN_CAR_INVALID", "Choose a vehicle.");
  const car = (await loadCars([carId])).get(carId);
  if (!car || car.deleted_at) throw fail(404, "CAMPAIGN_CAR_NOT_FOUND", "That vehicle was not found.");
  if (car.status !== "available") throw fail(409, "CAMPAIGN_CAR_UNAVAILABLE", "Only available vehicles can be featured.");
  return car;
}
async function assertNoOverlap(carId, s, e, exceptId) {
  const rows = check(await db().from("featured_vehicle_campaigns").select("id,starts_at,ends_at,paused").eq("car_id", carId), "check existing campaigns") || [];
  const clash = rows.find((r) => !r.paused && r.id !== exceptId && new Date(r.starts_at) < e && new Date(r.ends_at) > s);
  if (clash) throw fail(409, "CAMPAIGN_OVERLAP", "This vehicle already has a campaign during that period.");
}
async function record(campaign, action, actorId) {
  const { error } = await db().from("featured_vehicle_campaign_history").insert({ campaign_id: campaign.id, action, snapshot: campaign, actor_id: actorId || null });
  // History is best effort AFTER the change committed; surface it in logs, never as a failed change.
  if (error) console.error("FEATURED_CAMPAIGN_HISTORY_FAILED", { id: campaign.id, action, message: error.message });
}
async function getRow(id) {
  assertId(id);
  const rows = check(await db().from("featured_vehicle_campaigns").select("*").eq("id", id).limit(1), "read the campaign");
  if (!rows?.[0]) throw fail(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  return rows[0];
}

export async function listCampaigns({ now = new Date() } = {}) {
  const rows = check(await db().from("featured_vehicle_campaigns").select("*").order("starts_at", { ascending: false }), "list campaigns") || [];
  const cars = await loadCars(rows.map((r) => r.car_id));
  const campaigns = rows.map((r) => view(r, cars.get(r.car_id), now));
  const counts = { current: 0, upcoming: 0, expired: 0, inactive: 0 };
  campaigns.forEach((c) => { counts[c.state] += 1; });
  return { campaigns, counts, timezone: "Africa/Nairobi", serverTime: now.toISOString() };
}

export async function searchVehicles(q, { limit = 8 } = {}) {
  const term = String(q || "").trim().replace(/[%,()]/g, " ").slice(0, 60);
  let query = db().from("cars").select("id,title,brand,model,year,price,status,images,deleted_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(Math.min(Math.max(Number(limit) || 8, 1), 20));
  if (term) query = query.or(`title.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
  return (check(await query, "search vehicles") || []).map(carView);
}

export async function createCampaign({ carId, startsAt, endsAt, displayOrder, userId, now = new Date() }) {
  const { s, e } = validatePeriod(startsAt, endsAt, { now });
  const order = parseOrder(displayOrder);
  const car = await assertCarFeaturable(carId);
  await assertNoOverlap(carId, s, e);
  const row = check(await db().from("featured_vehicle_campaigns").insert({ car_id: carId, starts_at: s.toISOString(), ends_at: e.toISOString(), display_order: order, paused: false, created_by: userId || null, updated_by: userId || null }).select("*").single(), "save the campaign");
  await record(row, "created", userId);
  return view(row, car, now);
}

export async function updateCampaign(id, { startsAt, endsAt, displayOrder, userId, now = new Date() }) {
  const cur = await getRow(id);
  const nextStart = startsAt ?? cur.starts_at, nextEnd = endsAt ?? cur.ends_at;
  const { s, e } = validatePeriod(nextStart, nextEnd, { now, allowPast: true });
  const order = displayOrder === undefined ? cur.display_order : parseOrder(displayOrder);
  if (e <= now && campaignState(cur, now) !== "expired") throw fail(400, "CAMPAIGN_ALREADY_ENDED", "The end must be in the future. Use \"End now\" to stop a campaign.");
  await assertNoOverlap(cur.car_id, s, e, id);
  const row = check(await db().from("featured_vehicle_campaigns").update({ starts_at: s.toISOString(), ends_at: e.toISOString(), display_order: order, updated_by: userId || null, updated_at: now.toISOString() }).eq("id", id).select("*").single(), "update the campaign");
  await record(row, "updated", userId);
  return view(row, (await loadCars([row.car_id])).get(row.car_id), now);
}

export async function setPaused(id, paused, { userId, now = new Date() }) {
  const cur = await getRow(id);
  if (!paused) await assertNoOverlap(cur.car_id, new Date(cur.starts_at), new Date(cur.ends_at), id);
  const row = check(await db().from("featured_vehicle_campaigns").update({ paused: !!paused, updated_by: userId || null, updated_at: now.toISOString() }).eq("id", id).select("*").single(), "update the campaign");
  await record(row, paused ? "paused" : "resumed", userId);
  return view(row, (await loadCars([row.car_id])).get(row.car_id), now);
}

export async function endNow(id, { userId, now = new Date() }) {
  const cur = await getRow(id);
  if (campaignState(cur, now) !== "current") throw fail(409, "CAMPAIGN_NOT_CURRENT", "Only a campaign that is running now can be ended.");
  const row = check(await db().from("featured_vehicle_campaigns").update({ ends_at: now.toISOString(), updated_by: userId || null, updated_at: now.toISOString() }).eq("id", id).select("*").single(), "end the campaign");
  await record(row, "ended", userId);
  return view(row, (await loadCars([row.car_id])).get(row.car_id), now);
}

export async function deleteCampaign(id, { userId }) {
  const cur = await getRow(id);
  check(await db().from("featured_vehicle_campaigns").delete().eq("id", id), "delete the campaign");
  await record(cur, "deleted", userId);
  return { id };
}

export async function listHistory(limit = 50) {
  const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const rows = check(await db().from("featured_vehicle_campaign_history").select("*").order("at", { ascending: false }).limit(n), "read history") || [];
  return rows.map((h) => ({ id: h.id, campaignId: h.campaign_id, action: h.action, actorId: h.actor_id, at: h.at, carId: h.snapshot?.car_id, startsAt: h.snapshot?.starts_at, endsAt: h.snapshot?.ends_at }));
}

// Public: the vehicle ids to feature right now, in display order. Skips a campaign whose vehicle is no longer available.
export async function currentPublic({ now = new Date() } = {}) {
  const iso = now.toISOString();
  const rows = check(await db().from("featured_vehicle_campaigns").select("id,car_id,display_order,starts_at,ends_at").eq("paused", false).lte("starts_at", iso).gt("ends_at", iso).order("display_order", { ascending: true }).order("starts_at", { ascending: true }).limit(60), "read current campaigns") || [];
  const cars = await loadCars(rows.map((r) => r.car_id));
  const seen = new Set();
  const carIds = [];
  for (const r of rows) {
    const c = cars.get(r.car_id);
    if (!c || c.deleted_at || c.status !== "available" || seen.has(r.car_id)) continue;
    seen.add(r.car_id); carIds.push(r.car_id);
    if (carIds.length >= PUBLIC_LIMIT) break;
  }
  return { carIds, serverTime: iso };
}
