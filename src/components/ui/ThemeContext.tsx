import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Light theme tokens
const lightTheme = {
  '--color-bg-base': '#FDFAF5',
  '--color-bg-primary': '#FDFAF5',
  '--color-bg-secondary': '#F7F2E8',
  '--color-bg-elevated': '#FFFFFF',
  '--color-bg-muted': '#EDE7D9',
  '--color-bg-surface': '#F7F2E8',
  '--color-text-primary': '#2E2B28',
  '--color-text-secondary': '#4A4540',
  '--color-text-muted': '#9A9088',
  '--color-text-dim': '#C8BFB0',
  '--color-text-inverse': '#FFFFFF',
  '--color-border': '#E0D8C8',
  '--color-border-soft': '#EDE7D9',
  '--color-border-strong': '#C8BFB0',
  '--color-surface-900': '#0A1626',
  '--color-surface-850': 'rgba(10, 22, 38, 0.98)',
  '--nav-bg': '#0A1626',
  '--nav-bg-scrolled': 'rgba(10, 22, 38, 0.98)',
  '--nav-text': '#FDFAF5',
  '--nav-text-muted': 'rgba(253, 250, 245, 0.65)',
};

// Dark theme tokens
const darkTheme = {
  '--color-bg-base': '#0A0A0A',
  '--color-bg-primary': '#0A0A0A',
  '--color-bg-secondary': '#111111',
  '--color-bg-elevated': '#1A1A1A',
  '--color-bg-muted': '#222222',
  '--color-bg-surface': '#111111',
  '--color-text-primary': '#F0EDE6',
  '--color-text-secondary': '#B0A89E',
  '--color-text-muted': '#6B6560',
  '--color-text-dim': '#4A4540',
  '--color-text-inverse': '#0A0A0A',
  '--color-border': '#2A2A2A',
  '--color-border-soft': '#1F1F1F',
  '--color-border-strong': '#3A3A3A',
  '--color-surface-900': '#050505',
  '--color-surface-850': 'rgba(5, 5, 5, 0.98)',
  '--nav-bg': '#050505',
  '--nav-bg-scrolled': 'rgba(5, 5, 5, 0.98)',
  '--nav-text': '#F0EDE6',
  '--nav-text-muted': 'rgba(240, 237, 230, 0.6)',
};

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  storageKey = 'kayad-theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return defaultTheme;
  });

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    const tokens = newTheme === 'dark' ? darkTheme : lightTheme;
    
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    root.setAttribute('data-theme', newTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey, applyTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(storageKey);
      // Only auto-switch if user hasn't set a preference
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
