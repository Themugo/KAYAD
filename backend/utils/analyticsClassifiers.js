// Pure helpers for visitor analytics: bot detection, device class, referrer channel, path normalisation. No I/O, no secrets.
// Full-user-agent strings are NEVER stored; only the coarse class returned here is kept.

const BOT_RE = /(bot|crawl|spider|slurp|headless|phantom|lighthouse|pagespeed|pingdom|uptime|monitor|curl\/|wget|python-requests|python-urllib|aiohttp|httpclient|java\/|okhttp\/(?!.*mobile)|go-http|libwww|scrapy|postman|insomnia|axios\/|node-fetch|undici|facebookexternalhit|whatsapp\/|telegrambot|preview|validator|archive|checker|probe|scanner|selenium|playwright|puppeteer|cypress)/i;

/** Known automated traffic. An empty or very short user agent is treated as automated too (real browsers always send one). */
export function isBot(userAgent) {
  const ua = String(userAgent || "").trim();
  if (ua.length < 12) return true;
  return BOT_RE.test(ua);
}

export function deviceClass(userAgent) {
  const ua = String(userAgent || "");
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave|startpage|qwant|ask)\./i;
const SOCIAL = /(^|\.)(facebook|fb|instagram|t|twitter|x|linkedin|lnkd|tiktok|youtube|youtu|whatsapp|wa|pinterest|reddit|telegram|t\.me|snapchat|threads)\.(com|me|co|be|in|ly|tv)$/i;

const cleanHost = (h) => String(h || "").toLowerCase().replace(/^www\./, "").slice(0, 100);
const hostOf = (url) => { try { return cleanHost(new URL(url).hostname); } catch { return ""; } };

/**
 * @returns {{channel: string, host: string|null}|null}  null = internal navigation (does not change a session's source).
 * UTM parameters win over the referrer; internal referrers (own hosts) are ignored.
 */
export function classifyReferrer({ referrer, utmMedium, utmSource, utmCampaign }, ownHosts = []) {
  const medium = String(utmMedium || "").toLowerCase();
  const source = String(utmSource || "").toLowerCase().slice(0, 60);
  if (medium === "email" || medium === "newsletter") return { channel: "email", host: source || null };
  if (medium === "social" || medium === "social-media") return { channel: "social", host: source || null };
  if (medium === "organic" || medium === "search") return { channel: "search", host: source || null };
  if (medium || utmCampaign) return { channel: "campaign", host: source || cleanHost(utmCampaign) || null };
  const host = hostOf(referrer);
  if (!host) return { channel: "direct", host: null };
  const own = ownHosts.map(cleanHost);
  if (own.some((o) => o && (host === o || host.endsWith(`.${o}`)))) return null;
  if (SEARCH.test(host)) return { channel: "search", host };
  if (SOCIAL.test(host) || host === "t.co" || host === "t.me" || host === "lnkd.in") return { channel: "social", host };
  return { channel: "referral", host };
}

const UUID_SEG = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === "string" && UUID_SEG.test(v);

/**
 * Stable page identity. The app is a single-page shell whose sections are addressed as /?nav=<section>, so `nav` is kept (strictly
 * allow-listed); every other query parameter, any fragment and every identifier-looking path segment are dropped. Admin and API
 * paths are not tracked (returns null).
 */
export function normalizePath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.length > 400) return null;
  let url;
  try { url = new URL(raw, "http://kayad.local"); } catch { return null; }
  let p = url.pathname.toLowerCase();
  if (p === "/admin" || p.startsWith("/admin/") || p === "/api" || p.startsWith("/api/")) return null;
  p = p
    .split("/")
    .map((seg) => (UUID_SEG.test(seg) || /^\d{3,}$/.test(seg) ? ":id" : seg.replace(/[^a-z0-9._~-]/g, "").slice(0, 60)))
    .join("/")
    .replace(/\/+$/, "") || "/";
  const nav = (url.searchParams.get("nav") || "").toLowerCase();
  if (/^[a-z0-9-]{1,40}$/.test(nav)) p += `?nav=${nav}`;
  return p.slice(0, 120);
}

/** Auction pages: /auction/:id (the live auction room) or the discovery/auction sections. */
export const isAuctionPath = (path) => /^\/auctions?(\/|$|\?)/.test(path) || /[?&]nav=(auction|auctions|discovery|auction-room)/.test(path);
