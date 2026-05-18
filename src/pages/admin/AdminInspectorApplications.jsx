import { useState, useEffect } from 'react';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

export default function AdminInspectorApplications() {
  const { toast } = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApps = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/inspector-applications', { params })
      .then(d => setApps(d.applications || []))
      .catch(() => toast('Failed to load', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApps(); }, [statusFilter]);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      const body = { reviewNotes: reviewNotes[id] || '' };
      if (action === 'approve') body.assignedSpecialty = 'Pre-Purchase Inspection';
      await api.post(`/inspector-applications/${id}/${action}`, body);
      toast(`Application ${action}ed`, 'success');
      fetchApps();
    } catch (err) {
      toast(err.response?.data?.message || `Failed to ${action}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 960 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2>🔧 Inspector Applications</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Review and approve mechanic inspector applicants</p>
          </div>
          <select className="input" style={{ width: 160, fontSize: 12 }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : apps.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No applications found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apps.map(app => (
              <div key={app._id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{app.fullName}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        background: app.status === 'approved' ? 'rgba(34,197,94,0.1)' : app.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(212,168,67,0.1)',
                        color: app.status === 'approved' ? 'var(--green)' : app.status === 'rejected' ? 'var(--red)' : 'var(--gold)',
                      }}>
                        {app.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{app.email} · {app.phone}</div>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => setExpanded(expanded === app._id ? null : app._id)}>
                    {expanded === app._id ? '▲ Hide' : '▼ Details'}
                  </button>
                </div>

                {expanded === app._id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>ID Number:</span> {app.idNumber}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Location:</span> {app.location}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Experience:</span> {app.yearsOfExperience} years</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Applied:</span> {new Date(app.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Specialties:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {app.specialties?.map(s => (
                          <span key={s} style={{ padding: '2px 8px', background: 'rgba(212,168,67,0.1)', borderRadius: 4, fontSize: 11, color: 'var(--gold)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    {app.preferredRegions?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Regions:</span> {app.preferredRegions.join(', ')}
                      </div>
                    )}
                    {app.toolsAvailable && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        <strong>Tools:</strong> {app.toolsAvailable}
                      </div>
                    )}

                    {app.status === 'pending' && (
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <div className="input-group">
                          <label className="input-label" style={{ fontSize: 12 }}>Review Notes</label>
                          <input className="input" style={{ fontSize: 12 }} placeholder="Optional notes..."
                            value={reviewNotes[app._id] || ''}
                            onChange={e => setReviewNotes(p => ({ ...p, [app._id]: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button className="btn btn-sm btn-green" disabled={actionLoading === app._id}
                            onClick={() => handleAction(app._id, 'approve')}>
                            {actionLoading === app._id ? 'Processing...' : '✅ Approve'}
                          </button>
                          <button className="btn btn-sm btn-outline" disabled={actionLoading === app._id}
                            onClick={() => handleAction(app._id, 'reject')} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                            {actionLoading === app._id ? 'Processing...' : '❌ Reject'}
                          </button>
                        </div>
                      </div>
                    )}

                    {app.reviewNotes && (
                      <div style={{ marginTop: 12, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 12 }}>
                        <strong style={{ color: 'var(--text-muted)' }}>Review Notes:</strong> {app.reviewNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
