import { ThemeTokens, AuctionTheme, ThemeDesignTokens } from './ThemeTokens';

export { AuctionTheme, ThemeTokens, ThemeDesignTokens };

export interface ThemeConfig {
  mode: 'dark' | 'light' | 'auto';
  tokens: typeof ThemeTokens;
}

export const defaultThemeConfig: ThemeConfig = {
  mode: 'dark',
  tokens: ThemeTokens,
};

