export const AuctionTheme = {
  navy: {
    deepest: '#0A3340',
    deep: '#12576D',
    primary: '#176B87',
    secondary: '#12576D',
    highlight: '#13B8A6',
  },
  gold: {
    primary: '#13B8A6',
    light: '#E0FAF9',
    amber: '#13B8A6',
  },
  cream: {
    primary: '#F6FAF9',
    sand: '#EEF7F5',
    warmAccent: '#DDF4F0',
    border: '#D7E7E4',
  },
  accent: {
    teal: '#13B8A6',
    emerald: '#176B87',
    crimson: '#991B1B',
  },
} as const;

export const ThemeDesignTokens = {
  colors: {
    navy: AuctionTheme.navy,
    gold: AuctionTheme.gold,
    cream: AuctionTheme.cream,
    accent: AuctionTheme.accent,
    text: {
      primary: '#176B87',
      body: '#365563',
      muted: '#66808A',
      light: '#F6FAF9',
    }
  },
  typography: {
    fontSerif: "'Playfair Display', serif",
    fontSans: "'Plus Jakarta Sans', sans-serif",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  shadows: {
    subtle: "0 1px 2px 0 rgba(10, 51, 64, 0.05)",
    card: "0 4px 20px -2px rgba(10, 51, 64, 0.08)",
    hover: "0 10px 25px -5px rgba(10, 51, 64, 0.12)",
  }
} as const;

export const ThemeTokens = {
  colors: {
    primaryNavy: AuctionTheme.navy.primary,
    secondaryNavy: AuctionTheme.navy.secondary,
    champagneGold: AuctionTheme.gold.primary,
    emeraldGreen: AuctionTheme.accent.emerald,
    backgroundLight: AuctionTheme.cream.primary,
    backgroundSand: AuctionTheme.cream.sand,
    textDark: AuctionTheme.navy.primary,
    textBody: '#365563',
    textMuted: '#66808A',
    crimsonRed: AuctionTheme.accent.crimson,
    navActive: '#13B8A6',
    warningAmber: AuctionTheme.gold.amber,
    azureTeal: '#13B8A6',
    deepestNavy: AuctionTheme.navy.deepest,
    deepNavy: AuctionTheme.navy.deep,
    navyHighlight: AuctionTheme.navy.highlight,
    warmAccentBg: AuctionTheme.cream.warmAccent,
    borderWarm: AuctionTheme.cream.border,
  },
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'Plus Jakarta Sans', sans-serif",
  },
  auction: AuctionTheme,
  design: ThemeDesignTokens,
} as const;

export type ThemeColors = typeof ThemeTokens.colors;


