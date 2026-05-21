import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Car, PlusCircle, Gavel, TrendingUp,
  DollarSign, Users, Settings, ChevronLeft, PanelRight, Award,
} from 'lucide-react';
import { useState } from 'react';

const DEALER_LINKS = [
  { to: '/dealer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dealer/add-car', icon: PlusCircle, label: 'Add Listing' },
  { to: '/dealer/auction-setup', icon: Gavel, label: 'Auction Setup' },
  { to: '/dealer/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/dealer/settlement', icon: DollarSign, label: 'Settlement' },
  { to: '/dealer/team', icon: Users, label: 'Team' },
  { to: '/dealer/settings', icon: Settings, label: 'Settings' },
];

// Only show onboarding link when the dealer hasn't completed onboarding
const ONBOARDING_LINK = { to: '/dealer/onboarding', icon: Award, label: 'Onboarding' };

const SELLER_ROLES = ['dealer', 'broker', 'individual_seller'];

export default function DealerSidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user || !SELLER_ROLES.includes(user.role)) return null;

  const links = user.approved
    ? DEALER_LINKS
    : [ONBOARDING_LINK, ...DEALER_LINKS];

  return (
    <div style={{
      width: collapsed ? 52 : 220,
      transition: 'width 0.25s ease',
      background: '#080808',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden', flexShrink: 0, zIndex: 100,
    }}>
      <div style={{
        padding: collapsed ? '12px 0' : '16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Dealer
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          {collapsed ? <PanelRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '8px 0',
        scrollbarWidth: 'thin',
      }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px 0' : '8px 18px',
              margin: '1px 6px', borderRadius: 8,
              textDecoration: 'none',
              fontSize: 12, fontWeight: 600,
              color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
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

      {/* Brand badge at bottom */}
      {!collapsed && (
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: 10, color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          <span style={{ color: 'var(--gold)' }}>◆</span> Kayad Marketplace
        </div>
      )}
    </div>
  );
}
