import { useState, useEffect } from 'react';
import { dealerAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';
import { ClipboardCheck } from 'lucide-react';
import { timeAgo, StatusBadge } from '../components/DashboardWidgets';

export default function DealerInspectionsPage() {
  const { toast } = useToast();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    dealerAPI.inspections?.()
      .then(res => setInspections(res.inspections || res.data || []))
      .catch(() => toast('Failed to load inspections', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = filter ? inspections.filter(i => i.status === filter) : inspections;

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pre-Inspection</h1>
            <p className="page-subtitle">Vehicle inspection requests and reports</p>
          </div>
        </div>

        <div className="filter-bar">
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardCheck size={40} /></div>
            <div className="empty-state-title">No inspections yet</div>
            <div className="empty-state-desc">Request a pre-inspection from your inventory to get started</div>
          </div>
        ) : (
          <div className="dealer-table-wrap">
            <table className="dealer-table">
              <thead>
                <tr>
                  <th>Vehicle</th><th>Inspector</th><th>Date</th><th>Status</th><th>Report</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i._id}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{i.carTitle || i.car?.title || '—'}</td>
                    <td>{i.inspectorName || i.inspector?.name || '—'}</td>
                    <td style={{ color: 'rgba(255,255,255,0.4)' }}>{i.scheduledDate ? new Date(i.scheduledDate).toLocaleDateString() : timeAgo(i.createdAt)}</td>
                    <td><StatusBadge status={i.status || 'pending'} /></td>
                    <td>{i.reportUrl ? <a href={i.reportUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>View</a> : '—'}</td>
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
