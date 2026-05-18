import { useState, useEffect, useCallback } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/helpers';
import { CheckCircle, XCircle, Clock, Search, Eye } from 'lucide-react';

const STATUS_BADGE = {
  pending:  'badge-muted',
  active:   'badge-green',
  rejected: 'badge-muted',
  sold:     'badge-gold',
};

export default function AdminCarModeration() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await adminAPI.cars(params);
      setCars(data.cars || data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch { toast('Failed to load listings', 'error'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const handleModerate = async (carId, action) => {
    const adminNote = action === 'reject' ? prompt('Reason for rejection:') : '';
    if (action === 'reject' && adminNote === null) return;
    setActionId(carId);
    try {
      await adminAPI.moderateCar(carId, { action, adminNote });
      toast(`Listing ${action}d successfully`, 'success');
      load();
    } catch { toast(`Failed to ${action} listing`, 'error'); }
    finally { setActionId(null); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div className="section-eyebrow">Admin</div>
            <h1 style={{ margin: 0 }}>Car Moderation Queue</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Search listings..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 36, minWidth: 220 }}
              />
            </div>
            <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ minWidth: 140 }}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="active">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No listings found.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Dealer</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map(car => (
                    <tr key={car._id} onClick={() => setSelected(car)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{car.title || `${car.brand} ${car.model || ''}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {car.year || ''} &middot; {car.mileage ? `${(car.mileage / 1000).toFixed(0)}k km` : ''}
                        </div>
                      </td>
                      <td>{car.dealer?.name || car.dealer?.email || 'Unknown'}</td>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        KES {formatKES(car.price || 0)}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[car.status] || 'badge-muted'}`}>
                          {car.status || 'unknown'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo(car.createdAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 11, border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}
                            disabled={actionId === car._id}
                            onClick={() => handleModerate(car._id, 'approve')}>
                            <CheckCircle size={12} style={{ marginRight: 4 }} />
                            Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 11, borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}
                            disabled={actionId === car._id}
                            onClick={() => handleModerate(car._id, 'reject')}>
                            <XCircle size={12} style={{ marginRight: 4 }} />
                            Reject
                          </button>
                          <button className="btn btn-sm btn-outline"
                            onClick={() => setSelected(car)}>
                            <Eye size={12} style={{ marginRight: 4 }} />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i}
                    className={`btn btn-sm ${page === i + 1 ? 'btn-gold' : ''}`}
                    onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{selected.title || `${selected.brand} ${selected.model || ''}`}</h2>
              <span className={`badge ${STATUS_BADGE[selected.status] || 'badge-muted'}`}>
                {selected.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14, marginBottom: 16 }}>
              <div><strong>Price:</strong> KES {formatKES(selected.price || 0)}</div>
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

            {selected.status === 'pending' && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-sm"
                  style={{ background: '#22c55e', color: '#000', fontWeight: 700, border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
                  disabled={actionId === selected._id}
                  onClick={() => { handleModerate(selected._id, 'approve'); setSelected(null); }}>
                  <CheckCircle size={14} style={{ marginRight: 6 }} /> Approve Listing
                </button>
                <button className="btn btn-sm"
                  style={{ background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
                  disabled={actionId === selected._id}
                  onClick={() => { handleModerate(selected._id, 'reject'); setSelected(null); }}>
                  <XCircle size={14} style={{ marginRight: 6 }} /> Reject Listing
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
