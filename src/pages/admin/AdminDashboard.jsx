// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { carsAPI, adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { SkeletonStat, SkeletonRow, SkeletonText } from '../../components/Skeleton';

function ReportCard({ icon, label, val, color }) {
  return (
    <div className="stat-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, fontSize: '1.5rem' }}>{val}</div>
        </div>
        <span style={{ fontSize: 28, opacity: 0.7 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [cars, setCars] = useState([]);

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
    <div className="page">
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
        <div className="card" style={{ padding: '16px 20px 0' }}>
          <SkeletonText lines={1} />
          <div style={{ marginTop: 16 }}>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</div>
        </div>
      </div>
    </div>
  );

  const s = stats || {};

  // ── Dealer-wise aggregation ──
  const dealerMap = {};
  cars.forEach(car => {
    const dealerId = car.dealer?._id || 'unknown';
    const dealerName = car.dealer?.name || 'Unknown Dealer';
    if (!dealerMap[dealerId]) dealerMap[dealerId] = { name: dealerName, carCount: 0, totalViews: 0, cars: [] };
    dealerMap[dealerId].carCount++;
    dealerMap[dealerId].totalViews += car.views || 0;
    dealerMap[dealerId].cars.push(car);
  });
  const dealerRows = Object.entries(dealerMap)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.carCount - a.carCount);

  // ── Most viewed cars ──
  const topCars = [...cars]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 15);

  const statusBadge = (car) => {
    if (car.auctionStatus === 'live') return <span className="badge badge-green">Live</span>;
    if (car.auctionStatus === 'ended') return <span className="badge badge-muted">Ended</span>;
    if (car.auctionStatus === 'sold') return <span className="badge badge-gold">Sold</span>;
    return <span className="badge badge-muted">Draft</span>;
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1100 }}>

        <div style={{ marginBottom: 28 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Reports Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Read-only platform analytics — cars listed per dealer and car viewership.
          </p>
        </div>

        {/* ── Summary Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          <ReportCard icon="👥" label="Total Users" val={(s.totalUsers || 0).toLocaleString()} color="var(--blue)" />
          <ReportCard icon="🚗" label="Total Cars" val={(s.totalCars || 0).toLocaleString()} color="var(--green)" />
          <ReportCard icon="⚡" label="Total Bids" val={(s.totalBids || 0).toLocaleString()} color="var(--gold)" />
          <ReportCard icon="💰" label="Revenue" val={formatKES(s.revenue || 0)} color="var(--purple)" />
          <ReportCard icon="📋" label="Dealers" val={String(dealerRows.length)} color="var(--orange)" />
        </div>

        {/* ── Cars Listed By Dealer ── */}
        <div className="card" style={{ marginBottom: 24, padding: 0 }}>
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
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No dealer data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Most Viewed Cars ── */}
        <div className="card" style={{ padding: 0 }}>
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
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{car.title}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{car.dealer?.name || 'Unknown'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: car.views > 1000 ? 'var(--gold)' : undefined }}>
                      {(car.views || 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>{car.bidsCount || 0}</td>
                    <td style={{ textAlign: 'center' }}>{statusBadge(car)}</td>
                  </tr>
                ))}
                {topCars.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No car data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}