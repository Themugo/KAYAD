import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import Navbar from './Navbar';
import Footer from './Footer';
import CompareDrawer from './CompareDrawer';
import DemoModeBanner from './DemoModeBanner';

export default function AppLayout({ children }) {
  const [config, setConfig] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    adminAPI.getPublicConfig().then(cfg => {
      setConfig(cfg.config || cfg);
    }).catch(() => {
      toast('Could not load site configuration', 'warning');
    });
  }, []);

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
      <Navbar branding={config?.branding} />
      <main id="app-main-content" className="app-main" role="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <CompareDrawer />
    </div>
  );
}
