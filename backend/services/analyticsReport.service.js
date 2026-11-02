// Visitor analytics REPORTING: date ranges (Africa/Nairobi, UTC+3, no DST), aggregation, comparison, live view, CSV export.
// Everything here reads the persisted, hashed tables written by analytics.service.js. Nothing is invented: when there is no data the
// numbers are zero and `tracking.begins` says from when reliable tracking exists.
import { getSupabase } from "../utils/supabase.js";
import { isAuctionPath } from "../utils/analyticsClassifiers.js";

export const TZ = "Africa/Nairobi";
const EAT_MS = 3 * 3600_000;
const DAY = 86400_000;
export const MAX_ROWS = 200_000;
export const LIVE_WINDOW_MIN = 5;
export const LIVE_REFRESH_SECONDS = 30;
export const RANGES = Object.freeze(["today", "yesterday", "7d", "30d", "90d", "custom"]);

export const METRIC_DEFINITIONS = Object.freeze({
  totalVisits: "Visits (sessions): distinct browsing sessions that started in the period. A session ends after 30 minutes of inactivity or when the tab session ends. Refreshing a page does not create a new visit.",
  uniqueVisitors: "Unique visitors: distinct browsers/devices (a first-party random id, stored only as a keyed hash) with at least one visit in the period. Counted once per period however many times they return; a refresh never adds a visitor.",
  guestVisitors: "Guest visitors: unique visitors with NO signed-in request in the period.",
  registeredVisitors: "Registered visitors: unique visitors with at least one signed-in request in the period. A browser that browses as a guest and then logs in is counted ONCE, as registered (guest-to-registered reconciliation on the same browser id). Guest + registered = unique visitors.",
  authenticatedSessions: "Authenticated sessions: visits in which at least one request carried a valid login. A guest session that logs in part-way is one authenticated session, not two.",
  newRegistrations: "New registrations: user accounts created in the period (from the accounts table - the authoritative source, not client events).",
  returningVisitors: "Returning visitors: unique visitors in the period whose first-ever recorded visit was before the period began. New visitors = unique visitors - returning. Only visits since tracking began can be known.",
  registrationConversionRate: "Registration conversion rate: visitors who completed a registration in the period / unique visitors in the period. The registration signal is reported by the browser after a successful sign-up; new registrations (above) is the authoritative account count.",
  pageViews: "Page views: tracked page loads (general pages, vehicle pages and auction pages). Rapid repeats of the same page inside 2 seconds in one session are collapsed; a later refresh is a new page view but never a new visit or visitor.",
  mostVisitedPages: "Most visited pages: page views by normalised page (identifiers removed; the app section is kept).",
  mostViewedListings: "Most viewed vehicle listings: vehicle-page views by public listing id.",
  auctionPageViews: "Auction page views: page views of auction pages and sections.",
  trafficSources: "Traffic sources: the channel that started each visit (direct, search, social, email, campaign, referral). Internal navigation never changes a visit's source.",
  geography: "Geography: country of the visit from the CDN country header only. No city, coordinates or IP address is stored. 'Unknown' means the header was absent.",
  devices: "Devices: mobile, tablet or desktop, classified from the browser at the time of the visit. The user-agent string itself is not stored.",
  activeSessions: `Live activity: visits with a request in the last ${LIVE_WINDOW_MIN} minutes. Browsers send a keep-alive about once a minute while a tab is visible. The dashboard refreshes every ${LIVE_REFRESH_SECONDS} seconds.`,
  excluded: "Excluded from every number: known bots and automation, requests with Do-Not-Track or Global-Privacy-Control set, admin and API pages, and anything recorded while collection is disabled in settings.",
  distinctions: "Page views, visits, unique visitors, registered accounts, authenticated sessions, active users and auction participants are different quantities. Auction participants (bidders/registrants) come from the auctions system, not from traffic analytics.",
});

