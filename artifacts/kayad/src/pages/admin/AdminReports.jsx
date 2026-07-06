import { useState, useEffect } from 'react';
import { reportAPI } from '../../api/api';
import { timeAgo } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const STATUS_BADGE = {
  pending: 'badge-muted',
  reviewed: 'badge-green',
  dismissed: 'badge-muted',
  action_taken: 'badge-gold',
};

export default function AdminReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportAPI.adminAll().then(data => {
      setReports(data.reports || data.data || []);
    }).catch(() => toast('Failed to load reports', 'error'))
    .finally(() => setLoading(false));
  }, [toast]);

  const handleUpdate = async (id, status) => {
    try {
      await reportAPI.adminUpdate(id, { status });
      toast(`Report ${status}`, 'success');
      setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    } catch {
      toast('Failed to update report', 'error');
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ marginBottom: 24 }}>Reports</h1>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : reports.length === 0 ? (
          <div className="empty-state"><p>No reports yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Target</th>
                  <th>Reporter</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.category}</strong>{r.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.description}</div>}</td>
                    <td style={{ fontSize: 13 }}>{r.targetType} &middot; {r.targetId?.slice(-6)}</td>
                    <td style={{ fontSize: 13 }}>{r.reporter?.name || r.reporter?.email || 'Anonymous'}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-muted'}`}>{r.status}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(r.createdAt)}</td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm" style={{ background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 11, border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }} onClick={() => handleUpdate(r._id, 'reviewed')}>Mark Reviewed</button>
                          <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 11, borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }} onClick={() => handleUpdate(r._id, 'dismissed')}>Dismiss</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
