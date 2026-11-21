import { createContext, useContext, useState, useEffect } from 'react';
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
      root.style.setProperty('--primary-navy', '#0a3340');
      root.style.setProperty('--secondary-navy', '#12576D');
      root.style.setProperty('--aqua-accent', '#13B8A6');
      root.style.setProperty('--success-green', '#10B981');
      root.style.setProperty('--bg-light', '#0A3340');
      root.style.setProperty('--text-dark', '#f6faf9');
      root.style.setProperty('--danger-red', '#EF4444');
      root.style.setProperty('--nav-active', '#13B8A6');
      root.style.setProperty('--warning-gold', '#176b87');
      root.style.setProperty('--info-indigo', '#176b87');
      root.style.setProperty('--deepest-navy', '#061F28');
      root.style.setProperty('--deep-navy', '#083441');
      root.style.setProperty('--navy-highlight', '#13B8A6');
      root.style.setProperty('--warm-accent-bg', '#12576D');
      root.style.setProperty('--muted-text', '#94A3B8');
    } else {
      root.style.setProperty('--primary-navy', defaultThemeConfig.tokens.colors.primaryNavy || '#176B87');
      root.style.setProperty('--secondary-navy', defaultThemeConfig.tokens.colors.secondaryNavy || '#12576D');
      root.style.setProperty('--aqua-accent', '#13B8A6');
      root.style.setProperty('--success-green', defaultThemeConfig.tokens.colors.emeraldGreen || '#166534');
      root.style.setProperty('--bg-light', defaultThemeConfig.tokens.colors.backgroundLight || '#F6FAF9');
      root.style.setProperty('--text-dark', defaultThemeConfig.tokens.colors.textDark || '#176B87');
      root.style.setProperty('--danger-red', defaultThemeConfig.tokens.colors.crimsonRed || '#991B1B');
      root.style.setProperty('--nav-active', defaultThemeConfig.tokens.colors.navActive || '#13B8A6');
      root.style.setProperty('--warning-gold', defaultThemeConfig.tokens.colors.warningAmber || '#13B8A6');
      root.style.setProperty('--info-indigo', defaultThemeConfig.tokens.colors.navyHighlight || '#176B87');
      root.style.setProperty('--deepest-navy', defaultThemeConfig.tokens.colors.deepestNavy || '#0A3340');
      root.style.setProperty('--deep-navy', defaultThemeConfig.tokens.colors.deepNavy || '#12576D');
      root.style.setProperty('--navy-highlight', defaultThemeConfig.tokens.colors.navyHighlight || '#176B87');
      root.style.setProperty('--warm-accent-bg', defaultThemeConfig.tokens.colors.warmAccentBg || '#DDF4F0');
      root.style.setProperty('--muted-text', defaultThemeConfig.tokens.colors.textMuted || '#64748b');
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