// ---------- date ranges ----------
const pad = (n) => String(n).padStart(2, "0");
export const eatDateStr = (ms) => { const d = new Date(ms + EAT_MS); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const dayStartMs = (dateStr) => Date.parse(`${dateStr}T00:00:00+03:00`);

/** @returns {{ok: true, range, label, from: Date, to: Date, days: number}|{ok: false, code, message}}  `to` is EXCLUSIVE. */
export function resolveRange({ range = "7d", from, to } = {}, now = new Date()) {
  const nowMs = now.getTime();
  const todayStart = dayStartMs(eatDateStr(nowMs));
  let f; let t; let label;
  switch (range) {
    case "today": f = todayStart; t = todayStart + DAY; label = "Today"; break;
    case "yesterday": f = todayStart - DAY; t = todayStart; label = "Yesterday"; break;
    case "7d": f = todayStart - 6 * DAY; t = todayStart + DAY; label = "Last 7 days"; break;
    case "30d": f = todayStart - 29 * DAY; t = todayStart + DAY; label = "Last 30 days"; break;
    case "90d": f = todayStart - 89 * DAY; t = todayStart + DAY; label = "Last 90 days"; break;
    case "custom": {
      const ok = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dayStartMs(s));
      if (!ok(from) || !ok(to)) return { ok: false, code: "ANALYTICS_RANGE_INVALID", message: "Custom range needs from and to dates as YYYY-MM-DD." };
      f = dayStartMs(from); t = dayStartMs(to) + DAY;
      if (t <= f) return { ok: false, code: "ANALYTICS_RANGE_INVALID", message: "The end date must not be before the start date." };
      if (f > nowMs) return { ok: false, code: "ANALYTICS_RANGE_INVALID", message: "The start date is in the future." };
      if ((t - f) / DAY > 366) return { ok: false, code: "ANALYTICS_RANGE_TOO_LONG", message: "A custom range can cover at most 366 days." };
      label = `${from} to ${to}`; break;
    }
    default: return { ok: false, code: "ANALYTICS_RANGE_INVALID", message: `Unknown range. Use one of: ${RANGES.join(", ")}.` };
  }
  return { ok: true, range, label, from: new Date(f), to: new Date(t), days: Math.round((t - f) / DAY) };
}

export const previousRange = (r) => ({ from: new Date(r.from.getTime() - (r.to - r.from)), to: new Date(r.from.getTime()) });

