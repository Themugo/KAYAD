// src/pages/PaymentsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { paymentsAPI, formatKES } from '../api/api';
import { useToast } from '../context/ToastContext';
import { timeAgo, copyToClipboard } from '../utils/helpers';
import EmptyState from '../components/EmptyState';

const STATUS_BADGE = { success: 'badge-green', pending: 'badge-orange', failed: 'badge-red', cancelled: 'badge-muted' };
const STATUS_ICON  = { success: '✅', pending: '⏳', failed: '❌', cancelled: '—' };

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await paymentsAPI.myPayments();
      setPayments(d.payments || d.data || []);
    } catch { toast('Failed to load payments', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter(p => {
    const statusOk = filter === 'all' || p.status === filter;
    const typeOk   = typeFilter === 'all' || p.type === typeFilter;
    return statusOk && typeOk;
  });

  // Summary stats
  const totalSpent  = payments.filter(p => p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0);
  const successCount = payments.filter(p => p.status === 'success').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const bidPayments  = payments.filter(p => p.type === 'bid' && p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0);

  const handleCopy = async (text) => {
    const ok = await copyToClipboard(text);
    if (ok) toast('Copied!', 'success');
  };

  const handleRefreshStatus = async (paymentId, checkoutId) => {
    try {
      const d = await paymentsAPI.status(checkoutId || paymentId);
      if (d.payment?.status === 'success') {
        toast('Payment confirmed!', 'success');
        load();
      } else {
        toast(`Status: ${d.payment?.status || 'pending'}`, 'info');
      }
    } catch { toast('Could not fetch status', 'error'); }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="section-eyebrow">Finance</div>
        <h2 style={{ marginBottom: 32 }}>💳 Payment History</h2>

        {/* ─── Summary Cards ─── */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Spent',    val: formatKES(totalSpent),  icon: '💰', color: 'var(--gold-light)' },
            { label: 'Successful',     val: successCount,            icon: '✅', color: 'var(--green)' },
            { label: 'Pending',        val: pendingCount,            icon: '⏳', color: 'var(--orange)' },
            { label: 'Bid Commitments', val: formatKES(bidPayments), icon: '⚡', color: 'var(--blue)' },
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

        {/* ─── Filters ─── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'success', 'pending', 'failed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`btn btn-sm ${filter === s ? 'btn-gold' : 'btn-outline'}`}>
              {STATUS_ICON[s] || '📋'} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          {['all', 'buy', 'bid', 'escrow'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`btn btn-sm ${typeFilter === t ? 'btn-outline' : 'btn-ghost'}`}
              style={{ color: typeFilter === t ? 'var(--gold)' : undefined }}>
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ─── Table ─── */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="💳"
            title={filter === 'all' && typeFilter === 'all' ? 'No payments yet' : 'No matching payments'}
            description="Your M-Pesa transactions appear here after placing bids or buying cars."
            action={{ label: 'Browse Cars', onClick: () => window.location.href = '/' }}
          />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Car</th><th>Type</th><th>Amount</th>
                    <th>Phone</th><th>Status</th><th>Receipt</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {p.createdAt ? timeAgo(p.createdAt) : '—'}
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.car?.title || '—'}
                      </td>
                      <td>
                        <span className={`badge ${p.type === 'bid' ? 'badge-blue' : p.type === 'escrow' ? 'badge-purple' : 'badge-gold'}`}>
                          {p.type === 'bid' ? '⚡' : p.type === 'escrow' ? '🔒' : '💳'} {p.type}
                        </span>
                      </td>
                      <td>
                        <span className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(p.amount)}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {p.phone ? `...${p.phone.slice(-4)}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[p.status] || 'badge-muted'}`}>
                          {STATUS_ICON[p.status]} {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {p.mpesaReceiptNumber
                          ? <span onClick={e => { e.stopPropagation(); handleCopy(p.mpesaReceiptNumber); }} style={{ cursor: 'pointer', color: 'var(--gold)' }} title="Click to copy">
                              {p.mpesaReceiptNumber}
                            </span>
                          : '—'
                        }
                      </td>
                      <td>
                        {p.status === 'pending' && (
                          <button className="btn btn-outline btn-sm"
                            onClick={e => { e.stopPropagation(); handleRefreshStatus(p._id, p.checkoutRequestID); }}>
                            ↻
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail modal ─── */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payment Detail</div>
                <h3 style={{ marginTop: 4 }}>{selected.car?.title || 'Payment'}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{STATUS_ICON[selected.status]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Amount Paid</div>
              <div className="price-tag" style={{ fontSize: '2rem' }}>{formatKES(selected.amount)}</div>
              <span className={`badge ${STATUS_BADGE[selected.status] || 'badge-muted'}`} style={{ marginTop: 8 }}>
                {selected.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Type',         val: selected.type },
                { label: 'Date',         val: selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-KE') : '—' },
                { label: 'Phone',        val: selected.phone || '—' },
                { label: 'Checkout ID',  val: selected.checkoutRequestID?.slice(-12) || '—', mono: true },
                { label: 'M-Pesa Ref',   val: selected.mpesaReceiptNumber || '—', mono: true },
                { label: 'Result Code',  val: selected.resultCode ?? '—' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 500, fontSize: 13, marginTop: 4, fontFamily: r.mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>
                    {r.val}
                  </div>
                </div>
              ))}
            </div>

            {selected.mpesaReceiptNumber && (
              <button className="btn btn-outline btn-full" style={{ marginTop: 20 }}
                onClick={() => handleCopy(selected.mpesaReceiptNumber)}>
                📋 Copy M-Pesa Receipt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
