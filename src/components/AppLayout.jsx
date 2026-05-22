import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';
import Navbar from './Navbar';
import Footer from './Footer';
import CompareDrawer from './CompareDrawer';
import BackendStatusBanner from './DemoModeBanner';

export default function AppLayout({ children }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    adminAPI.getConfig().then(cfg => {
      setConfig(cfg.config || cfg);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;

    if (config.fontDisplay) root.style.setProperty('--font-display', `'${config.fontDisplay}', Georgia, serif`);
    if (config.fontBody) root.style.setProperty('--font-body', `'${config.fontBody}', -apple-system, sans-serif`);

    if (config.fontSizePct) root.style.setProperty('--font-size-pct', String(config.fontSizePct));
    if (config.baseFontSize) root.style.setProperty('--base-font-size', `${config.baseFontSize}px`);
    if (config.lineHeight) root.style.setProperty('--body-line-height', String(config.lineHeight));

    const b = config.branding;
    if (b) {
      if (b.primaryColor) root.style.setProperty('--gold', b.primaryColor);
      if (b.accentColor) root.style.setProperty('--gold-light', b.accentColor);
      if (b.bgColor) root.style.setProperty('--bg', b.bgColor);
      if (b.surfaceColor) root.style.setProperty('--surface', b.surfaceColor);
      if (b.cardColor) root.style.setProperty('--card', b.cardColor);
      if (b.textColor) root.style.setProperty('--text', b.textColor);
    }
  }, [config]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <a href="#app-main-content" className="skip-link">
        Skip to main content
      </a>
      <BackendStatusBanner />
      <Navbar branding={config?.branding} />
      <main id="app-main-content" className="app-main" role="main" tabIndex={-1} style={{ paddingTop: 80 }}>
        {children}
      </main>
      <Footer />
      <CompareDrawer />
    </div>
  );
}
