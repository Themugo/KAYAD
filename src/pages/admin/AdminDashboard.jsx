// src/pages/admin/AdminDashboard.jsx — Redesigned with UI component system
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { SkeletonStat, SkeletonRow, SkeletonText } from '../../components/Skeleton';
import { StatCard, Card, Badge, ChartPlaceholder, ActivityFeed, EmptyState } from '../../components/ui';

const TABS = [
  { id: 'overview',  label: '📊 Overview' },
  { id: 'dealers',  label: '🏪 Dealers' },
  { id: 'vehicles', label: '🚗 Vehicles' },
  { id: 'activity', label: '⚡ Activity' },
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [cars, setCars] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      adminAPI.stats(),
      carsAPI.list({ limit: 50 }),
    ])
      .then(([s, c]) => {
        setStats(s.stats || s.data || s);
        const carList = c.cars || c.data || [];
        setCars(carList);
      })
      .catch(() => toast('Could not load reports', 'warning'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page" style={{ paddingTop: 88 }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Reports Dashboard</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[1,2,3,4,5].map(i => <SkeletonStat key={i} />)}
        </div>
        <div className="card" style={{ marginBottom: 24, padding: '16px 20px 0' }}>
          <SkeletonText lines={1} />
          <div style={{ marginTop: 16 }}>{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
        </div>
      </div>
    </div>
  );

  const s = stats || {};

  // Dealer aggregation
  const dealerMap = {};
  cars.forEach(car => {
    const dealerId = car.dealer?._id || 'unknown';
    const dealerName = car.dealer?.name || 'Unknown Dealer';
    if (!dealerMap[dealerId]) dealerMap[dealerId] = { name: dealerName, carCount: 0, totalViews: 0, cars: [] };
    dealerMap[dealerId].carCount++;
    dealerMap[dealerId].totalViews += car.views || 0;
    dealerMap[dealerId].cars.push(car);
  });
  const dealerRows = Object.entries(dealerMap).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.carCount - a.carCount);
  const topCars = [...cars].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 15);

  const statusBadge = (car) => {
    if (car.auctionStatus === 'live') return <Badge variant="green">Live</Badge>;
    if (car.auctionStatus === 'ended') return <Badge variant="muted">Ended</Badge>;
    if (car.auctionStatus === 'sold') return <Badge variant="gold">Sold</Badge>;
    return <Badge variant="muted">Draft</Badge>;
  };

  return (
    <div className="page" style={{ paddingTop: 88 }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Reports Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Read-only platform analytics — cars listed per dealer and car viewership.
          </p>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          <StatCard icon="👥" iconVariant="blue" label="Total Users" value={(s.totalUsers || 0).toLocaleString()} trend={5} />
          <StatCard icon="🚗" iconVariant="green" label="Total Cars" value={(s.totalCars || 0).toLocaleString()} trend={12} />
          <StatCard icon="⚡" iconVariant="gold" label="Total Bids" value={(s.totalBids || 0).toLocaleString()} trend={-3} />
          <StatCard icon="💰" iconVariant="gold" label="Revenue" value={formatKES(s.revenue || 0)} trend={8} />
          <StatCard icon="📋" iconVariant="orange" label="Dealers" value={String(dealerRows.length)} />
        </div>

        {/* Tabs */}
        <div className="ui-tabbar" style={{ marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} className={`ui-tabbar__item ${tab === t.id ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }} className="admin-overview-grid">
            <Card>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem' }}>📈 Platform Activity (Last 12 Months)</h3>
              </div>
              <ChartPlaceholder data={[40, 65, 35, 80, 55, 70, 45, 60, 50, 75, 42, 68]} label="Monthly listings" height={220} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
              </div>
            </Card>

            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>⚡ Recent Activity</h3>
              <ActivityFeed items={[
                { icon: '🚗', text: 'New vehicle listed: Toyota V8', time: '2 min ago' },
                { icon: '⚡', text: 'Bid placed on Mercedes GLE', time: '15 min ago' },
                { icon: '👤', text: 'New dealer registered', time: '1 hour ago' },
                { icon: '🔒', text: 'Escrow released for BMW X5', time: '2 hours ago' },
                { icon: '✅', text: 'Vehicle inspection completed', time: '3 hours ago' },
              ]} />
            </Card>
          </div>
        )}

        {/* ── Dealers Tab ── */}
        {tab === 'dealers' && (
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16 }}>📊 Cars Listed by Dealer</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th style={{ textAlign: 'center' }}>Cars Listed</th>
                    <th style={{ textAlign: 'center' }}>Total Views</th>
                    <th style={{ textAlign: 'center' }}>Avg Views / Car</th>
                  </tr>
                </thead>
                <tbody>
                  {dealerRows.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td style={{ textAlign: 'center' }}>{d.carCount}</td>
                      <td style={{ textAlign: 'center' }}>{(d.totalViews || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>{d.carCount ? Math.round((d.totalViews || 0) / d.carCount).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {dealerRows.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32 }}>
                      <EmptyState icon="🏪" title="No dealer data" desc="Dealer data will appear once listings are created." />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Vehicles Tab ── */}
        {tab === 'vehicles' && (
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16 }}>👁 Most Viewed Cars</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Car</th>
                    <th>Dealer / Seller</th>
                    <th style={{ textAlign: 'center' }}>Views</th>
                    <th style={{ textAlign: 'center' }}>Bids</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topCars.map(car => (
                    <tr key={car._id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>
                        <Link to={`/cars/${car._id}`} style={{ color: 'inherit' }}>{car.title}</Link>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{car.dealer?.name || 'Unknown'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: car.views > 1000 ? 'var(--gold-400)' : undefined }}>
                        {(car.views || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>{car.bidsCount || 0}</td>
                      <td style={{ textAlign: 'center' }}>{statusBadge(car)}</td>
                    </tr>
                  ))}
                  {topCars.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                      <EmptyState icon="🚗" title="No vehicle data" desc="Vehicle data will appear once listings are created." />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Activity Tab ── */}
        {tab === 'activity' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="admin-activity-grid">
            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>⚡ Live Activity Feed</h3>
              <ActivityFeed items={[
                { icon: '🚗', text: 'New vehicle listed: Toyota Land Cruiser V8', time: '2 min ago' },
                { icon: '⚡', text: 'Bid placed: KES 11,200,000 on Mercedes GLE', time: '15 min ago' },
                { icon: '👤', text: 'New dealer registered: Mombasa Motors', time: '1 hour ago' },
                { icon: '🔒', text: 'Escrow released for BMW X5 M Sport', time: '2 hours ago' },
                { icon: '✅', text: 'Vehicle inspection completed for Audi Q7', time: '3 hours ago' },
                { icon: '💳', text: 'Payment processed: KES 450,000 deposit', time: '4 hours ago' },
                { icon: '⭐', text: 'New 5-star review left for Nairobi Auto Hub', time: '5 hours ago' },
              ]} />
            </Card>

            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📊 Bid Activity (Last 7 Days)</h3>
              <ChartPlaceholder data={[12, 25, 18, 30, 22, 35, 28]} label="Daily bids" height={200} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-overview-grid, .admin-activity-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
