/**
 * A tiny, non-authoritative hint that this browser was signed in last time. It is never used to grant
 * access (the server session check always decides); it only lets the header decide what to show while
 * that check is still in flight: a returning member sees a neutral placeholder (no "Sign In" flash), while a
 * first-time visitor or a signed-out browser sees a working Sign In button immediately instead of
 * waiting for a slow server.
 */
const KEY = 'kayad_session_hint';

export function hasSessionHint(): boolean {
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function setSessionHint(): void {
  try { window.localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
}
export function clearSessionHint(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
