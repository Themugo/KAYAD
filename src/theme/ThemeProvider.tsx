import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, defaultThemeConfig } from './ThemeConfig';

export interface ThemeContextType {
  theme: ThemeConfig;
  mode: 'dark' | 'light';
  setThemeMode: (mode: 'dark' | 'light' | 'auto') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultThemeConfig,
  mode: 'light',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('kayad_theme_mode') || localStorage.getItem('kayad_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return 'dark';
  });

  const setThemeMode = (newMode: 'dark' | 'light' | 'auto') => {
    let targetMode: 'dark' | 'light' = 'light';
    if (newMode === 'auto') {
      targetMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      targetMode = newMode;
    }
    setModeState(targetMode);
    localStorage.setItem('kayad_theme_mode', targetMode);
    localStorage.setItem('kayad_theme', targetMode);
  };

  const toggleTheme = () => {
    setThemeMode(mode === 'dark' ? 'light' : 'dark');
  };

  const themeConfig: ThemeConfig = {
    ...defaultThemeConfig,
    mode,
  };

  useEffect(() => {
    const root = document.documentElement;
    const isDark = mode === 'dark';

    root.classList.toggle('dark', isDark);

    if (isDark) {
      root.style.setProperty('--primary-navy', '#0F172A');
      root.style.setProperty('--secondary-navy', '#1E293B');
      root.style.setProperty('--aqua-accent', '#00C9CE');
      root.style.setProperty('--success-green', '#10B981');
      root.style.setProperty('--bg-light', '#0B132B');
      root.style.setProperty('--text-dark', '#F8FAFC');
      root.style.setProperty('--danger-red', '#EF4444');
      root.style.setProperty('--nav-active', '#00C9CE');
      root.style.setProperty('--warning-gold', '#F59E0B');
      root.style.setProperty('--info-indigo', '#6366F1');
      root.style.setProperty('--deepest-navy', '#020617');
      root.style.setProperty('--deep-navy', '#0B0F19');
      root.style.setProperty('--navy-highlight', '#38BDF8');
      root.style.setProperty('--warm-accent-bg', '#1E293B');
      root.style.setProperty('--muted-text', '#94A3B8');
    } else {
      root.style.setProperty('--primary-navy', defaultThemeConfig.tokens.colors.primaryNavy || '#1E3063');
      root.style.setProperty('--secondary-navy', defaultThemeConfig.tokens.colors.secondaryNavy || '#2A3B7A');
      root.style.setProperty('--aqua-accent', '#00C9CE');
      root.style.setProperty('--success-green', defaultThemeConfig.tokens.colors.emeraldGreen || '#166534');
      root.style.setProperty('--bg-light', defaultThemeConfig.tokens.colors.backgroundLight || '#FCF9F4');
      root.style.setProperty('--text-dark', defaultThemeConfig.tokens.colors.textDark || '#1E3063');
      root.style.setProperty('--danger-red', defaultThemeConfig.tokens.colors.crimsonRed || '#991B1B');
      root.style.setProperty('--nav-active', defaultThemeConfig.tokens.colors.navActive || '#00C9CE');
      root.style.setProperty('--warning-gold', defaultThemeConfig.tokens.colors.warningAmber || '#00C9CE');
      root.style.setProperty('--info-indigo', defaultThemeConfig.tokens.colors.navyHighlight || '#344999');
      root.style.setProperty('--deepest-navy', defaultThemeConfig.tokens.colors.deepestNavy || '#0B1628');
      root.style.setProperty('--deep-navy', defaultThemeConfig.tokens.colors.deepNavy || '#121D33');
      root.style.setProperty('--navy-highlight', defaultThemeConfig.tokens.colors.navyHighlight || '#344999');
      root.style.setProperty('--warm-accent-bg', defaultThemeConfig.tokens.colors.warmAccentBg || '#EFE8DA');
      root.style.setProperty('--muted-text', defaultThemeConfig.tokens.colors.textMuted || '#6B7A99');
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme: themeConfig, mode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export const useDesignTheme = useTheme;

