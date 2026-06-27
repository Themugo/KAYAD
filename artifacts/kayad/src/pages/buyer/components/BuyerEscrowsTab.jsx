import { Link } from 'react-router-dom';

function statusBadge(status) {
  const map = {
    pending:  { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)' },
    held:     { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    released: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
    refunded: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    disputed: { bg: 'rgba(255,159,67,0.1)', color: '#ff9f43' },
  };
  const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      {status.toUpperCase()}
    </span>
  );
}

export default function BuyerEscrowsTab({ escrows }) {
  if (escrows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
        <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 14, marginBottom: 8 }}>No escrows yet</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Escrows are created when you make a purchase or bid on a vehicle.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {escrows.map(e => (
        <div key={e._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{e.car?.title || 'Vehicle'}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              <span>KES {Number(e.amount||0).toLocaleString()}</span>
              <span>·</span>
              <span>{new Date(e.createdAt).toLocaleDateString()}</span>
              {e.deliveryConfirmed && (
                <>
                  <span>·</span>
                  <span style={{ color: '#22c55e' }}>✓ Delivery confirmed</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {e.status === 'held' && !e.deliveryConfirmed && (
              <Link to={`/escrow/${e._id}`} style={{
                padding: '6px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                color: '#22c55e', fontSize: 11, fontWeight: 600, textDecoration: 'none',
              }}>Confirm Delivery</Link>
            )}
            {statusBadge(e.status)}
          </div>
        </div>
      ))}
    </div>
  );
}
