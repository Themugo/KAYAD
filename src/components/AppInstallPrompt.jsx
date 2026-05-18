import { useState, useEffect } from 'react';

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') console.log('User installed Kayad');
      setDeferredPrompt(null);
    });
  };

  if (!deferredPrompt) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div onClick={handleInstall} style={{
        background: 'var(--gold)', padding: '8px 14px', borderRadius: '2rem',
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 11,
        fontWeight: 700, color: '#0A1628', textTransform: 'uppercase',
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 14 }}>+</span>
        Install App
      </div>
    </div>
  );
}
