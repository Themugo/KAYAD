// src/pages/admin/AdminEscrows.jsx
import { useState, useEffect, useCallback } from 'react';
import { escrowAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

const STATUS_META = {
  pending:  { label: 'Pending',  badge: 'badge-orange', icon: '⏳' },
  held:     { label: 'Held',     badge: 'badge-blue',   icon: '💰' },
  released: { label: 'Released', badge: 'badge-green',  icon: '✅' },
  refunded: { label: 'Refunded', badge: 'badge-red',    icon: '↩️' },
  disputed: { label: 'Disputed', badge: 'badge-red',    icon: '⚠️' },
};

export default function AdminEscrows() {
  const { toast } = useToast();
  const [escrows, setEscrows] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [page, setPage]       = useState(1);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null); // detail modal

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const data = await escrowAPI.all(params);
      setEscrows(data.escrows || data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch { toast('Failed to load escrows', 'error'); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleRelease = async (id) => {
    if (!window.confirm('Release funds to the seller? This is irreversible.')) return;
    setActionId(id);
    try {
      await escrowAPI.release(id);
      toast('✅ Funds released to seller!', 'success');
      load();
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Release failed', 'error');
    } finally { setActionId(null); }
  };

  const handleRefund = async (id) => {
    if (!window.confirm('Refund funds to the buyer? This is irreversible.')) return;
    setActionId(id);
    try {
      await escrowAPI.refund(id);
      toast('↩️ Refund issued to buyer!', 'success');
      load();
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Refund failed', 'error');
    } finally { setActionId(null); }
  };

  // Summary counts
  const counts = escrows.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const heldTotal = escrows
    .filter(e => e.status === 'held')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        <div style={{ marginBottom: 28 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Escrow Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Control all buyer-seller payment escrows. Release or refund with full audit trail.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { label: 'Total Escrows', val: total, icon: '🔒', color: 'var(--text)' },
            { label: 'Awaiting Release', val: counts.held || 0, icon: '💰', color: 'var(--blue)' },
            { label: 'Funds Locked (KES)', val: formatKES(heldTotal), icon: '⏳', color: 'var(--gold-light)' },
            { label: 'Disputes', val: counts.disputed || 0, icon: '⚠️', color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color, fontSize: '1.5rem' }}>{s.val}</div>
                </div>
                <span style={{ fontSize: 26 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Alert: held escrows need action */}
        {(counts.held || 0) > 0 && (
          <div style={{
            background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 22 }}>💰</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--blue)', fontSize: 14 }}>
                {counts.held} escrow{counts.held !== 1 ? 's' : ''} awaiting your action
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Review held escrows and release or refund funds accordingly.
              </div>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setFilter('held')}>
              Show Held →
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="tabs">
          {['all', 'pending', 'held', 'released', 'refunded', 'disputed'].map(f => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`}
              onClick={() => { setFilter(f); setPage(1); }}>
              {STATUS_META[f]?.icon} {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (counts[f] || 0) > 0 && (
                <span style={{ marginLeft: 5, background: 'var(--surface)', borderRadius: 100, padding: '1px 7px', fontSize: 10 }}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : escrows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <h3>No escrow records</h3>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Car</th>
                    <th>Buyer</th>
                    <th>Seller</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map(e => {
                    const meta = STATUS_META[e.status] || { label: e.status, badge: 'badge-muted', icon: '•' };
                    const isHeld = e.status === 'held';
                    return (
                      <tr key={e._id} style={{ background: isHeld ? 'rgba(59,130,246,0.03)' : '' }}>
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          #{e._id?.slice(-8)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13, maxWidth: 180 }}>
                            {e.car?.title || 'Unknown Car'}
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          <div style={{ fontWeight: 500 }}>{e.buyer?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.buyer?.phone || ''}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          <div style={{ fontWeight: 500 }}>{e.seller?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.seller?.phone || ''}</div>
                        </td>
                        <td>
                          <div className="price-tag" style={{ fontSize: '0.95rem' }}>{formatKES(e.amount)}</div>
                        </td>
                        <td>
                          <span className={`badge ${meta.badge}`}>{meta.icon} {meta.label}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(e.createdAt).toLocaleDateString('en-KE')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexDirection: 'column', minWidth: 130 }}>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}
                              onClick={() => setSelected(e)}
                            >
                              🔍 Details
                            </button>
                            {isHeld && (
                              <>
                                <button className="btn btn-gold btn-sm" disabled={actionId === e._id}
                                  onClick={() => handleRelease(e._id)}>
                                  {actionId === e._id ? '...' : '✅ Release'}
                                </button>
                                <button className="btn btn-danger btn-sm" disabled={actionId === e._id}
                                  onClick={() => handleRefund(e._id)}>
                                  {actionId === e._id ? '...' : '↩️ Refund'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Escrow Detail</div>
                <h3 style={{ marginTop: 4 }}>{selected.car?.title || 'Car Purchase'}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Escrow ID', val: `#${selected._id?.slice(-10)}` },
                { label: 'Status', val: `${STATUS_META[selected.status]?.icon} ${selected.status}` },
                { label: 'Amount', val: formatKES(selected.amount) },
                { label: 'Created', val: new Date(selected.createdAt).toLocaleString('en-KE') },
                { label: 'Buyer', val: selected.buyer?.name || '—' },
                { label: 'Buyer Phone', val: selected.buyer?.phone || '—' },
                { label: 'Seller', val: selected.seller?.name || '—' },
                { label: 'Seller Phone', val: selected.seller?.phone || '—' },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: 14 }}>{row.val}</div>
                </div>
              ))}
            </div>

            {selected.status === 'held' && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-gold btn-full" disabled={actionId === selected._id}
                  onClick={() => handleRelease(selected._id)}>
                  {actionId === selected._id ? '...' : '✅ Release Funds to Seller'}
                </button>
                <button className="btn btn-danger btn-full" disabled={actionId === selected._id}
                  onClick={() => handleRefund(selected._id)}>
                  {actionId === selected._id ? '...' : '↩️ Refund to Buyer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
