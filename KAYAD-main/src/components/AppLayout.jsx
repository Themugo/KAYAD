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
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <Navbar />
      </header>
      <main className="pt-[72px]">
        {children}
      </main>
    </div>
  );
}
