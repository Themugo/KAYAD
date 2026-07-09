import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, formatKES } from '../../api/api';
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [summary, setSummary]     = useState(null);
  const [cars, setCars]           = useState([]);
  const [bids, setBids]           = useState([]);
  const [escrows, setEscrows]     = useState([]);
  const [earnings, setEarnings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [bidsPage, setBidsPage]   = useState(1);
  const [bidsTotal, setBidsTotal] = useState(0);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        dealerAPI.summary().catch(() => ({ summary: {} })),
        dealerAPI.cars().catch(() => ({ cars: [] })),
      ]);
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
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
      dealerAPI.escrows()
        .then(d => setEscrows(d.escrows || []))
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

  const s = summary || {};

  const statCards = [
    { label: 'Total Listings', value: s.totalCars ?? cars.length, icon: '🚗' },
    { label: 'Active', value: s.activeCars ?? 0, icon: '✅' },
    { label: 'Total Views', value: (s.totalViews ?? 0).toLocaleString(), icon: '👁' },
    { label: 'Total Bids', value: s.totalBids ?? 0, icon: '⚡' },
    { label: 'Live Auctions', value: s.liveAuctions ?? 0, icon: '🔴' },
    { label: 'Pending Escrows', value: s.pendingEscrows ?? 0, icon: '🔒' },
  ];

  const totalPages = Math.ceil(bidsTotal / 20);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Dealer Hub</div>
            <h2>Welcome, {user?.name?.split(' ')[0]}</h2>
            {user?.businessName && (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>🏪 {user.businessName}</div>
            )}
          </div>
          <Link to="/dealer/add-car" className="btn btn-gold">+ List New Car</Link>
        </div>

        {/* ─── Stats Grid ─── */}
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {statCards.map(c => (
            <div key={c.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label">{c.label}</div>
                  <div className="stat-value">{c.value}</div>
                </div>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* OVERVIEW                                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid-2">
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recent Listings</h3>
              {cars.slice(0, 5).map(car => (
                <div key={car._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{car.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{car.views || 0} views · {car.bidsCount || 0} bids</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontWeight: 600, fontSize: '0.95rem' }}>
                      {formatKES(car.price)}
                    </div>
                    {car.auctionStatus === 'live' && <span className="badge badge-green" style={{ fontSize: 9 }}>LIVE</span>}
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

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { to: '/dealer/add-car', icon: '➕', label: 'List a New Car', desc: 'Add vehicle to marketplace' },
                  { to: '/dealer/analytics', icon: '📊', label: 'Analytics', desc: 'Views, bids, earnings reports' },
                  { to: '/dealer/settings', icon: '⚙', label: 'Settings', desc: 'Payments, business profile, alerts' },
                  { to: '/escrow', icon: '🔒', label: 'Check Escrow', desc: 'View payment status' },
                  { to: '/chat', icon: '💬', label: 'View Messages', desc: 'Buyer inquiries' },
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

            {/* Dealer Stats Summary */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Performance at a Glance</h3>
              <div className="grid-2" style={{ gap: 12 }}>
                {[
                  { label: 'Conversion Rate', val: s.totalCars > 0 ? `${Math.round(((s.soldCars || 0) / s.totalCars) * 100)}%` : '0%' },
                  { label: 'Avg Views / Car', val: s.totalCars > 0 ? Math.round((s.totalViews || 0) / s.totalCars).toLocaleString() : 0 },
                  { label: 'Total Revenue', val: formatKES(s.totalRevenue || 0) },
                  { label: 'Sold Cars', val: s.soldCars ?? 0 },
                ].map(st => (
                  <div key={st.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-light)', marginTop: 2 }}>{st.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Dealer Quick Links</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link to="/dealer/analytics" className="btn btn-outline btn-sm">📊 Full Analytics</Link>
                <Link to="/dealer/settings" className="btn btn-outline btn-sm">⚙ Settings</Link>
                <Link to="/payments" className="btn btn-outline btn-sm">💳 Payments</Link>
                <Link to="/escrow" className="btn btn-outline btn-sm">🔒 Escrows</Link>
                <Link to="/chat" className="btn btn-outline btn-sm">💬 Messages</Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* LISTINGS                                                */}
        {/* ═══════════════════════════════════════════════════════ */}
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
              <div className="card" style={{ padding: 0 }}>
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

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BIDS                                                    */}
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
        {/* ESCROWS                                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'escrows' && (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
              {escrows.length} escrow{escrows.length !== 1 ? 's' : ''}
            </div>

            {escrows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔒</div>
                <h3>No escrows yet</h3>
                <p>Escrows are created when a buyer pays for one of your listings. They'll appear here.</p>
              </div>
            ) : (
              <div className="grid-2">
                {escrows.map(e => (
                  <div key={e._id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.car?.title || 'Unknown Car'}</div>
                      <span className={`badge ${e.status === 'held' ? 'badge-gold' : e.status === 'released' ? 'badge-green' : e.status === 'refunded' ? 'badge-red' : 'badge-muted'}`}>
                        {e.status}
                      </span>
                    </div>
                    <div className="grid-2" style={{ gap: 8, fontSize: 13 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Buyer</div>
                        <div style={{ fontWeight: 500 }}>{e.buyer?.name || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                        <div className="price-tag">{formatKES(e.amount)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created</div>
                        <div>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-KE') : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Released</div>
                        <div>{e.releasedAt ? new Date(e.releasedAt).toLocaleDateString('en-KE') : '—'}</div>
                      </div>
                    </div>
                    {e.status === 'held' && (
                      <div style={{ marginTop: 12, background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)', borderRadius: 6, padding: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                        ⏳ Payment held in escrow — awaiting admin release after buyer confirms receipt
                      </div>
                    )}
                    {e.status === 'released' && (
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--green)' }}>✅ Released — funds sent to your account</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Link to="/escrow" className="btn btn-outline btn-sm">View All Escrows →</Link>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* EARNINGS                                                */}
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
