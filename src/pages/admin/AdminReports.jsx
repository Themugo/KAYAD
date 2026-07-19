import { useState, useEffect } from 'react';
import { reportAPI } from '../../api/api';
import { timeAgo } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { Button, SpinnerPage } from '../../components/ui';

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
          <SpinnerPage label="Loading reports..." />
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
                          <Button variant="success" size="sm" onClick={() => handleUpdate(r._id, 'reviewed')}>Mark Reviewed</Button>
                          <Button variant="danger" size="sm" onClick={() => handleUpdate(r._id, 'dismissed')}>Dismiss</Button>
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
