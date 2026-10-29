import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';

const STATUS_BADGE = {
  live: 'badge-green',
  draft: 'badge-muted',
  ended: 'badge-muted',
  sold: 'badge-gold',
};

export const normalizeListingStatus = (car) => {
  const value = car?.auctionStatus ?? car?.auction_status ?? car?.status;
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'unknown';
};

export const getLoadErrorMessage = (error) => {
  const status = error?.response?.status;
  const body = error?.response?.data || {};
  const code = String(body.code || '').toUpperCase();

  if (code === 'SYSTEM_MAINTENANCE' || body.maintenance === true) {
    return 'The system is under confirmed maintenance. Try again when service is restored.';
  }
  if (status === 401) return 'Your session may have expired. Sign in again to review listings.';
  if (status === 403) return 'You do not have permission to view listing management.';
  if (!error?.response) return 'Could not connect to the listing service. Check your connection and retry.';
  if (status >= 500) return 'The listing service is temporarily unavailable. Your records have not been cleared.';
  return 'The listing request could not be completed. Please retry or contact support if the problem continues.';
};

export const isListingArray = (value) => Array.isArray(value) && value.every((item) =>
  item && typeof item === 'object' && !Array.isArray(item) &&
  (typeof item._id === 'string' || typeof item.id === 'string')
);

function CarRow({ car: c, onDelete, onSelect, actionId }) {
  const priceValue = c.price ?? c.startingPrice;
  const price = priceValue === null || priceValue === undefined || priceValue === '' ? NaN : Number(priceValue);
  const vehicle = [c.year, Number.isFinite(Number(c.mileage)) && c.mileage !== null && c.mileage !== undefined && c.mileage !== '' ? `${Number(c.mileage).toLocaleString()} km` : null].filter(Boolean).join(' · ');
  const status = normalizeListingStatus(c);
  const id = c._id || c.id;
  const image = c.image || c.images?.[0] || c.photos?.[0];
  const title = c.title || [c.year, c.brand, c.model].filter(Boolean).join(' ') || 'Untitled listing';

  return (
    <tr onClick={() => onSelect?.(c)}>
      <td>{image ? <img src={image} alt="" loading="lazy" decoding="async" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span aria-hidden="true">—</span>}</td>
      <td style={{ fontWeight: 600, minWidth: 180 }}><Link to={`/cars/${id}`} style={{ color: 'var(--admin-brand-dark)' }} onClick={(e) => e.stopPropagation()}>{title}</Link></td>
      <td>{Number.isFinite(price) ? formatKES(price) : 'Unavailable'}</td>
      <td>{vehicle || '—'}</td>
      <td><span className={`badge ${STATUS_BADGE[status] || 'badge-muted'}`}>{status.replace(/_/g, ' ')}</span></td>
      <td>{(c.createdAt || c.created_at) ? timeAgo(c.createdAt || c.created_at) : '—'}</td>
      <td>
        <button type="button" className="btn btn-sm btn-danger" aria-label={`Remove listing ${title}`} disabled={actionId === `${id}-del`} onClick={(e) => { e.stopPropagation(); onDelete(c); }}>
          {actionId === `${id}-del` ? 'Removing…' : 'Remove'}
        </button>
      </td>
    </tr>
  );
}

