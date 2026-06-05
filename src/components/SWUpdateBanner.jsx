import { useRegisterSW } from 'virtual:pwa-register/react';

export default function SWUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1A1A1A', color: '#F0EDE6',
      padding: '12px 16px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', zIndex: 9999,
      borderTop: '1px solid var(--gold)',
      fontFamily: 'var(--font-body)',
    }}>
      <span style={{ fontSize: 14 }}>
        A new version of Kayad is available.
      </span>
      <button onClick={() => updateServiceWorker(true)} style={{
        background: 'var(--gold)', color: '#050505',
        border: 'none', padding: '6px 14px', borderRadius: 6,
        cursor: 'pointer', fontWeight: 600, fontSize: 13,
      }}>
        Update
      </button>
    </div>
  );
}
