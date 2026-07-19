import { useState, useEffect } from 'react';
import { supportTicketAdminAPI } from '../../api/api';
import { timeAgo } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import { Button, SpinnerPage } from '../../components/ui';

const STATUS_BADGE = {
  open: 'badge-muted',
  in_progress: 'badge-gold',
  resolved: 'badge-green',
  closed: 'badge-muted',
};

export default function AdminSupportTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supportTicketAdminAPI.list().then(data => {
      setTickets(data.tickets || data.data || []);
    }).catch(() => toast('Failed to load tickets', 'error'))
    .finally(() => setLoading(false));
  }, [toast]);

  const handleStatus = async (id, status) => {
    try {
      await supportTicketAdminAPI.updateStatus(id, { status });
      toast(`Ticket ${status}`, 'success');
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status } : t));
    } catch {
      toast('Failed to update ticket', 'error');
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ marginBottom: 24 }}>Support Tickets</h1>
        {loading ? (
          <SpinnerPage label="Loading tickets..." />
        ) : tickets.length === 0 ? (
          <div className="empty-state"><p>No tickets yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t._id}>
                    <td><strong>{t.subject}</strong>{t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.description?.slice(0, 80)}{t.description?.length > 80 ? '…' : ''}</div>}</td>
                    <td style={{ fontSize: 13 }}>{t.user?.name || t.user?.email || 'Unknown'}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-muted'}`}>{t.status}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(t.createdAt)}</td>
                    <td>
                      {t.status === 'open' && (
                        <Button variant="primary" size="sm" onClick={() => handleStatus(t._id, 'in_progress')}>Start</Button>
                      )}
                      {t.status === 'in_progress' && (
                        <Button variant="success" size="sm" onClick={() => handleStatus(t._id, 'resolved')}>Resolve</Button>
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
