import { useState, useEffect, useCallback, useRef } from 'react';
import { inspectionAPI, formatKES } from '../../api/api';
import { UserCheck, ClipboardCheck, RefreshCw, AlertCircle, MapPin, CalendarClock } from 'lucide-react';

const STATUS_META = {
  requested: { label: 'Requested', bg: 'rgba(217,119,6,0.10)', color: '#a16207' },
  assigned: { label: 'Assigned', bg: 'rgba(37,99,235,0.10)', color: '#1d4ed8' },
  in_progress: { label: 'In Progress', bg: 'rgba(13,148,136,0.10)', color: '#0f766e' },
  completed: { label: 'Completed', bg: 'rgba(22,163,74,0.10)', color: '#15803d' },
  cancelled: { label: 'Cancelled', bg: 'rgba(220,38,38,0.10)', color: '#b91c1c' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function displayFee(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Fee unavailable';
  return formatKES(Number(value));
}

function recordTitle(order) {
  const car = order.car || {};
  const title = [car.year, car.brand || car.make, car.model].filter(Boolean).join(' ');
  return car.title || title || (car.id || car._id ? `Vehicle ${String(car.id || car._id).slice(0, 8)}` : 'Vehicle details unavailable');
}

export default function AdminInspections() {
  const [orders, setOrders] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [actionOrder, setActionOrder] = useState(null);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestSequence = useRef(0);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const sequence = ++requestSequence.current;
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [data, inspectorResult] = await Promise.allSettled([
        inspectionAPI.list(params),
        inspectionAPI.availableInspectors(),
      ]);
      if (sequence !== requestSequence.current) return;
      if (data.status !== 'fulfilled' || !data.value || data.value.success === false || !Array.isArray(data.value.orders)) {
        const reason = data.status === 'rejected' ? data.reason : null;
        throw new Error(reason?.message || data.value?.message || 'The inspections service returned an unexpected response.');
      }
      setOrders(data.value.orders);
      setLastUpdated(new Date());
      if (inspectorResult.status === 'fulfilled' && inspectorResult.value?.success !== false && Array.isArray(inspectorResult.value?.inspectors)) {
        setInspectors(inspectorResult.value.inspectors);
      } else {
        setInspectors([]);
        setActionMessage('Inspector directory is temporarily unavailable. Orders are shown, but assignment is unavailable until refresh succeeds.');
      }
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      setError(err?.message || 'Inspection orders could not be loaded. Try again.');
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  const handleAssign = async (orderId, inspectorId) => {
    if (!inspectorId) return;
    setActionOrder(orderId);
    setActionMessage('');
    setError('');
    try {
      const result = await inspectionAPI.assign(orderId, inspectorId);
      if (result?.success === false) throw new Error(result.message || 'The inspector could not be assigned.');
      setAssigning(null);
      setActionMessage('Inspector assigned successfully.');
      await load({ quiet: true });
    } catch (err) {
      setError(err?.message || 'Inspector assignment failed. Please retry.');
    } finally {
      setActionOrder(null);
    }
  };

  const countFor = (status) => orders.filter((order) => order.status === status).length;

  return (
    <div className="page" style={{ padding: '28px 0 40px' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="section-eyebrow">Inspection Services</div>
            <h2 style={{ marginBottom: 6 }}>All Inspection Orders</h2>
            <p style={{ margin: 0, color: 'var(--admin-muted-content)', fontSize: 13 }}>Review requests, assign eligible inspectors, and track inspection progress.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="inspection-status-filter" style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-muted-content)' }}>Status</label>
            <select id="inspection-status-filter" aria-label="Filter inspections by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
              style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.16)', borderRadius: 8, padding: '9px 12px', color: '#0a3340', fontSize: 12, minHeight: 36 }}>
              {STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button type="button" onClick={() => load({ quiet: true })} disabled={loading || refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#0a3340', border: 0, borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: loading || refreshing ? 'wait' : 'pointer', opacity: loading || refreshing ? 0.65 : 1 }}>
              <RefreshCw size={13} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Visible orders', value: orders.length },
            { label: 'Requested', value: countFor('requested') },
            { label: 'Assigned', value: countFor('assigned') },
            { label: 'In progress', value: countFor('in_progress') },
            { label: 'Completed', value: countFor('completed') },
          ].map((item) => <div key={item.label} style={{ background: '#fff', border: '1px solid rgba(10,51,64,0.08)', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ color: 'var(--admin-muted-content)', fontSize: 11, fontWeight: 650 }}>{item.label}</div>
            <div style={{ color: '#0a3340', fontSize: 23, fontWeight: 800, marginTop: 3 }}>{loading ? '—' : item.value}</div>
          </div>)}
        </div>

        {error && <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 10, padding: 14, marginBottom: 16, color: '#991b1b', fontSize: 13 }}>
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}><strong>Inspection data could not be refreshed.</strong><div style={{ marginTop: 4 }}>{error}</div><button type="button" onClick={() => load()} style={{ marginTop: 9, border: '1px solid rgba(153,27,27,0.3)', background: '#fff', color: '#991b1b', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>Try again</button></div>
        </div>}
        {actionMessage && <div role="status" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#166534', borderRadius: 9, padding: 11, marginBottom: 14, fontSize: 12 }}>{actionMessage}</div>}

        {loading ? <div className="loading-center" aria-label="Loading inspection orders"><div className="spinner" /></div> : orders.length === 0 && !error ? (
          <div className="empty-state" style={{ padding: '44px 24px', background: '#fff', border: '1px solid rgba(10,51,64,0.08)', borderRadius: 12 }}>
            <ClipboardCheck size={38} style={{ opacity: 0.35 }} />
            <h3 style={{ marginTop: 12 }}>{statusFilter ? `No ${STATUS_META[statusFilter]?.label.toLowerCase() || 'matching'} inspection orders` : 'No inspection orders yet'}</h3>
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, maxWidth: 420, margin: '8px auto 0' }}>This is an empty result from the inspection service, not a payment or verification status. New requests will appear here when recorded.</p>
          </div>
        ) : orders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((order) => {
              const status = STATUS_META[order.status] || { label: String(order.status || 'Unknown').replaceAll('_', ' '), bg: 'rgba(100,116,139,0.1)', color: '#475569' };
              const inspector = typeof order.inspector === 'object' ? order.inspector : null;
              const buyer = typeof order.buyer === 'object' ? order.buyer : null;
              const score = order.overallScore;
              return <article key={order.id || order._id} style={{ background: '#fff', border: '1px solid rgba(10,51,64,0.09)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(10,51,64,0.06)', borderRadius: 9 }}><ClipboardCheck size={18} color="#0a3340" /></div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: '1px 0 5px', color: '#0a3340', fontSize: 14, fontWeight: 800 }}>{recordTitle(order)}</h3>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: 'var(--admin-muted-content)', fontSize: 12 }}>
                        <span>{displayFee(order.fee)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{order.location || 'Location not provided'}</span>
                        {order.createdAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CalendarClock size={12} />Requested {new Date(order.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '5px 9px', borderRadius: 6, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>{status.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '7px 16px', marginTop: 13, fontSize: 12, color: 'var(--admin-muted-content)', flexWrap: 'wrap' }}>
                  <span><strong style={{ color: '#334155' }}>Buyer:</strong> {buyer?.name || buyer?.email || 'Buyer details unavailable'}</span>
                  {inspector && <span><strong style={{ color: '#334155' }}>Inspector:</strong> {inspector.name || inspector.businessName || 'Assigned inspector'}</span>}
                  {order.scheduledAt && <span><strong style={{ color: '#334155' }}>Scheduled:</strong> {new Date(order.scheduledAt).toLocaleString()}</span>}
                  {score !== null && score !== undefined && Number.isFinite(Number(score)) && <span><strong style={{ color: '#334155' }}>Score:</strong> {Number(score)}/100</span>}
                </div>
                {order.status === 'requested' && <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(10,51,64,0.07)' }}>
                  {assigning === (order.id || order._id) ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {inspectors.length ? inspectors.map((candidate) => <button key={candidate.id || candidate._id} type="button" disabled={actionOrder === (order.id || order._id)} onClick={() => handleAssign(order.id || order._id, candidate.id || candidate._id)}
                      style={{ background: 'rgba(29,78,216,0.07)', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 8, padding: '8px 10px', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {candidate.name || candidate.businessName || candidate.email || 'Eligible inspector'}{candidate.location ? ` · ${candidate.location}` : ''}
                    </button>) : <span style={{ fontSize: 12, color: 'var(--admin-muted-content)' }}>No active, verified inspectors are currently available.</span>}
                    <button type="button" onClick={() => setAssigning(null)} style={{ background: 'transparent', border: 0, color: 'var(--admin-muted-content)', padding: 8, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </div> : <button type="button" onClick={() => setAssigning(order.id || order._id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#0a3340', border: 0, borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, fontWeight: 750, cursor: 'pointer' }}><UserCheck size={14} /> Assign eligible inspector</button>}
                </div>}
                {order.status === 'completed' && score !== null && score !== undefined && Number.isFinite(Number(score)) && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(10,51,64,0.07)', fontSize: 12, color: 'var(--admin-muted-content)' }}><strong style={{ color: '#0a3340' }}>Condition:</strong> {order.conditionRating || 'Not recorded'} · {Array.isArray(order.checklist) ? order.checklist.length : 0} checklist items recorded</div>}
              </article>;
            })}
          </div>
        ) : null}
        {lastUpdated && <p style={{ margin: '14px 2px 0', color: 'var(--admin-muted-content)', fontSize: 11 }}>Last successful refresh: {lastUpdated.toLocaleTimeString()} · Showing up to 200 recent orders.</p>}
        <p style={{ margin: '8px 2px 0', color: 'var(--admin-muted-content)', fontSize: 11 }}>The legacy vehicle inspection request records do not initiate payment. “Requested” means a request is recorded; it does not mean payment is pending or complete.</p>
      </div>
    </div>
  );
}
