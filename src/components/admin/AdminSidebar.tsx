import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Car, ShieldCheck, Gavel, Lock, DollarSign, UserCheck, Star, Shield, Crown, PanelRight, ChevronLeft,
  Activity, Megaphone, Settings, AlertTriangle, ClipboardCheck, BarChart3,
  Gift, MessageSquare, TrendingUp, Bell, X, type LucideIcon, Flag, TicketCheck,
  Radio, ChevronDown, BriefcaseBusiness, Building2, Wrench,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';
import { getEffectivePermissions, PAGE_PERMISSIONS, SUPERADMIN_ONLY } from '../../utils/permissions';

interface LinkItem {
  to: string;
  icon: LucideIcon;
  label: string;
  superadmin?: boolean;
  danger?: boolean;
}

interface NavigationGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  links: LinkItem[];
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'command-centre', label: 'Command Centre', icon: LayoutDashboard,
    links: [{ to: '/admin', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    id: 'business-operations', label: 'Business Operations', icon: BriefcaseBusiness,
    links: [
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/sellers', icon: UserCheck, label: 'Sellers' },
      { to: '/admin/cars', icon: Car, label: 'Listings' },
      { to: '/admin/moderation', icon: ShieldCheck, label: 'Moderation' },
      { to: '/admin/auctions', icon: Activity, label: 'Auctions' },
      { to: '/admin/bids', icon: Gavel, label: 'Bids' },
      { to: '/admin/escrows', icon: Lock, label: 'Escrows' },
      { to: '/admin/transactions', icon: DollarSign, label: 'Transactions' },
      { to: '/admin/ntsa-queue', icon: ClipboardCheck, label: 'NTSA Queue' },
      { to: '/admin/inspections', icon: BarChart3, label: 'Inspections' },
      { to: '/admin/dealer-verifications', icon: ShieldCheck, label: 'Dealer Verifications' },
      { to: '/admin/inspector-applications', icon: UserCheck, label: 'Inspector Apps' },
    ],
  },
  {
    id: 'business-management', label: 'Business Management', icon: Building2,
    links: [
      { to: '/admin/reviews', icon: Star, label: 'Reviews' },
      { to: '/admin/referrals', icon: Gift, label: 'Referrals' },
      { to: '/admin/chats', icon: MessageSquare, label: 'Chats' },
      { to: '/admin/reports', icon: Flag, label: 'Reports' },
      { to: '/admin/support-tickets', icon: TicketCheck, label: 'Support Tickets' },
      { to: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
      { to: '/admin/market-data', icon: TrendingUp, label: 'Market Data' },
      { to: '/admin/ads', icon: Megaphone, label: 'Ad Manager' },
      { to: '/admin/broadcast', icon: Radio, label: 'Broadcast' },
    ],
  },
  {
    id: 'system-administration', label: 'System Administration', icon: Wrench,
    links: [
      { to: '/admin/security-log', icon: Shield, label: 'Security Log' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
      { to: '/admin/control-room', icon: LayoutDashboard, label: 'Control Room' },
      { to: '/admin/staff', icon: Crown, label: 'Staff', superadmin: true },
      { to: '/admin/staff-permissions', icon: Shield, label: 'Staff Permissions', superadmin: true },
      { to: '/admin/panic-room', icon: AlertTriangle, label: 'Panic Room', danger: true },
      { to: '/admin/webhoist', icon: Crown, label: 'Webhoist', superadmin: true },
    ],
  },
];

const ELIGIBLE_ROLES = ['superadmin', 'admin', 'moderator', 'escrow_officer', 'marketing', 'ad_manager', 'accounts', 'technical_support', 'hr', 'ghost_checker'];

const roleLinks = (user: { role?: string; permissions?: string[] }): LinkItem[] => {
  const role = user?.role;
  if (role === 'superadmin') return NAVIGATION_GROUPS.flatMap(group => group.links);
  const perms = getEffectivePermissions(user);
  return NAVIGATION_GROUPS.flatMap(group => group.links).filter(link => {
    if (link.danger || link.superadmin) return false;
    if (SUPERADMIN_ONLY.has(link.to)) return false;
    const required = PAGE_PERMISSIONS[link.to];
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
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'command-centre': true,
    'business-operations': true,
    'business-management': true,
    'system-administration': true,
  });
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    adminAPI.alerts({ limit: 1, read: 'false' }).then(data => setAlertCount(data.unreadCount || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (mobileOpen) setCollapsed(false);
  }, [mobileOpen]);

  const permittedLinks = new Set(user ? roleLinks(user).map(link => link.to) : []);
  const visibleGroups = NAVIGATION_GROUPS.map(group => ({
    ...group,
    links: group.links.filter(link => permittedLinks.has(link.to)),
  })).filter(group => group.links.length > 0);

  // Keep the group containing the current route discoverable, including nested routes.
  const activeGroup = visibleGroups.find(group => group.links.some(link =>
    link.to === '/admin' ? location.pathname === '/admin' : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`),
  ));
  useEffect(() => {
    if (activeGroup) setExpandedGroups(current => ({ ...current, [activeGroup.id]: true }));
  }, [activeGroup?.id, location.pathname]);

  if (!user || !ELIGIBLE_ROLES.includes(user.role || '')) return null;

  return (
    <>
      {mobileOpen && <button type="button" className="admin-sidebar-backdrop" onClick={onToggle} aria-label="Close admin navigation" />}
      <aside
        id="admin-sidebar-navigation"
        className={`admin-sidebar${mobileOpen ? ' open' : ''}${collapsed ? ' is-collapsed' : ''}`}
        aria-label="Administration navigation"
      >
        <div className="admin-sidebar__brand">
          {!collapsed && (
            <div className="admin-sidebar__brand-copy">
              <span className="admin-sidebar__eyebrow">KAYAD</span>
              <span className="admin-sidebar__brand-title">Admin Console</span>
            </div>
          )}
          <div className="admin-sidebar__controls">
            {mobileOpen && (
              <button type="button" className="admin-sidebar__icon-button admin-sidebar__mobile-close" onClick={onToggle} aria-label="Close sidebar">
                <X size={17} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="admin-sidebar__icon-button admin-sidebar__collapse"
              onClick={() => setCollapsed(value => !value)}
              aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <nav className="admin-sidebar__navigation" aria-label="Admin sections">
          {visibleGroups.map(group => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups[group.id] ?? true;
            const groupHasActiveRoute = group.links.some(link =>
              link.to === '/admin' ? location.pathname === '/admin' : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`),
            );
            return (
              <section className={`admin-sidebar__group${groupHasActiveRoute ? ' has-active-route' : ''}`} key={group.id}>
                {!collapsed ? (
                  <button
                    type="button"
                    className="admin-sidebar__group-toggle"
                    aria-expanded={isExpanded}
                    aria-controls={`admin-nav-group-${group.id}`}
                    onClick={() => setExpandedGroups(current => ({ ...current, [group.id]: !(current[group.id] ?? true) }))}
                  >
                    <GroupIcon size={14} aria-hidden="true" />
                    <span>{group.label}</span>
                    <ChevronDown className="admin-sidebar__group-chevron" size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <div className="admin-sidebar__collapsed-group-label" title={group.label} aria-label={group.label}>
                    <GroupIcon size={15} aria-hidden="true" />
                  </div>
                )}
                {(!collapsed && isExpanded || collapsed) && (
                  <div className="admin-sidebar__links" id={`admin-nav-group-${group.id}`}>
                    {group.links.map(link => {
                      const LinkIcon = link.icon;
                      return (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          end={link.to === '/admin'}
                          className={({ isActive }) => `admin-sidebar__link${isActive ? ' is-active' : ''}${link.danger ? ' is-danger' : ''}`}
                          title={collapsed ? link.label : undefined}
                          aria-label={collapsed ? link.label : undefined}
                          onClick={() => { if (mobileOpen) onToggle(); }}
                        >
                          <LinkIcon size={16} aria-hidden="true" />
                          {!collapsed && <span>{link.label}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        {alertCount > 0 && (
          <div className="admin-sidebar__alerts" role="status" aria-live="polite" title={`${alertCount} unread alert${alertCount !== 1 ? 's' : ''}`}>
            <Bell size={15} aria-hidden="true" />
            {!collapsed && <span>{alertCount} unread alert{alertCount !== 1 ? 's' : ''}</span>}
            {collapsed && <span className="admin-sidebar__alert-dot" aria-hidden="true" />}
          </div>
        )}
      </aside>
    </>
  );
}
