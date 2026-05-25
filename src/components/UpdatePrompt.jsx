import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => {
        r.update();
      }, 60000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#111', borderTop: '1px solid rgba(212,196,168,0.2)',
      padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
        A new version is available
      </div>
      <button onClick={() => updateServiceWorker(true)} style={{
        padding: '8px 18px', borderRadius: 8, background: 'var(--gold)', color: '#000',
        border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Refresh
      </button>
    </div>
  );
}
