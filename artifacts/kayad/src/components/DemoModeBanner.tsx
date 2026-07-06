import { useState, useEffect } from 'react';
import { checkBackendAvailability, isDemoMode, disableDemoMode } from '../api/api';
import { useAuth } from '../context/AuthContext';

const DEMO_FORCE_OFF_KEY = 'kayad_demo_force_off';

// A subtle, professional "preview" indicator shown when the live backend
// isn't reachable and the app is serving sample data. Admin users get an
// additional "Disable Demo" button to switch into real-data mode.
export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showAdminOptions, setShowAdminOptions] = useState(false);
  const { user, isAdmin } = useAuth() as any;
  const isStaff = isAdmin || ['superadmin', 'admin', 'marketing', 'technical_support'].includes(user?.role);

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

  const handleDisableDemo = () => {
    // Force-disable demo mode: sets a localStorage flag and reloads so the
    // app re-initialises without demo data. The app will show an error state
    // (or blank data) if the real backend is still unreachable — that's OK;
    // admins use this to verify real-data connectivity.
    disableDemoMode();
    localStorage.setItem(DEMO_FORCE_OFF_KEY, '1');
    window.location.reload();
  };

  const handleResetDemo = () => {
    // Clear ALL demo-related storage and reload fresh demo mode
    ['kayad_demo_cars', 'kayad_demo_user', 'kayad_demo_team', DEMO_FORCE_OFF_KEY].forEach(k =>
      localStorage.removeItem(k)
    );
    window.location.reload();
  };

  if (!visible || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        display: 'inline-flex', flexDirection: showAdminOptions ? 'column' : 'row',
        alignItems: showAdminOptions ? 'stretch' : 'center',
        gap: showAdminOptions ? 6 : 8,
        background: 'rgba(17,17,17,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,196,168,0.25)',
        borderRadius: showAdminOptions ? 12 : 9999,
        padding: showAdminOptions ? '12px 14px' : '7px 12px 7px 14px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        fontFamily: 'var(--font-body, sans-serif)',
        minWidth: showAdminOptions ? 220 : 'auto',
      }}
    >
      {/* Main indicator row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold, #D4C4A8)', boxShadow: '0 0 8px rgba(212,196,168,0.7)', flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold, #D4C4A8)', letterSpacing: '0.04em' }}>
          Preview Mode
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
          sample data
        </span>
        {isStaff && (
          <button
            type="button"
            onClick={() => setShowAdminOptions(p => !p)}
            title="Admin demo controls"
            style={{ background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', borderRadius: 6, cursor: 'pointer', color: 'var(--gold)', fontSize: 10, fontWeight: 700, padding: '2px 7px', letterSpacing: '0.06em', marginLeft: 2 }}
          >
            {showAdminOptions ? '▲' : 'Admin'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss preview notice"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1, padding: '0 0 0 4px' }}
        >
          ×
        </button>
      </div>

      {/* Admin expanded panel */}
      {isStaff && showAdminOptions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 0' }}>
            Admin Controls
          </div>
          <button
            type="button"
            onClick={handleDisableDemo}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, padding: '8px 12px', cursor: 'pointer', color: '#ef4444', fontSize: 11.5, fontWeight: 700, textAlign: 'left' }}
          >
            🚫 Disable Demo Mode
            <div style={{ fontSize: 9.5, fontWeight: 400, color: 'rgba(239,68,68,0.7)', marginTop: 2 }}>Reload without sample data</div>
          </button>
          <button
            type="button"
            onClick={handleResetDemo}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: 700, textAlign: 'left' }}
          >
            🔄 Reset Demo Data
            <div style={{ fontSize: 9.5, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Clears edits, restores seed data</div>
          </button>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1.4, marginTop: 2 }}>
            Accounts: admin@kayad.com / Admin@1234<br/>
            superadmin@kayad.com / SuperAdmin@1234<br/>
            webhost@kayad.com / Webhost@1234
          </div>
        </div>
      )}
    </div>
  );
}
