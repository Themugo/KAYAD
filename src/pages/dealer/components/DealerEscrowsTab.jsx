import { RefreshCw } from 'lucide-react';
import { StatusBadge, EscrowProgress, ESCROW_STEPS, timeAgo } from './DashboardWidgets';

export default function DealerEscrowsTab({ escrows, escrowLoading, onRefresh }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>Escrow Transactions</h2>
        <button onClick={onRefresh} disabled={escrowLoading} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={12} /> {escrowLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      {escrows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No escrow transactions yet</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 }}>Escrows are created automatically when a bid is accepted</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
          {escrows.map(e => {
            const amount = e.amount || e.price || 0;
            const status = e.status || 'pending';
            const stepIndex = ESCROW_STEPS.findIndex(s => s.key === status);
            return (
              <div key={e._id} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{e.carTitle || e.car?.title || 'Vehicle'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{e.buyerName || e.buyer?.name || 'Buyer'}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <EscrowProgress status={status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(amount).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step {stepIndex + 1}/{ESCROW_STEPS.length}</div>
                    <div style={{ fontSize: 11, color: ESCROW_STEPS[stepIndex]?.color || 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{status}</div>
                  </div>
                </div>
                {e.createdAt && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                    Created {timeAgo(e.createdAt)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
