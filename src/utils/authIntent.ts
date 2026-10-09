/**
 * Authentication intent: where a person was trying to go (`next`) and what they
 * came to do (`intent`) when they were sent to sign in or register.
 *
 * Both values are UX hints only. They never grant anything: the backend decides
 * roles and approvals, and a `next` path is only ever navigated to inside the
 * single-page app after being validated here.
 */

/** Pages that are part of the sign-in machinery; returning to them would loop. */
const AUTH_PATHS = new Set([
  '/login',
  '/admin/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/force-password-change',
]);

/** What a visitor says they came to do. Used only to pre-select a registration path. */
export const AUTH_INTENTS = ['buyer', 'seller', 'dealer', 'provider', 'professional'] as const;
export type AuthIntent = (typeof AUTH_INTENTS)[number];

export const isAuthIntent = (value: unknown): value is AuthIntent =>
  typeof value === 'string' && (AUTH_INTENTS as readonly string[]).includes(value);

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const PROBE_ORIGIN = 'https://kayad.invalid';
const MAX_LENGTH = 512;

/**
 * Returns a safe in-app path (pathname + search + hash) or `fallback`.
 * Rejects absolute and protocol-relative URLs, backslash tricks, control
 * characters, over-long values and the authentication pages themselves.
 */
export function safeNextPath<F extends string | null = null>(raw: unknown, fallback: F = null as F): string | F {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (CONTROL_CHARS.test(value) || value.includes('\\')) return fallback;

  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { return fallback; }
  if (decoded.startsWith('//') || decoded.startsWith('/\\') || CONTROL_CHARS.test(decoded) || decoded.includes('\\')) return fallback;

  let url: URL;
  try { url = new URL(value, PROBE_ORIGIN); } catch { return fallback; }
  if (url.origin !== PROBE_ORIGIN) return fallback;
  if (AUTH_PATHS.has(url.pathname.replace(/\/+$/, '') || '/')) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export type AuthKind = 'login' | 'register';

/** Canonical URL for the sign-in or registration page, carrying validated context. */
export function buildAuthPath(kind: AuthKind, ctx: { next?: unknown; intent?: unknown } = {}): string {
  const params = new URLSearchParams();
  const next = safeNextPath(ctx.next);
  if (next && next !== '/') params.set('next', next);
  if (isAuthIntent(ctx.intent)) params.set('intent', ctx.intent);
  const qs = params.toString();
  return `/${kind === 'login' ? 'login' : 'register'}${qs ? `?${qs}` : ''}`;
}

/** The page the visitor is on right now, as a `next` candidate. */
export function currentPathForNext(): string | null {
  if (typeof window === 'undefined') return null;
  return safeNextPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
}

export interface AuthContextInfo { next: string | null; intent: AuthIntent | null }

const STORAGE_KEY = 'kayad:auth-intent';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Remember (non-sensitive) intent across the email-verification round trip,
 * which usually happens in another tab. Holds only a validated path and an
 * allow-listed intent word - never credentials, tokens or personal data.
 */
export function rememberAuthIntent(ctx: { next?: unknown; intent?: unknown }): void {
  try {
    const next = safeNextPath(ctx.next);
    const intent = isAuthIntent(ctx.intent) ? ctx.intent : null;
    if (!next && !intent) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ next, intent, at: Date.now() }));
  } catch { /* storage unavailable: the URL still carries the context */ }
}

export function readStoredAuthIntent(): AuthContextInfo {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > STORAGE_TTL_MS) return { next: null, intent: null };
    return { next: safeNextPath(parsed.next), intent: isAuthIntent(parsed.intent) ? parsed.intent : null };
  } catch { return { next: null, intent: null }; }
}

export function clearStoredAuthIntent(): void {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

const fromLocationState = (state: unknown): string | null => {
  const from = (state as { from?: unknown } | null | undefined)?.from;
  if (typeof from === 'string') return safeNextPath(from);
  if (from && typeof from === 'object') {
    const f = from as { pathname?: string; search?: string; hash?: string };
    return safeNextPath(`${f.pathname || ''}${f.search || ''}${f.hash || ''}`);
  }
  return null;
};

/**
 * Resolve the context for the current auth page: explicit `?next=`/`?intent=`
 * first, then router `state.from` (set by route guards), then what was
 * remembered before an email-verification round trip.
 */
export function readAuthContext(location: { search?: string; state?: unknown }, opts: { useStored?: boolean } = {}): AuthContextInfo {
  const params = new URLSearchParams(location.search || '');
  const stored = opts.useStored ? readStoredAuthIntent() : { next: null, intent: null };
  const rawIntent = params.get('intent');
  return {
    next: safeNextPath(params.get('next')) || fromLocationState(location.state) || stored.next,
    intent: isAuthIntent(rawIntent) ? rawIntent : stored.intent,
  };
}

/** Sign-in URL that returns to `loc` (a router location or window.location) afterwards. */
export function loginPathFor(loc: { pathname?: string; search?: string; hash?: string }, intent?: unknown): string {
  return buildAuthPath('login', { next: `${loc.pathname || ''}${loc.search || ''}${loc.hash || ''}`, intent });
}
