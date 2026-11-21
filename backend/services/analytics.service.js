// Visitor analytics INGESTION. First-party, privacy-conscious:
//  * identifiers are keyed HMACs (ANALYTICS_HASH_SECRET, else derived from JWT_SECRET) - raw visitor/session/user ids, IPs and full user
//    agents are never persisted;
//  * bots/automation, Do-Not-Track / Global-Privacy-Control requests, admin/API paths and a disabled setting are NOT counted;
//  * the event time is the SERVER time (a client clock cannot back-fill or inflate history);
//  * repeats are collapsed: events are idempotent on their client event id and de-duplicated on session|type|path|listing|2-second bucket.
// Metric definitions live in services/analyticsReport.service.js (METRIC_DEFINITIONS).
import crypto from "crypto";
import { getSupabase } from "../utils/supabase.js";
import { logError } from "../utils/logger.js";
import { isBot, deviceClass, classifyReferrer, normalizePath, isAuctionPath, isUuid } from "../utils/analyticsClassifiers.js";

export const SETTINGS_KEY = "analytics_settings";
export const DEFAULT_SETTINGS = Object.freeze({ enabled: true, retentionDays: 400 });
export const EVENT_TYPES = Object.freeze(["page_view", "listing_view", "auction_view", "registration", "heartbeat"]);
const SETTINGS_TTL_MS = 30_000;
let settingsCache = null;
let testSettings = null;

export const __setAnalyticsSettingsForTests = (s) => { testSettings = s; settingsCache = null; };

const secret = () => process.env.ANALYTICS_HASH_SECRET || (process.env.JWT_SECRET ? `analytics:${process.env.JWT_SECRET}` : null);
export const hashId = (kind, value) => {
  const key = secret();
  if (!key) throw Object.assign(new Error("ANALYTICS_HASH_SECRET (or JWT_SECRET) is not configured"), { code: "ANALYTICS_NOT_CONFIGURED" });
  return crypto.createHmac("sha256", key).update(`${kind}:${value}`).digest("hex").slice(0, 32);
};

/**
 * True when a database error means the analytics tables have not been created on this database (migration 20261101120000 not applied).
 * Postgres says 42P01 (undefined_table); PostgREST says PGRST205 / "Could not find the table ... in the schema cache".
 */
export function isAnalyticsStoreMissing(err) {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "");
  if (code !== "42P01" && code !== "PGRST205" && !/does not exist|schema cache/i.test(msg)) return false;
  return code === "42P01" || code === "PGRST205" || /analytics_(visitors|sessions|events)/i.test(msg);
}
export const ANALYTICS_NOT_SET_UP = Object.freeze({
  code: "ANALYTICS_NOT_SET_UP",
  message: "Traffic analytics is not set up on this database yet: its tables (analytics_visitors, analytics_sessions, analytics_events) are missing. Run the analytics setup SQL once (runbooks/traffic-analytics-setup-20261102), then reload this page.",
});