// ---------- data access ----------
async function fetchAll(table, columns, col, from, to, { gteOnly = false } = {}) {
  const sb = getSupabase();
  const rows = [];
  let truncated = false;
  for (let offset = 0; ; offset += 1000) {
    let q = sb.from(table).select(columns).gte(col, from.toISOString());
    if (!gteOnly) q = q.lt(col, to.toISOString());
    const { data, error } = await q.order(col, { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
    if (rows.length >= MAX_ROWS) { truncated = true; break; }
  }
  return { rows, truncated };
}

export async function trackingBegins() {
  const { data, error } = await getSupabase().from("analytics_sessions").select("started_at").order("started_at", { ascending: true }).range(0, 0);
  if (error) throw error;
  return data?.[0]?.started_at || null;
}

// ---------- aggregation (pure) ----------
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const bump = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);
const VIEW = new Set(["page_view", "listing_view", "auction_view"]);

/** Pure. sessions/events are already restricted to [from,to). visitors = analytics_visitors rows (any superset). */
export function aggregate({ sessions, events, visitors, from, to, newAccounts = null }) {
  const vByHash = new Map((visitors || []).map((v) => [v.visitor_hash, v]));
  const visitorSet = new Set(sessions.map((s) => s.visitor_hash));
  const registeredSet = new Set(sessions.filter((s) => s.authenticated).map((s) => s.visitor_hash));
  const returning = [...visitorSet].filter((h) => { const v = vByHash.get(h); return v && new Date(v.first_seen_at) < from; }).length;

  const views = events.filter((e) => VIEW.has(e.event_type));
  const convertedSet = new Set(events.filter((e) => e.event_type === "registration").map((e) => e.visitor_hash));

  const pages = new Map(); const pageVisitors = new Map();
  const listings = new Map(); const listingVisitors = new Map();
  let auctionViews = 0; const auctionVisitors = new Set();
  for (const e of views) {
    bump(pages, e.path); (pageVisitors.get(e.path) || pageVisitors.set(e.path, new Set()).get(e.path)).add(e.visitor_hash);
    if (e.listing_id) { bump(listings, e.listing_id); (listingVisitors.get(e.listing_id) || listingVisitors.set(e.listing_id, new Set()).get(e.listing_id)).add(e.visitor_hash); }
    if (e.event_type === "auction_view" || isAuctionPath(e.path)) { auctionViews += 1; auctionVisitors.add(e.visitor_hash); }
  }
  const top = (m, vis, key, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n).map(([k, v]) => ({ [key]: k, views: v, uniqueVisitors: vis.get(k)?.size || 0 }));

  const channels = new Map(); const channelVisitors = new Map(); const hosts = new Map();
  const countries = new Map(); const countryVisitors = new Map();
  const devices = new Map(); const deviceVisitors = new Map();
  const add = (sm, vm, k, h) => { bump(sm, k); (vm.get(k) || vm.set(k, new Set()).get(k)).add(h); };
  for (const s of sessions) {
    add(channels, channelVisitors, s.source_channel || "direct", s.visitor_hash);
    if (s.source_host) bump(hosts, `${s.source_channel}|${s.source_host}`);
    add(countries, countryVisitors, s.country_code || "Unknown", s.visitor_hash);
    add(devices, deviceVisitors, s.device_class || "desktop", s.visitor_hash);
  }
  const split = (sm, vm, key) => [...sm.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ [key]: k, visits: v, uniqueVisitors: vm.get(k)?.size || 0, shareOfVisits: pct(v, sessions.length) }));

  // daily series in Africa/Nairobi
  const days = new Map();
  const dayRow = (d) => days.get(d) || days.set(d, { date: d, visits: 0, pageViews: 0, registrations: 0, _v: new Set(), _reg: new Set(), _auth: 0 }).get(d);
  for (let t = from.getTime(); t < to.getTime(); t += DAY) dayRow(eatDateStr(t));
  for (const s of sessions) { const r = dayRow(eatDateStr(new Date(s.started_at).getTime())); r.visits += 1; r._v.add(s.visitor_hash); if (s.authenticated) { r._reg.add(s.visitor_hash); r._auth += 1; } }
  for (const e of events) { const r = dayRow(eatDateStr(new Date(e.occurred_at).getTime())); if (VIEW.has(e.event_type)) r.pageViews += 1; else if (e.event_type === "registration") r.registrations += 1; }
  const daily = [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({
    date: r.date, visits: r.visits, uniqueVisitors: r._v.size, registeredVisitors: r._reg.size, guestVisitors: r._v.size - r._reg.size,
    authenticatedSessions: r._auth, pageViews: r.pageViews, registrations: r.registrations,
  }));

  return {
    totals: {
      totalVisits: sessions.length,
      uniqueVisitors: visitorSet.size,
      guestVisitors: visitorSet.size - registeredSet.size,
      registeredVisitors: registeredSet.size,
      authenticatedSessions: sessions.filter((s) => s.authenticated).length,
      newRegistrations: newAccounts,
      returningVisitors: returning,
      newVisitors: visitorSet.size - returning,
      convertedVisitors: convertedSet.size,
      registrationConversionRate: pct(convertedSet.size, visitorSet.size),
      pageViews: views.length,
      auctionPageViews: auctionViews,
      auctionPageVisitors: auctionVisitors.size,
    },
    daily,
    topPages: top(pages, pageVisitors, "path"),
    topListings: top(listings, listingVisitors, "listingId"),
    sources: { channels: split(channels, channelVisitors, "channel"), topHosts: [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => { const [channel, host] = k.split("|"); return { channel, host, visits: v }; }) },
    geography: split(countries, countryVisitors, "country"),
    devices: split(devices, deviceVisitors, "device"),
  };
}

/** Compare numeric totals with the previous period. Returns null when tracking did not cover the previous period. */
export function compareTotals(cur, prev, trackingStart, prevFrom) {
  if (!trackingStart || new Date(trackingStart) > prevFrom) {
    return { available: false, reason: trackingStart ? `Tracking began ${trackingStart}, after the start of the previous period, so a like-for-like comparison is not possible.` : "No analytics have been collected yet." };
  }
  const keys = ["totalVisits", "uniqueVisitors", "guestVisitors", "registeredVisitors", "authenticatedSessions", "returningVisitors", "pageViews", "auctionPageViews", "convertedVisitors"];
  const change = {};
  for (const k of keys) change[k] = { current: cur[k], previous: prev[k], changePct: prev[k] > 0 ? Math.round(((cur[k] - prev[k]) / prev[k]) * 1000) / 10 : null };
  return { available: true, change };
}

