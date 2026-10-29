import { useState, useEffect, useCallback, useRef } from 'react';
import { feedbackAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';
import { MessageSquare, Eye, X, RefreshCw, AlertCircle } from 'lucide-react';

const TYPE_BADGE = { general: 'badge-blue', feedback: 'badge-green', bug_report: 'badge-red', feature_request: 'badge-gold' };
const STATUS_BADGE = { new: 'badge-blue', read: 'badge-muted', addressed: 'badge-green' };
const TYPE_LABELS = { general: 'General', feedback: 'Feedback', bug_report: 'Bug Report', feature_request: 'Feature Request' };
const STATUS_TABS = [
  { key: 'all', label: 'All' }, { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' }, { key: 'addressed', label: 'Addressed' },
];
const PAGE_SIZE = 20;
const getId = (item) => item?.id ?? item?._id ?? null;
const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

export default function AdminFeedback() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionId, setActionId] = useState(null);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++requestSeq.current;
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await feedbackAPI.adminAll(params);
      if (!isRecord(response) || response.success === false) throw new Error('Unexpected feedback response');
      const records = Array.isArray(response.feedback) ? response.feedback : (Array.isArray(response.data) ? response.data : null);
      if (!records) throw new Error('Feedback response did not contain a valid list');
      const totalValue = Number(response.pagination?.total ?? response.total ?? records.length);
      if (!Number.isFinite(totalValue) || totalValue < 0) throw new Error('Invalid feedback total');
      if (sequence !== requestSeq.current) return;
      setItems(records);
      setTotal(totalValue);
      if (isRecord(response.counts)) setCounts(response.counts);
      else setCounts(null);
    } catch (error) {
      if (sequence !== requestSeq.current) return;
      setLoadError('Feedback could not be loaded. Existing feedback has not been changed.');
      setCounts(null);
      toast('Failed to load feedback', 'error');
    } finally {
      if (sequence === requestSeq.current) setLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => { load(); return () => { requestSeq.current += 1; }; }, [load]);

  const handleUpdate = async (item, status) => {
    const id = getId(item);
    if (!id || actionId) return;
    setActionId(id);
    try {
      const response = await feedbackAPI.adminUpdate(id, { status });
      if (response?.success === false) throw new Error('Feedback update rejected');
      const updated = response?.feedback;
      setItems((previous) => previous.map((entry) => getId(entry) === id ? { ...entry, ...(updated || {}), status } : entry));
      setSelected((previous) => previous && getId(previous) === id ? { ...previous, ...(updated || {}), status } : previous);
      toast(`Marked as ${status}`, 'success');
      // Counts are server-owned; refresh them instead of guessing at counts locally.
      await load();
    } catch {
      toast('Failed to update feedback. Refresh and try again.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownCount = counts || { all: loadError ? null : total, new: null, read: null, addressed: null };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><MessageSquare size={22} style={{ color: 'var(--brand)' }} />User Feedback</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Review user submissions and record their moderation status.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {STATUS_TABS.map((tab) => (
            <div key={tab.key} className="card"
              style={{ padding: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tab.label} submissions</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{shownCount[tab.key] == null ? '—' : shownCount[tab.key]}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_TABS.map((tab) => (
            <button type="button" key={tab.key} className={`btn btn-sm ${statusFilter === tab.key ? 'btn-gold' : 'btn-outline'}`}
              aria-pressed={statusFilter === tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1); }}>{tab.label}</button>
          ))}
          <button type="button" className="btn btn-sm btn-outline" onClick={load} disabled={loading} style={{ marginLeft: 'auto' }}>
            <RefreshCw size={13} style={{ marginRight: 5 }} />{loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loadError && <div role="alert" className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--danger, #b91c1c)' }}>
          <AlertCircle size={18} /><div style={{ flex: 1, fontSize: 14 }}>{loadError}</div>
          <button type="button" className="btn btn-sm btn-outline" onClick={load} disabled={loading}>Retry</button>
        </div>}

        <div className="card">
          <div className="table-wrap">
            {loading && items.length === 0 ? (
              <div className="loading-center" style={{ padding: 48 }}><div className="spinner" /></div>
            ) : !loadError && items.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-icon"><MessageSquare size={40} /></div>
                <h3>No feedback found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{statusFilter !== 'all' ? `No ${statusFilter} feedback submissions were found.` : 'No feedback submissions have been recorded yet.'}</p>
              </div>
            ) : items.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{items.map((feedback) => {
                  const id = getId(feedback);
                  const status = feedback.status || 'new';
                  return <tr key={id || `${feedback.createdAt}-${feedback.subject}`} style={{ cursor: 'pointer' }} onClick={() => setSelected(feedback)}>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{feedback.createdAt ? timeAgo(feedback.createdAt) : '—'}</td>
                    <td><span className={`badge ${TYPE_BADGE[feedback.type] || 'badge-muted'}`} style={{ fontSize: 10 }}>{TYPE_LABELS[feedback.type] || feedback.type || '—'}</span></td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{feedback.name || feedback.user?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{feedback.email || feedback.user?.email || '—'}</td>
                    <td><div style={{ maxWidth: 180 }} className="text-truncate">{feedback.subject?.length > 40 ? `${feedback.subject.slice(0, 40)}…` : feedback.subject || '—'}</div></td>
                    <td><div style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-muted)' }} className="text-truncate">{feedback.message?.length > 60 ? `${feedback.message.slice(0, 60)}…` : feedback.message || '—'}</div></td>
                    <td><span className={`badge ${STATUS_BADGE[status] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>{status}</span></td>
                    <td onClick={(event) => event.stopPropagation()} role="presentation"><button type="button" className="btn btn-sm btn-outline" onClick={() => setSelected(feedback)}><Eye size={12} style={{ marginRight: 4 }} />View</button></td>
                  </tr>;
                })}</tbody>
              </table>
            ) : null}
          </div>
        </div>

        {total > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button type="button" className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next →</button>
          </div>
        </div>}
      </div>

      {selected && <div className="modal-overlay" role="presentation" onClick={(event) => event.target === event.currentTarget && setSelected(null)}>
        <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title" style={{ maxWidth: 540 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`badge ${TYPE_BADGE[selected.type] || 'badge-muted'}`}>{TYPE_LABELS[selected.type] || selected.type || 'General'}</span>
                <span className={`badge ${STATUS_BADGE[selected.status || 'new'] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>{selected.status || 'new'}</span>
              </div>
              <h3 id="feedback-detail-title" style={{ margin: '4px 0 0' }}>{selected.subject || 'Feedback details'}</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selected.name || selected.user?.name || 'Unknown user'} · {selected.email || selected.user?.email || 'No email provided'} · {selected.createdAt ? timeAgo(selected.createdAt) : 'Date unavailable'}</div>
            </div>
            <button type="button" onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="Close" title="Close"><X size={16} aria-hidden="true" /></button>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, marginBottom: 20 }}><p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{selected.message || 'No message provided.'}</p></div>
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, flexWrap: 'wrap' }}>
            {(selected.status || 'new') !== 'read' && (selected.status || 'new') !== 'addressed' && <button type="button" className="btn btn-outline btn-sm" disabled={actionId === getId(selected) || Boolean(actionId)} onClick={() => handleUpdate(selected, 'read')}>{actionId === getId(selected) ? 'Saving…' : 'Mark as Read'}</button>}
            {(selected.status || 'new') !== 'addressed' && <button type="button" className="btn btn-gold btn-sm" disabled={actionId === getId(selected) || Boolean(actionId)} onClick={() => handleUpdate(selected, 'addressed')}>{actionId === getId(selected) ? 'Saving…' : 'Mark as Addressed'}</button>}
          </div>
        </div>
      </div>}
    </div>
  );
}
