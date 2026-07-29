/**
 * KAYAD Design Tokens
 * 
 * Centralized design system tokens for consistent styling.
 * These tokens will be implemented in future design phases.
 * 
 * @description
 * All design decisions should reference these tokens rather than hardcoded values.
 * This ensures consistency across the entire application.
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
  // Primary Colors
  primary: {
    50: '',
    100: '',
    200: '',
    300: '',
    400: '',
    500: '',
    600: '',
    700: '',
    800: '',
    900: '',
  },
  
  // Secondary Colors
  secondary: {
    50: '',
    100: '',
    200: '',
    300: '',
    400: '',
    500: '',
    600: '',
    700: '',
    800: '',
    900: '',
  },
  
  // Accent Colors
  accent: {
    50: '',
    100: '',
    200: '',
    300: '',
    400: '',
    500: '',
    600: '',
    700: '',
    800: '',
    900: '',
  },
  
  // Neutral Colors
  neutral: {
    50: '',
    100: '',
    200: '',
    300: '',
    400: '',
    500: '',
    600: '',
    700: '',
    800: '',
    900: '',
    950: '',
  },
  
  // Semantic Colors
  success: '',
  warning: '',
  error: '',
  info: '',
  
  // Background Colors
  background: {
    primary: '',
    secondary: '',
    tertiary: '',
  },
  
  // Surface Colors
  surface: {
    elevated: '',
    overlay: '',
    interactive: '',
  },
  
  // Text Colors
  text: {
    primary: '',
    secondary: '',
    muted: '',
    disabled: '',
    inverse: '',
  },
  
  // Border Colors
  border: {
    default: '',
    hover: '',
    focus: '',
    disabled: '',
  },
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: '',
    serif: '',
    mono: '',
    display: '',
  },
  
  // Font Sizes
  fontSize: {
    xs: '',
    sm: '',
    base: '',
    lg: '',
    xl: '',
    '2xl': '',
    '3xl': '',
    '4xl': '',
    '5xl': '',
    '6xl': '',
    '7xl': '',
    '8xl': '',
    '9xl': '',
  },
  
  // Font Weights
  fontWeight: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// ELEVATION / SHADOW TOKENS
// ============================================================================

export const elevation = {
  none: 'none',
  xs: '',
  sm: '',
  DEFAULT: '',
  md: '',
  lg: '',
  xl: '',
  '2xl': '',
  '3xl': '',
  inner: '',
} as const;

// ============================================================================
// BREAKPOINT TOKENS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export const animation = {
  // Durations
  duration: {
    instant: '0ms',
    fastest: '50ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
    persistent: '1000ms',
  },
  
  // Easing Functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // Custom easings
    spring: '',
    bounce: '',
    smooth: '',
  },
  
  // Keyframes
  keyframes: {
    fadeIn: '',
    fadeOut: '',
    slideInUp: '',
    slideInDown: '',
    slideInLeft: '',
    slideInRight: '',
    scaleIn: '',
    scaleOut: '',
    spin: '',
    pulse: '',
    ping: '',
    bounce: '',
  },
} as const;

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export const zIndex = {
  auto: 'auto',
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

// ============================================================================
// TRANSITION TOKENS
// ============================================================================

export const transition = {
  property: {
    none: 'none',
    all: 'all',
    default: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
    colors: 'background-color, border-color, color, fill, stroke',
    transform: 'transform',
    opacity: 'opacity',
    shadow: 'box-shadow',
  },
  duration: animation.duration,
  easing: animation.easing,
} as const;

// ============================================================================
// ICON SIZE TOKENS
// ============================================================================

export const iconSize = {
  xs: '0.625rem',  // 10px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '2.5rem', // 40px
  '4xl': '3rem',   // 48px
} as const;

// ============================================================================
// CONTAINER WIDTH TOKENS
// ============================================================================

export const containerWidth = {
  none: 'none',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
  full: '100%',
  prose: '65ch',
  screen: '100vw',
} as const;

// ============================================================================
// OPACITY TOKENS
// ============================================================================

export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  15: '0.15',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  35: '0.35',
  40: '0.4',
  45: '0.45',
  50: '0.5',
  55: '0.55',
  60: '0.6',
  65: '0.65',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  85: '0.85',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const;

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  elevation,
  breakpoints,
  animation,
  zIndex,
  transition,
  iconSize,
  containerWidth,
  opacity,
} as const;

export default tokens;