export default function AdminCars() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.auctionStatus = statusFilter;
      const data = await adminAPI.cars(params);

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw Object.assign(new Error('Unexpected listing response'), { code: 'INVALID_LISTING_RESPONSE' });
      }
      const listingData = data.cars ?? data.data;
      if (!isListingArray(listingData)) {
        throw Object.assign(new Error('Unexpected listing response'), { code: 'INVALID_LISTING_RESPONSE' });
      }
      const rawTotal = data.pagination?.total ?? data.total;
      const parsedTotal = Number(rawTotal);
      if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
        throw Object.assign(new Error('Unexpected listing total'), { code: 'INVALID_LISTING_RESPONSE' });
      }

      if (requestId !== requestSequence.current) return;
      setCars(listingData);
      setTotal(parsedTotal);
      setHasLoaded(true);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      const message = error?.code === 'INVALID_LISTING_RESPONSE'
        ? 'The listing service returned an unexpected response. No records have been marked as empty.'
        : getLoadErrorMessage(error);
      setLoadError(message);
      toast(message, 'error');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [page, search, statusFilter, toast]);

  useEffect(() => {
    load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  const handleDelete = useCallback(async (car) => {
    const id = car?._id || car?.id;
    if (!id) {
      toast('This listing has no valid identifier and cannot be removed.', 'error');
      return;
    }
    const title = car.title || [car.year, car.brand, car.model].filter(Boolean).join(' ') || 'this listing';
    if (!window.confirm(`Remove "${title}" from listing management? Existing lifecycle and deletion safeguards will apply.`)) return;
    setActionId(`${id}-del`);
    try {
      await adminAPI.deleteCar(id);
      toast('Listing removal confirmed by the server', 'success');
      setCars((prev) => prev.filter((item) => (item._id || item.id) !== id));
      setTotal((count) => Math.max(0, count - 1));
      if (selected && (selected._id || selected.id) === id) setSelected(null);
    } catch (error) {
      const message = error?.response?.data?.message || 'The listing could not be removed. The server did not confirm the change.';
      toast(message, 'error');
      await load();
    } finally {
      setActionId(null);
    }
  }, [selected, toast, load]);

  const pageStats = useMemo(() => {
    const statuses = cars.map(normalizeListingStatus);
    return {
      live: statuses.filter((status) => status === 'live').length,
      sold: statuses.filter((status) => status === 'sold').length,
      pending: statuses.filter((status) => status === 'draft' || status === 'pending' || status === 'awaiting_review').length,
    };
  }, [cars]);

  const refresh = () => {
    if (!loading) load();
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>Listing Management</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Review vehicle listings and their current marketplace status.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={refresh} disabled={loading} aria-label="Refresh listings">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loadError && (
          <div role="alert" aria-live="polite" style={{ border: '1px solid var(--border, #d8dce2)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{hasLoaded ? 'Could not refresh listings' : 'Could not load listings'}</div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{loadError}</div>
            <button type="button" className="btn btn-sm btn-outline" onClick={refresh} disabled={loading}>{loading ? 'Retrying…' : 'Try again'}</button>
            {hasLoaded && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Previously loaded records are retained and may be stale.</p>}
          </div>
        )}

        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Listings', value: hasLoaded ? total : '—', note: 'Across all pages', color: 'var(--brand)' },
            { label: 'Live Auctions', value: hasLoaded ? pageStats.live : '—', note: 'On this page', color: 'var(--green-400)' },
            { label: 'Sold', value: hasLoaded ? pageStats.sold : '—', note: 'On this page', color: 'var(--brand)' },
            { label: 'Pending', value: hasLoaded ? pageStats.pending : '—', note: 'On this page', color: 'var(--orange-400)' },
          ].map((stat) => (
            <div key={stat.label} className="stat-box" style={{ textAlign: 'center', padding: 16 }}>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{stat.note}</div>
            </div>
          ))}
        </div>

        <div className="data-table-controls" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder="Search listings..." value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            style={{ flex: '1 1 260px', maxWidth: 360 }} aria-label="Search listings" />
          <select className="input" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            style={{ width: 'auto' }} aria-label="Filter by auction status">
            <option value="all">All Status</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
            <option value="sold">Sold</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="data-table" aria-busy={loading}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 64 }}>Image</th>
                <th>Title</th>
                <th>Price</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Listed</th>
                <th style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => (
                <CarRow key={car._id || car.id} car={car} onDelete={handleDelete} onSelect={setSelected} actionId={actionId} />
              ))}
              {!loading && !loadError && hasLoaded && cars.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                  {search.trim() || statusFilter !== 'all' ? 'No listings match the current search or status filter.' : 'No listings are currently available.'}
                </td></tr>
              )}
              {loading && cars.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>Loading listings…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{hasLoaded ? `${total.toLocaleString()} total listings` : 'Total unavailable until listings load successfully'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn btn-sm btn-outline" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Prev</button>
            <span style={{ padding: '4px 12px' }}>Page {page}</span>
            <button type="button" className="btn btn-sm btn-outline" disabled={loading || page * 20 >= total} onClick={() => setPage((current) => current + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
