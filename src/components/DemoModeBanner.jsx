import { useState, useEffect } from 'react';
import { checkBackendAvailability, isDemoMode } from '../api/api';
import { X, RefreshCw, Terminal } from 'lucide-react';

export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [backendUp, setBackendUp] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (isDemoMode()) await checkBackendAvailability();
      const demo = isDemoMode();
      setVisible(demo);
      setBackendUp(!demo);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    const online = await checkBackendAvailability();
    setBackendUp(online);
    if (online) setVisible(false);
    setRetrying(false);
  };

  if (!visible || dismissed || backendUp) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg, #1a1207, #2a1f0e)',
      borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
      padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      fontSize: 12, color: 'rgba(255, 255, 255, 0.8)',
    }}>
      <Terminal size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
      <span style={{ fontWeight: 600, color: '#f59e0b' }}>Backend Offline</span>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>—</span>
      <span>Run <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>npm run dev:full</code> to start backend + frontend</span>
      <button onClick={handleRetry} disabled={retrying} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 6, padding: '4px 10px', color: '#f59e0b',
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
      }}>
        <RefreshCw size={12} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
        {retrying ? 'Checking...' : 'Retry'}
      </button>
      <button onClick={() => setDismissed(true)} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
        cursor: 'pointer', display: 'flex', padding: 2,
      }}>
        <X size={14} />
      </button>
    </div>
  );
}
