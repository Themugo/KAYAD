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
      position: 'fixed', bottom: 24, left: 24, right: 24, zIndex: 200,
      background: 'var(--gold)', padding: '14px 18px', borderRadius: '1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, background: '#0A1628', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>🚗</div>
        <div>
          <div style={{ color: '#0A1628', fontWeight: 900, fontSize: 11, textTransform: 'uppercase' }}>
            Install Kayad App
          </div>
          <div style={{ color: 'rgba(10,22,40,0.6)', fontSize: 10, marginTop: 1 }}>
            Faster bids & instant alerts
          </div>
        </div>
      </div>
      <button onClick={handleInstall} style={{
        background: '#0A1628', color: '#fff', border: 'none',
        padding: '9px 18px', borderRadius: '0.75rem', fontSize: 10,
        fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        Install
      </button>
    </div>
  );
}
