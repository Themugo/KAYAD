import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, carsAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';

const STATUS_BADGE = {
  live:   'badge-green', draft: 'badge-muted', ended: 'badge-muted', sold: 'badge-gold',
};

// One row per listing, matching the seven columns declared in the table header.
function CarRow({ car: c, onDelete, onSelect, actionId }) {
  const price = Number(c.price ?? c.startingPrice);
  const vehicle = [c.year, Number.isFinite(Number(c.mileage)) && c.mileage !== null && c.mileage !== undefined ? `${Number(c.mileage).toLocaleString()} km` : null].filter(Boolean).join(' · ');
  return (
    <tr onClick={() => onSelect?.(c)}>
      <td>{c.image || c.images?.[0] ? <img src={c.image || c.images[0]} alt="" loading="lazy" decoding="async" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} /> : <span aria-hidden="true">—</span>}</td>
      <td style={{ fontWeight: 600 }}><Link to={`/cars/${c._id}`} style={{ color: 'var(--admin-brand-dark)' }} onClick={(e) => e.stopPropagation()}>{c.title || [c.year, c.brand, c.model].filter(Boolean).join(' ') || 'Untitled listing'}</Link></td>
      <td>{Number.isFinite(price) ? formatKES(price) : 'Unavailable'}</td>
      <td>{vehicle || '—'}</td>
      <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-muted'}`}>{c.status || 'unknown'}</span></td>
      <td>{c.createdAt ? timeAgo(c.createdAt) : '—'}</td>
      <td>
        <button type="button" className="btn btn-sm btn-danger" disabled={actionId === c._id + '-del'} onClick={(e) => { e.stopPropagation(); onDelete(c); }}>Delete</button>
      </td>
    </tr>
  );
}

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

  const handleDelete = useCallback(async (car) => {
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
  }, [selected, toast]);

  const filteredStats = useMemo(() => {
    const live = cars.filter(c => c.auction_status === 'live').length;
    const sold = cars.filter(c => c.auction_status === 'sold').length;
    const pending = cars.filter(c => c.auction_status === 'draft' || !c.auction_status).length;
    return { total: cars.length, live, sold, pending };
  }, [cars]);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h2 style={{ marginBottom: 24 }}>Listing Management</h2>

        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Listings', value: filteredStats.total, color: 'var(--brand)' },
            { label: 'Live Auctions', value: filteredStats.live, color: 'var(--green-400)' },
            { label: 'Sold', value: filteredStats.sold, color: 'var(--brand)' },
            { label: 'Pending', value: filteredStats.pending, color: 'var(--orange-400)' },
          ].map(s => (
            <div key={s.label} className="stat-box" style={{ textAlign: 'center', padding: 16 }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="data-table-controls" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder="Search listings..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: '1 1 260px', maxWidth: 360 }} aria-label="Search listings" />
          <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto' }} aria-label="Filter by status">
            <option value="all">All Status</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
            <option value="sold">Sold</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: 56 }}>Image</th>
                <th>Title</th>
                <th>Price</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Listed</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(c => (
                <CarRow key={c._id} car={c} onDelete={handleDelete} onSelect={setSelected} actionId={actionId} />
              ))}
              {cars.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No listings found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{total} total listings</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ padding: '4px 12px' }}>Page {page}</span>
            <button className="btn btn-sm btn-outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