export async function getAnalyticsSettings() {
  if (testSettings) return { ...DEFAULT_SETTINGS, ...testSettings };
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.value;
  let value = { ...DEFAULT_SETTINGS };
  try {
    const { data } = await getSupabase().from("system_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const v = data?.value || {};
    value = {
      enabled: typeof v.enabled === "boolean" ? v.enabled : DEFAULT_SETTINGS.enabled,
      retentionDays: Number.isInteger(v.retentionDays) && v.retentionDays >= 30 && v.retentionDays <= 1825 ? v.retentionDays : DEFAULT_SETTINGS.retentionDays,
    };
  } catch (err) { logError("Analytics settings read failed", { error: err?.message }); }
  settingsCache = { at: Date.now(), value };
  return value;
}

const ownHosts = () => (process.env.FRONTEND_URL || "https://www.kayad.space").split(",").map((u) => { try { return new URL(u.trim()).hostname; } catch { return ""; } }).filter(Boolean);
const countryOf = (h) => {
  const c = String(h["cf-ipcountry"] || h["x-vercel-ip-country"] || h["x-country-code"] || "").toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;
};

/**
 * @param {{headers: object, user?: {id: string}}} req
 * @param {{visitorId: string, sessionId: string, eventId: string, type: string, path: string, listingId?: string, referrer?: string, utm?: object}} body (already schema-validated)
 * @returns {Promise<{counted: boolean, reason?: string, deduped?: boolean}>}
 */
export async function recordEvent(req, body) {
  const h = req.headers || {};
  if (h.dnt === "1" || h["sec-gpc"] === "1") return { counted: false, reason: "do_not_track" };
  if (isBot(h["user-agent"])) return { counted: false, reason: "bot" };
  const settings = await getAnalyticsSettings();
  if (!settings.enabled) return { counted: false, reason: "disabled" };

  const isHeartbeat = body.type === "heartbeat";
  const path = normalizePath(body.path);
  if (!path) return { counted: false, reason: "untracked_path" };

  const sb = getSupabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const authenticated = !!req.user?.id;
  const visitor = hashId("v", body.visitorId);
  const session = hashId("s", body.sessionId);
  const userHash = authenticated ? hashId("u", req.user.id) : null;

  // ---- visitor (first_seen is set once, never moved) ----
  const { data: v } = await sb.from("analytics_visitors").select("visitor_hash, ever_authenticated").eq("visitor_hash", visitor).maybeSingle();
  if (!v) {
    const ins = await sb.from("analytics_visitors").insert({ visitor_hash: visitor, first_seen_at: nowIso, last_seen_at: nowIso, ever_authenticated: authenticated });
    if (ins.error && ins.error.code !== "23505") throw ins.error;
  } else {
    await sb.from("analytics_visitors").update({ last_seen_at: nowIso, ever_authenticated: v.ever_authenticated || authenticated }).eq("visitor_hash", visitor);
  }

  // ---- session (one row per browsing session; a guest session that logs in is UPGRADED, never duplicated) ----
  const { data: s } = await sb.from("analytics_sessions").select("session_hash, authenticated, page_views, visitor_hash").eq("session_hash", session).maybeSingle();
  if (s && s.visitor_hash !== visitor) return { counted: false, reason: "session_conflict" }; // one session id cannot be replayed by another visitor
  const src = classifyReferrer({ referrer: body.referrer, utmMedium: body.utm?.medium, utmSource: body.utm?.source, utmCampaign: body.utm?.campaign }, ownHosts());
  const countsAsView = !isHeartbeat && body.type !== "registration";
  if (!s) {
    const ins = await sb.from("analytics_sessions").insert({
      session_hash: session, visitor_hash: visitor, started_at: nowIso, last_seen_at: nowIso, authenticated, user_hash: userHash,
      device_class: deviceClass(h["user-agent"]), country_code: countryOf(h),
      source_channel: src?.channel || "direct", source_host: src?.host || null, landing_path: path, page_views: countsAsView ? 1 : 0,
    });
    if (ins.error && ins.error.code !== "23505") throw ins.error;
  } else {
    await sb.from("analytics_sessions").update({
      last_seen_at: nowIso, authenticated: s.authenticated || authenticated, ...(authenticated ? { user_hash: userHash } : {}),
      page_views: (s.page_views || 0) + (countsAsView ? 1 : 0),
    }).eq("session_hash", session);
  }
  if (isHeartbeat) return { counted: true };

  // ---- event (idempotent + de-duplicated) ----
  const listingId = isUuid(body.listingId) ? body.listingId : null;
  const bucket = Math.floor(now.getTime() / 2000);
  const dedupeKey = crypto.createHash("sha256").update(`${session}|${body.type}|${path}|${listingId || ""}|${bucket}`).digest("hex").slice(0, 40);
  const ev = await sb.from("analytics_events").insert({
    event_id: body.eventId, occurred_at: nowIso, session_hash: session, visitor_hash: visitor, event_type: body.type, path,
    listing_id: listingId, authenticated, dedupe_key: dedupeKey,
  });
  if (ev.error) {
    if (ev.error.code === "23505") return { counted: false, reason: "duplicate", deduped: true };
    throw ev.error;
  }
  return { counted: true };
}

/** Deletes events/sessions/visitors older than the retention window. Returns row counts. */
export async function purgeExpired({ now = new Date() } = {}) {
  const { retentionDays } = await getAnalyticsSettings();
  const cutoff = new Date(now.getTime() - retentionDays * 86400_000).toISOString();
  const sb = getSupabase();
  const out = {};
  for (const [table, col] of [["analytics_events", "occurred_at"], ["analytics_sessions", "last_seen_at"], ["analytics_visitors", "last_seen_at"]]) {
    const r = await sb.from(table).delete().lt(col, cutoff).select();
    if (r.error) throw r.error;
    out[table] = Array.isArray(r.data) ? r.data.length : 0;
  }
  return { cutoff, retentionDays, deleted: out };
}

export { isAuctionPath };