// ---------- live ----------
export async function liveActivity(now = new Date()) {
  const since = new Date(now.getTime() - LIVE_WINDOW_MIN * 60_000);
  const { rows, truncated } = await fetchAll("analytics_sessions", "session_hash, visitor_hash, authenticated, device_class, last_seen_at", "last_seen_at", since, now, { gteOnly: true });
  const visitors = new Set(rows.map((r) => r.visitor_hash));
  const dev = { mobile: 0, tablet: 0, desktop: 0 };
  rows.forEach((r) => { dev[r.device_class] = (dev[r.device_class] || 0) + 1; });
  return {
    asOf: now.toISOString(), windowMinutes: LIVE_WINDOW_MIN, refreshSeconds: LIVE_REFRESH_SECONDS, truncated,
    activeSessions: rows.length, activeVisitors: visitors.size,
    registeredSessions: rows.filter((r) => r.authenticated).length, guestSessions: rows.filter((r) => !r.authenticated).length, devices: dev,
  };
}

// ---------- full report ----------
export async function buildReport({ range, from, to }, { newAccountsCounter, now = new Date() } = {}) {
  const r = resolveRange({ range, from, to }, now);
  if (!r.ok) return r;
  const prev = previousRange(r);
  const [begins, sess, ev, vis, prevSess, prevEv] = await Promise.all([
    trackingBegins(),
    fetchAll("analytics_sessions", "session_hash, visitor_hash, started_at, authenticated, device_class, country_code, source_channel, source_host", "started_at", r.from, r.to),
    fetchAll("analytics_events", "occurred_at, visitor_hash, event_type, path, listing_id", "occurred_at", r.from, r.to),
    fetchAll("analytics_visitors", "visitor_hash, first_seen_at, ever_authenticated", "last_seen_at", r.from, r.to, { gteOnly: true }),
    fetchAll("analytics_sessions", "session_hash, visitor_hash, started_at, authenticated", "started_at", prev.from, prev.to),
    fetchAll("analytics_events", "occurred_at, visitor_hash, event_type, path, listing_id", "occurred_at", prev.from, prev.to),
  ]);
  let newAccounts = null;
  try { newAccounts = newAccountsCounter ? await newAccountsCounter(r.from, r.to) : null; } catch { newAccounts = null; }
  const cur = aggregate({ sessions: sess.rows, events: ev.rows, visitors: vis.rows, from: r.from, to: r.to, newAccounts });
  const previous = aggregate({ sessions: prevSess.rows, events: prevEv.rows, visitors: vis.rows, from: prev.from, to: prev.to });
  const partialStart = begins && new Date(begins) > r.from;
  return {
    ok: true,
    range: { key: r.range, label: r.label, from: r.from.toISOString(), to: r.to.toISOString(), timezone: TZ, days: r.days },
    tracking: {
      begins, partialPeriod: !!partialStart, hasData: !!begins,
      note: !begins ? "No visitor analytics have been collected yet. Numbers will appear once tracking starts; no history is estimated." : partialStart ? `Reliable tracking begins ${begins}. Anything before that moment was not collected and is not estimated.` : null,
      truncated: sess.truncated || ev.truncated,
    },
    ...cur,
    comparison: compareTotals(cur.totals, previous.totals, begins, prev.from),
    definitions: METRIC_DEFINITIONS,
  };
}

// ---------- CSV ----------
const SAFE = (v) => {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`; // spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header, rows) => [header.join(","), ...rows.map((r) => header.map((h) => SAFE(r[h])).join(","))].join("\n") + "\n";
export const EXPORT_KINDS = Object.freeze(["summary", "daily", "pages", "listings", "sources", "devices", "geography"]);

export function exportCsv(report, kind) {
  switch (kind) {
    case "summary": return toCsv(["metric", "value"], Object.entries(report.totals).map(([metric, value]) => ({ metric, value })));
    case "daily": return toCsv(["date", "visits", "uniqueVisitors", "guestVisitors", "registeredVisitors", "authenticatedSessions", "pageViews", "registrations"], report.daily);
    case "pages": return toCsv(["path", "views", "uniqueVisitors"], report.topPages);
    case "listings": return toCsv(["listingId", "views", "uniqueVisitors"], report.topListings);
    case "sources": return toCsv(["channel", "visits", "uniqueVisitors", "shareOfVisits"], report.sources.channels);
    case "devices": return toCsv(["device", "visits", "uniqueVisitors", "shareOfVisits"], report.devices);
    case "geography": return toCsv(["country", "visits", "uniqueVisitors", "shareOfVisits"], report.geography);
    default: return null;
  }
}
