import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, ShieldCheck, Gavel,
  Search, Users, UserCheck, Megaphone, DollarSign, TrendingUp,
  Building2, Settings, HelpCircle, ExternalLink, Award,
  ChevronLeft, PanelRight, X, LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

interface LinkItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

interface LinkGroup {
  heading?: string;
  items: LinkItem[];
}

const SIDEBAR_GROUPS: LinkGroup[] = [
  {
    items: [
      { to: '/dealer', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/dealer/inventory', icon: Package, label: 'Inventory' },
      { to: '/dealer/orders', icon: ShoppingCart, label: 'Orders' },
      { to: '/dealer/escrows', icon: ShieldCheck, label: 'Escrow' },
      { to: '/dealer/auctions', icon: Gavel, label: 'Auctions' },
      { to: '/dealer/inspections', icon: Search, label: 'Pre-Inspection' },
    ],
  },
  {
    heading: 'Sales',
    items: [
      { to: '/dealer/leads', icon: Users, label: 'Leads' },
      { to: '/dealer/customers', icon: UserCheck, label: 'Customers' },
    ],
  },
  {
    heading: 'Business',
    items: [
      { to: '/dealer/marketing', icon: Megaphone, label: 'Marketing' },
      { to: '/dealer/finance', icon: DollarSign, label: 'Finance' },
      { to: '/dealer/analytics', icon: TrendingUp, label: 'Analytics' },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { to: '/dealer/organization', icon: Building2, label: 'Organization' },
      { to: '/dealer/settings', icon: Settings, label: 'Settings' },
      { to: '/dealer/support', icon: HelpCircle, label: 'Support' },
    ],
  },
];

const SELLER_ROLES = ['dealer', 'individual_seller'];

interface DealerSidebarProps {
  mobileOpen: boolean;
  onToggle: () => void;
}

export default function DealerSidebar({ mobileOpen, onToggle }: DealerSidebarProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user || !SELLER_ROLES.includes(user.role || '')) return null;

  const showOnboarding = user.status !== 'approved';

  return (
    <>
    {mobileOpen && (
      <div
        className="dealer-sidebar-backdrop"
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Escape' && onToggle()}
        role="button"
        tabIndex={0}
        aria-label="Close sidebar"
      />
    )}
    <div className={`dealer-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
      <div className="dealer-sidebar-header" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Dealer
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {mobileOpen && (
            <button type="button" onClick={onToggle} aria-label="Close sidebar"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: 4 }}>
              <X size={16} />
            </button>
          )}
          <button type="button" onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', padding: 4 }}>
            {collapsed ? <PanelRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin' }}>
        {showOnboarding && (
          <div>
            {!collapsed && <div className="dealer-sidebar-section">Getting Started</div>}
            <NavLink
              to="/dealer/onboarding"
              className={({ isActive }) => `dealer-sidebar-link${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '8px 12px',
              })}
              title={collapsed ? 'Onboarding' : undefined}
            >
              <Award size={collapsed ? 18 : 16} />
              {!collapsed && <span>Onboarding</span>}
            </NavLink>
          </div>
        )}
        {SIDEBAR_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.heading && !collapsed && (
              <div className="dealer-sidebar-section">{group.heading}</div>
            )}
            {group.items.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `dealer-sidebar-link${isActive ? ' active' : ''}`}
                style={({ isActive }) => ({
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '8px 12px',
                })}
                title={collapsed ? link.label : undefined}
              >
                <link.icon size={collapsed ? 18 : 16} />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <NavLink to="/" end
        className="dealer-sidebar-link dealer-sidebar-bottom"
        style={({ isActive }) => ({
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '10px 0' : '8px 12px',
        })}
        title="Back to main site"
      >
        <ExternalLink size={collapsed ? 18 : 16} />
        {!collapsed && <span>Back to Site</span>}
      </NavLink>
    </div>
    </>
  );
}
