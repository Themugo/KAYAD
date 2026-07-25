export interface ThemeColors {
  navbarBg: string;
  navbarText: string;
  navbarAccent: string;
  heroBg: string;
  heroText: string;
  heroAccent: string;
  footerBg: string;
  footerText: string;
  footerAccent: string;
  cardBg: string;
  cardBorder: string;
  cardHeading: string;
  cardBody: string;
  cardAccent: string;
  dashboardBg: string;
  dashboardCardBg: string;
  dashboardHeading: string;
  dashboardAccent: string;
  pageBg: string;
  bodyText: string;
  headingText: string;
  buttonBg: string;
  buttonText: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface ThemeSizes {
  headingScale: number;
  bodyScale: number;
  sectionPadding: number;
  cardPadding: number;
  radius: number;
}

export type NavbarLayout = 'centered' | 'split' | 'compact';
export type HeroLayout = 'centered' | 'split' | 'minimal';
export type FooterLayout = 'four-col' | 'three-col' | 'two-col' | 'centered';
export type CardLayout = 'standard' | 'compact' | 'magazine';
export type DashboardLayout = 'grid' | 'list' | 'sidebar';

export interface ThemeLayouts {
  navbar: NavbarLayout;
  hero: HeroLayout;
  footer: FooterLayout;
  card: CardLayout;
  dashboard: DashboardLayout;
}

export interface ThemeTimeRule {
  enabled: boolean;
  dayStartHour: number;
  nightStartHour: number;
  dayColors: Partial<ThemeColors>;
  nightColors: Partial<ThemeColors>;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
  sizes: ThemeSizes;
  layouts: ThemeLayouts;
  time: ThemeTimeRule;
}

export const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Outfit',
  'Georgia',
  'system-ui',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
];

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    navbarBg: '#1e3063',
    navbarText: '#ffffff',
    navbarAccent: '#00d1d5',
    heroBg: '#1e3063',
    heroText: '#ffffff',
    heroAccent: '#00d1d5',
    footerBg: '#141f42',
    footerText: '#ffffff',
    footerAccent: '#00d1d5',
    cardBg: '#fcf9f4',
    cardBorder: '#e8e4dc',
    cardHeading: '#1e3063',
    cardBody: '#4a5568',
    cardAccent: '#00d1d5',
    dashboardBg: '#fcf9f4',
    dashboardCardBg: '#ffffff',
    dashboardHeading: '#1e3063',
    dashboardAccent: '#3ddb72',
    pageBg: '#fcf9f4',
    bodyText: '#4a5568',
    headingText: '#1e3063',
    buttonBg: '#3ddb72',
    buttonText: '#1e3063',
  },
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter',
  },
  sizes: {
    headingScale: 1,
    bodyScale: 1,
    sectionPadding: 80,
    cardPadding: 20,
    radius: 16,
  },
  layouts: {
    navbar: 'split',
    hero: 'centered',
    footer: 'four-col',
    card: 'standard',
    dashboard: 'grid',
  },
  time: {
    enabled: false,
    dayStartHour: 6,
    nightStartHour: 18,
    dayColors: {
      pageBg: '#fcf9f4',
      bodyText: '#4a5568',
      headingText: '#1e3063',
      navbarBg: '#1e3063',
      heroBg: '#1e3063',
    },
    nightColors: {
      pageBg: '#fcf9f4',
      bodyText: '#4a5568',
      headingText: '#1e3063',
      navbarBg: '#0f1a35',
      heroBg: '#0f1a35',
    },
  },
};
