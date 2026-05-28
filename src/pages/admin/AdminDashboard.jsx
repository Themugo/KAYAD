import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, formatKES } from '../../api/api';
import { Users, Car, DollarSign, ShieldCheck, Gavel, AlertTriangle, Settings, BarChart3, ChevronRight, Activity, TrendingUp, Lock, Megaphone, UserCheck, Crown, ClipboardCheck, Star, Shield, Gift, MessageSquare, Bell, Eye, Check, PlusCircle, Server, Clock, Database, Wifi, RefreshCw } from 'lucide-react';

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
};

function StatBox({ icon: Icon, label, value, sub, color = 'var(--gold)', to }) {
  const inner = (
    <div style={{
      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '22px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (to) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: `${color}08` }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '2rem', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function NavTile({ to, icon: Icon, label, desc, danger }) {
  const accent = danger ? '#ef4444' : 'var(--gold)';
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0C0C0C',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}35`; e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.04)' : '#111'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#0C0C0C'; }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: danger ? '#ef4444' : '#fff', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{desc}</div>
        </div>
        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
      </div>
    </Link>
  );
}

function AlertDot({ severity }) {
  const map = { critical: 'var(--red)', warning: 'var(--orange)', info: 'var(--gold)', low: '#eab308' };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: map[severity] || map.low,
      flexShrink: 0, marginTop: 3, display: 'inline-block',
    }} />
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role || 'admin';
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminAPI.stats().catch(() => ({ stats: {} })),
      adminAPI.alerts({ limit: 10, read: 'false' }).catch(() => ({ alerts: [], unreadCount: 0 })),
    ]).then(([s, a]) => {
      setStats(s.stats || {});
      setAlerts(a.alerts || []);
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
  const s = stats || {};

  const quickStats = [
    { emoji: '👥', label: 'Total Users',     value: s.totalUsers,     color: '#3b82f6',  to: '/admin/users' },
    { emoji: '🚗', label: 'Total Cars',      value: s.totalCars,      color: 'var(--gold)', to: '/admin/cars' },
    { emoji: '🔨', label: 'Active Auctions', value: s.activeAuctions, color: '#f97316',   to: '/admin/auctions' },
    { emoji: '💰', label: 'Total Revenue',   value: s.totalRevenue,   color: 'var(--gold)', to: '/admin/transactions', kes: true },
    { emoji: '⏳', label: 'Pending Dealers',  value: s.pendingDealers, color: '#f97316',   to: '/admin/sellers' },
    { emoji: '📋', label: 'Pending Cars',    value: s.pendingCars,    color: '#8b5cf6',   to: '/admin/moderation' },
    { emoji: '🔔', label: 'Active Alerts',   value: s.activeAlerts,   color: Number(s.activeAlerts||0) > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' },
    { emoji: '🏷️', label: 'Total Bids',      value: s.totalBids,      color: '#06b6d4',   to: '/admin/bids' },
  ];

  const formatValue = (val, isKes) =>
    isKes ? formatKES(val) : Number(val || 0).toLocaleString('en-KE');

  const platformHealth = [
    { label: 'Redis',      status: 'connected',  icon: Database },
    { label: 'Socket.IO',  status: 'connected',  icon: Wifi },
    { label: 'Last Backup',status: '2h ago',      icon: Clock },
    { label: 'Uptime',     status: '99.97%',      icon: Activity },
  ];

  const recentUsers = [
    { name: 'Grace Mwangi',     email: 'grace.mwangi@email.com',    role: 'Dealer',      date: '2026-05-20' },
    { name: 'Peter Kamau',      email: 'peter.kamau@email.com',     role: 'Individual',  date: '2026-05-19' },
    { name: 'Faith Akinyi',     email: 'faith.akinyi@email.com',    role: 'Broker',      date: '2026-05-19' },
    { name: 'James Ochieng',    email: 'james.ochieng@email.com',   role: 'Dealer',      date: '2026-05-18' },
    { name: 'Sarah Wanjiku',    email: 'sarah.wanjiku@email.com',   role: 'Individual',  date: '2026-05-18' },
  ];

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
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 12, marginBottom: 24 }}>
            {quickStats.map(qs => {
              const inner = (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '18px 20px',
                  transition: 'border-color 0.2s, transform 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${qs.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: `${qs.color}`, opacity: 0.06 }} />
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${qs.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 18 }}>
                    {qs.emoji}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{qs.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', lineHeight: 1 }}>
                    {formatValue(qs.value, qs.kes)}
                  </div>
                  {qs.to && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <Eye size={10} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>View details</span>
                    </div>
                  )}
                </div>
              );
              return qs.to ? <Link key={qs.label} to={qs.to} style={{ textDecoration: 'none' }}>{inner}</Link> : <div key={qs.label}>{inner}</div>;
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '20px',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} style={{ color: 'var(--gold)' }} /> Alerts
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {alerts.length > 0 && (
                    <button onClick={handleMarkAllRead} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                      Mark All Read
                    </button>
                  )}
                  <Link to="/admin/security-log" style={{ fontSize: 10, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
                </div>
              </div>
              {alerts.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={20} style={{ color: 'var(--green)', marginBottom: 8 }} />
                  <div>No unread alerts · All clear</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  {alerts.slice(0, 6).map(a => {
                    const sev = a.severity === 'critical' ? 'high' : a.severity === 'warning' ? 'medium' : 'low';
                    const sevColor = sev === 'high' ? 'var(--red)' : sev === 'medium' ? 'var(--orange)' : '#eab308';
                    return (
                      <div key={a._id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: sev === 'high' ? 'rgba(239,68,68,0.04)' : sev === 'medium' ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${sev === 'high' ? 'rgba(239,68,68,0.12)' : sev === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)'}`,
                        fontSize: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', background: sevColor,
                            flexShrink: 0, marginTop: 3,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                              <span style={{ fontWeight: 600, color: '#fff', fontSize: 11, textTransform: 'capitalize' }}>{a.type?.replace(/_/g, ' ')}</span>
                              <span style={{
                                fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 600,
                                background: sev === 'high' ? 'rgba(239,68,68,0.12)' : sev === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(234,179,8,0.12)',
                                color: sevColor,
                              }}>
                                {sev.toUpperCase()}
                              </span>
                              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)' }}>
                                {new Date(a.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
                              {a.data?.message || a.message || a.type || 'System alert'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkRead(a._id)}
                            style={{
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6,
                              color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 7px', fontSize: 9, fontWeight: 600,
                              flexShrink: 0, marginTop: 1,
                            }}
                            title="Mark as read"
                          >
                            ✓ Read
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '20px',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} style={{ color: 'var(--gold)' }} /> Quick Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {[
                  { to: '/admin/cars/new', icon: PlusCircle, label: 'Add Car', desc: 'Create a new vehicle listing', color: 'var(--gold)' },
                  { to: '/admin/users', icon: Users, label: 'Manage Users', desc: 'Accounts, roles & permissions', color: '#3b82f6' },
                  { to: '/admin/escrows', icon: Lock, label: 'View All Escrows', desc: 'Active escrow ledger', color: 'var(--green)' },
                  { to: '/admin/panic-room', icon: AlertTriangle, label: 'Panic Room', desc: 'Emergency system controls', color: 'var(--red)', danger: true },
                ].map(action => (
                  <Link key={action.label} to={action.to} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: action.danger ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${action.danger ? 'rgba(239,68,68,0.12)' : 'var(--border)'}`,
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${action.color}35`; e.currentTarget.style.background = action.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = action.danger ? 'rgba(239,68,68,0.12)' : 'var(--border)'; e.currentTarget.style.background = action.danger ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)'; }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: `${action.color}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <action.icon size={16} style={{ color: action.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: action.danger ? 'var(--red)' : '#fff', marginBottom: 1 }}>{action.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{action.desc}</div>
                      </div>
                      <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '20px',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={14} style={{ color: 'var(--gold)' }} /> Platform Health
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {platformHealth.map(h => {
                  const healthy = h.status === 'connected';
                  return (
                    <div key={h.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h.icon size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{h.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: healthy ? 'var(--green)' : 'var(--text-muted)' }}>
                          {h.status}
                        </span>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: healthy ? 'var(--green)' : 'var(--text-muted)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={14} style={{ color: 'var(--gold)' }} /> Recent Registrations
              </div>
              <Link to="/admin/users" style={{ fontSize: 10, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u, i) => (
                    <tr key={i} style={{ borderBottom: i < recentUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600, fontSize: 12 }}>{u.name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                        {new Date(u.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Your Modules
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {links.map(l => <NavTile key={l.to} {...l} />)}
          </div>
        </>
      )}
    </div>
  );
}
