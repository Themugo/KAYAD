// src/pages/admin/AdminCars.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, carsAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';

const STATUS_BADGE = {
  live:   'badge-green', draft: 'badge-muted', ended: 'badge-muted', sold: 'badge-gold',
};

export default function AdminCars() {
  const { toast } = useToast();
  const [cars, setCars]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.auctionStatus = statusFilter;
      const data = await adminAPI.cars(params);
      setCars(data.cars || data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch { toast('Failed to load listings', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (car) => {
    if (!window.confirm(`Delete "${car.title}"? Cannot be undone.`)) return;
    setActionId(car._id + '-del');
    try {
      await adminAPI.deleteCar(car._id);
      toast('Listing deleted', 'success');
      setCars(prev => prev.filter(c => c._id !== car._id));
      setTotal(t => t - 1);
      if (selected?._id === car._id) setSelected(null);
    } catch { toast('Delete failed', 'error'); }
    finally { setActionId(null); }
  };

  const handleFeature = async (car) => {
    setActionId(car._id + '-feat');
    try {
      await carsAPI.update(car._id, { isPromoted: !car.isPromoted });
      setCars(prev => prev.map(c => c._id === car._id ? { ...c, isPromoted: !c.isPromoted } : c));
      toast(car.isPromoted ? 'Removed from featured' : '⭐ Listing featured!', 'success');
    } catch { toast('Failed', 'error'); }
    finally { setActionId(null); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Car Listings <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 400 }}>({total.toLocaleString()} total)</span></h2>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search title, brand, dealer..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 300 }} />
          {['all', 'live', 'draft', 'ended', 'sold'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`btn btn-sm ${statusFilter === s ? 'btn-gold' : 'btn-outline'}`}>
              {s === 'live' ? '🔴 ' : ''}{s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading-center" style={{ padding: 48 }}><div className="spinner" /></div>
            ) : cars.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-icon">🚗</div>
                <h3>No listings found</h3>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Listing</th><th>Dealer</th><th>Price</th>
                    <th>Views</th><th>Bids</th><th>Trust</th>
                    <th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map(car => (
                    <tr key={car._id}
                      style={{ cursor: 'pointer', background: car.trustScore < 50 ? 'rgba(239,68,68,0.02)' : '' }}
                      onClick={() => setSelected(car)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 52, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                            {car.images?.[0]
                              ? <img src={car.images[0]?.url || car.images[0]} alt={car.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🚗</div>
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {car.year} · {car.fuel} · {car.location?.city}
                            </div>
                            {car.isPromoted && <span className="badge badge-gold" style={{ fontSize: 9, marginTop: 3 }}>★ FEATURED</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 500 }}>{car.dealer?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.dealer?.email}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatKES(car.currentBid || car.price)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{car.views || 0}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{car.bidsCount || 0}</td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: 13,
                          color: (car.trustScore ?? 100) >= 80 ? 'var(--green)'
                            : (car.trustScore ?? 100) >= 50 ? 'var(--gold)'
                            : 'var(--red)',
                        }}>
                          {car.trustScore ?? 100}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[car.auctionStatus] || 'badge-muted'}`}>
                          {(() => { const s = car.auctionStart ? new Date(car.auctionStart).getTime() : 0; const e = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0; const n = Date.now(); return s > 0 && e > 0 && s <= n && e > n; })() && <span className="live-dot" style={{ width: 6, height: 6 }} />}
                          {car.auctionStatus || 'listed'}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {car.createdAt ? timeAgo(car.createdAt) : '—'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, flexDirection: 'column', minWidth: 100 }}>
                          <Link to={`/cars/${car._id}`} target="_blank" className="btn btn-outline btn-sm">View</Link>
                          <button className={`btn btn-sm ${car.isPromoted ? 'btn-outline' : 'btn-gold'}`}
                            onClick={() => handleFeature(car)} disabled={actionId === car._id + '-feat'}>
                            {car.isPromoted ? '★ Unfeature' : '⭐ Feature'}
                          </button>
                          <button className="btn btn-danger btn-sm" disabled={actionId === car._id + '-del'}
                            onClick={() => handleDelete(car)}>
                            {actionId === car._id + '-del' ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)', gap: 4 }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Listing Detail</div>
                <h3 style={{ marginTop: 4 }}>{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {selected.images?.[0] && (
              <div style={{ aspectRatio: '16/9', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
                <img src={selected.images[0]?.url || selected.images[0]} alt={selected.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Price',       val: formatKES(selected.currentBid || selected.price) },
                { label: 'Trust Score', val: `${selected.trustScore ?? 100}%` },
                { label: 'Views',       val: selected.views || 0 },
                { label: 'Bids',        val: selected.bidsCount || 0 },
                { label: 'Dealer',      val: selected.dealer?.name || '—' },
                { label: 'Status',      val: selected.auctionStatus || 'listed' },
                { label: 'Listed',      val: selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-KE') : '—' },
                { label: 'ID',          val: `#${selected._id?.slice(-8)}`, mono: true },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: 14, fontFamily: r.mono ? 'monospace' : undefined }}>{r.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link to={`/cars/${selected._id}`} target="_blank" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                View Listing ↗
              </Link>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(selected)}
                disabled={actionId === selected._id + '-del'}>
                {actionId === selected._id + '-del' ? 'Deleting...' : '🗑 Delete Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
