import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Car, ShieldCheck, Gavel, Lock, DollarSign,
  Activity, Megaphone, Settings, AlertTriangle, ClipboardCheck, BarChart3,
  UserCheck, Crown, Shield, Star, Lock as VaultIcon, ChevronLeft, PanelRight,
  Gift, MessageSquare, TrendingUp, Bell, X, LucideIcon, Flag, TicketCheck,
  Radio,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';
import { getEffectivePermissions, PAGE_PERMISSIONS, SUPERADMIN_ONLY } from '../utils/permissions';

interface LinkItem {
  to: string;
  icon: LucideIcon;
  label: string;
  superadmin?: boolean;
  danger?: boolean;
}

const ALL_LINKS: LinkItem[] = [
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
  { to: '/admin/reports', icon: Flag, label: 'Reports' },
  { to: '/admin/support-tickets', icon: TicketCheck, label: 'Support Tickets' },
  { to: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
  { to: '/admin/market-data', icon: TrendingUp, label: 'Market Data' },
  { to: '/admin/transactions', icon: DollarSign, label: 'Transactions' },
  { to: '/admin/ntsa-queue', icon: ClipboardCheck, label: 'NTSA Queue' },
  { to: '/admin/inspections', icon: BarChart3, label: 'Inspections' },
  { to: '/admin/dealer-verifications', icon: ShieldCheck, label: 'Dealer Verifications' },
  { to: '/admin/inspector-applications', icon: UserCheck, label: 'Inspector Apps' },
  { to: '/admin/security-log', icon: Shield, label: 'Security Log' },
  { to: '/admin/ads', icon: Megaphone, label: 'Ad Manager' },
  { to: '/admin/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/control-room', icon: LayoutDashboard, label: 'Control Room' },
  { to: '/admin/staff', icon: Crown, label: 'Staff', superadmin: true },
  { to: '/admin/staff-permissions', icon: Shield, label: 'Staff Permissions', superadmin: true },
  { to: '/admin/panic-room', icon: AlertTriangle, label: 'Panic Room', danger: true },
  { to: '/admin/webhoist', icon: Crown, label: 'Webhoist', superadmin: true },
];

const ELIGIBLE_ROLES = ['superadmin', 'admin', 'moderator', 'escrow_officer', 'marketing', 'ad_manager', 'accounts', 'technical_support', 'hr', 'ghost_checker'];

const roleLinks = (user: { role?: string; permissions?: string[] }): LinkItem[] => {
  const role = user?.role;
  if (role === 'superadmin') return ALL_LINKS;
  const perms = getEffectivePermissions(user);
  return ALL_LINKS.filter(l => {
    if (l.danger || l.superadmin) return false;
    if (SUPERADMIN_ONLY.has(l.to)) return false;
    const required = PAGE_PERMISSIONS[l.to];
    if (!required) return true;
    return perms.includes(required);
  });
};

interface AdminSidebarProps {
  mobileOpen: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ mobileOpen, onToggle }: AdminSidebarProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    adminAPI.alerts({ limit: 1, read: 'false' }).then(d => setAlertCount(d.unreadCount || 0)).catch(() => {});
  }, []);

  if (!user || !ELIGIBLE_ROLES.includes(user.role || '')) return null;

  const links = roleLinks(user);

  return (
    <>
    {mobileOpen && <div className="admin-sidebar-backdrop" onClick={onToggle} role="button" tabIndex={0} onKeyPress={onToggle} />}
    <div className={`admin-sidebar ${mobileOpen ? 'open' : ''}`} style={{
      width: collapsed ? 52 : 220,
      transition: 'width 0.25s ease, transform 0.3s ease',
      background: '#080808',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        padding: collapsed ? '12px 0' : '16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Admin</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          {mobileOpen && (
            <button onClick={onToggle} aria-label="Close sidebar"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: 4 }}>
              <X size={16} />
            </button>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', padding: 4 }}>
            {collapsed ? <PanelRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: collapsed ? '8px 0' : '8px 0',
        scrollbarWidth: 'thin',
      }}>
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
              position: 'relative',
            })}
            title={collapsed ? link.label : undefined}
          >
            <link.icon size={collapsed ? 18 : 16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Alert badge at bottom */}
      {alertCount > 0 && (
        <div style={{
          padding: collapsed ? '8px 0' : '10px 18px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start',
          fontSize: 11, color: '#ef4444', fontWeight: 600,
        }}>
          <Bell size={14} />
          {!collapsed && <span>{alertCount} alert{alertCount !== 1 ? 's' : ''}</span>}
        </div>
      )}
    </div>
    </>
  );
}
