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
    navbarBg: '#176B87',
    navbarText: '#ffffff',
    navbarAccent: '#13B8A6',
    heroBg: '#176B87',
    heroText: '#ffffff',
    heroAccent: '#13B8A6',
    footerBg: '#0A3340',
    footerText: '#ffffff',
    footerAccent: '#13B8A6',
    cardBg: '#F6FAF9',
    cardBorder: '#D7E7E4',
    cardHeading: '#176B87',
    cardBody: '#176b87',
    cardAccent: '#13B8A6',
    dashboardBg: '#F6FAF9',
    dashboardCardBg: '#ffffff',
    dashboardHeading: '#176B87',
    dashboardAccent: '#13B8A6',
    pageBg: '#F6FAF9',
    bodyText: '#176b87',
    headingText: '#176B87',
    buttonBg: '#13B8A6',
    buttonText: '#176B87',
  },
  fonts: {
    heading: 'Outfit',
    body: 'Plus Jakarta Sans',
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
      pageBg: '#F6FAF9',
      bodyText: '#176b87',
      headingText: '#176B87',
      navbarBg: '#176B87',
      heroBg: '#176B87',
    },
    nightColors: {
      pageBg: '#F6FAF9',
      bodyText: '#176b87',
      headingText: '#176B87',
      navbarBg: '#0A3340',
      heroBg: '#0A3340',
    },
  },
};
