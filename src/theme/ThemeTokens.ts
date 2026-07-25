export const AuctionTheme = {
  navy: {
    deepest: '#0B1628',
    deep: '#121D33',
    primary: '#1E3063',
    secondary: '#2A3B7A',
    highlight: '#344999',
  },
  gold: {
    primary: '#00C9CE',
    light: '#E0FAF9',
    amber: '#00C9CE',
  },
  cream: {
    primary: '#FCF9F4',
    sand: '#F5EFE6',
    warmAccent: '#EFE8DA',
    border: '#E2D8C7',
  },
  accent: {
    teal: '#00C9CE',
    emerald: '#166534',
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
      primary: '#1E3063',
      body: '#2B3B5C',
      muted: '#6B7A99',
      light: '#FCF9F4',
    }
  },
  typography: {
    fontSerif: "'Playfair Display', serif",
    fontSans: "'Plus Jakarta Sans', sans-serif",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  shadows: {
    subtle: "0 1px 2px 0 rgba(11, 22, 40, 0.05)",
    card: "0 4px 20px -2px rgba(11, 22, 40, 0.08)",
    hover: "0 10px 25px -5px rgba(11, 22, 40, 0.12)",
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
    textBody: '#2B3B5C',
    textMuted: '#6B7A99',
    crimsonRed: AuctionTheme.accent.crimson,
    navActive: '#00C9CE',
    warningAmber: AuctionTheme.gold.amber,
    azureTeal: '#00C9CE',
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


