import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dealerAPI, carsAPI, adminAPI, escrowAPI, formatKES, isDemoMode } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TABS = [
  { id: 'overview',  label: '📊 Overview' },
  { id: 'listings',  label: '🚗 Listings' },
  { id: 'bids',      label: '⚡ Bids' },
  { id: 'escrows',   label: '🔒 Escrows' },
  { id: 'earnings',  label: '💰 Earnings' },
];

export default function DealerDashboard() {
  const { user, isDealer } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [summary, setSummary]     = useState(null);
  const [cars, setCars]           = useState([]);
  const [bids, setBids]           = useState([]);
  const [escrows, setEscrows]     = useState([]);
  const [earnings, setEarnings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [bidsPage, setBidsPage]   = useState(1);
  const [bidsTotal, setBidsTotal] = useState(0);
  const [config, setConfig]       = useState({});

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, c, cfg] = await Promise.all([
        dealerAPI.summary().catch(() => ({ summary: {} })),
        dealerAPI.cars().catch(() => ({ cars: [] })),
        adminAPI.getConfig().catch(() => ({})),
      ]);
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
      setConfig(cfg);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (tab === 'bids') {
      dealerAPI.bids({ page: bidsPage, limit: 20 })
        .then(d => { setBids(d.bids || []); setBidsTotal(d.pagination?.total || 0); })
        .catch(() => {});
    }
    if (tab === 'escrows') {
      escrowAPI.mine()
        .then(d => setEscrows(d.escrows || d.data || []))
        .catch(() => {});
    }
    if (tab === 'earnings') {
      dealerAPI.earnings({ days: 365 })
        .then(d => setEarnings(d.earnings || d.data || d))
        .catch(() => {});
    }
  }, [tab, bidsPage]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await carsAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      toast('Listing deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  const paymentsWaived = !!(config.waivePayments || config.freeMarket || isDemoMode());

  if (!user?.approved && user?.role === 'dealer') {
    return (
      <div className="page loading-center" style={{ flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h3>Awaiting Admin Approval</h3>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
          Your seller account is pending approval. You'll be notified once approved.
        </p>
      </div>
    );
  }

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const s = summary || {};

  const totalStockValue = cars.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
  const brandGroups = cars.reduce((acc, c) => {
    const b = c.brand || 'Other';
    if (!acc[b]) acc[b] = [];
    acc[b].push(c);
    return acc;
  }, {});
  const brandCounts = Object.entries(brandGroups).sort((a, b) => b[1].length - a[1].length);

  const statCards = [
    { label: 'Total Listings', value: s.totalCars ?? cars.length, icon: '🚗' },
    { label: 'Stock Value', value: formatKES(totalStockValue), icon: '💎' },
    { label: 'Active', value: s.activeCars ?? 0, icon: '✅' },
    { label: 'Total Views', value: (s.totalViews ?? 0).toLocaleString(), icon: '👁' },
    { label: 'Total Bids', value: s.totalBids ?? 0, icon: '⚡' },
    { label: 'Sold', value: s.soldCars ?? 0, icon: '🏆' },
  ];

  const totalPages = Math.ceil(bidsTotal / 20);

  const escrowLocked = escrows.filter(e => e.status === 'funded' || e.status === 'pending').length;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        {/* ─── Status Banner ─── */}
        {paymentsWaived && (
          <div style={{
            padding: '10px 18px', marginBottom: 20, borderRadius: 10,
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 12, color: 'var(--gold-light)' }}>
              🎉 Listing fees waived — you're on the free plan. No payment needed.
            </div>
            {(paymentsWaived && !isDemoMode()) && (
              <span className="badge badge-gold" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>FREE PLAN</span>
            )}
          </div>
        )}

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">{isDealer ? 'Dealer Hub' : 'Seller Hub'}</div>
            <h2>Welcome, {user?.name?.split(' ')[0]}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {user?.businessName && (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>🏪 {user.businessName}</div>
              )}
              {isDealer && (
                <span style={{
                  background: 'rgba(212,168,55,0.15)', color: 'var(--gold)',
                  borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700,
                }}>DEALER</span>
              )}
              {!isDealer && (
                <>
                  <span style={{
                    background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                    borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700,
                  }}>BROKER</span>
                  <span style={{
                    background: 'rgba(212,168,55,0.1)', color: 'var(--gold)',
                    borderRadius: 4, padding: '1px 6px', fontSize: 8, fontWeight: 700,
                  }}>🔒 ESCROW MANDATORY</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/dealer/add-car" className="btn btn-gold">+ List New Car</Link>
            <Link to="/dealer/analytics" className="btn btn-outline">📊 Analytics</Link>
          </div>
        </div>

        {/* ─── Stats Grid ─── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 28,
        }}>
          {statCards.map((c, i) => (
            <div key={c.label} style={{
              background: i < 2 ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.03))' : 'var(--surface)',
              border: `1px solid ${i < 2 ? 'rgba(212,175,55,0.2)' : 'var(--border)'}`,
              borderRadius: 12, padding: '16px 18px',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: i < 2 ? 'var(--gold-light)' : '#fff', lineHeight: 1.2 }}>{c.value}</div>
                </div>
                <span style={{ fontSize: 24, opacity: 0.6 }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {TABS.map(t => {
            const badge = t.id === 'escrows' && escrowLocked > 0 ? escrowLocked : null;
            return (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
                {badge != null && <span className="tab-badge">{badge}</span>}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* OVERVIEW                                               */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Recent Listings */}
              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Listings</h3>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cars.length} total</span>
                </div>
                {cars.slice(0, 5).map((car, i) => (
                  <div key={car._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600, width: 20 }}>#{i + 1}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{car.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.views || 0} views · {car.bidsCount || 0} bids</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link to={`/dealer/edit/${car._id}`} className="btn btn-outline btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}>Edit</Link>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 600, fontSize: '0.95rem' }}>
                          {formatKES(car.price)}
                        </div>
                        {car.auctionStatus === 'live' && <span className="badge badge-green" style={{ fontSize: 9 }}>LIVE</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {cars.length === 0 && (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <div className="empty-icon">🚗</div>
                    <p style={{ fontSize: 13 }}>No listings yet</p>
                    <Link to="/dealer/add-car" className="btn btn-gold btn-sm" style={{ marginTop: 8 }}>Add First Car</Link>
                  </div>
                )}
                {cars.length > 0 && (
                  <button onClick={() => setTab('listings')} style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View all listings →
                  </button>
                )}
              </div>

              {/* Brand Distribution */}
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Brand Inventory</h3>
                {brandCounts.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>No cars yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {brandCounts.map(([brand, list]) => (
                      <div key={brand} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🚘</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ fontWeight: 600 }}>{brand}</span>
                            <span style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{list.length}</span>
                          </div>
                          <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: 'var(--gold)', width: `${(list.length / cars.length) * 100}%` }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                          {formatKES(list.reduce((s, c) => s + (Number(c.price) || 0), 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom row: Quick Actions + Performance ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { to: '/dealer/add-car', icon: '➕', label: 'List a New Car', desc: 'Add vehicle to marketplace' },
                    { to: '/dealer/analytics', icon: '📊', label: 'Analytics & Reports', desc: 'Views, bids, earnings reports' },
                    { to: '/dealer/settings', icon: '⚙', label: 'Settings & Team', desc: 'Payments, business profile, staff' },
                    { to: '/escrow', icon: '🔒', label: 'Escrow Dashboard', desc: 'Secure payment protection' },
                    { to: '/chat', icon: '💬', label: 'Messages', desc: 'Buyer inquiries & chat' },
                  ].map(a => (
                    <Link key={a.to} to={a.to} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '11px 14px', borderRadius: 8,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      transition: 'all 0.2s', textDecoration: 'none',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(212,175,55,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                    >
                      <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{a.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Performance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Conversion Rate', val: s.totalCars > 0 ? `${Math.round(((s.soldCars || 0) / s.totalCars) * 100)}%` : '0%' },
                    { label: 'Avg Views / Car', val: s.totalCars > 0 ? Math.round((s.totalViews || 0) / s.totalCars).toLocaleString() : 0 },
                    { label: 'Total Revenue', val: formatKES(s.totalRevenue || 0) },
                    { label: 'Sold Cars', val: s.soldCars ?? 0 },
                  ].map(st => (
                    <div key={st.label} style={{ background: 'rgba(212,175,55,0.04)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(212,175,55,0.08)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold-light)', marginTop: 4 }}>{st.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <Link to="/dealer/analytics" className="btn btn-outline btn-sm">📊 Full Analytics</Link>
                  <Link to="/dealer/settings" className="btn btn-outline btn-sm">⚙ Settings</Link>
                  <Link to="/payments" className="btn btn-outline btn-sm">💳 Payments</Link>
                  <Link to="/chat" className="btn btn-outline btn-sm">💬 Messages</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* LISTINGS                                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'listings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{cars.length} listing{cars.length !== 1 ? 's' : ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!paymentsWaived && (
                  <span className="badge badge-gold" style={{ fontSize: 9 }}>LISTING FEE: {formatKES(config.listingFee || 0)}</span>
                )}
                <Link to="/dealer/add-car" className="btn btn-gold btn-sm">+ Add Car</Link>
              </div>
            </div>

            {cars.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <h3>No listings yet</h3>
                <p>Start by adding your first car to the marketplace.</p>
                <Link to="/dealer/add-car" className="btn btn-gold" style={{ marginTop: 16 }}>List Your First Car</Link>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 30, fontSize: 10 }}>#</th>
                        <th>Car</th>
                        <th>Price</th>
                        <th>Views</th>
                        <th>Bids</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cars.map((car, idx) => (
                        <tr key={car._id}>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                                {car.images?.[0]?.url
                                  ? <img src={car.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚗</div>
                                }
                              </div>
                              <div>
                                <Link to={`/dealer/edit/${car._id}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}>{car.title}</Link>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.year} · {car.fuel} · {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(car.price)}</td>
                          <td style={{ fontSize: 13 }}>{car.views || 0}</td>
                          <td style={{ fontSize: 13 }}>{car.bidsCount || 0}</td>
                          <td>
                            {car.auctionStatus === 'live'
                              ? <span className="badge badge-green">Live</span>
                              : car.auctionStatus === 'ended'
                              ? <span className="badge badge-muted">Ended</span>
                              : car.allowBid
                              ? <span className="badge badge-gold">Bidding</span>
                              : <span className="badge badge-blue">Listed</span>
                            }
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Link to={`/dealer/edit/${car._id}`} className="btn btn-outline btn-sm">✏ Edit</Link>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car._id)} title="Delete">🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Total stock value: <strong style={{ color: 'var(--gold-light)' }}>{formatKES(totalStockValue)}</strong></span>
                  <span>Avg price: <strong>{cars.length > 0 ? formatKES(Math.round(totalStockValue / cars.length)) : '—'}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BIDS                                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'bids' && (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
              {bidsTotal} bid{bidsTotal !== 1 ? 's' : ''} on your listings
            </div>

            {bids.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚡</div>
                <h3>No bids received yet</h3>
                <p>Bids from buyers appear here once they place them on your listings.</p>
                <Link to="/dealer/add-car" className="btn btn-gold" style={{ marginTop: 16 }}>List a Car to Attract Bids</Link>
              </div>
            ) : (
              <>
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Car</th>
                          <th>Bidder</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bids.map(b => (
                          <tr key={b._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 36, height: 26, borderRadius: 3, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                                  {b.carImage
                                    ? <img src={b.carImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🚗</div>
                                  }
                                </div>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{b.carTitle}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{b.bidderName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.bidderEmail}</div>
                            </td>
                            <td className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(b.amount)}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-KE') : '—'}
                            </td>
                            <td>
                              <span className={`badge ${b.status === 'paid' ? 'badge-green' : b.status === 'failed' ? 'badge-red' : 'badge-orange'}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-outline btn-sm" disabled={bidsPage <= 1} onClick={() => setBidsPage(p => p - 1)}>← Prev</button>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px' }}>Page {bidsPage} of {totalPages}</span>
                    <button className="btn btn-outline btn-sm" disabled={bidsPage >= totalPages} onClick={() => setBidsPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ESCROWS — now unified for all sellers                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'escrows' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                {escrows.length} escrow{escrows.length !== 1 ? 's' : ''}
              </div>
              <Link to="/escrow" className="btn btn-outline btn-sm">Full Escrow Dashboard →</Link>
            </div>

            {/* Escrow summary */}
            {escrows.length > 0 && (
              <div className="grid-3" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Total Escrows', val: escrows.length, icon: '🔒', color: 'var(--text)' },
                  { label: 'Locked / Funded', val: escrows.filter(e => e.status === 'funded' || e.status === 'pending').length, icon: '💰', color: 'var(--blue)' },
                  { label: 'Released', val: escrows.filter(e => e.status === 'released').length, icon: '✅', color: 'var(--green)' },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                      </div>
                      <span style={{ fontSize: 24 }}>{s.icon}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            {escrows.length === 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div className="grid-4" style={{ textAlign: 'center' }}>
                  {[
                    { step: '1', icon: '💳', label: 'Buyer Pays', desc: 'Full amount via M-Pesa into escrow' },
                    { step: '2', icon: '🔒', label: 'Funds Locked', desc: 'Admin holds payment securely' },
                    { step: '3', icon: '🚗', label: 'Car Delivered', desc: 'Buyer inspects and confirms' },
                    { step: '4', icon: '✅', label: 'Released to You', desc: 'Funds sent to your account' },
                  ].map(s => (
                    <div key={s.step}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-glow)', border: '1px solid var(--gold-muted)', color: 'var(--gold)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                        {s.step}
                      </div>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="empty-state" style={{ padding: '20px 0 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                  <h3>No escrows yet</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Escrows are created when a buyer pays for one of your listings. They'll appear here automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Escrow list */}
            {escrows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {escrows.map(e => {
                  const statusMeta = {
                    pending:  { label: 'Pending',  badge: 'badge-orange', icon: '⏳' },
                    funded:   { label: 'Funded',   badge: 'badge-blue',   icon: '💰' },
                    released: { label: 'Released', badge: 'badge-green',  icon: '✅' },
                    refunded: { label: 'Refunded', badge: 'badge-red',    icon: '↩️' },
                    disputed: { label: 'Disputed', badge: 'badge-red',    icon: '⚠️' },
                  };
                  const m = statusMeta[e.status] || { label: e.status, badge: 'badge-muted', icon: '•' };
                  return (
                    <div key={e._id} className="card" style={{
                      padding: 18, border: e.status === 'funded' ? '1px solid rgba(59,130,246,0.25)' : '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 28 }}>{m.icon}</div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span className={`badge ${m.badge}`}>{m.label}</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{e.car?.title || 'Car Sale'}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Buyer: {e.buyer?.name || '—'} · {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-KE') : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="price-tag" style={{ fontSize: '1.1rem' }}>{formatKES(e.amount)}</div>
                          {e.status === 'funded' && <span style={{ fontSize: 11, color: 'var(--gold)', display: 'block', marginTop: 2 }}>🕐 Awaiting release</span>}
                          {e.status === 'released' && <span style={{ fontSize: 11, color: 'var(--green)', display: 'block', marginTop: 2 }}>✅ Funds sent</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* EARNINGS                                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'earnings' && (
          <div>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {[
                { label: 'Total Earned', value: formatKES(earnings?.total ?? s.totalRevenue ?? 0), icon: '💰' },
                { label: 'In Escrow', value: formatKES(earnings?.inEscrow ?? 0), icon: '🔒' },
                { label: 'Released', value: formatKES(earnings?.released ?? 0), icon: '✅' },
                { label: 'This Period', value: formatKES(earnings?.thisMonth ?? 0), icon: '📈' },
              ].map(e => (
                <div key={e.label} className="stat-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div className="stat-label">{e.label}</div>
                      <div className="stat-value">{e.value}</div>
                    </div>
                    <span style={{ fontSize: 26 }}>{e.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly revenue bar */}
            {earnings?.monthly?.length > 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>📈 Monthly Revenue</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 }}>
                  {earnings.monthly.slice(-12).map((m, i) => {
                    const val = m.amount || m.total || 0;
                    const max = Math.max(...earnings.monthly.map(x => x.amount || x.total || 0), 1);
                    const pct = (val / max) * 100;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ height: `${Math.max(4, pct)}%`, width: '100%', borderRadius: '3px 3px 0 0', background: i === earnings.monthly.length - 1 ? 'var(--gold)' : 'var(--gold-muted)', minHeight: 4, transition: 'height 0.4s' }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-dim)' }}>
                  {earnings.monthly.slice(-12).filter((_, i) => i % 3 === 0).map((m, i) => (
                    <span key={i}>{m.month || ''}</span>
                  ))}
                </div>
              </div>
            )}

            {earnings?.payments?.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>Recent Payments</h3>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Car</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.payments.slice(0, 10).map(p => (
                        <tr key={p._id}>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-KE') : '—'}
                          </td>
                          <td style={{ fontSize: 13 }}>{p.car?.title || '—'}</td>
                          <td className="price-tag" style={{ fontSize: '0.9rem' }}>{formatKES(p.dealerAmount || p.amount)}</td>
                          <td>
                            <span className={`badge ${p.status === 'success' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-muted'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                  <Link to="/payments" className="btn btn-outline btn-sm">View All Payments →</Link>
                </div>
              </div>
            )}

            {(!earnings?.payments || earnings.payments.length === 0) && (
              <div className="empty-state">
                <div className="empty-icon">💰</div>
                <h3>No earnings yet</h3>
                <p>Once you make sales, your earnings and payment history will appear here.</p>
                <Link to="/dealer/analytics" className="btn btn-outline" style={{ marginTop: 16 }}>View Analytics 📊</Link>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
