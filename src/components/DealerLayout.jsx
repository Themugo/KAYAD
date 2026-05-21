import DealerSidebar from './DealerSidebar';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronRight, Home } from 'lucide-react';

const ROLE_LABELS = {
  dealer: 'Dealer',
  broker: 'Broker',
  individual_seller: 'Individual Seller',
};

const SEGMENT_LABELS = {
  dealer: 'Dealer',
  'add-car': 'Add Listing',
  'edit-car': 'Edit Listing',
  'auction-setup': 'Auction Setup',
  analytics: 'Analytics',
  settlement: 'Settlement',
  team: 'Team',
  settings: 'Settings',
  onboarding: 'Onboarding',
  setup: 'Setup',
};

export default function DealerLayout({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  const segments = loc.pathname.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050505' }}>
      <DealerSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top header bar */}
        <div style={{
          height: 48, background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }} title="Back to homepage">
              <Home size={12} />
              <span style={{ marginLeft: 4 }}>Kayad</span>
            </Link>
            {segments.map((seg, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ChevronRight size={10} style={{ opacity: 0.4 }} />
                <span style={{ color: i === segments.length - 1 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                  {SEGMENT_LABELS[seg] || seg}
                </span>
              </span>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
            <Link to="/notifications" aria-label="Notifications"
              style={{ color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              <Bell size={14} />
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
              {ROLE_LABELS[user?.role] || 'Seller'}
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(212,196,168,0.15)', color: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {(user?.name || 'D')[0].toUpperCase()}
            </div>
          </div>
        </div>
        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
