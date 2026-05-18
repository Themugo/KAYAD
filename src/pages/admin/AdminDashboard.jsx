import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, formatKES } from '../../api/api';
import { Users, Car, DollarSign, ShieldCheck, Gavel, AlertTriangle, Settings, BarChart3, ChevronRight, Activity, TrendingUp, Lock, Megaphone, UserCheck, Crown, ClipboardCheck } from 'lucide-react';

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
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'Manage all accounts' },
    { to:'/admin/moderation',   icon: ClipboardCheck,label:'Moderation Queue',desc:'Approve/reject listings' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'All vehicle listings' },
    { to:'/admin/sellers',      icon: UserCheck,    label:'Dealer Approvals',desc:'Pending verifications' },
    { to:'/admin/transactions', icon: DollarSign,   label:'Transactions',   desc:'Payment records' },
    { to:'/admin/escrows',      icon: Lock,         label:'Escrows',        desc:'Active escrow ledger' },
    { to:'/admin/bids',         icon: Gavel,        label:'Bids',           desc:'All auction bids' },
    { to:'/admin/auctions',     icon: Activity,     label:'Auctions',       desc:'Live & upcoming' },
    { to:'/admin/ads',          icon: Megaphone,    label:'Ad Manager',     desc:'Banners & promotions' },
    { to:'/admin/settings',     icon: Settings,     label:'System Config',  desc:'Platform settings' },
    { to:'/admin/panic-room',   icon: AlertTriangle,label:'Panic Room',     desc:'Emergency controls', danger: true },
    { to:'/admin/ntsa-queue',   icon: ClipboardCheck,  label:'NTSA Queue',     desc:'Vehicle verification queue' },
    { to:'/admin/inspections',  icon: BarChart3,    label:'Inspections',    desc:'On-demand inspection orders' },
  ],
  admin: [
    { to:'/admin/users',        icon: Users,        label:'Users',          desc:'Manage accounts' },
    { to:'/admin/cars',         icon: Car,          label:'Listings',       desc:'Vehicle listings' },
    { to:'/admin/sellers',      icon: UserCheck,    label:'Dealer Approvals',desc:'Verifications' },
    { to:'/admin/transactions', icon: DollarSign,   label:'Transactions',   desc:'Payments' },
    { to:'/admin/escrows',      icon: Lock,         label:'Escrows',        desc:'Ledger' },
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role || 'admin';
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.stats().catch(() => ({ stats: {} })).then(s => {
      setStats(s.stats || {});
    }).finally(() => setLoading(false));
  }, []);

  const links = ROLE_LINKS[role] || ROLE_LINKS.admin;
  const s = stats || {};

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,168,67,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '40px 0 36px',
      }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>{rc.icon}</span>
              <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{rc.label}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: 0 }}>
              Admin <span style={{ color: 'var(--gold)' }}>Control Centre</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 6 }}>Platform overview · {new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/settings" style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={14} /> Settings
            </Link>
            {(role === 'superadmin' || role === 'admin') && (
              <Link to="/admin/panic-room" style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> Panic Room
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '36px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* STATS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 36 }}>
              <StatBox icon={Users}       label="Total Users"     value={s.totalUsers}     color="#3b82f6"    to="/admin/users" />
              <StatBox icon={Car}         label="Listings"        value={s.totalCars}      color="var(--gold)" to="/admin/cars" />
              <StatBox icon={Gavel}       label="Active Auctions" value={s.activeAuctions} color="#f97316"    to="/admin/auctions" />
              <StatBox icon={Lock}        label="Escrows"         value={s.totalEscrows}   color="#22c55e"    to="/admin/escrows" />
              <StatBox icon={DollarSign}  label="Revenue"
                value={s.totalRevenue ? `${(Number(s.totalRevenue)/1e6).toFixed(1)}M` : '—'}
                sub="KES platform" color="var(--gold)" to="/admin/transactions" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Extra stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <StatBox icon={UserCheck}   label="Dealers"       value={s.totalDealers}   color="#8b5cf6" to="/admin/sellers" />
                <StatBox icon={ShieldCheck} label="Verified"      value={s.verifiedDealers} color="#22c55e" />
                <StatBox icon={TrendingUp}  label="Bids Today"    value={s.bidsToday}      color="#f97316" to="/admin/bids" />
                <StatBox icon={BarChart3}   label="Payments"      value={s.totalPayments}  color="#06b6d4" to="/admin/transactions" />
              </div>

              {/* Recent activity placeholder */}
              <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={14} style={{ color: 'var(--gold)' }} /> Platform Health
                </div>
                {[
                  { label: 'Pending Dealer Approvals', value: s.pendingDealers || 0, to: '/admin/sellers', urgent: (s.pendingDealers||0) > 0 },
                  { label: 'Cars Pending Review',      value: s.pendingCars    || 0, to: '/admin/moderation' },
                  { label: 'Open Escrows',             value: s.openEscrows    || 0, to: '/admin/escrows' },
                  { label: 'Unread Alerts',            value: s.alerts         || 0, to: '/admin/users', urgent: (s.alerts||0) > 0 },
                ].map(item => (
                  <Link key={item.label} to={item.to} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.paddingLeft = '4px'}
                      onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
                    >
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{item.label}</span>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: item.urgent && item.value > 0 ? '#ef4444' : item.value > 0 ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                      }}>{item.value}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* NAV TILES */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
              Your Modules
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {links.map(l => <NavTile key={l.to} {...l} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
