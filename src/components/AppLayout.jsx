import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';
import Navbar from './Navbar';

export default function AppLayout({ children }) {
  const [fonts, setFonts] = useState(null);

  useEffect(() => {
    adminAPI.getConfig().then(cfg => {
      const c = cfg.config || cfg;
      if (c.fontDisplay || c.fontBody) setFonts(c);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!fonts) return;
    const root = document.documentElement;
    if (fonts.fontDisplay) root.style.setProperty('--font-display', `'${fonts.fontDisplay}', Georgia, serif`);
    if (fonts.fontBody) root.style.setProperty('--font-body', `'${fonts.fontBody}', -apple-system, sans-serif`);
  }, [fonts]);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', overflowX: 'hidden' }}>
      <Navbar />
      <main style={{ paddingTop: 100 }}>
        {children}
      </main>
    </div>
  );
}
