// Light / dark / system theme preference. Self-contained (no provider): the choice is persisted in localStorage, applied to <html>
// (data-theme + the `dark` class), and "system" follows the OS live. index.html applies the same logic BEFORE first paint (no flash).
// Storage can throw or be empty (private windows, blocked storage): every access is guarded and the app falls back to "system".
export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'kayard_theme_preference';

export const isThemePreference = (v: unknown): v is ThemePreference => v === 'light' || v === 'dark' || v === 'system';

export function readThemePreference(): ThemePreference {
  try { const v = window.localStorage.getItem(THEME_STORAGE_KEY); return isThemePreference(v) ? v : 'system'; } catch { return 'system'; }
}
export function systemPrefersDark(): boolean {
  try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}
export const resolveTheme = (pref: ThemePreference): 'light' | 'dark' => (pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref);

export function applyTheme(pref: ThemePreference): 'light' | 'dark' {
  const resolved = resolveTheme(pref);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0A3340'); // navy in both themes
  }
  return resolved;
}
export function saveThemePreference(pref: ThemePreference): void {
  try { window.localStorage.setItem(THEME_STORAGE_KEY, pref); } catch { /* storage unavailable: the choice lasts for this page view only */ }
  applyTheme(pref);
  try { window.dispatchEvent(new CustomEvent('kayard:theme-change', { detail: pref })); } catch { /* noop */ }
}
/** Keep "system" in sync with the OS. Returns an unsubscribe function. */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const on = () => { if (readThemePreference() === 'system') applyTheme('system'); };
  mq.addEventListener?.('change', on);
  return () => mq.removeEventListener?.('change', on);
}
