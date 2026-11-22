import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readThemePreference, saveThemePreference, applyTheme, resolveTheme, THEME_STORAGE_KEY } from '../../theme/themePreference';

const mm = (dark: boolean) => vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: dark && q.includes('dark'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme'); document.documentElement.classList.remove('dark'); vi.restoreAllMocks(); });

describe('theme preference', () => {
  it('defaults to system and ignores junk values', () => { expect(readThemePreference()).toBe('system'); localStorage.setItem(THEME_STORAGE_KEY, 'purple'); expect(readThemePreference()).toBe('system'); });
  it('persists light/dark/system and applies to <html>', () => {
    mm(false); saveThemePreference('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark'); expect(document.documentElement.getAttribute('data-theme')).toBe('dark'); expect(document.documentElement.classList.contains('dark')).toBe(true);
    saveThemePreference('light'); expect(document.documentElement.getAttribute('data-theme')).toBe('light'); expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
  it('system follows the OS', () => { mm(true); expect(resolveTheme('system')).toBe('dark'); expect(applyTheme('system')).toBe('dark'); mm(false); expect(resolveTheme('system')).toBe('light'); });
  it('survives unavailable storage', () => {
    mm(false); vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); }); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readThemePreference()).toBe('system'); expect(() => saveThemePreference('dark')).not.toThrow(); expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
