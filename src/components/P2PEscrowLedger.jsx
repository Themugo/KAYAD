export default function P2PEscrowLedger({ escrows = [] }) {
  const held = escrows.filter(e => e.status === 'held');
  const heldTotal = held.reduce((acc, e) => acc + (e.amount || 0), 0);
  const awaitingRelease = escrows.filter(e => e.status === 'held' && e.buyer?.confirmedDelivery);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: 40 }}>
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: 24, borderRadius: '1rem' }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#f59e0b' }}>Held in Bank (P2P)</p>
          <h3 style={{ fontSize: '1.875rem', fontFamily: 'monospace', marginTop: 8, color: 'white' }}>KES {heldTotal.toLocaleString('en-KE')}</h3>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: 24, borderRadius: '1rem' }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#3b82f6' }}>Awaiting Release</p>
          <h3 style={{ fontSize: '1.875rem', fontFamily: 'monospace', marginTop: 8, color: 'white' }}>{awaitingRelease.length} Cars</h3>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: 24, borderRadius: '1rem' }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#10b981' }}>Total Escrows</p>
          <h3 style={{ fontSize: '1.875rem', fontFamily: 'monospace', marginTop: 8, color: 'white' }}>{escrows.length}</h3>
        </div>
      </div>

      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '1rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>
            <tr>
              <th style={{ padding: 16 }}>Car & Seller</th>
              <th style={{ padding: 16 }}>Buyer Status</th>
              <th style={{ padding: 16 }}>Amount</th>
              <th style={{ padding: 16 }}>Action</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #222' }}>
            {escrows.filter(e => e.status === 'held').length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No held escrows awaiting action</td></tr>
            ) : escrows.filter(e => e.status === 'held').map(e => (
              <tr key={e._id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: 16 }}>
                  <p style={{ fontWeight: 700, color: 'white' }}>{e.car?.title || 'Vehicle'}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Seller: {e.seller?.name || 'Individual'} (Indiv)</p>
                </td>
                <td style={{ padding: 16, color: '#34d399', fontWeight: 700, fontStyle: 'italic' }}>
                  {e.buyer?.confirmedDelivery ? '✓ Car Received' : '⏳ Awaiting Delivery Confirmation'}
                </td>
                <td style={{ padding: 16, fontFamily: 'monospace' }}>KES {Number(e.amount).toLocaleString('en-KE')}</td>
                <td style={{ padding: 16 }}>
                  {e.buyer?.confirmedDelivery ? (
                    <button style={{ background: 'var(--gold)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      Finalize Bank Transfer to Seller
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Await buyer confirmation</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
