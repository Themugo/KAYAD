import { useState, useEffect, useCallback } from 'react';
import { feedbackAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';
import { MessageSquare, Eye } from 'lucide-react';

const TYPE_BADGE = {
  general: 'badge-blue',
  feedback: 'badge-green',
  bug_report: 'badge-red',
  feature_request: 'badge-gold',
};

const STATUS_BADGE = {
  new: 'badge-blue',
  read: 'badge-muted',
  addressed: 'badge-green',
};

const TYPE_LABELS = {
  general: 'General',
  feedback: 'Feedback',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'addressed', label: 'Addressed' },
];

const PAGE_SIZE = 20;

export default function AdminFeedback() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await feedbackAPI.adminAll(params);
      setItems(data.feedback || data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch { toast('Failed to load feedback', 'error'); }
    finally { setLoading(false); }
  }, [page, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id, status) => {
    setActionId(id);
    try {
      await feedbackAPI.adminUpdate(id, { status });
      toast(`Marked as ${status}`, 'success');
      setItems(prev => prev.map(f => f._id === id ? { ...f, status } : f));
      if (selected?._id === id) setSelected(prev => prev ? { ...prev, status } : prev);
    } catch { toast('Failed to update', 'error'); }
    finally { setActionId(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare size={22} style={{ color: 'var(--gold)' }} />
            User Feedback
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(t => (
            <button key={t.key} className={`btn btn-sm ${statusFilter === t.key ? 'btn-gold' : 'btn-outline'}`}
              onClick={() => { setStatusFilter(t.key); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading-center" style={{ padding: 48 }}><div className="spinner" /></div>
            ) : items.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-icon"><MessageSquare size={40} /></div>
                <h3>No feedback found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{statusFilter !== 'all' ? `No ${statusFilter} feedback` : 'No feedback submissions yet'}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(f => (
                    <tr key={f._id} style={{ cursor: 'pointer' }} onClick={() => setSelected(f)}>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {timeAgo(f.createdAt)}
                      </td>
                      <td>
                        <span className={`badge ${TYPE_BADGE[f.type] || 'badge-muted'}`} style={{ fontSize: 10 }}>
                          {TYPE_LABELS[f.type] || f.type || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{f.name || f.user?.name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.email || f.user?.email || '—'}</td>
                      <td>
                        <div style={{ maxWidth: 180 }} className="text-truncate">
                          {f.subject?.length > 40 ? f.subject.slice(0, 40) + '...' : f.subject || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-muted)' }} className="text-truncate">
                          {f.message?.length > 60 ? f.message.slice(0, 60) + '...' : f.message || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[f.status] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>
                          {f.status || 'new'}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelected(f)}>
                          <Eye size={12} style={{ marginRight: 4 }} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${TYPE_BADGE[selected.type] || 'badge-muted'}`}>
                    {TYPE_LABELS[selected.type] || selected.type}
                  </span>
                  <span className={`badge ${STATUS_BADGE[selected.status] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>
                    {selected.status || 'new'}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0' }}>{selected.subject}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {selected.name || selected.user?.name} &middot; {selected.email || selected.user?.email} &middot; {timeAgo(selected.createdAt)}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{selected.message}</p>
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {selected.status !== 'read' && (
                <button className="btn btn-outline btn-sm" disabled={actionId === selected._id}
                  onClick={() => handleUpdate(selected._id, 'read')}>
                  {actionId === selected._id ? '...' : 'Mark as Read'}
                </button>
              )}
              {selected.status !== 'addressed' && (
                <button className="btn btn-gold btn-sm" disabled={actionId === selected._id}
                  onClick={() => handleUpdate(selected._id, 'addressed')}>
                  {actionId === selected._id ? '...' : 'Mark as Addressed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
