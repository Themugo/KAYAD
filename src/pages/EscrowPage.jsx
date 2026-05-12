// src/pages/EscrowPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { escrowAPI, formatKES } from '../api/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { timeAgo, formatDate } from '../utils/helpers';

const STATUS_META = {
  pending:  { label: 'Pending',  badge: 'badge-orange', icon: '⏳', desc: 'Awaiting payment confirmation.' },
  funded:   { label: 'Funded',   badge: 'badge-blue',   icon: '💰', desc: 'Funds held safely. Admin will release after car handover.' },
  released: { label: 'Released', badge: 'badge-green',  icon: '✅', desc: 'Funds released to seller. Deal complete!' },
  refunded: { label: 'Refunded', badge: 'badge-red',    icon: '↩️', desc: 'Funds returned to you.' },
  disputed: { label: 'Disputed', badge: 'badge-red',    icon: '⚠️', desc: 'Under review by admin.' },
};

export default function EscrowPage() {
  const { on } = useSocket();
  const { toast } = useToast();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab]         = useState('all');

  useEffect(() => {
    escrowAPI.mine()
      .then(d => setEscrows(d.escrows || d.data || []))
      .catch(() => toast('Failed to load escrows', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time escrow updates
  useEffect(() => {
    const offRelease = on('escrowReleased', data => {
      setEscrows(prev => prev.map(e => e._id === data.escrowId ? { ...e, status: 'released' } : e));
      toast('✅ Escrow released! Seller has been paid.', 'success');
    });
    const offRefund = on('escrowRefunded', data => {
      setEscrows(prev => prev.map(e => e._id === data.escrowId ? { ...e, status: 'refunded' } : e));
      toast('↩️ Escrow refunded to your account.', 'info');
    });
    return () => { offRelease(); offRefund(); };
  }, [on]);

  const filtered = tab === 'all' ? escrows : escrows.filter(e => e.status === tab);

  // Totals
  const totalLocked = escrows.filter(e => e.status === 'funded').reduce((s, e) => s + (e.amount || 0), 0);
  const totalReleased = escrows.filter(e => e.status === 'released').reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="section-eyebrow">Finance</div>
        <h2 style={{ marginBottom: 8 }}>🔒 My Escrow</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
          All your car purchase payments protected in escrow. Admin releases funds after car is received.
        </p>

        {/* ─── How it works ─── */}
        <div className="card" style={{ padding: 20, marginBottom: 28 }}>
          <div className="grid-4" style={{ textAlign: 'center' }}>
            {[
              { step: '1', icon: '💳', label: 'You Pay', desc: 'Full amount via M-Pesa into escrow' },
              { step: '2', icon: '🔒', label: 'Funds Locked', desc: 'Admin holds payment securely' },
              { step: '3', icon: '🚗', label: 'Car Delivered', desc: 'You inspect and confirm the car' },
              { step: '4', icon: '✅', label: 'Released', desc: 'Funds sent to seller' },
            ].map(s => (
              <div key={s.step}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-glow)', border: '1px solid var(--gold-muted)', color: 'var(--gold)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Summary ─── */}
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {[
            { label: 'Total Escrows',    val: escrows.length, icon: '🔒', color: 'var(--text)' },
            { label: 'Currently Locked', val: formatKES(totalLocked),   icon: '💰', color: 'var(--blue)' },
            { label: 'Total Released',   val: formatKES(totalReleased),  icon: '✅', color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color, fontSize: '1.3rem' }}>{s.val}</div>
                </div>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div className="tabs">
          {['all', 'funded', 'released', 'refunded', 'disputed'].map(t => {
            const count = t === 'all' ? escrows.length : escrows.filter(e => e.status === t).length;
            return (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {STATUS_META[t]?.icon || '📋'} {t.charAt(0).toUpperCase() + t.slice(1)}
                {count > 0 && <span style={{ marginLeft: 5, background: 'var(--surface)', borderRadius: 100, padding: '1px 6px', fontSize: 10 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* ─── Escrow List ─── */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <h3>No escrow records</h3>
            <p>When you buy a car via M-Pesa, your payment is protected here until you receive it.</p>
            <Link to="/" className="btn btn-gold" style={{ marginTop: 16 }}>Browse Cars →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(e => {
              const meta = STATUS_META[e.status] || { label: e.status, badge: 'badge-muted', icon: '•', desc: '' };
              return (
                <div key={e._id} className="card" style={{
                  padding: 20, cursor: 'pointer',
                  border: e.status === 'funded' ? '1px solid rgba(59,130,246,0.25)' : '1px solid var(--border)',
                }}
                  onClick={() => setSelected(e)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 32 }}>{meta.icon}</div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        {e.car?.title && (
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{e.car.title}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {meta.desc}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                        {e.createdAt ? timeAgo(e.createdAt) : ''} · #{e._id?.slice(-8)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="price-tag" style={{ fontSize: '1.3rem' }}>{formatKES(e.amount)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {e.status === 'funded' ? '🕐 Awaiting release' : ''}
                        {e.status === 'released' ? `Released ${e.releasedAt ? formatDate(e.releasedAt) : ''}` : ''}
                      </div>
                    </div>

                    <div style={{ color: 'var(--text-dim)', fontSize: 18 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Escrow Record</div>
                <h3 style={{ marginTop: 4 }}>{selected.car?.title || 'Car Purchase'}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Amount & status */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{STATUS_META[selected.status]?.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Escrow Amount</div>
              <div className="price-tag" style={{ fontSize: '2rem' }}>{formatKES(selected.amount)}</div>
              <span className={`badge ${STATUS_META[selected.status]?.badge || 'badge-muted'}`} style={{ marginTop: 10 }}>
                {STATUS_META[selected.status]?.label}
              </span>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
                {STATUS_META[selected.status]?.desc}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Escrow ID', val: `#${selected._id?.slice(-10)}`, mono: true },
                { label: 'Created',   val: selected.createdAt ? formatDate(selected.createdAt) : '—' },
                { label: 'Buyer',     val: selected.buyer?.name || '—' },
                { label: 'Seller',    val: selected.seller?.name || '—' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13, fontFamily: r.mono ? 'monospace' : undefined }}>{r.val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Need help? Contact support or raise a dispute from your admin dashboard.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
