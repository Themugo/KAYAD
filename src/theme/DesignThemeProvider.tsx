import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { DEFAULT_THEME, type ThemeConfig } from './themeTypes';

interface DesignThemeContextValue {
  theme: ThemeConfig;
  loading: boolean;
  saveTheme: (next: ThemeConfig) => Promise<void>;
  resetTheme: () => void;
}

const DesignThemeContext = createContext<DesignThemeContextValue | null>(null);

function resolveTimeColors(theme: ThemeConfig): ThemeConfig {
  if (!theme.time.enabled) return theme;
  const hour = new Date().getHours();
  const { dayStartHour, nightStartHour, dayColors, nightColors } = theme.time;
  const isDay = hour >= dayStartHour && hour < nightStartHour;
  return {
    ...theme,
    colors: { ...theme.colors, ...(isDay ? dayColors : nightColors) },
  };
}

function applyThemeToDom(theme: ThemeConfig) {
  const root = document.documentElement;
  const c = theme.colors;
  const vars: Record<string, string> = {
    '--c-navbar-bg': c.navbarBg,
    '--c-navbar-text': c.navbarText,
    '--c-navbar-accent': c.navbarAccent,
    '--c-hero-bg': c.heroBg,
    '--c-hero-text': c.heroText,
    '--c-hero-accent': c.heroAccent,
    '--c-footer-bg': c.footerBg,
    '--c-footer-text': c.footerText,
    '--c-footer-accent': c.footerAccent,
    '--c-card-bg': c.cardBg,
    '--c-card-border': c.cardBorder,
    '--c-card-heading': c.cardHeading,
    '--c-card-body': c.cardBody,
    '--c-card-accent': c.cardAccent,
    '--c-dashboard-bg': c.dashboardBg,
    '--c-dashboard-card-bg': c.dashboardCardBg,
    '--c-dashboard-heading': c.dashboardHeading,
    '--c-dashboard-accent': c.dashboardAccent,
    '--c-page-bg': c.pageBg,
    '--c-body-text': c.bodyText,
    '--c-heading-text': c.headingText,
    '--c-button-bg': c.buttonBg,
    '--c-button-text': c.buttonText,
    '--font-heading': theme.fonts.heading,
    '--font-body': theme.fonts.body,
  };
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--heading-scale', String(theme.sizes.headingScale));
  root.style.setProperty('--body-scale', String(theme.sizes.bodyScale));
  root.style.setProperty('--section-pad', `${theme.sizes.sectionPadding}px`);
  root.style.setProperty('--card-pad', `${theme.sizes.cardPadding}px`);
  root.style.setProperty('--radius', `${theme.sizes.radius}px`);
  root.style.setProperty('--layout-navbar', theme.layouts.navbar);
  root.style.setProperty('--layout-hero', theme.layouts.hero);
  root.style.setProperty('--layout-footer', theme.layouts.footer);
  root.style.setProperty('--layout-card', theme.layouts.card);
  root.style.setProperty('--layout-dashboard', theme.layouts.dashboard);
}

const STORAGE_KEY = 'kayad_design_theme';

function loadSavedTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ThemeConfig>;
      return { ...DEFAULT_THEME, ...parsed, colors: { ...DEFAULT_THEME.colors, ...parsed.colors }, fonts: { ...DEFAULT_THEME.fonts, ...parsed.fonts }, sizes: { ...DEFAULT_THEME.sizes, ...parsed.sizes }, layouts: { ...DEFAULT_THEME.layouts, ...parsed.layouts }, time: { ...DEFAULT_THEME.time, ...parsed.time } };
    }
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

export function DesignThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(loadSavedTheme);
  const [loading] = useState(false);

  useEffect(() => {
    const resolved = resolveTimeColors(theme);
    applyThemeToDom(resolved);
  }, [theme]);

  useEffect(() => {
    if (!theme.time.enabled) return;
    const id = setInterval(() => {
      const resolved = resolveTimeColors(theme);
      applyThemeToDom(resolved);
    }, 60000);
    return () => clearInterval(id);
  }, [theme]);

  const saveTheme = useCallback(async (next: ThemeConfig) => {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THEME));
  }, []);

  return (
    <DesignThemeContext.Provider value={{ theme, loading, saveTheme, resetTheme }}>
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useDesignTheme() {
  const ctx = useContext(DesignThemeContext);
  if (!ctx) throw new Error('useDesignTheme must be used within DesignThemeProvider');
  return ctx;
}
