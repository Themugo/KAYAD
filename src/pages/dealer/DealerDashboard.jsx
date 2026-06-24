import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, adminAPI, notifAPI, escrowAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Plus, ChevronRight, TrendingUp, Car, Gavel, BarChart3, Users, Shield, Bell, BadgePercent } from 'lucide-react';

// Extracted components
import TeamTab from './components/TeamTab';
import DealerOverview from './components/DealerOverview';
import DealerListingsTab from './components/DealerListingsTab';
import DealerBidsTab from './components/DealerBidsTab';
import DealerEscrowsTab from './components/DealerEscrowsTab';
import DealerEarningsTab from './components/DealerEarningsTab';
import DealerPackageTab from './components/DealerPackageTab';
import DealerMilestoneTracker from './components/DealerMilestoneTracker';
import ReferralStats from '../../components/ReferralStats';
import { DealerKPIRow } from './components/DealerKPIWidgets';
import { TABS_CONFIG } from './components/DashboardWidgets';

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
  const [escrowLoading, setEscrowLoading] = useState(false);

  const canManageDemoCars = ['dealer', 'broker', 'individual_seller'].includes(user?.role);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const fetchEscrows = () => {
    setEscrowLoading(true);
    escrowAPI.mine().then(d => {
      setEscrows(d.escrows || d.data || d || []);
    }).catch(() => {
      toast('Failed to load escrows', 'error');
    }).finally(() => setEscrowLoading(false));
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
    if (tab === 'bids') dealerAPI.bids({ limit: 50 }).then(d => { if (!ignore) setBids(d.bids || []); }).catch(() => { if (!ignore) toast('Failed to load bids', 'error'); });
    if (tab === 'earnings') dealerAPI.earnings({ days: 365 }).then(d => { if (!ignore) setEarnings(d.earnings || d.data || d); }).catch(() => { if (!ignore) toast('Failed to load earnings', 'error'); });
    if (tab === 'escrows') fetchEscrows();
    return () => { ignore = true; };
  }, [tab]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing permanently?')) return;
    try { await carsAPI.remove(carId); setCars(p => p.filter(c => c._id !== carId)); toast('Listing deleted', 'info'); }
    catch { toast('Delete failed', 'error'); }
  };

  const s = summary || {};
  const totalRevenue = s.totalRevenue || s.revenue || 0;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

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

          <DealerMilestoneTracker />

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
              <>
                <DealerOverview
                  summary={s}
                  cars={cars}
                  totalRevenue={totalRevenue}
                  trends={trends}
                  earnings={earnings}
                  escrows={escrows}
                  onDelete={handleDelete}
                  goToTab={setTab}
                />
                <div style={{ marginTop: 24 }}>
                  <ReferralStats />
                </div>
              </>
            )}

            {tab === 'listings' && (
              <DealerListingsTab cars={cars} totalCars={s.totalCars} setCars={setCars} toast={toast} />
            )}

            {tab === 'bids' && (
              <DealerBidsTab bids={bids} setBids={setBids} toast={toast} />
            )}

            {tab === 'escrows' && (
              <DealerEscrowsTab escrows={escrows} escrowLoading={escrowLoading} onRefresh={fetchEscrows} />
            )}

            {tab === 'earnings' && <DealerEarningsTab earnings={earnings} />}

            {tab === 'package' && <DealerPackageTab user={user} listingsCount={cars.length} />}

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
