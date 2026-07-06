// src/pages/EscrowPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { escrowAPI, formatKES } from '../api/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { timeAgo, formatDate } from '../utils/helpers';
import { ShieldCheck, X } from 'lucide-react';
import EscrowTimeline from '../components/EscrowTimeline';
import EmptyState from '../components/EmptyState';

const STATUS_META = {
  pending:  { label: 'Pending',  badge: 'badge-orange', icon: '⏳', desc: 'Awaiting payment confirmation.' },
  held:     { label: 'Held',     badge: 'badge-blue',   icon: '💰', desc: 'Funds held safely. Confirm delivery to request release.' },
  released: { label: 'Released', badge: 'badge-green',  icon: '✅', desc: 'Funds released to seller. Deal complete!' },
  refunded: { label: 'Refunded', badge: 'badge-red',    icon: '↩️', desc: 'Funds returned to you.' },
  disputed: { label: 'Disputed', badge: 'badge-red',    icon: '⚠️', desc: 'Under review by admin.' },
};

const ESCROW_STEPS = [
  { key: 'created',              label: 'Escrow Created', icon: '📄' },
  { key: 'funded',               label: 'Payment Funded', icon: '💰' },
  { key: 'buyer_requested_release', label: 'Delivery Confirmed', icon: '🚗' },
  { key: 'released',             label: 'Funds Released',  icon: '✅' },
];

