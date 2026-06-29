import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, formatKES } from '../../api/api';
import { Settings, AlertTriangle, RefreshCw, Gavel, Activity, Users, Car, DollarSign, Lock, Megaphone, UserCheck, ClipboardCheck, Star, Gift, MessageSquare, TrendingUp, BarChart3 } from 'lucide-react';
import AdminQuickStats from './components/AdminQuickStats';
import AdminChartsRow from './components/AdminChartsRow';
import AdminAlertsPanel from './components/AdminAlertsPanel';
import AdminQuickActions from './components/AdminQuickActions';
import AdminPlatformHealth from './components/AdminPlatformHealth';
import AdminRecentRegistrations from './components/AdminRecentRegistrations';
import AdminModuleNav from './components/AdminModuleNav';
import AdminOperationalOverview from './components/AdminOperationalOverview';

const ROLE_CONFIG = {
  superadmin:       { label: 'Super Admin',       icon: '👑', color: 'var(--gold)' },
  admin:            { label: 'Admin',              icon: '⚙',  color: '#3b82f6' },
  marketing:        { label: 'Marketing',          icon: '📢', color: '#8b5cf6' },
  technical_support:{ label: 'Tech Support',       icon: '🛠', color: '#22c55e' },
  hr:               { label: 'HR',                 icon: '👥', color: '#f97316' },
  accounts:         { label: 'Accounts',           icon: '💰', color: '#06b6d4' },
  escrow_officer:   { label: 'Escrow Officer',     icon: '🔒', color: '#22c55e' },
  ad_manager:       { label: 'Ad Manager',         icon: '📢', color: '#8b5cf6' },
  moderator:        { label: 'Moderator',          icon: '🛡', color: '#3b82f6' },
  ghost_checker:    { label: 'Inspector',          icon: '🔍', color: '#22c55e' },
};

