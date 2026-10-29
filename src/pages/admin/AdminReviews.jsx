import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Star, RefreshCw, Search, ChevronLeft, ChevronRight, MessageSquareWarning } from 'lucide-react';

const PAGE_SIZE = 20;
const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const STATUS_COLORS = {
  pending: { color: '#92400e', background: '#fef3c7' },
  approved: { color: '#166534', background: '#dcfce7' },
  rejected: { color: '#991b1b', background: '#fee2e2' },
};
const reviewId = (review) => String(review?.id || review?._id || '');
const safeDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
};
const safeRating = (value) => {
  const rating = Number(value);
  return Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0;
};

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [statusCounts, setStatusCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setLoadError('');
    try {
      const data = await adminAPI.reviews({ page, limit: PAGE_SIZE, ...(status !== 'all' ? { status } : {}) });
      if (sequence !== requestSequence.current) return;
      if (!data || !Array.isArray(data.reviews) || !data.pagination) {
        throw new Error('The review service returned an unexpected response.');
      }
      setReviews(data.reviews);
      setTotal(Number.isFinite(Number(data.pagination.total)) ? Number(data.pagination.total) : data.reviews.length);
      if (data.statusCounts && typeof data.statusCounts === 'object') {
        setStatusCounts({
          total: Number(data.statusCounts.total) || 0,
          pending: Number(data.statusCounts.pending) || 0,
          approved: Number(data.statusCounts.approved) || 0,
          rejected: Number(data.statusCounts.rejected) || 0,
        });
      }
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setLoadError(error?.response?.data?.message || error?.message || 'Reviews could not be loaded. Existing decisions have not been changed.');
      toast('Failed to load reviews', 'error');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [page, status, toast]);

  useEffect(() => { load(); return () => { requestSequence.current += 1; }; }, [load]);

  const handleStatus = async (id, nextStatus) => {
    if (!id || actionId) return;
    setActionId(id);
    try {
      await adminAPI.reviewStatus(id, nextStatus);
      toast(`Review ${nextStatus}`, 'success');
      if (selected && reviewId(selected) === id) setSelected(null);
      await load();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || 'Moderation failed. No success was confirmed.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!id || actionId || !window.confirm('Delete this review permanently? This cannot be undone.')) return;
    setActionId(id);
    try {
      await adminAPI.deleteReview(id);
      toast('Review deleted', 'success');
      if (selected && reviewId(selected) === id) setSelected(null);
      await load();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || 'Delete failed. No success was confirmed.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleReviews = reviews.filter((review) => {
    if (!normalizedSearch) return true;
    return [review.user?.name, review.user?.email, review.dealer?.name, review.dealer?.businessName, review.comment, review.car?.title]
      .some((value) => String(value || '').toLocaleLowerCase().includes(normalizedSearch));
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', background: '#f6faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic', margin: 0 }}>Review Moderation</h2>
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, marginTop: 6 }}>Manage and moderate dealer reviews across the platform.</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading} aria-label="Refresh reviews">
            <RefreshCw size={14} aria-hidden="true" style={{ marginRight: 6 }} />{loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[{ key: 'all', label: 'All reviews', value: statusCounts.total }, { key: 'pending', label: 'Pending', value: statusCounts.pending }, { key: 'approved', label: 'Approved', value: statusCounts.approved }, { key: 'rejected', label: 'Rejected', value: statusCounts.rejected }].map((item) => (
            <button type="button" key={item.key} onClick={() => { setStatus(item.key); setPage(1); }} aria-pressed={status === item.key}
              style={{ textAlign: 'left', background: status === item.key ? '#e8f2f2' : '#fff', border: `1px solid ${status === item.key ? '#176b87' : 'rgba(10,51,64,.09)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ color: 'var(--admin-muted-content)', fontSize: 12 }}>{item.label}</div>
              <div style={{ color: '#0a3340', fontWeight: 800, fontSize: 24, marginTop: 4 }}>{loading && item.key === 'all' ? '—' : item.value.toLocaleString()}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
          <label style={{ position: 'relative', display: 'block', flex: '1 1 280px', maxWidth: 480 }}>
            <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
            <input aria-label="Search loaded reviews" placeholder="Search this page by user, dealer, vehicle or comment…" value={search} onChange={(event) => setSearch(event.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: '1px solid rgba(10,51,64,.15)', borderRadius: 8, padding: '10px 12px 10px 36px', color: '#0a3340', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
            Status
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} style={{ background: '#fff', border: '1px solid rgba(10,51,64,.15)', borderRadius: 8, padding: '10px 12px', color: '#0a3340' }}>
              {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {loadError ? (
          <div role="alert" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 24, color: '#9a3412' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}><MessageSquareWarning size={20} aria-hidden="true" />Review records could not be loaded.</div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>{loadError}</p>
            <p style={{ fontSize: 12 }}>This is a loading failure, not confirmation that no reviews exist. No moderation decision was changed by this failed request.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>{loading ? 'Retrying…' : 'Retry loading reviews'}</button>
          </div>
        ) : loading ? (
          <div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /><span style={{ marginLeft: 10, color: '#64748b' }}>Loading reviews…</span></div>
        ) : visibleReviews.length === 0 ? (
          <div className="empty-state" style={{ padding: 48, background: '#fff', border: '1px solid rgba(10,51,64,.07)', borderRadius: 14 }}>
            <div className="empty-icon"><Star size={32} aria-hidden="true" /></div>
            <h3>{search.trim() ? 'No matching reviews on this page' : 'No reviews found'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>{search.trim() ? 'Try another search term or clear the search.' : status === 'all' ? 'No reviews have been submitted yet.' : `There are no ${status} reviews in this queue.`}</p>
            {search.trim() && <button type="button" className="btn btn-outline btn-sm" onClick={() => setSearch('')}>Clear search</button>}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--admin-muted-content)', fontSize: 12, marginBottom: 12 }}>
              <span>Showing {firstItem}–{lastItem} of {total.toLocaleString()} reviews</span>
              {normalizedSearch && <span>Search is limited to the currently loaded page.</span>}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {visibleReviews.map((review) => {
                const id = reviewId(review);
                const rating = safeRating(review.rating);
                const currentStatus = STATUSES.some((entry) => entry.value === review.status) && review.status !== 'all' ? review.status : 'pending';
                const busy = actionId === id;
                return (
                  <article key={id || `${review.createdAt}-${review.comment}`} style={{ background: '#fff', border: '1px solid rgba(10,51,64,.08)', borderRadius: 14, padding: '18px clamp(14px, 2vw, 22px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ minWidth: 220, flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                          <span style={{ display: 'inline-flex', gap: 2, color: '#b7791f' }} aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < rating ? 'currentColor' : 'none'} aria-hidden="true" />)}</span>
                          <strong style={{ fontSize: 13, color: '#0a3340' }}>{rating}/5</strong>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', borderRadius: 999, padding: '4px 8px', ...STATUS_COLORS[currentStatus] }}>{currentStatus}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-muted-content)', lineHeight: 1.6 }}>
                          <span>{review.user?.name || review.reviewer?.name || 'Anonymous reviewer'}</span>{' · '}
                          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{review.dealer?.businessName || review.dealer?.name || 'Dealer unavailable'}</span>{' · '}{safeDate(review.createdAt)}
                        </div>
                        {review.car?.title && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Vehicle: {review.car.title}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {currentStatus !== 'approved' && <button type="button" className="btn btn-outline btn-sm" disabled={busy || Boolean(actionId)} onClick={() => handleStatus(id, 'approved')}>Approve</button>}
                        {currentStatus !== 'rejected' && <button type="button" className="btn btn-outline btn-sm" disabled={busy || Boolean(actionId)} onClick={() => handleStatus(id, 'rejected')}>Reject</button>}
                        <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--red)', borderColor: 'rgba(239,68,68,.3)' }} disabled={busy || Boolean(actionId)} onClick={() => handleDelete(id)}>{busy ? 'Working…' : 'Delete'}</button>
                      </div>
                    </div>
                    {review.comment ? <p style={{ fontSize: 13, color: 'rgba(10,51,64,.78)', lineHeight: 1.65, margin: '10px 0', overflowWrap: 'anywhere' }}>{review.comment}</p> : <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', margin: '10px 0' }}>No written comment was provided.</p>}
                    {selected && reviewId(selected) === id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(10,51,64,.08)', fontSize: 11, color: 'var(--admin-muted-content)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                        <div>Review ID: {id || 'Unavailable'}</div><div>Reviewer ID: {review.user?.id || review.user?._id || review.reviewerId || '—'}</div>
                        <div>Dealer ID: {review.dealer?.id || review.dealer?._id || review.dealerId || '—'}</div><div>Reviewer email: {review.user?.email || review.reviewer?.email || '—'}</div>
                        <div>Moderated at: {safeDate(review.moderatedAt)}</div><div>Moderator ID: {review.moderatedBy || '—'}</div>
                      </div>
                    )}
                    <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 10, marginTop: 6 }} onClick={() => setSelected(selected && reviewId(selected) === id ? null : review)} aria-expanded={Boolean(selected && reviewId(selected) === id)}>{selected && reviewId(selected) === id ? 'Less info' : 'More info'}</button>
                  </article>
                );
              })}
            </div>
            {pages > 1 && <nav aria-label="Review pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={14} aria-hidden="true" /> Previous</button>
              <span style={{ fontSize: 12, color: '#64748b' }}>Page {page} of {pages}</span>
              <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages || loading} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Next <ChevronRight size={14} aria-hidden="true" /></button>
            </nav>}
          </>
        )}
      </div>
    </div>
  );
}