function Stepper({ escrow }) {
  const history = escrow.history || [];
  const doneKeys = new Set(history.map(h => h.action));
  const currentIdx = (() => { for (let i = ESCROW_STEPS.length - 1; i >= 0; i--) { if (doneKeys.has(ESCROW_STEPS[i].key)) return i; } return -1; })();

  return (
    <div style={{ display: 'flex', gap: 0, margin: '20px 0 24px', position: 'relative', padding: '20px 0' }}>
      {ESCROW_STEPS.map((s, i) => {
        const isDone = doneKeys.has(s.key);
        const isCurrent = i === currentIdx;
        const isNext = i === currentIdx + 1;
        return (
          <div key={s.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            {i < ESCROW_STEPS.length - 1 && (
              <div style={{
                position: 'absolute', top: 14, left: '50%', width: '100%',
                height: 2, background: isDone ? '#22c55e' : isCurrent ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.08)',
                zIndex: 0, transition: 'background 0.3s',
              }} />
            )}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', margin: '0 auto 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDone ? '#22c55e' : isCurrent ? 'var(--gold)' : isNext ? 'rgba(212,196,168,0.1)' : 'rgba(255,255,255,0.06)',
              color: isDone || isCurrent ? '#000' : isNext ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
              fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 1,
              border: isCurrent && !isDone ? '2px solid var(--gold)' : isNext ? '1px solid rgba(212,196,168,0.3)' : 'none',
              transition: 'all 0.3s',
              boxShadow: isCurrent ? '0 0 0 4px rgba(212,196,168,0.1)' : 'none',
            }}>
              {isDone ? '✓' : s.icon}
            </div>
            <div style={{ 
              fontSize: 10, 
              color: isDone ? '#22c55e' : isCurrent ? 'var(--gold)' : isNext ? 'rgba(212,196,168,0.6)' : 'rgba(255,255,255,0.3)', 
              fontWeight: isCurrent ? 700 : 500,
              transition: 'all 0.3s',
            }}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EscrowPage() {
  const { on } = useSocket();
  const { toast } = useToast();
  const { user } = useAuth();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab]         = useState('all');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    escrowAPI.mine()
      .then(d => setEscrows(d.escrows || d.data || []))
      .catch((error) => {
        console.error('Failed to load escrows:', error);
        toast('Failed to load escrows', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Real-time escrow updates
  useEffect(() => {
    const offFunded = on('escrowFunded', data => {
      setEscrows(prev => prev.map(e => e._id === data.escrowId ? { ...e, status: 'held' } : e));
      toast('💰 Payment confirmed! Funds are now held in escrow.', 'success');
    });
    const offRelease = on('escrowReleased', data => {
      setEscrows(prev => prev.map(e => e._id === data.escrowId ? { ...e, status: 'released', releasedAt: new Date().toISOString() } : e));
      toast('✅ Escrow released! Seller has been paid.', 'success');
    });
    const offRefund = on('escrowRefunded', data => {
      setEscrows(prev => prev.map(e => e._id === data.escrowId ? { ...e, status: 'refunded' } : e));
      toast('↩️ Escrow refunded to your account.', 'info');
    });
    const offDisputed = on('escrowDisputed', data => {
      setEscrows(prev => prev.map(e => e._id === data.escrowId ? { ...e, status: 'disputed' } : e));
      toast('⚠️ Escrow disputed. Admin has been notified.', 'info');
    });
    return () => { offFunded(); offRelease(); offRefund(); offDisputed(); };
  }, [on]);

  const filtered = tab === 'all' ? escrows : escrows.filter(e => e.status === tab);

  const totalLocked = escrows.filter(e => e.status === 'held').reduce((s, e) => s + (e.amount || 0), 0);
  const totalReleased = escrows.filter(e => e.status === 'released').reduce((s, e) => s + (e.amount || 0), 0);

  const handleRequestRelease = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await escrowAPI.requestRelease(selected._id);
      toast('🚗 Delivery confirmed! Admin has been notified to release funds.', 'success');
      setSelected(null);
      load();
    } catch (e) {
      toast(e.response?.data?.message || 'Request failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDispute = async () => {
    if (!selected || !disputeReason.trim()) return;
    setSubmitting(true);
    try {
      await escrowAPI.dispute(selected._id, disputeReason.trim());
      toast('⚠️ Dispute raised. Our team will review.', 'info');
      setDisputeOpen(false);
      setDisputeReason('');
      setSelected(null);
      load();
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to raise dispute', 'error');
    } finally { setSubmitting(false); }
  };

  const isBuyer = (e) => String(e.buyer?._id || e.buyer) === String(user?._id || user?.id);

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
          {['all', 'held', 'released', 'refunded', 'disputed'].map(t => {
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
          <EmptyState
            icon="🔒"
            title="No escrow records"
            description="When you buy a car via M-Pesa, your payment is protected here until you receive it."
            action={{ label: 'Browse Cars →', onClick: () => window.location.href = '/' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(e => {
              const meta = STATUS_META[e.status] || { label: e.status, badge: 'badge-muted', icon: '•', desc: '' };
              return (
                <div key={e._id} className="card" style={{
                  padding: 20, cursor: 'pointer',
                  border: e.status === 'held' ? '1px solid rgba(59,130,246,0.25)' : '1px solid var(--border)',
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
                        {e.status === 'held' ? '🕐 Awaiting release' : ''}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Escrow Record</div>
                <h3 style={{ marginTop: 4 }}>{selected.car?.title || 'Car Purchase'}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Timeline Stepper */}
            <Stepper escrow={selected} />

            {/* Detailed Timeline */}
            <EscrowTimeline escrow={selected} />

            {/* Amount & status */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', marginBottom: 16 }}>
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

            {/* History */}
            {(selected.history?.length || 0) > 0 && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Activity</div>
                {selected.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                    <span>•</span>
                    <span>{h.action.replace(/_/g, ' ')}</span>
                    {h.at && <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)' }}>{formatDate(h.at)}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Confirm Delivery (Buyer only, when held) */}
              {selected.status === 'held' && isBuyer(selected) && !disputeOpen && (
                <button onClick={handleRequestRelease} disabled={submitting}
                  className="btn btn-gold btn-full">
                  {submitting ? 'Confirming…' : '🚗 Confirm Delivery & Request Release'}
                </button>
              )}

              {/* Raise Dispute */}
              {['held', 'pending'].includes(selected.status) && !disputeOpen && (
                <button onClick={() => setDisputeOpen(true)}
                  style={{
                    background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 'var(--radius)', padding: '10px 16px',
                    color: '#ef4444', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                  ⚠️ Raise a Dispute
                </button>
              )}

              {/* Dispute Form */}
              {disputeOpen && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius)', padding: 14,
                }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
                    Describe your issue
                  </label>
                  <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                    placeholder="Explain what went wrong…"
                    style={{
                      width: '100%', minHeight: 70, resize: 'vertical',
                      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setDisputeOpen(false); setDisputeReason(''); }}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={handleDispute} disabled={submitting || !disputeReason.trim()}
                      style={{
                        background: '#ef4444', border: 'none', borderRadius: 8, padding: '7px 14px',
                        color: '#fff', fontWeight: 700, fontSize: 11, cursor: submitting ? 'wait' : 'pointer',
                        opacity: (submitting || !disputeReason.trim()) ? 0.5 : 1,
                      }}>
                      {submitting ? 'Submitting…' : 'Submit Dispute'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selected.status === 'disputed' && selected.disputeReason && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Dispute Reason</div>
                {selected.disputeReason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
