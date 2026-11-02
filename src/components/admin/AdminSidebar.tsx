import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Car, ShieldCheck, LifeBuoy, Gavel, Lock, DollarSign, UserCheck, Star, Shield, Crown, PanelRight, ChevronLeft,
  Activity, Megaphone, Settings, AlertTriangle, ClipboardCheck, BarChart3,
  Gift, MessageSquare, TrendingUp, Bell, X, type LucideIcon, Flag, TicketCheck,
  Radio, ChevronDown, BriefcaseBusiness, Building2, Wrench,
  BadgeCheck, UserSearch, IdCard, Gauge, Server, KeyRound, MessageSquareText, Store, Globe, Palette,
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

// Grouped by the work an administrator is doing, in the order a day usually runs: look at the platform, run the marketplace, onboard and
// verify the people who sell on it, handle money, look after customers, grow the business, then administer the platform itself.
// Every destination from the previous four-group layout is kept exactly once; only grouping and order changed. Settings is NOT in a
// group: it is pinned to the bottom of the sidebar (see SETTINGS_LINK) so it is reachable whatever is expanded or collapsed.
const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'command-centre', label: 'Command Centre', icon: LayoutDashboard,
    links: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/traffic-analytics', icon: Globe, label: 'Traffic Analytics', superadmin: true },
    ],
  },
  {
    id: 'marketplace', label: 'Marketplace', icon: Car,
    links: [
      { to: '/admin/cars', icon: Car, label: 'Listings' },
      { to: '/admin/moderation', icon: ShieldCheck, label: 'Moderation' },
      { to: '/admin/auctions', icon: Activity, label: 'Auctions' },
      { to: '/admin/bids', icon: Gavel, label: 'Bids' },
      { to: '/admin/inspections', icon: BarChart3, label: 'Inspections' },
      { to: '/admin/ntsa-queue', icon: ClipboardCheck, label: 'NTSA Queue' },
    ],
  },
  {
    id: 'accounts-onboarding', label: 'Accounts & Onboarding', icon: UserCheck,
    links: [
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/sellers', icon: UserCheck, label: 'Sellers' },
      { to: '/admin/dealer-verifications', icon: BadgeCheck, label: 'Dealer Verifications' },
      { to: '/admin/private-seller-applications', icon: IdCard, label: 'Private Seller Applications' },
      { to: '/admin/inspector-applications', icon: UserSearch, label: 'Inspector Apps' },
    ],
  },
  {
    id: 'finance', label: 'Finance', icon: DollarSign,
    links: [
      { to: '/admin/escrows', icon: Lock, label: 'Escrows' },
      { to: '/admin/transactions', icon: DollarSign, label: 'Transactions' },
    ],
  },
  {
    id: 'customer-care', label: 'Customer Care', icon: Building2,
    links: [
      { to: '/admin/support-tickets', icon: TicketCheck, label: 'Support Tickets' },
      { to: '/admin/reports', icon: Flag, label: 'Reports' },
      { to: '/admin/chats', icon: MessageSquare, label: 'Chats' },
      { to: '/admin/reviews', icon: Star, label: 'Reviews' },
      { to: '/admin/feedback', icon: MessageSquareText, label: 'Feedback' },
    ],
  },
  {
    id: 'growth', label: 'Growth & Insight', icon: TrendingUp,
    links: [
      { to: '/admin/market-data', icon: TrendingUp, label: 'Market Data' },
      { to: '/admin/ads', icon: Megaphone, label: 'Ad Manager' },
      { to: '/admin/broadcast', icon: Radio, label: 'Broadcast' },
      { to: '/admin/referrals', icon: Gift, label: 'Referrals' },
    ],
  },
  {
    id: 'platform-security', label: 'Platform & Security', icon: Wrench,
    links: [
      { to: '/admin/security-log', icon: Shield, label: 'Security Log' },
      { to: '/admin/control-room', icon: Gauge, label: 'Control Room' },
      { to: '/admin/staff', icon: Crown, label: 'Staff', superadmin: true },
      { to: '/admin/staff-permissions', icon: KeyRound, label: 'Staff Permissions', superadmin: true },
      { to: '/admin/panic-room', icon: AlertTriangle, label: 'Panic Room', danger: true },
      { to: '/admin/site-designs', icon: Palette, label: 'Site Designs' },
      { to: '/admin/platform-recovery', icon: LifeBuoy, label: 'Platform Recovery' },
      { to: '/admin/webhoist', icon: Server, label: 'System Overview', superadmin: true },
    ],
  },
];

// Standalone, never inside a collapsible group, rendered last in the sidebar. Same route and same permission rule as before.
const SETTINGS_LINK: LinkItem = { to: '/admin/settings', icon: Settings, label: 'Settings' };

const ELIGIBLE_ROLES = ['superadmin', 'admin', 'moderator', 'escrow_officer', 'marketing', 'ad_manager', 'accounts', 'technical_support', 'hr', 'ghost_checker'];

const roleLinks = (user: { role?: string; permissions?: string[] }): LinkItem[] => {
  const role = user?.role;
  const everyLink = [...NAVIGATION_GROUPS.flatMap(group => group.links), SETTINGS_LINK];
  if (role === 'superadmin') return everyLink;
  const perms = getEffectivePermissions(user);
  return everyLink.filter(link => {
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
    'marketplace': true,
    'accounts-onboarding': true,
    'finance': true,
    'customer-care': true,
    'growth': true,
    'platform-security': true,
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
                <div className="admin-sidebar__links" id={`admin-nav-group-${group.id}`} hidden={!collapsed && !isExpanded}>
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

        {/* Pinned footer: outside every group, so it stays visible however the groups above are expanded or collapsed. Settings is the last item. */}
        <div className="admin-sidebar__footer admin-sidebar__pinned">
          <Link className="admin-sidebar__link" to="/" title={collapsed ? 'View marketplace' : undefined} aria-label={collapsed ? 'View marketplace' : undefined} onClick={() => { if (mobileOpen) onToggle(); }}>
            <Store size={16} aria-hidden="true" />
            {!collapsed && <span>View marketplace</span>}
          </Link>
          {permittedLinks.has(SETTINGS_LINK.to) && (
            <NavLink
              to={SETTINGS_LINK.to}
              className={({ isActive }) => `admin-sidebar__link admin-sidebar__settings${isActive ? ' is-active' : ''}`}
              title={collapsed ? SETTINGS_LINK.label : undefined}
              aria-label={collapsed ? SETTINGS_LINK.label : undefined}
              onClick={() => { if (mobileOpen) onToggle(); }}
            >
              <Settings size={16} aria-hidden="true" />
              {!collapsed && <span>{SETTINGS_LINK.label}</span>}
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
