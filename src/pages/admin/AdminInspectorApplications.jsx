import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 20;
const STATUS_META = {
  pending: { label: 'Pending', color: 'var(--brand)', background: 'rgba(23, 107, 135, 0.10)' },
  approved: { label: 'Approved', color: 'var(--green)', background: 'rgba(34, 197, 94, 0.10)' },
  rejected: { label: 'Rejected', color: 'var(--red)', background: 'rgba(239, 68, 68, 0.10)' },
};
const EMPTY_COUNTS = { pending: 0, approved: 0, rejected: 0, total: 0 };

function safeDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function safeDocumentUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function statusLabel(status) {
  return STATUS_META[String(status || '').toLowerCase()]?.label || 'Unknown status';
}

export default function AdminInspectorApplications() {
  const { toast } = useToast();
  const [apps, setApps] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [loadError, setLoadError] = useState('');
  const requestSequence = useRef(0);

  const fetchApps = useCallback(async ({ quiet = false } = {}) => {
    const requestId = ++requestSequence.current;
    if (!quiet) setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const response = await adminAPI.inspectorApplications(params);
      if (requestId !== requestSequence.current) return false;
      if (!response || !Array.isArray(response.applications)) {
        throw new Error('The server returned an invalid inspector application response. No records were changed.');
      }
      setApps(response.applications);
      setCounts({
        pending: Number(response.statusCounts?.pending ?? 0),
        approved: Number(response.statusCounts?.approved ?? 0),
        rejected: Number(response.statusCounts?.rejected ?? 0),
        total: Number(response.statusCounts?.total ?? response.pagination?.total ?? response.applications.length),
      });
      const nextPagination = response.pagination || {};
      setPagination({
        page: Number(nextPagination.page || page),
        limit: Number(nextPagination.limit || PAGE_SIZE),
        total: Number(nextPagination.total ?? response.applications.length),
        pages: Number(nextPagination.pages ?? (response.applications.length ? 1 : 0)),
      });
      return true;
    } catch (error) {
      if (requestId !== requestSequence.current) return false;
      const data = error?.response?.data || error?.responseData || {};
      const message = data.message || error?.message || 'Failed to load inspector applications.';
      setLoadError(message);
      toast(message, 'error');
      return false;
    } finally {
      if (requestId === requestSequence.current && !quiet) setLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => { void fetchApps(); }, [fetchApps]);

  const handleAction = async (app, action) => {
    const id = app.id || app._id;
    if (!id) {
      toast('This application has no valid record identifier. Refresh the queue before reviewing it.', 'error');
      return;
    }
    const notes = String(reviewNotes[id] || '').trim();
    if (action === 'reject' && notes.length < 3) {
      toast('Enter a rejection reason of at least 3 characters before rejecting this application.', 'error');
      setExpanded(id);
      return;
    }
    setActionLoading(id);
    try {
      await adminAPI.reviewInspector(id, action, { reviewNotes: notes });
      toast(action === 'approve' ? 'Inspector application approved.' : 'Inspector application rejected.', 'success');
      setReviewNotes(current => { const next = { ...current }; delete next[id]; return next; });
      setExpanded(null);
      await fetchApps({ quiet: true });
    } catch (error) {
      const message = error?.response?.data?.message || error?.responseData?.message || error?.message || `Failed to ${action} inspector application.`;
      toast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const updateFilter = value => { setStatusFilter(value); setPage(1); setExpanded(null); };
  const firstRecord = pagination.total ? ((pagination.page - 1) * pagination.limit) + 1 : 0;
  const lastRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>Inspector Applications</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Review mechanic inspector applicants, validate their details and record the decision.</p>
          </div>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => void fetchApps()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh applications'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[['Pending', counts.pending, 'pending'], ['Approved', counts.approved, 'approved'], ['Rejected', counts.rejected, 'rejected'], ['Total', counts.total, 'total']].map(([label, value, key]) => (
            <div key={key} className="card" style={{ padding: 16, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} aria-label="Filter inspector applications">
            {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([value, label]) => (
              <button key={value || 'all'} type="button" className={`btn btn-sm ${statusFilter === value ? 'btn-primary' : 'btn-outline'}`} aria-pressed={statusFilter === value} onClick={() => updateFilter(value)}>{label}</button>
            ))}
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pagination.total ? `Showing ${firstRecord}–${lastRecord} of ${pagination.total}` : '0 applications'}</span>
        </div>

        {loadError && (
          <div role="alert" className="card" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--red)' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Applications could not be loaded.</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{loadError}</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>The queue is not being treated as empty, and no application decision has been changed by this failed read.</p>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => void fetchApps()} disabled={loading} style={{ marginTop: 12 }}>Retry loading applications</button>
          </div>
        )}

        {loading ? (
          <div className="loading-center" role="status"><div className="spinner" /><span>Loading inspector applications…</span></div>
        ) : (loadError && apps.length === 0) ? null : apps.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No applications found</div>
            <div style={{ fontSize: 13 }}>{statusFilter ? `There are no ${statusLabel(statusFilter).toLowerCase()} applications in this queue.` : 'New inspector applications will appear here when submitted.'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apps.map(app => {
              const id = app.id || app._id;
              const status = String(app.status || '').toLowerCase();
              const meta = STATUS_META[status] || { color: 'var(--text-muted)', background: 'rgba(127,127,127,0.1)' };
              const isExpanded = expanded === id;
              const busy = actionLoading === id;
              const documents = [
                ...(app.cvUrl ? [{ label: 'CV / résumé', url: app.cvUrl }] : []),
                ...(Array.isArray(app.certificationDocs) ? app.certificationDocs.map((url, index) => ({ label: `Certification document ${index + 1}`, url })) : []),
              ].map(doc => ({ ...doc, url: safeDocumentUrl(doc.url) })).filter(doc => doc.url);
              return (
                <article key={id || `${app.email}-${app.createdAt}`} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: '1 1 280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{app.fullName || 'Name not provided'}</span>
                        <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: meta.background, color: meta.color }}>{statusLabel(status)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, overflowWrap: 'anywhere' }}>{app.email || 'No email'}{app.phone ? ` · ${app.phone}` : ''}</div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>{app.location || 'Location not provided'}</span>
                        <span>{Number.isFinite(Number(app.yearsOfExperience)) ? `${app.yearsOfExperience} years’ experience` : 'Experience not provided'}</span>
                        <span>Applied {safeDate(app.createdAt)}</span>
                      </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : id)}>{isExpanded ? 'Hide details' : 'Review details'}</button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, fontSize: 13 }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>National ID / document reference</span><div style={{ marginTop: 4, overflowWrap: 'anywhere' }}>{app.idNumber || 'Not provided'}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Certifications</span><div style={{ marginTop: 4 }}>{Array.isArray(app.certifications) && app.certifications.length ? app.certifications.join(', ') : 'None listed'}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Preferred regions</span><div style={{ marginTop: 4 }}>{Array.isArray(app.preferredRegions) && app.preferredRegions.length ? app.preferredRegions.join(', ') : 'Not specified'}</div></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tools available</span><div style={{ marginTop: 4 }}>{app.toolsAvailable || 'Not specified'}</div></div>
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Inspection specialties</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {Array.isArray(app.specialties) && app.specialties.length ? app.specialties.map((specialty, index) => <span key={`${specialty}-${index}`} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 11, background: 'rgba(23, 107, 135, 0.10)', color: 'var(--brand)' }}>{specialty}</span>) : <span style={{ fontSize: 12 }}>None listed</span>}
                        </div>
                      </div>
                      {documents.length > 0 && <div style={{ marginTop: 14 }}><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Supporting documents</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{documents.map(doc => <a key={doc.url} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brand)' }}>{doc.label} ↗</a>)}</div></div>}
                      {app.reviewNotes && <div style={{ marginTop: 14, padding: 10, borderRadius: 6, background: 'rgba(127,127,127,0.07)', fontSize: 12 }}><strong>Previous review notes:</strong> {app.reviewNotes}</div>}

                      {status === 'pending' && (
                        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                          <div className="input-group">
                            <label className="input-label" htmlFor={`inspector-review-notes-${id}`} style={{ fontSize: 12 }}>Review notes {`(required for rejection)`}</label>
                            <textarea id={`inspector-review-notes-${id}`} className="input" rows={3} maxLength={1000} placeholder="Record verification findings or explain the rejection…" value={reviewNotes[id] || ''} onChange={event => setReviewNotes(current => ({ ...current, [id]: event.target.value }))} />
                            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>{(reviewNotes[id] || '').length}/1000</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                            <button type="button" className="btn btn-sm btn-green" disabled={busy || actionLoading !== null || loading} onClick={() => void handleAction(app, 'approve')}>{busy ? 'Processing…' : 'Approve application'}</button>
                            <button type="button" className="btn btn-sm btn-outline" disabled={busy || actionLoading !== null || loading || String(reviewNotes[id] || '').trim().length < 3} onClick={() => void handleAction(app, 'reject')} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>{busy ? 'Processing…' : 'Reject application'}</button>
                          </div>
                          <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Approval creates or activates an inspector provider record and may trigger an account invitation. Check the application details before approving.</p>
                        </div>
                      )}
                      {status !== 'pending' && <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>This application has already been reviewed. Its decision cannot be changed from this queue.</div>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loadError && pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
            <button type="button" className="btn btn-sm btn-outline" disabled={page <= 1 || loading} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.pages}</span>
            <button type="button" className="btn btn-sm btn-outline" disabled={page >= pagination.pages || loading} onClick={() => setPage(value => Math.min(pagination.pages, value + 1))}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
