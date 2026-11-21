// First-party, privacy-conscious visitor analytics client.
//  - Anonymous random ids only (no cookies, no fingerprinting, no personal data). The SERVER hashes them with a secret before storing.
//  - Honours Do Not Track, Global Privacy Control and a local opt-out key; never runs on /admin.
//  - visitorId lives in localStorage; sessionId lives in sessionStorage and rotates after 30 minutes of inactivity.
//  - A page view is sent once per navigation (the server also drops refreshes inside 2 seconds). Heartbeats run only while the tab is visible.
//  - Sending signed-in vs guest needs no client logic: the same ids are posted and the server upgrades the session when a login is present.
import { api } from '../api/httpClient';

export const OPT_OUT_KEY = 'kayad_analytics_optout';
const VISITOR_KEY = 'kayad_vid';
const SESSION_KEY = 'kayad_sid';
const SESSION_TS_KEY = 'kayad_sid_ts';
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const HEARTBEAT_MS = 60 * 1000;

type EventType = 'page_view' | 'listing_view' | 'auction_view' | 'registration' | 'heartbeat';

const uuid = (): string => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const store = (kind: 'local' | 'session') => { try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; } };

export const trackingAllowed = (): boolean => {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  if (nav.doNotTrack === '1' || (window as any).doNotTrack === '1' || nav.msDoNotTrack === '1') return false;
  if (nav.globalPrivacyControl === true) return false;
  if (store('local')?.getItem(OPT_OUT_KEY) === '1') return false;
  return true;
};
export const setAnalyticsOptOut = (optOut: boolean): void => {
  const s = store('local'); if (!s) return;
  try { if (optOut) { s.setItem(OPT_OUT_KEY, '1'); s.removeItem(VISITOR_KEY); store('session')?.removeItem(SESSION_KEY); } else s.removeItem(OPT_OUT_KEY); } catch { /* ignore */ }
};

export const isTrackablePath = (path: string): boolean => !/^\/(admin|api|reset-password|verify)/i.test(path);

export const getVisitorId = (): string => {
  const s = store('local'); const have = s?.getItem(VISITOR_KEY);
  if (have && /^[0-9a-f-]{36}$/i.test(have)) return have;
  const id = uuid(); try { s?.setItem(VISITOR_KEY, id); } catch { /* ignore */ }
  return id;
};
export const getSessionId = (now = Date.now()): string => {
  const s = store('session'); const id = s?.getItem(SESSION_KEY); const ts = Number(s?.getItem(SESSION_TS_KEY) || 0);
  let out = id && /^[0-9a-f-]{36}$/i.test(id) && now - ts < SESSION_IDLE_MS ? id : uuid();
  try { s?.setItem(SESSION_KEY, out); s?.setItem(SESSION_TS_KEY, String(now)); } catch { /* ignore */ }
  return out;
};

const UUID_IN_PATH = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;
/** Classify a route into the event the server expects. Listing/auction detail pages carry the PUBLIC listing id only. */
export const classifyRoute = (pathname: string): { type: EventType; listingId?: string } => {
  const m = pathname.match(UUID_IN_PATH);
  if (/^\/auctions?\b/i.test(pathname)) return m ? { type: 'auction_view', listingId: m[1] } : { type: 'auction_view' };
  if (/^\/(car|cars|vehicle|vehicles|listing|listings)\//i.test(pathname) && m) return { type: 'listing_view', listingId: m[1] };
  return { type: 'page_view' };
};

const send = async (type: EventType, pathWithQuery: string, extra: Record<string, unknown> = {}): Promise<void> => {
  if (!trackingAllowed()) return;
  const path = pathWithQuery.split('#')[0];
  if (!isTrackablePath(path)) return;
  const payload: Record<string, unknown> = { visitorId: getVisitorId(), sessionId: getSessionId(), eventId: uuid(), type, path, ...extra };
  try { await api.post('/analytics/collect', payload, { timeout: 8000 }); } catch { /* analytics must never affect the page */ }
};

const utmFrom = (search: string) => {
  const p = new URLSearchParams(search); const o: Record<string, string> = {};
  for (const k of ['source', 'medium', 'campaign'] as const) { const v = p.get(`utm_${k}`); if (v) o[k] = v.slice(0, 60); }
  return Object.keys(o).length ? o : undefined;
};

let lastKey = '';
export const trackPageView = (pathname: string, search = '', referrer = ''): void => {
  const key = `${pathname}${search}`; if (key === lastKey) return; lastKey = key;
  const { type, listingId } = classifyRoute(pathname);
  const extra: Record<string, unknown> = {};
  if (listingId) extra.listingId = listingId;
  if (referrer) extra.referrer = referrer.slice(0, 400);
  const utm = utmFrom(search); if (utm) extra.utm = utm;
  void send(type, `${pathname}${search.startsWith('?nav=') || /[?&]nav=/.test(search) ? search : ''}`, extra);
};
export const trackRegistration = (): void => { void send('registration', '/register'); };
/** Sent right after sign-in so the existing guest session is upgraded to authenticated (one visit, never double counted). */
export const trackLoginHeartbeat = (pathname: string): void => { void send('heartbeat', pathname || '/'); };

let timer: ReturnType<typeof setInterval> | null = null;
export const startHeartbeat = (getPath: () => string): (() => void) => {
  if (timer) clearInterval(timer);
  timer = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState === 'visible') void send('heartbeat', getPath()); }, HEARTBEAT_MS);
  return () => { if (timer) clearInterval(timer); timer = null; };
};
export const __resetTrackerForTests = () => { lastKey = ''; if (timer) clearInterval(timer); timer = null; };
