import { useState, useEffect } from 'react';
import { inspectionAPI, formatKES } from '../../api/api';
import { Eye, UserCheck, ClipboardCheck, Search } from 'lucide-react';

const STATUS_COLORS = {
  pending_payment: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b' },
  paid: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  assigned: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  in_progress: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b' },
  completed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

export default function AdminInspections() {
  const [orders, setOrders] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [assigning, setAssigning] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [data, ins] = await Promise.all([
        inspectionAPI.list(params),
        inspectionAPI.availableInspectors().catch(() => ({ inspectors: [] })),
      ]);
      setOrders(data.orders || []);
      setInspectors(ins.inspectors || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAssign = async (orderId) => {
    const inspectorId = prompt('Enter Inspector ID to assign:');
    if (!inspectorId) return;
    try {
      await inspectionAPI.assign(orderId, inspectorId.trim());
      setAssigning(null);
      load();
    } catch {}
  };

  const handleAssignSelector = async (orderId, inspectorId) => {
    try {
      await inspectionAPI.assign(orderId, inspectorId);
      setAssigning(null);
      load();
    } catch {}
  };

  return (
    <div className="page" style={{ padding: '32px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Inspection Services</div>
            <h2>All Inspection Orders</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12 }}>
              <option value="">All Status</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="paid">Paid</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <ClipboardCheck size={40} style={{ opacity: 0.2 }} />
            <h3>No inspection orders</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map(o => {
              const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending_payment;
              const car = o.car || {};
              return (
                <div key={o._id} style={{
                  background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ClipboardCheck size={18} style={{ color: sc.color }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{car.title || car._id}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                          Fee: {formatKES(o.fee)} · {o.location || 'No location'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '3px 10px', borderRadius: 6, background: sc.bg, color: sc.color,
                      }}>{o.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
                    <span>Buyer: {o.buyer?.name || o.buyer?.email || '—'}</span>
                    {o.inspector && <span>Inspector: {o.inspector.name || o.inspector.email}</span>}
                    {o.overallScore && <span>Score: {o.overallScore}/100</span>}
                  </div>

                  {o.status === 'paid' && (
                    <div style={{ marginTop: 10 }}>
                      {assigning === o._id ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {inspectors.map(ins => (
                            <button key={ins._id} onClick={() => handleAssignSelector(o._id, ins._id)}
                              style={{
                                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                                borderRadius: 8, padding: '6px 12px', color: '#8b5cf6', fontSize: 11,
                                fontWeight: 700, cursor: 'pointer',
                              }}>
                              {ins.name || ins.email} {ins.locationCity ? `(${ins.locationCity})` : ''}
                            </button>
                          ))}
                          <button onClick={() => setAssigning(null)} style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)',
                            fontSize: 11, cursor: 'pointer',
                          }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setAssigning(o._id)} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                          borderRadius: 8, padding: '6px 14px', color: '#8b5cf6', fontSize: 11,
                          fontWeight: 700, cursor: 'pointer',
                        }}>
                          <UserCheck size={13} /> Assign Inspector
                        </button>
                      )}
                    </div>
                  )}

                  {o.status === 'completed' && o.overallScore && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: o.overallScore >= 80 ? 'rgba(34,197,94,0.15)' : o.overallScore >= 60 ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 900,
                        color: o.overallScore >= 80 ? '#22c55e' : o.overallScore >= 60 ? '#f59e0b' : '#ef4444',
                      }}>{o.overallScore}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{o.conditionRating} condition</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{o.checklist?.length || 0} items checked</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
