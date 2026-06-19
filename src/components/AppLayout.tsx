import { useState, useEffect, ReactNode, useCallback } from 'react';
import { adminAPI } from '../api/api';
import Navbar from './Navbar';
import Footer from './Footer';
import CompareDrawer from './CompareDrawer';
import DemoModeBanner from './DemoModeBanner';

interface SiteConfig {
  fontDisplay?: string;
  fontBody?: string;
  fontSizePct?: number;
  baseFontSize?: number;
  lineHeight?: number;
}

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  const loadConfig = useCallback(() => {
    adminAPI.getPublicConfig().then(cfg => {
      setConfig(cfg.config || cfg);
    }).catch(() => {
      // Silently fail - use defaults
    });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;

    if (config.fontDisplay) root.style.setProperty('--font-display', `'${config.fontDisplay}', Georgia, serif`);
    if (config.fontBody) root.style.setProperty('--font-body', `'${config.fontBody}', -apple-system, sans-serif`);

    if (config.fontSizePct) root.style.setProperty('--font-size-pct', String(config.fontSizePct));
    if (config.baseFontSize) root.style.setProperty('--base-font-size', `${config.baseFontSize}px`);
    if (config.lineHeight) root.style.setProperty('--body-line-height', String(config.lineHeight));
  }, [config]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <a href="#app-main-content" className="skip-link">
        Skip to main content
      </a>
      <DemoModeBanner />
      <Navbar />
      <main id="app-main-content" className="app-main" role="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <CompareDrawer />
    </div>
  );
}
