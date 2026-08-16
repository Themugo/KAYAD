// Design System Tokens - JavaScript Utilities
// Use these in JavaScript/TypeScript when CSS variables aren't available

export const tokens = {
  // Typography
  typography: {
    fontFamily: {
      display: "'Playfair Display', Georgia, serif",
      sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "'JetBrains Mono', Consolas, monospace",
    },
    fontSize: {
      displayXl: 'clamp(3rem, 6vw, 4.5rem)',
      displayL: 'clamp(2.25rem, 4vw, 3rem)',
      h1: 'clamp(1.75rem, 3vw, 2.25rem)',
      h2: 'clamp(1.375rem, 2vw, 1.75rem)',
      h3: 'clamp(1.125rem, 1.5vw, 1.375rem)',
      h4: '1rem',
      bodyLg: '1.125rem',
      body: '1rem',
      bodySm: '0.875rem',
      caption: '0.75rem',
      overline: '0.6875rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.1,
      snug: 1.25,
      normal: 1.5,
      relaxed: 1.65,
    },
  },

  // Spacing (4px base)
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '28px',
    full: '9999px',
  },

  // Colors - Brand (Green)
  colors: {
    brand: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#2DD9BE',
      500: '#16C4A4',
      600: '#109E85',
      700: '#0C7B68',
      800: '#065F46',
      900: '#064E3B',
      DEFAULT: '#16C4A4',
      light: '#2DD9BE',
      dark: '#0C7B68',
    },
    // Surface (Dark)
    surface: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#0A1626',
    },
    // Background (Light)
    background: {
      base: '#FDFAF5',
      primary: '#FDFAF5',
      secondary: '#F7F2E8',
      tertiary: '#EDE7D9',
      elevated: '#FFFFFF',
      muted: '#EDE7D9',
    },
    // Status
    status: {
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    },
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    brand: '0 4px 14px rgba(22, 196, 164, 0.25)',
    'brand-lg': '0 8px 30px rgba(22, 196, 164, 0.35)',
  },

  // Z-Index
  zIndex: {
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modalBackdrop: 400,
    modal: 500,
    popover: 600,
    tooltip: 700,
    toast: 800,
  },

  // Transitions
  transitions: {
    duration: {
      instant: '50ms',
      fast: '100ms',
      normal: '150ms',
      slow: '200ms',
      slower: '250ms',
      slowest: '350ms',
    },
    easing: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      in: 'cubic-bezier(0.7, 0, 0.84, 0)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Helper to get CSS variable value
export const cssVar = (name: string): string => `var(--${name})`;

// Helper to create responsive style
export const responsive = <T>(
  styles: {
    base?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
  },
  property: keyof T
) => styles;

// Common style presets
export const presets = {
  card: {
    padding: tokens.spacing[6],
    background: tokens.colors.background.elevated,
    border: `1px solid ${tokens.colors.surface[200]}`,
    borderRadius: tokens.radius.xl,
    boxShadow: tokens.shadows.sm,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2],
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.semibold,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: `all ${tokens.transitions.duration.normal} ${tokens.transitions.easing.out}`,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    background: tokens.colors.background.elevated,
    border: `1px solid ${tokens.colors.surface[200]}`,
    borderRadius: tokens.radius.md,
  },
} as const;
