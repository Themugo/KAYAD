// src/pages/dealer/DealerDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, formatKES } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CarCard from '../../components/CarCard';

export default function DealerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [summary, setSummary]   = useState(null);
  const [cars, setCars]         = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');

  useEffect(() => {
    Promise.all([
      dealerAPI.summary().catch(() => ({})),
      dealerAPI.cars().catch(() => ({ cars: [] })),
      dealerAPI.earnings().catch(() => ({})),
    ]).then(([s, c, e]) => {
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
      setEarnings(e.earnings || e.data || e);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await carsAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      toast('Listing deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  if (!user?.approved && user?.role === 'dealer') {
    return (
      <div className="page loading-center" style={{ flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h3>Awaiting Admin Approval</h3>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
          Your dealer account is pending approval. You'll be notified once approved.
        </p>
      </div>
    );
  }

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const stats = [
    { label: 'Total Listings', value: summary?.totalCars ?? cars.length, icon: '🚗' },
    { label: 'Active Listings', value: summary?.activeCars ?? 0, icon: '✅' },
    { label: 'Total Views', value: summary?.totalViews?.toLocaleString() ?? 0, icon: '👁' },
    { label: 'Total Bids', value: summary?.totalBids ?? 0, icon: '⚡' },
    { label: 'Total Earned', value: formatKES(earnings?.total ?? 0), icon: '💰' },
    { label: 'Live Auctions', value: summary?.liveAuctions ?? 0, icon: '🔴' },
  ];

  return (
    <div className="page">
      <div className="container" style={{ padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div className="section-eyebrow">Dealer Hub</div>
            <h2>Welcome, {user?.name?.split(' ')[0]}</h2>
            {user?.businessName && (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>🏪 {user.businessName}</div>
            )}
          </div>
          <Link to="/dealer/add-car" className="btn btn-gold">
            + List New Car
          </Link>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['overview', 'listings', 'earnings'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ─ Overview ─ */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Recent listings */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recent Listings</h3>
                {cars.slice(0, 4).map(car => (
                  <div key={car._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{car.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.views || 0} views · {car.bidsCount || 0} bids</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 600, fontSize: '0.95rem' }}>
                        {formatKES(car.price)}
                      </div>
                      {car.auctionStatus === 'live' && (
                        <span className="badge badge-green" style={{ fontSize: 9 }}>LIVE</span>
                      )}
                    </div>
                  </div>
                ))}
                <Link to="/dealer" onClick={() => setTab('listings')} style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--gold)' }}>
                  View all listings →
                </Link>
              </div>

              {/* Quick actions */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { to: '/dealer/add-car', icon: '➕', label: 'List a New Car', desc: 'Add vehicle to marketplace' },
                    { to: '/escrow',         icon: '🔒', label: 'Check Escrow',   desc: 'View payment status' },
                    { to: '/chat',           icon: '💬', label: 'View Messages',  desc: 'Buyer inquiries' },
                    { to: '/cars?auctionStatus=live', icon: '⚡', label: 'Live Auctions', desc: 'See what\'s bidding now' },
                  ].map(a => (
                    <Link key={a.to} to={a.to} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px', borderRadius: 8,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      transition: 'border-color 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span style={{ fontSize: 24 }}>{a.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─ Listings ─ */}
        {tab === 'listings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{cars.length} listing{cars.length !== 1 ? 's' : ''}</div>
              <Link to="/dealer/add-car" className="btn btn-gold btn-sm">+ Add Car</Link>
            </div>

            {cars.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <h3>No listings yet</h3>
                <p>Start by adding your first car to the marketplace.</p>
                <Link to="/dealer/add-car" className="btn btn-gold" style={{ marginTop: 16 }}>List Your First Car</Link>
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Car</th>
                        <th>Price</th>
                        <th>Views</th>
                        <th>Bids</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cars.map(car => (
                        <tr key={car._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                                {car.images?.[0]?.url
                                  ? <img src={car.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚗</div>
                                }
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{car.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.year} · {car.fuel}</div>
                              </div>
                            </div>
                          </td>
                          <td className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(car.price)}</td>
                          <td>{car.views || 0}</td>
                          <td>{car.bidsCount || 0}</td>
                          <td>
                            {car.auctionStatus === 'live'
                              ? <span className="badge badge-green">Live</span>
                              : car.auctionStatus === 'ended'
                              ? <span className="badge badge-muted">Ended</span>
                              : <span className="badge badge-blue">Listed</span>
                            }
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Link to={`/dealer/edit/${car._id}`} className="btn btn-outline btn-sm">Edit</Link>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car._id)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─ Earnings ─ */}
        {tab === 'earnings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {[
              { label: 'Total Earned', value: formatKES(earnings?.total ?? 0) },
              { label: 'This Month', value: formatKES(earnings?.thisMonth ?? 0) },
              { label: 'In Escrow', value: formatKES(earnings?.inEscrow ?? 0) },
              { label: 'Released', value: formatKES(earnings?.released ?? 0) },
            ].map(e => (
              <div key={e.label} className="stat-box">
                <div className="stat-label">{e.label}</div>
                <div className="stat-value">{e.value}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
