import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Car, ShieldCheck, Gavel, Lock, DollarSign,
  Activity, Megaphone, Settings, AlertTriangle, ClipboardCheck, BarChart3,
  UserCheck, Crown, Shield, Star, Lock as VaultIcon, ChevronLeft, PanelRight,
  Gift, MessageSquare, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

const ALL_LINKS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/sellers', icon: UserCheck, label: 'Sellers' },
  { to: '/admin/cars', icon: Car, label: 'Listings' },
  { to: '/admin/moderation', icon: ShieldCheck, label: 'Moderation' },
  { to: '/admin/auctions', icon: Activity, label: 'Auctions' },
  { to: '/admin/bids', icon: Gavel, label: 'Bids' },
  { to: '/admin/escrows', icon: Lock, label: 'Escrows' },
  { to: '/admin/escrow-vault', icon: VaultIcon, label: 'Escrow Vaults' },
  { to: '/admin/reviews', icon: Star, label: 'Reviews' },
  { to: '/admin/referrals', icon: Gift, label: 'Referrals' },
  { to: '/admin/chats', icon: MessageSquare, label: 'Chats' },
  { to: '/admin/market-data', icon: TrendingUp, label: 'Market Data' },
  { to: '/admin/transactions', icon: DollarSign, label: 'Transactions' },
  { to: '/admin/ntsa-queue', icon: ClipboardCheck, label: 'NTSA Queue' },
  { to: '/admin/inspections', icon: BarChart3, label: 'Inspections' },
  { to: '/admin/inspector-applications', icon: UserCheck, label: 'Inspector Apps' },
  { to: '/admin/security-log', icon: Shield, label: 'Security Log' },
  { to: '/admin/ads', icon: Megaphone, label: 'Ad Manager' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/control-room', icon: LayoutDashboard, label: 'Control Room' },
  { to: '/admin/staff', icon: Crown, label: 'Staff' },
  { to: '/admin/panic-room', icon: AlertTriangle, label: 'Panic Room', danger: true },
];

const ELIGIBLE_ROLES = ['superadmin', 'admin', 'moderator', 'escrow_officer', 'marketing', 'ad_manager', 'accounts', 'technical_support', 'hr'];

const roleLinks = (role) => {
  if (role === 'superadmin') return ALL_LINKS;
  const dashboards = [];
  for (const link of ALL_LINKS) {
    if (link.danger && role !== 'superadmin') continue;
    dashboards.push(link);
  }
  return dashboards;
};

export default function AdminSidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user || !ELIGIBLE_ROLES.includes(user.role)) return null;

  const links = roleLinks(user.role);

  return (
    <>
      <div
        style={{
          width: collapsed ? 52 : 220,
          transition: 'width 0.25s ease',
          background: '#080808',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden', flexShrink: 0, zIndex: 100,
        }}
      >
        <div style={{
          padding: collapsed ? '12px 0' : '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Admin</span>}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', padding: 4 }}>
            {collapsed ? <PanelRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 0' : '8px 0' }}>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '8px 18px',
                margin: '1px 6px', borderRadius: 8,
                textDecoration: 'none',
                fontSize: 12, fontWeight: 600,
                color: isActive ? 'var(--gold)' : link.danger ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(212,196,168,0.06)' : 'transparent',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              })}
              title={collapsed ? link.label : undefined}
            >
              <link.icon size={collapsed ? 18 : 16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
