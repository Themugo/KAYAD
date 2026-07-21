import { useState, useEffect, useCallback } from 'react';
import { adminPaymentsAPI, formatKES } from '../../api/api';
import { timeAgo } from '../../utils/helpers';

export default function AdminTransactions() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (filter !== 'all') params.status = filter;
      if (typeFilter !== 'all') params.type = typeFilter;
      const d = await adminPaymentsAPI.list(params);
      setPayments(d.payments || []);
      setSummary(d.summary || null);
      setTotal(d.pagination?.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter, typeFilter]);

  useEffect(() => { load(1); setPage(1); }, [filter, typeFilter, load]);
  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Transactions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Platform-wide payment oversight</p>
        </div>

        {summary && (
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Revenue', value: formatKES(summary.totalRevenue), icon: '💰' },
              { label: 'Transactions', value: summary.totalTransactions.toLocaleString(), icon: '📊' },
            ].map(s => (
              <div key={s.label} className="stat-box">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                  </div>
                  <span style={{ fontSize: 26 }}>{s.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto', padding: '8px 16px' }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select className="input" style={{ width: 'auto', padding: '8px 16px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="bid">Bid</option>
            <option value="purchase">Purchase</option>
            <option value="escrow">Escrow</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Car</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No transactions found</td></tr>
                ) : payments.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.user?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.user?.email || ''}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.car?.title || '—'}</td>
                    <td className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(p.amount)}</td>
                    <td><span className="badge badge-blue">{p.type}</span></td>
                    <td>
                      <span className={`badge ${p.status === 'success' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-orange'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.createdAt ? timeAgo(p.createdAt) : '—'}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelected(p)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}

        {selected && (
          <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} role="presentation" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3>Transaction Details</h3>
                <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'User', val: `${selected.user?.name} (${selected.user?.email})` },
                  { label: 'Car', val: selected.car?.title || '—' },
                  { label: 'Amount', val: formatKES(selected.amount) },
                  { label: 'Type', val: selected.type },
                  { label: 'Status', val: selected.status },
                  { label: 'M-Pesa Code', val: selected.mpesaCode || '—' },
                  { label: 'Date', val: selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-KE') : '—' },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
