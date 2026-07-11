// src/pages/dealer/DealerDashboard.jsx — Redesigned with UI component system
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, formatKES } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatCard, Card, Badge, ChartPlaceholder, ActivityFeed, EmptyState, Button, Pagination } from '../../components/ui';

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
      <div className="page" style={{ paddingTop: 88 }}>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <EmptyState icon="⏳" title="Awaiting Admin Approval"
            desc="Your dealer account is pending approval. You'll be notified once approved." />
        </div>
      </div>
    );
  }

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const s = summary || {};

  return (
    <div className="page" style={{ paddingTop: 88 }}>
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
          <Button variant="primary" icon="➕" onClick={() => window.location.href = '/dealer/add-car'}>List New Car</Button>
        </div>

        {/* ─── Stats Grid ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard icon="🚗" iconVariant="gold" label="Total Listings" value={s.totalCars ?? cars.length} />
          <StatCard icon="✅" iconVariant="green" label="Active" value={s.activeCars ?? 0} />
          <StatCard icon="👁" iconVariant="blue" label="Total Views" value={(s.totalViews ?? 0).toLocaleString()} trend={5} />
          <StatCard icon="⚡" iconVariant="gold" label="Total Bids" value={s.totalBids ?? 0} />
          <StatCard icon="🔴" iconVariant="red" label="Live Auctions" value={s.liveAuctions ?? 0} />
          <StatCard icon="🔒" iconVariant="orange" label="Pending Escrows" value={s.pendingEscrows ?? 0} />
        </div>

        {/* ─── Tabs ─── */}
        <div className="ui-tabbar" style={{ marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} className={`ui-tabbar__item ${tab === t.id ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═════ OVERVIEW ═════ */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }} className="dealer-overview-grid">
            {/* Recent Listings */}
            <Card>
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
                    {car.auctionStatus === 'live' && <Badge variant="live" style={{ fontSize: 9 }}>LIVE</Badge>}
                  </div>
                </div>
              ))}
              {cars.length === 0 && (
                <EmptyState icon="🚗" title="No listings yet"
                  action={() => window.location.href = '/dealer/add-car'} actionLabel="Add First Car" />
              )}
              {cars.length > 0 && (
                <button onClick={() => setTab('listings')} style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  View all listings →
                </button>
              )}
            </Card>

            {/* Quick Actions */}
            <Card>
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
                    padding: '12px', borderRadius: 'var(--radius-md)',
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
            </Card>

            {/* Performance */}
            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📈 Views (Last 7 Days)</h3>
              <ChartPlaceholder data={[30, 45, 35, 50, 65, 55, 70]} label="Daily views" height={160} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </Card>

            {/* Activity */}
            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>⚡ Recent Activity</h3>
              <ActivityFeed items={[
                { icon: '👁', text: 'New view on Toyota V8', time: '10 min ago' },
                { icon: '⚡', text: 'Bid placed on Mercedes GLE', time: '1 hour ago' },
                { icon: '💬', text: 'New inquiry from buyer', time: '2 hours ago' },
                { icon: '🔒', text: 'Escrow payment received', time: '5 hours ago' },
              ]} />
            </Card>
          </div>
        )}

        {/* ═════ LISTINGS ═════ */}
        {tab === 'listings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{cars.length} listing{cars.length !== 1 ? 's' : ''}</div>
              <Link to="/dealer/add-car" className="btn btn-gold btn-sm">+ Add Car</Link>
            </div>

            {cars.length === 0 ? (
              <EmptyState icon="🚗" title="No listings yet" desc="Start by adding your first car to the marketplace."
                action={() => window.location.href = '/dealer/add-car'} actionLabel="List Your First Car" />
            ) : (
              <Card style={{ padding: 0 }}>
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
                              ? <Badge variant="green">Live</Badge>
                              : car.auctionStatus === 'ended'
                              ? <Badge variant="muted">Ended</Badge>
                              : <Badge variant="blue">Listed</Badge>
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
              </Card>
            )}
          </div>
        )}

        {/* ═════ BIDS ═════ */}
        {tab === 'bids' && (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
              {bidsTotal} bid{bidsTotal !== 1 ? 's' : ''} on your listings
            </div>

            {bids.length === 0 ? (
              <EmptyState icon="⚡" title="No bids received yet" desc="Bids from buyers appear here once they place them on your listings."
                action={() => window.location.href = '/dealer/add-car'} actionLabel="List a Car to Attract Bids" />
            ) : (
              <>
                <Card style={{ padding: 0 }}>
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
                              <Badge variant={b.status === 'paid' ? 'green' : b.status === 'failed' ? 'red' : 'orange'}>
                                {b.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {bidsTotal > 20 && (
                  <div style={{ marginTop: 20 }}>
                    <Pagination page={bidsPage} totalPages={Math.ceil(bidsTotal / 20)} onChange={setBidsPage} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═════ ESCROWS ═════ */}
        {tab === 'escrows' && (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
              {escrows.length} escrow{escrows.length !== 1 ? 's' : ''}
            </div>

            {escrows.length === 0 ? (
              <EmptyState icon="🔒" title="No escrows yet" desc="Escrows are created when a buyer pays for one of your listings. They'll appear here." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="escrow-grid">
                {escrows.map(e => (
                  <Card key={e._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.car?.title || 'Unknown Car'}</div>
                      <Badge variant={e.status === 'held' ? 'gold' : e.status === 'released' ? 'green' : e.status === 'refunded' ? 'red' : 'muted'}>
                        {e.status}
                      </Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
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
                  </Card>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Link to="/escrow"><Button variant="outline" size="sm">View All Escrows →</Button></Link>
            </div>
          </div>
        )}

        {/* ═════ EARNINGS ═════ */}
        {tab === 'earnings' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              <StatCard icon="💰" iconVariant="gold" label="Total Earned" value={formatKES(earnings?.total ?? s.totalRevenue ?? 0)} />
              <StatCard icon="🔒" iconVariant="orange" label="In Escrow" value={formatKES(earnings?.inEscrow ?? 0)} />
              <StatCard icon="✅" iconVariant="green" label="Released" value={formatKES(earnings?.released ?? 0)} />
              <StatCard icon="📈" iconVariant="blue" label="This Period" value={formatKES(earnings?.thisMonth ?? 0)} trend={12} />
            </div>

            {/* Earnings chart */}
            <Card style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📊 Monthly Earnings</h3>
              <ChartPlaceholder data={[450, 520, 380, 610, 550, 720, 680, 750, 690, 820, 780, 910]} label="Monthly revenue (KES thousands)" height={200} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
              </div>
            </Card>

            {earnings?.payments?.length > 0 && (
              <Card style={{ padding: 0 }}>
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
                            <Badge variant={p.status === 'success' ? 'green' : p.status === 'failed' ? 'red' : 'muted'}>
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                  <Link to="/payments"><Button variant="outline" size="sm">View All Payments →</Button></Link>
                </div>
              </Card>
            )}

            {(!earnings?.payments || earnings.payments.length === 0) && (
              <EmptyState icon="💰" title="No earnings yet" desc="Once you make sales, your earnings and payment history will appear here."
                action={() => window.location.href = '/dealer/analytics'} actionLabel="View Analytics 📊" />
            )}
          </div>
        )}
      </div>

      {/* responsive handled in index.css */}
    </div>
  );
}
