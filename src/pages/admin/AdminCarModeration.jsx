import { useState, useEffect, useRef, useCallback } from 'react';
import { adminAPI, formatKES, bulkAdminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import { CheckCircle, XCircle, Clock, Search, Eye, Loader, RefreshCw, AlertTriangle } from 'lucide-react';

const STATUS_BADGE = {
  pending: 'badge-muted',
  available: 'badge-green',
  active: 'badge-green',
  rejected: 'badge-muted',
  hidden: 'badge-muted',
  sold: 'badge-gold',
  draft: 'badge-muted',
  reserved: 'badge-gold',
};

const listingId = (car) => car?._id || car?.id || null;
const listingStatus = (car) => {
  const value = car?.status ?? car?.auctionStatus ?? car?.auction_status;
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'unknown';
};
const isValidListingArray = (items) => Array.isArray(items) && items.every((item) =>
  item && typeof item === 'object' && !Array.isArray(item) && Boolean(listingId(item))
);

const PAGE_SIZE = 20;

export default function AdminCarModeration() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [hasMore, setHasMore] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);
  const [sentinelRef, sentinelEntry] = useIntersectionObserver();
  const pageRef = useRef(1);
  const searchRef = useRef('');
  const filterRef = useRef('pending');
  const requestSequence = useRef(0);

  const loadPage = useCallback(async (pageNum, append) => {
    const requestId = ++requestSequence.current;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setLoadError('');
    try {
      const params = { page: pageNum, limit: PAGE_SIZE };
      if (searchRef.current.trim()) params.search = searchRef.current.trim();
      if (filterRef.current !== 'all') params.status = filterRef.current;
      const data = await adminAPI.cars(params);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw Object.assign(new Error('Invalid listing response'), { code: 'INVALID_LISTING_RESPONSE' });
      }
      const items = data.cars ?? data.data;
      const totalValue = data.pagination?.total ?? data.total;
      const total = Number(totalValue);
      if (!isValidListingArray(items) || !Number.isFinite(total) || total < 0) {
        throw Object.assign(new Error('Invalid listing response'), { code: 'INVALID_LISTING_RESPONSE' });
      }
      if (requestId !== requestSequence.current) return;
      if (append) {
        setCars((prev) => {
          const seen = new Set(prev.map(listingId));
          return [...prev, ...items.filter((item) => !seen.has(listingId(item)))];
        });
      } else {
        setCars(items);
        setSelectedIds([]);
      }
      setHasMore(pageNum * PAGE_SIZE < total);
      setHasLoaded(true);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      const message = error?.code === 'INVALID_LISTING_RESPONSE'
        ? 'The listing service returned an unexpected response. No moderation records were cleared.'
        : error?.response?.status === 401
          ? 'Your session may have expired. Sign in again to access moderation.'
          : error?.response?.status === 403
            ? 'You do not have permission to access listing moderation.'
            : !error?.response
              ? 'Could not connect to the listing service. Check your connection and retry.'
              : 'The moderation queue could not be loaded. Existing records have been retained.';
      setLoadError(message);
      if (append) pageRef.current = Math.max(1, pageNum - 1);
      toast(message, 'error');
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    searchRef.current = search;
    filterRef.current = statusFilter;
    pageRef.current = 1;
    setHasMore(true);
    loadPage(1, false);
    return () => { requestSequence.current += 1; };
  }, [search, statusFilter, loadPage]);

  useEffect(() => {
    if (sentinelEntry?.isIntersecting && hasMore && !loading && !loadingMore) {
      pageRef.current += 1;
      loadPage(pageRef.current, true);
    }
  }, [sentinelEntry, hasMore, loading, loadingMore, loadPage]);

  const handleBulkModerate = async (action) => {
    if (selectedIds.length === 0) return;
    const adminNote = action === 'hide' ? prompt('Reason for hiding these listings (shown to the sellers):') : '';
    if (action === 'hide' && adminNote === null) return;
    setBulkAction(action);
    try {
      const result = await bulkAdminAPI.moderateCars({ carIds: selectedIds, action, adminNote });
      const changedCount = Number(result?.count);
      const skippedIds = new Set((Array.isArray(result?.skipped) ? result.skipped : []).map((item) => String(item.id)));
      toast(
        `${Number.isFinite(changedCount) ? changedCount : 0} listing(s) ${action === 'approve' ? 'approved' : 'hidden'}` +
          (skippedIds.size ? `; ${skippedIds.size} skipped by server safeguards` : ''),
        skippedIds.size ? 'warning' : 'success',
      );
      setSelectedIds([]);
      setSelected(null);
      // Reconcile with the server; a bulk response can report skipped or blocked records.
      await loadPage(1, false);
    } catch (error) {
      toast(error?.response?.data?.message || (action === 'approve' ? 'Failed to approve listings' : 'Failed to hide listings'), 'error');
      await loadPage(1, false);
    } finally { setBulkAction(null); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cars.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cars.map(listingId).filter(Boolean));
    }
  };

  const handleModerate = async (carId, action) => {
    const adminNote = action === 'hide' ? prompt('Reason for hiding this listing (shown to the seller):') : '';
    if (action === 'hide' && adminNote === null) return false;
    setActionId(carId);
    try {
      const result = await adminAPI.moderateCar(carId, { action, adminNote });
      toast(result?.message || (action === 'approve' ? 'Listing approved and published' : 'Listing hidden — not publicly visible'), 'success');
      setCars((prev) => prev.filter((car) => String(listingId(car)) !== String(carId)));
      setSelectedIds((prev) => prev.filter((id) => String(id) !== String(carId)));
      setSelected((current) => current && String(listingId(current)) === String(carId) ? null : current);
      return true;
    } catch (error) {
      toast(error?.response?.data?.message || (action === 'approve' ? 'Failed to approve listing' : 'Failed to hide listing'), 'error');
      return false;
    } finally { setActionId(null); }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <div className="section-eyebrow">Admin</div>
            <h1 style={{ margin: 0 }}>Car Moderation Queue</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Search listings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, minWidth: 220, width: '100%' }}
                aria-label="Search listings by title or vehicle"
              />
            </div>
            <select aria-label="Filter vehicles by moderation status" className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ minWidth: 140 }}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="available">Approved / Live</option>
              <option value="hidden">Hidden</option>
              <option value="sold">Sold</option>
            </select>
            <button type="button" className="btn btn-outline" disabled={loading} onClick={() => loadPage(1, false)} aria-label="Refresh moderation queue">
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
            </button>
          </div>
        </div>

        {loadError && (
          <div role="alert" aria-live="polite" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--border, #d8dce2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <AlertTriangle size={20} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--orange-400, #b7791f)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{hasLoaded ? 'Could not refresh moderation queue' : 'Could not load moderation queue'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>{loadError}</div>
              <button type="button" className="btn btn-sm btn-outline" disabled={loading} onClick={() => loadPage(1, false)}>
                <RefreshCw size={13} style={{ marginRight: 6 }} /> {loading ? 'Retrying…' : 'Try again'}
              </button>
              {hasLoaded && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' }}>Previously loaded records are retained and may be stale.</p>}
            </div>
          </div>
        )}

        {loading && cars.length === 0 ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : loadError && !hasLoaded ? null : cars.length === 0 && hasLoaded ? (
          <div className="empty-state">
            <Clock size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No listings found.</p>
          </div>
        ) : (
          <>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(23, 107, 135, 0.08)', borderRadius: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedIds.length} selected</span>
              <button
                className="btn btn-sm"
                style={{ background: '#22c55e', color: '#0a3340', fontWeight: 700, fontSize: 11, border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}
                disabled={bulkAction !== null}
                onClick={() => handleBulkModerate('approve')}>
                <CheckCircle size={12} style={{ marginRight: 4 }} />
                {bulkAction === 'approve' ? '…' : 'Approve Selected'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'transparent', border: '1px solid rgba(185,28,28,0.3)', color: '#b91c1c', fontWeight: 700, fontSize: 11, borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}
                disabled={bulkAction !== null}
                onClick={() => handleBulkModerate('hide')}>
                <XCircle size={12} style={{ marginRight: 4 }} />
                {bulkAction === 'hide' ? '…' : 'Hide Selected'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedIds([])} disabled={bulkAction !== null}
                style={{ marginLeft: 'auto', fontSize: 11 }}>
                Clear
              </button>
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" aria-label="Select all vehicles on this page" checked={cars.length > 0 && selectedIds.length === cars.length}
                      onChange={toggleSelectAll}
                      onClick={e => e.stopPropagation()}
                      style={{ accentColor: 'var(--brand)', cursor: 'pointer' }} />
                  </th>
                  <th>Listing</th>
                  <th>Dealer</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map(car => {
                  const carId = listingId(car);
                  const status = listingStatus(car);
                  const isSelected = selectedIds.includes(carId);
                  return (
                  <tr key={carId} onClick={() => setSelected(car)} style={{ cursor: 'pointer', opacity: isSelected ? 0.8 : 1 }}>
                    <td onClick={e => e.stopPropagation()} role="presentation">
                      <input type="checkbox" aria-label="Select this vehicle" checked={isSelected}
                        onChange={() => toggleSelect(carId)}
                        style={{ accentColor: 'var(--brand)', cursor: 'pointer' }} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{car.title || `${car.brand} ${car.model || ''}`}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {car.year || ''} &middot; {car.mileage ? `${(car.mileage / 1000).toFixed(0)}k km` : ''}
                      </div>
                    </td>
                    <td>{car.dealer?.name || car.dealer?.email || 'Unknown'}</td>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {car.price !== null && car.price !== undefined && car.price !== '' ? `KES ${formatKES(car.price)}` : 'Unavailable'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[status] || 'badge-muted'}`}>
                        {status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(car.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                        onClick={e => e.stopPropagation()} role="presentation">
                        <button
                          className="btn btn-sm"
                          style={{ background: '#22c55e', color: '#0a3340', fontWeight: 700, fontSize: 11, border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}
                          disabled={actionId === carId}
                          onClick={() => handleModerate(carId, 'approve')}>
                          <CheckCircle size={12} style={{ marginRight: 4 }} />
                          Approve
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'transparent', border: '1px solid rgba(185,28,28,0.3)', color: '#b91c1c', fontWeight: 700, fontSize: 11, borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}
                          disabled={actionId === carId}
                          onClick={() => handleModerate(carId, 'hide')}>
                          <XCircle size={12} style={{ marginRight: 4 }} />
                          Hide
                        </button>
                        <button className="btn btn-sm btn-outline"
                          onClick={() => setSelected(car)}>
                          <Eye size={12} style={{ marginRight: 4 }} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        )}

        {loadingMore && (
          <div className="loading-center" style={{ padding: '24px 0' }}>
            <Loader size={20} className="spinner" />
          </div>
        )}

        {hasMore && cars.length > 0 && <div ref={sentinelRef} style={{ height: 1 }} />}
        {hasMore && cars.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
            <button type="button" className="btn btn-outline" disabled={loadingMore || loading} onClick={() => {
              const nextPage = pageRef.current + 1;
              pageRef.current = nextPage;
              loadPage(nextPage, true);
            }}>
              {loadingMore ? 'Loading more…' : 'Load more listings'}
            </button>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" role="presentation" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{selected.title || `${selected.brand} ${selected.model || ''}`}</h2>
              <span className={`badge ${STATUS_BADGE[listingStatus(selected)] || 'badge-muted'}`}>
                {listingStatus(selected).replace(/_/g, ' ')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14, marginBottom: 16 }}>
              <div><strong>Price:</strong> {selected.price !== null && selected.price !== undefined && selected.price !== '' ? `KES ${formatKES(selected.price)}` : 'Unavailable'}</div>
              <div><strong>Year:</strong> {selected.year || '-'}</div>
              <div><strong>Mileage:</strong> {selected.mileage ? `${(selected.mileage / 1000).toFixed(0)}k km` : '-'}</div>
              <div><strong>Transmission:</strong> {selected.transmission || '-'}</div>
              <div><strong>Fuel:</strong> {selected.fuelType || '-'}</div>
              <div><strong>Dealer:</strong> {selected.dealer?.name || selected.dealer?.email || 'Unknown'}</div>
            </div>

            {selected.description && (
              <div style={{ marginBottom: 16 }}>
                <strong>Description:</strong>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{selected.description}</p>
              </div>
            )}

            {listingStatus(selected) === 'pending' && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-sm"
                  style={{ background: '#22c55e', color: '#0a3340', fontWeight: 700, border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
                  disabled={actionId === listingId(selected)}
                  onClick={async () => { if (await handleModerate(listingId(selected), 'approve')) setSelected(null); }}>
                  <CheckCircle size={14} style={{ marginRight: 6 }} /> Approve Listing
                </button>
                <button className="btn btn-sm"
                  style={{ background: '#b91c1c', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
                  disabled={actionId === listingId(selected)}
                  onClick={async () => { if (await handleModerate(listingId(selected), 'hide')) setSelected(null); }}>
                  <XCircle size={14} style={{ marginRight: 6 }} /> Hide Listing
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