const ROLE_LINKS = {
  superadmin: [
    { to:'/admin/control-room', icon: Activity,     label:'Control Room',   desc:'System operations hub' },
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'Manage all accounts' },
    { to:'/admin/moderation',   icon: ClipboardCheck,label:'Moderation Queue',desc:'Approve/reject listings' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'All vehicle listings' },
    { to:'/admin/sellers',      icon: UserCheck,    label:'Dealer Approvals',desc:'Pending verifications' },
    { to:'/admin/transactions', icon: DollarSign,   label:'Transactions',   desc:'Payment records' },
    { to:'/admin/escrows',      icon: Lock,         label:'Escrows',        desc:'Active escrow ledger' },
    { to:'/admin/escrow-vault', icon: Lock,         label:'Escrow Vaults',  desc:'Secure P2P vaults' },
    { to:'/admin/reviews',      icon: Star,         label:'Reviews',        desc:'Moderate dealer reviews' },
    { to:'/admin/referrals',    icon: Gift,         label:'Referrals',      desc:'Referral analytics & payouts' },
    { to:'/admin/chats',        icon: MessageSquare,label:'Chat Moderation', desc:'View conversations' },
    { to:'/admin/market-data',  icon: TrendingUp,   label:'Market Data',    desc:'Pricing guide management' },
    { to:'/admin/bids',         icon: Gavel,        label:'Bids',           desc:'All auction bids' },
    { to:'/admin/auctions',     icon: Activity,     label:'Auctions',       desc:'Live & upcoming' },
    { to:'/admin/ads',          icon: Megaphone,    label:'Ad Manager',     desc:'Banners & promotions' },
    { to:'/admin/settings',     icon: Settings,     label:'System Config',  desc:'Platform settings' },
    { to:'/admin/panic-room',   icon: AlertTriangle,label:'Panic Room',     desc:'Emergency controls', danger: true },
    { to:'/admin/ntsa-queue',   icon: ClipboardCheck,  label:'NTSA Queue',     desc:'Vehicle verification queue' },
    { to:'/admin/inspections',  icon: BarChart3,    label:'Inspections',    desc:'On-demand inspection orders' },
  ],
  admin: [
    { to:'/admin/control-room', icon: Activity,     label:'Control Room',   desc:'System operations' },
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'Manage accounts' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'Vehicle listings' },
    { to:'/admin/sellers',      icon: UserCheck,    label:'Dealer Approvals',desc:'Verifications' },
    { to:'/admin/transactions', icon: DollarSign,   label:'Transactions',   desc:'Payments' },
    { to:'/admin/escrows',      icon: Lock,         label:'Escrows',        desc:'Ledger' },
    { to:'/admin/escrow-vault', icon: Lock,         label:'Escrow Vaults',  desc:'Vaults' },
    { to:'/admin/reviews',      icon: Star,         label:'Reviews',        desc:'Moderation' },
    { to:'/admin/bids',         icon: Gavel,        label:'Bids',           desc:'Auction bids' },
    { to:'/admin/auctions',     icon: Activity,     label:'Auctions',       desc:'Live & upcoming' },
  ],
  marketing: [
    { to:'/admin/ads',          icon: Megaphone,    label:'Ad Campaigns',   desc:'Banners & promotions' },
    { to:'/admin/settings',     icon: Settings,     label:'Content',        desc:'Homepage config' },
  ],
  technical_support: [
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'User management' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'Car listings' },
  ],
  hr: [
    { to:'/admin/sellers',      icon: UserCheck,    label:'Dealer Approvals',desc:'Verifications' },
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'Accounts' },
  ],
  accounts: [
    { to:'/admin/transactions', icon: DollarSign,   label:'Transactions',   desc:'Payments' },
    { to:'/admin/escrows',      icon: Lock,         label:'Escrows',        desc:'Ledger' },
  ],
  escrow_officer: [
    { to:'/admin/escrows',      icon: Lock,         label:'Escrows',        desc:'Manage releases' },
    { to:'/admin/transactions', icon: DollarSign,   label:'Transactions',   desc:'Records' },
  ],
  ad_manager: [
    { to:'/admin/ads',          icon: Megaphone,    label:'Ad Campaigns',   desc:'Manage ads' },
  ],
  moderator: [
    { to:'/admin/moderation',   icon: ClipboardCheck,label:'Moderation Queue',desc:'Approve/reject listings' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'Content review' },
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'Accounts' },
  ],
  ghost_checker: [
    { to:'/admin/inspections',  icon: ClipboardCheck,label:'Inspections',   desc:'Vehicle inspection orders' },
    { to:'/admin/ntsa-queue',   icon: Car,          label:'NTSA Queue',     desc:'Verification queue' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'Vehicle listings' },
  ],
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const role = user?.role || 'admin';
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [sysHealth, setSysHealth] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminAPI.stats().catch(() => ({ stats: {} })),
      adminAPI.alerts({ limit: 10, read: 'false' }).catch(() => ({ alerts: [], unreadCount: 0 })),
      adminAPI.users({ limit: 5 }).catch(() => ({ users: [] })),
      adminAPI.systemHealth().catch(() => ({ health: null })),
    ]).then(([s, a, u, h]) => {
      setStats(s.stats || {});
      setAlerts(a.alerts || []);
      setRecentUsers(u.users || u.data || []);
      setSysHealth(h.health || null);
      setLastRefresh(new Date());
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkRead = (id) => {
    adminAPI.markAlertRead(id).then(() => {
      setAlerts(prev => prev.filter(a => a._id !== id));
    }).catch(() => {});
  };

  const handleMarkAllRead = () => {
    adminAPI.markAllAlertsRead().then(() => {
      setAlerts([]);
    }).catch(() => {});
  };

  const hour = new Date().getHours();
  let greeting;
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';
  else if (hour < 21) greeting = 'Good Evening';
  else greeting = 'Good Night';

  const links = ROLE_LINKS[role] || ROLE_LINKS.admin;

  const formatValue = (val, isKes) =>
    isKes ? formatKES(val) : Number(val || 0).toLocaleString('en-KE');

  const roleLabel = (r) => ({ dealer: 'Dealer', individual_seller: 'Individual', user: 'Buyer' }[r] || (r ? r.replace(/_/g, ' ') : 'User'));

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 32px 48px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>{rc.icon}</span>
              <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{rc.label}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.5rem,2.6vw,2.2rem)', color: '#fff', margin: 0 }}>
              {greeting}, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'Admin'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Admin Control Room · {new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
            {lastRefresh && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <RefreshCw size={10} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Data refreshed {lastRefresh.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={fetchData} disabled={loading} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.5 : 1 }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <Link to="/admin/settings" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={13} /> Settings
            </Link>
            {(role === 'superadmin' || role === 'admin') && (
              <Link to="/admin/panic-room" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> Panic Room
              </Link>
            )}
            <Link to="/" style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Home
            </Link>
            <button onClick={async () => { await logout(); window.location.href = '/'; }} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <AdminOperationalOverview stats={stats} sysHealth={sysHealth} />

          <AdminQuickStats stats={stats} formatValue={formatValue} />

          <AdminChartsRow stats={stats} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 16, marginBottom: 28 }} className="admin-3col">
            <AdminAlertsPanel alerts={alerts} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />
            <AdminQuickActions />
            <AdminPlatformHealth sysHealth={sysHealth} />
          </div>

          <AdminRecentRegistrations recentUsers={recentUsers} roleLabel={roleLabel} />

          <AdminModuleNav links={links} />
        </>
      )}
    </div>
  );
}
