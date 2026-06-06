import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, adminAPI, notifAPI, escrowAPI, formatKES } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit3, Trash2, ChevronRight, TrendingUp, Car, Gavel, BarChart3, Users, Shield, Bell, Copy, Download, BadgePercent, RefreshCw } from 'lucide-react';

// Extracted components
import TeamTab from './components/TeamTab';
import DealerOverview from './components/DealerOverview';
import {
  TABS_CONFIG, STATUS_CONFIG, BID_STATUS_CONFIG, ESCROW_STEPS,
  timeAgo, StatCard, StatusBadge, DemoBadge, EscrowProgress,
} from './components/DashboardWidgets';

const TABS = TABS_CONFIG.map(t => ({
  ...t,
  icon: { overview: BarChart3, listings: Car, bids: Gavel, escrows: Shield, earnings: TrendingUp, package: BadgePercent, team: Users }[t.id],
}));

export default function DealerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary]     = useState(null);
  const [cars, setCars]           = useState([]);
  const [bids, setBids]           = useState([]);
  const [escrows, setEscrows]     = useState([]);
  const [earnings, setEarnings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [config, setConfig]       = useState({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [trends, setTrends]       = useState({});
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir]     = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bidFilter, setBidFilter] = useState('all');
  const [escrowLoading, setEscrowLoading] = useState(false);

  const canManageDemoCars = ['dealer', 'broker', 'individual_seller'].includes(user?.role);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const fetchEscrows = () => {
    setEscrowLoading(true);
    escrowAPI.mine().then(d => {
      setEscrows(d.escrows || d.data || d || []);
    }).catch(() => {}).finally(() => setEscrowLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    const carsPromise = canManageDemoCars
      ? Promise.all([
          dealerAPI.cars({ limit: 100 }).catch(() => ({ cars: [] })),
          carsAPI.demoAll().catch(() => ({ data: [] })),
        ]).then(([ownedRes, demoRes]) => {
          const owned = ownedRes.cars || ownedRes.data || [];
          const demo = demoRes.data || demoRes.cars || [];
          const ownedIds = new Set(owned.map(car => car._id));
          return { cars: [...owned, ...demo.filter(car => !ownedIds.has(car._id))] };
        })
      : dealerAPI.cars({ limit: 100 }).catch(() => ({ cars: [] }));
    Promise.all([
      dealerAPI.summary().catch(() => ({})),
      carsPromise,
      adminAPI.getConfig().catch(() => ({})),
      notifAPI.list({ limit: 1, unread: true }).catch(() => ({})),
      dealerAPI.analytics({ days: 30 }).catch(() => ({})),
    ]).then(([s, c, cfg, n, a]) => {
      if (ignore) return;
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
      setConfig(cfg.config || cfg);
      setUnreadNotifs(n.unreadCount || n.pendingCount || n.count || 0);
      const an = a.analytics || a.data || a;
      if (an?.conversionRates) {
        setTrends(an.conversionRates);
      }
    }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [canManageDemoCars]);

  useEffect(() => {
    if (tab !== 'bids' && tab !== 'earnings' && tab !== 'escrows') return;
    let ignore = false;
    if (tab === 'bids') dealerAPI.bids({ limit: 50 }).then(d => { if (!ignore) setBids(d.bids || []); }).catch(() => {});
    if (tab === 'earnings') dealerAPI.earnings({ days: 365 }).then(d => { if (!ignore) setEarnings(d.earnings || d.data || d); }).catch(() => {});
    if (tab === 'escrows') fetchEscrows();
    return () => { ignore = true; };
  }, [tab]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing permanently?')) return;
    try { await carsAPI.remove(carId); setCars(p => p.filter(c => c._id !== carId)); toast('Listing deleted', 'info'); }
    catch { toast('Delete failed', 'error'); }
  };

  if (!user?.approved && user?.role === 'dealer') {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>⏳</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', marginBottom: 10 }}>Pending Approval</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Your dealer application is under review. We'll notify you once approved — usually within 24 hours.</p>
          <Link to="/" style={{ padding: '11px 28px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontWeight: 900, fontSize: 11, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Return Home</Link>
        </div>
      </div>
    );
  }

  const s = summary || {};
  const totalRevenue = s.totalRevenue || s.revenue || 0;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const filteredBids = bidFilter === 'all' ? bids : bids.filter(b => b.status === bidFilter);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '36px 0 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Dealer Hub</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Connected
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#fff', margin: 0 }}>
                {greeting}, {user?.businessName || user?.name || 'Dealer'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 }}>
                {user?.location || 'Nairobi, Kenya'} · {dateStr} · {cars.length} listings
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/dealer/auctions" style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gavel size={13} /> Auction Setup
              </Link>
              <Link to="/notifications" title="Notifications" style={{
                position: 'relative', width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
              }}>
                <Bell size={14} style={{ color: '#fff' }} />
                {unreadNotifs > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ef4444', color: '#fff', fontSize: 9,
                    fontWeight: 900, minWidth: 16, height: 16,
                    borderRadius: 9999, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', padding: '0 4px',
                    boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                  }}>
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </Link>
              <Link to="/dealer/settings" style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Settings</Link>
              <Link to="/dealer/analytics" style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Analytics</Link>
              <Link to="/dealer/add-car" style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Plus size={14} /> New Listing
              </Link>
              <Link to="/" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Home
              </Link>
              <button onClick={async () => { await logout(); window.location.href = '/'; }} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          </div>

          {!user?.onboardingComplete && (
            <div style={{
              background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.15)',
              borderRadius: 10, padding: '12px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 20 }}>🚀</span>
              <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                Complete your <strong style={{ color: 'var(--gold)' }}>shop setup</strong> to start receiving payments
              </span>
              <Link to="/dealer/onboarding" style={{
                padding: '8px 18px', borderRadius: 8,
                background: 'var(--gold)', color: '#000',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                Complete Setup <ChevronRight size={13} />
              </Link>
            </div>
          )}

          {/* TABS */}
          <div className="tab-bar" style={{ gap: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? 'active' : ''}`} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 18px',
              }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <DealerOverview
                summary={s}
                cars={cars}
                totalRevenue={totalRevenue}
                trends={trends}
                onDelete={handleDelete}
                goToTab={setTab}
              />
            )}

            {/* ── LISTINGS ── */}
            {tab === 'listings' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>{cars.length} Listings</h2>
                    <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, outline: 'none' }}>
                      <option value="createdAt">Newest</option>
                      <option value="price">Price</option>
                      <option value="year">Year</option>
                      <option value="views">Views</option>
                    </select>
                    <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>
                      {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { const csv = [['Title','Brand','Model','Year','Price','Mileage','Views','Status'], ...cars.map(c => [c.title, c.brand, c.model, c.year, c.price, c.mileage, c.views, c.status])].map(r => r.join(',')).join('\n'); const b = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'listings.csv'; a.click(); }} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Download size={13} /> CSV
                    </button>
                    <Link to="/dealer/add-car" style={{ padding: '10px 20px', background: 'var(--gold)', color: '#000', borderRadius: 10, fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={13} /> Add Listing
                    </Link>
                  </div>
                </div>

                {/* Pagination info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    Showing {cars.length} of {s.totalCars || cars.length}
                  </span>
                </div>

                {/* Bulk action bar */}
                <div style={{
                  maxHeight: selectedIds.length > 0 ? 60 : 0,
                  opacity: selectedIds.length > 0 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease, opacity 0.3s ease',
                  marginBottom: selectedIds.length > 0 ? 12 : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{selectedIds.length} selected</span>
                    <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'active' }).then(() => { toast('Marked active', 'success'); setSelectedIds([]); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, cursor: 'pointer' }}>Mark Active</button>
                    <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'sold' }).then(() => { toast('Marked sold', 'success'); setSelectedIds([]); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Mark Sold</button>
                    <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'pending' }).then(() => { toast('Marked pending', 'success'); setSelectedIds([]); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', fontSize: 11, cursor: 'pointer' }}>Mark Pending</button>
                    <button onClick={() => setSelectedIds([])} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginLeft: 'auto' }}>Clear</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...cars].sort((a, b) => {
                    const dir = sortDir === 'desc' ? -1 : 1;
                    if (sortField === 'price') return dir * ((a.price||0) - (b.price||0));
                    if (sortField === 'year') return dir * ((a.year||0) - (b.year||0));
                    if (sortField === 'views') return dir * ((a.views||0) - (b.views||0));
                    return dir * (new Date(a.createdAt||0) - new Date(b.createdAt||0));
                  }).map(car => {
                    const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                    const isSelected = selectedIds.includes(car._id);
                    const isLiveAuction = car.auctionStatus === 'live';
                    const displayStatus = isLiveAuction ? 'live' : (car.status || 'draft');
                    return (
                      <div key={car._id} className="dealer-listing-row" style={{ background: 'var(--card)', border: `1px solid ${isSelected ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 16px', display: 'grid', gridTemplateColumns: '20px 64px 1fr 120px 90px auto', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => setSelectedIds(p => p.includes(car._id) ? p.filter(id => id !== car._id) : [...p, car._id])} style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }} />
                        {img ? <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 10, aspectRatio: '4/3', flexShrink: 0 }} />
                          : <div style={{ width: 64, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{car.title}</span>
                            {car.isDemo && <DemoBadge edited={!!car.demoEditedAt} />}
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{car.year || '—'} · {car.mileage?.toLocaleString() || '—'} km</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>👁 {car.views || 0} views</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(car.price||0).toLocaleString()}</div>
                        </div>
                        <StatusBadge status={displayStatus} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link to={`/cars/${car._id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Preview</Link>
                          <Link to={`/dealer/edit/${car._id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Edit</Link>
                          {/* Quick action buttons */}
                          <div style={{ position: 'relative', display: 'flex', gap: 2 }}>
                            <button
                              onClick={async () => {
                                try { await dealerAPI.markSold(car._id, { buyerName: prompt('Buyer name:') || 'Unknown', salePrice: Number(prompt('Sale price:') || car.price) }); toast('Marked as sold', 'success'); const r = await dealerAPI.cars({ limit: 100 }); setCars(r.cars || r.data || []); } catch { toast('Failed', 'error'); }
                              }}
                              title="Mark Sold"
                              style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}
                            >
                              <span role="img" aria-label="sold">💰</span>
                            </button>
                            <button
                              onClick={async () => {
                                try { const r = await dealerAPI.duplicate(car._id); toast('Duplicated', 'success'); const r2 = await dealerAPI.cars({ limit: 100 }); setCars(r2.cars || r2.data || []); } catch { toast('Failed', 'error'); }
                              }}
                              title="Duplicate"
                              style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: 11, cursor: 'pointer' }}
                            >
                              <span role="img" aria-label="duplicate">📋</span>
                            </button>
                            <button
                              onClick={() => { navigator.clipboard.writeText(window.location.origin + '/cars/' + car._id); toast('Link copied', 'success'); }}
                              title="Copy Link"
                              style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <button onClick={() => handleDelete(car._id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BIDS ── */}
            {tab === 'bids' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>Incoming Bids</h2>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['all', 'pending', 'accepted', 'rejected'].map(status => (
                      <button key={status} onClick={() => setBidFilter(status)} style={{
                        padding: '6px 14px', borderRadius: 8,
                        background: bidFilter === status ? 'rgba(212,196,168,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${bidFilter === status ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.07)'}`,
                        color: bidFilter === status ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      }}>
                        {status === 'all' ? 'All' : status}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredBids.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: 40, marginBottom: 14 }}>⚡</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                      {bidFilter === 'all' ? 'No bids received yet' : `No ${bidFilter} bids`}
                    </div>
                  </div>
                ) : filteredBids.map(b => {
                  const bidderName = b.bidderName || b.user?.name || 'Bidder';
                  const initials = bidderName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                  const bidCfg = BID_STATUS_CONFIG[b.status] || BID_STATUS_CONFIG.pending;
                  return (
                    <div key={b._id} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 20px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: b.accepted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: b.accepted ? '#22c55e' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{b.carTitle || b.car?.title || 'Vehicle'}</span>
                            <StatusBadge custom={bidCfg} />
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8 }}>
                            <span>{bidderName}</span>
                            <span>·</span>
                            <span>{timeAgo(b.createdAt)}</span>
                            {b.isAuto && <span>· <span style={{ color: 'var(--gold)' }}>Auto-bid</span></span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(b.amount||0).toLocaleString()}</div>
                      </div>
                      {b.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={async () => { try { const carId = b.carId?._id || b.carId; await dealerAPI.acceptBid(carId, b._id); toast(`Bid accepted — sale completed!`, 'success'); dealerAPI.bids({ limit: 50 }).then(d => setBids(d.bids || [])).catch(() => {}); } catch (e) { toast(e?.response?.data?.message || 'Failed to accept bid', 'error'); } }} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Accept
                          </button>
                          <button onClick={async () => { try { const carId = b.carId?._id || b.carId; await dealerAPI.rejectBid(carId, b._id); toast('Bid rejected', 'info'); dealerAPI.bids({ limit: 50 }).then(d => setBids(d.bids || [])).catch(() => {}); } catch { toast('Failed to reject', 'error'); } }} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ESCROWS ── */}
            {tab === 'escrows' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>Escrow Transactions</h2>
                  <button onClick={fetchEscrows} disabled={escrowLoading} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={12} /> {escrowLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {escrows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', background: 'var(--card)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No escrow transactions yet</div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 }}>Escrows are created automatically when a bid is accepted</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
                    {escrows.map(e => {
                      const amount = e.amount || e.price || 0;
                      const status = e.status || 'pending';
                      const stepIndex = ESCROW_STEPS.findIndex(s => s.key === status);
                      return (
                        <div key={e._id} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{e.carTitle || e.car?.title || 'Vehicle'}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{e.buyerName || e.buyer?.name || 'Buyer'}</div>
                            </div>
                            <StatusBadge status={status} />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <EscrowProgress status={status} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(amount).toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step {stepIndex + 1}/{ESCROW_STEPS.length}</div>
                              <div style={{ fontSize: 11, color: ESCROW_STEPS[stepIndex]?.color || 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{status}</div>
                            </div>
                          </div>
                          {e.createdAt && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                              Created {timeAgo(e.createdAt)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── EARNINGS ── */}
            {tab === 'earnings' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', marginBottom: 20 }}>Earnings Overview</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 16, marginBottom: 24 }}>
                  <StatCard icon="💰" label="Gross Revenue"  value={earnings?.gross    ? `${(earnings.gross/1e6).toFixed(1)}M`    : '—'} sub="KES" color="var(--gold)" />
                  <StatCard icon="📈" label="Net Earnings"   value={earnings?.net      ? `${(earnings.net/1e6).toFixed(1)}M`      : '—'} sub="after commission" color="#22c55e" />
                  <StatCard icon="📉" label="Commission Paid" value={earnings?.commission ? `${(earnings.commission/1e3).toFixed(0)}K` : '—'} sub="KES" color="#ef4444" />
                </div>
                {!earnings && (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No earnings data yet — complete a sale to see your revenue.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── PACKAGE ── */}
            {tab === 'package' && (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: '0 0 8px' }}>Your Listing Package</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No per-listing fees. Upgrade anytime to list more vehicles and unlock premium placement.</p>
                </div>

                <div style={{ background: 'var(--card)', border: '1px solid rgba(212,196,168,0.18)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>Current Plan</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.6rem', color: 'var(--gold)', textTransform: 'capitalize' }}>
                        {user?.dealerPackage || 'No Active Plan'}
                      </div>
                      {user?.packageExpiresAt && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                          Expires: {new Date(user.packageExpiresAt).toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' })}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Listings used</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
                        {cars.length} / {user?.packageListingMax || (user?.dealerPackage ? '∞' : 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 14 }}>
                  {[
                    { id: 'starter',    name: 'Starter',    price: 'KES 2,500/mo',  limit: 10,   color: 'rgba(255,255,255,0.6)',  perks: ['3 listings free (30 days)', 'KES 2,500/mo after trial', 'Standard position'] },
                    { id: 'growth',     name: 'Growth',     price: 'KES 6,500/mo',  limit: 30,   color: '#3b82f6',                perks: ['30 listings', 'Priority search', 'Chat support'] },
                    { id: 'elite',      name: 'Elite',      price: 'KES 14,000/mo', limit: 100,  color: 'var(--gold)',            badge: 'Most Popular', perks: ['100 listings', 'Homepage featured', 'Priority search', 'Account manager'] },
                    { id: 'enterprise', name: 'Enterprise', price: 'Custom',        limit: '∞',  color: '#a855f7',                perks: ['Unlimited', 'API access', 'White-label', 'SLA'] },
                  ].map(pkg => {
                    const isCurrent = user?.dealerPackage === pkg.id;
                    return (
                      <div key={pkg.id} style={{ background: 'var(--card)', border: `1px solid ${isCurrent ? pkg.color + '40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                        {pkg.badge && <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em' }}>{pkg.badge}</div>}
                        {isCurrent && <div style={{ position: 'absolute', top: 12, left: 12, background: '#22c55e', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em' }}>ACTIVE</div>}
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: pkg.color, marginBottom: 8, marginTop: (isCurrent || pkg.badge) ? 22 : 0 }}>{pkg.name}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: 4 }}>{pkg.price}</div>
                        <div style={{ fontSize: 11, color: pkg.color, fontWeight: 700, marginBottom: 16 }}>{pkg.limit} listings</div>
                        {pkg.perks.map((p, j) => (
                          <div key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5, display: 'flex', gap: 5 }}>
                            <span style={{ color: pkg.color, flexShrink: 0 }}>✓</span>{p}
                          </div>
                        ))}
                        <div style={{ marginTop: 18 }}>
                          {isCurrent ? (
                            <div style={{ padding: '9px', borderRadius: 9, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Current Plan ✓</div>
                          ) : (
                            <a href="mailto:plans@kayad.space?subject=Package Inquiry" style={{ display: 'block', padding: '9px', borderRadius: 9, background: `${pkg.color}12`, border: `1px solid ${pkg.color}30`, color: pkg.color, fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = `${pkg.color}22`}
                              onMouseLeave={e => e.currentTarget.style.background = `${pkg.color}12`}
                            >
                              {pkg.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
                  🔒 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>No escrow required for verified dealers.</strong> Contact <a href="mailto:plans@kayad.space" style={{ color: 'var(--gold)', textDecoration: 'none' }}>plans@kayad.space</a> to activate or change your package. Packages are managed by the Kayad team and reflected in your dashboard within 24 hours.
                </div>
              </div>
            )}

            {/* ── TEAM ── */}
            {tab === 'team' && (
              <TeamTab user={user} toast={toast} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
