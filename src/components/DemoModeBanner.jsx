import { useState, useEffect } from 'react';
import { checkBackendAvailability, isDemoMode } from '../api/api';

// A subtle, professional "preview" indicator shown when the live backend
// isn't reachable and the app is serving sample data. Deliberately
// understated — a small corner pill, not an alarming full-width "offline"
// banner — so it never undermines a live demo or pitch.
export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      if (isDemoMode()) await checkBackendAvailability(1);
      const inDemo = isDemoMode();
      setVisible(inDemo);
      if (!inDemo) setDismissed(false);
    };
    check();
    const interval = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(17,17,17,0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(212,196,168,0.25)',
        borderRadius: 9999,
        padding: '7px 12px 7px 14px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        fontFamily: 'var(--font-body, sans-serif)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold, #D4C4A8)', boxShadow: '0 0 8px rgba(212,196,168,0.7)' }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold, #D4C4A8)', letterSpacing: '0.04em' }}>
        Preview Mode
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
        sample data
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss preview notice"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1,
          padding: '0 0 0 4px', marginLeft: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}
