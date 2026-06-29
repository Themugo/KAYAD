import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI, adminAPI, notifAPI, escrowAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Plus, ChevronRight, TrendingUp, Car, Gavel, BarChart3, Users, Shield, Bell, BadgePercent, MessageSquare } from 'lucide-react';
import GlassCard from '../../components/dashboard/GlassCard';
import KPICard from '../../components/dashboard/KPICard';
import StatRow from '../../components/dashboard/StatRow';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import QuickActions from '../../components/dashboard/QuickActions';

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
import DealerLeadsTab from './components/DealerLeadsTab';
import { DealerKPIRow } from './components/DealerKPIWidgets';
import { TABS_CONFIG } from './components/DashboardWidgets';

const TABS = TABS_CONFIG.map(t => ({
  ...t,
  icon: { overview: BarChart3, listings: Car, leads: MessageSquare, bids: Gavel, escrows: Shield, earnings: TrendingUp, package: BadgePercent, team: Users }[t.id],
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
  const [healthData, setHealthData] = useState(null);

  const canManageDemoCars = ['dealer', 'individual_seller'].includes(user?.role);
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
      dealerAPI.milestones().catch(() => ({})),
    ]).then(([s, c, cfg, n, a, m]) => {
      if (ignore) return;
      setSummary(s.summary || s.data || s);
      setCars(c.cars || c.data || []);
      setConfig(cfg.config || cfg);
      setUnreadNotifs(n.unreadCount || n.pendingCount || n.count || 0);
      const an = a.analytics || a.data || a;
      if (an?.conversionRates) {
        setTrends(an.conversionRates);
      }
      const mData = m.milestones || m;
      const mStats = mData?.stats || m?.stats || {};
      if (mStats?.profileHealth) {
        setHealthData(mStats.profileHealth);
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
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '40px 0 36px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Dealer Hub</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Connected
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: 0 }}>
                  {greeting}, <span style={{ color: 'var(--gold)' }}>{user?.businessName || user?.name || 'Dealer'}</span>
                </h1>
                {healthData && (() => {
                  const score = healthData.score || 0;
                  const tier = score >= 90 ? { label: 'Elite', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' }
                    : score >= 75 ? { label: 'Platinum', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
                    : score >= 50 ? { label: 'Gold', color: 'var(--gold)', bg: 'rgba(212,196,168,0.15)' }
                    : score >= 25 ? { label: 'Silver', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' }
                    : { label: 'Bronze', color: '#d97706', bg: 'rgba(217,119,6,0.15)' };
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}40` }}>
                      {tier.label}
                      <span style={{ opacity: 0.6, fontWeight: 700 }}>{score}%</span>
                    </span>
                  );
                })()}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 }}>
                {user?.location || 'Nairobi, Kenya'} · {dateStr} · {cars.length} listings
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/dealer/add-car" style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Plus size={14} /> New Listing
              </Link>
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

          {user?.onboardingComplete && user?.verificationStatus && ['pending', 'under_review'].includes(user.verificationStatus) && (
            <div style={{
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
              borderRadius: 10, padding: '12px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 20 }}>🕐</span>
              <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                Verification <strong style={{ color: '#f59e0b' }}>in review</strong> — you can list up to <strong style={{ color: '#fff' }}>3 cars</strong> while waiting
              </span>
              <Link to="/dealer/onboarding" style={{
                padding: '8px 18px', borderRadius: 8,
                background: '#f59e0b', color: '#000',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
              }}>
                Check Status
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

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : (
          <>
            {/* KPI Row - Only show on overview tab */}
            {tab === 'overview' && (
              <StatRow style={{ marginBottom: 32 }}>
                <KPICard
                  title="Total Listings"
                  value={cars.length}
                  icon={Car}
                  trend={12}
                  color="gold"
                />
                <KPICard
                  title="Active Auctions"
                  value={s.activeAuctions || 0}
                  icon={Gavel}
                  trend={8}
                  color="blue"
                />
                <KPICard
                  title="Total Revenue"
                  value={`KES ${totalRevenue.toLocaleString()}`}
                  icon={TrendingUp}
                  trend={15}
                  color="gold"
                />
                <KPICard
                  title="Conversion Rate"
                  value={`${trends?.overall || 0}%`}
                  icon={BarChart3}
                  trend={5}
                  color="green"
                />
              </StatRow>
            )}

            {/* Quick Actions - Only show on overview tab */}
            {tab === 'overview' && (
              <div style={{ marginBottom: 32 }}>
                <h3 className="font-display font-bold text-white text-lg mb-4">Quick Actions</h3>
                <QuickActions 
                  actions={[
                    { id: '1', label: 'Add Vehicle', icon: Plus, to: '/dealer/add-car', color: 'gold' },
                    { id: '2', label: 'Create Auction', icon: Gavel, to: '/dealer/auctions', color: 'blue' },
                    { id: '3', label: 'View Analytics', icon: BarChart3, to: '/dealer/analytics', color: 'gold' },
                    { id: '4', label: 'Manage Team', icon: Users, to: '/dealer/team', color: 'green' },
                  ]} 
                />
              </div>
            )}

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
              <GlassCard>
                <DealerListingsTab cars={cars} totalCars={s.totalCars} setCars={setCars} toast={toast} />
              </GlassCard>
            )}

            {tab === 'leads' && (
              <GlassCard>
                <DealerLeadsTab toast={toast} />
              </GlassCard>
            )}

            {tab === 'bids' && (
              <GlassCard>
                <DealerBidsTab bids={bids} setBids={setBids} toast={toast} />
              </GlassCard>
            )}

            {tab === 'escrows' && (
              <GlassCard>
                <DealerEscrowsTab escrows={escrows} escrowLoading={escrowLoading} onRefresh={fetchEscrows} />
              </GlassCard>
            )}

            {tab === 'earnings' && (
              <GlassCard>
                <DealerEarningsTab earnings={earnings} />
              </GlassCard>
            )}

            {tab === 'package' && (
              <GlassCard>
                <DealerPackageTab user={user} listingsCount={cars.length} />
              </GlassCard>
            )}

            {/* ── TEAM ── */}
            {tab === 'team' && (
              <GlassCard>
                <TeamTab user={user} toast={toast} />
              </GlassCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
