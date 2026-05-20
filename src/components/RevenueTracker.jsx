import { TrendingUp, Wallet, ArrowDownLeft, FileText, CheckCircle } from 'lucide-react';
import { formatKES } from '../api/api';

export default function RevenueTracker({ stats }) {
  const s = stats || { totalVolume: 0, commitments: 0, sales: 0, pending: 0, recent: [], feesPaid: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 16, opacity: 0.1 }}><Wallet size={80} /></div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>Total Sales Volume</p>
          <h2 style={{ fontSize: '1.875rem', fontFamily: 'monospace', color: 'white', marginTop: 8 }}>{formatKES(s.totalVolume)}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 10, marginTop: 16, fontWeight: 700 }}>
            <TrendingUp size={12} /> Live tracking active
          </div>
        </div>

        <div style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>Bid Commitments</p>
          <h2 style={{ fontSize: '1.875rem', fontFamily: 'monospace', color: 'var(--gold)', marginTop: 8 }}>{formatKES(s.commitments)}</h2>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Non-refundable deposits collected</p>
        </div>

        <div style={{ background: '#111', padding: 24, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>Successful Sales</p>
          <h2 style={{ fontSize: '1.875rem', fontFamily: 'monospace', color: 'white', marginTop: 8 }}>{formatKES(s.sales)}</h2>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Full vehicle payouts released</p>
        </div>
      </div>

      {s.feesPaid > 0 && (
        <div style={{ padding: 16, background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fecdd3' }}>Kayad Platform Fees Paid</h4>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total spent on listings and promotions</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: 'white' }}>{formatKES(s.feesPaid)}</h4>
              <button style={{ fontSize: 10, color: '#fb7185', textDecoration: 'underline', textTransform: 'uppercase', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Get Invoices</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#111', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 14 }}>Recent Transactions</h3>
          <button style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={12} /> Statement
          </button>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {s.recent?.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No transactions yet</div>
          ) : (s.recent || []).map((tx, i) => (
            <div key={tx._id || i} style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <ArrowDownLeft size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{tx.carTitle || tx.car?.title || 'Vehicle Sale'}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{tx.date ? new Date(tx.date).toLocaleDateString() : tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ''}  {tx.type ? `• ${tx.type}` : ''}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: 'white' }}>+{formatKES(tx.amount)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: '#10b981', fontSize: 10, fontWeight: 700 }}>
                  <CheckCircle size={10} /> VERIFIED
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
