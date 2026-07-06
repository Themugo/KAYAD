import { useState, useEffect, ReactNode } from 'react';
import DealerSidebar from './DealerSidebar';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronRight, Home, Menu } from 'lucide-react';
import '../styles/dealer.css';

const ROLE_LABELS: Record<string, string> = {
  dealer: 'Dealer',
  individual_seller: 'Individual Seller',
};

const SEGMENT_LABELS: Record<string, string> = {
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
  inventory: 'Inventory',
  orders: 'Orders',
  escrows: 'Escrow',
  auctions: 'Auctions',
  inspections: 'Pre-Inspection',
  leads: 'Leads',
  customers: 'Customers',
  marketing: 'Marketing',
  finance: 'Finance',
  organization: 'Organization',
  support: 'Support',
};

interface DealerLayoutProps {
  children: ReactNode;
}

export default function DealerLayout({ children }: DealerLayoutProps) {
  const { user } = useAuth();
  const loc = useLocation();
  const segments = loc.pathname.split('/').filter(Boolean);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="dealer-layout">
      <DealerSidebar mobileOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="dealer-main">
        <div className="dealer-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, marginRight: 4 }}
            >
              <Menu size={18} />
            </button>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
            <Link to="/notifications" aria-label="Notifications"
              style={{ color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              <Bell size={14} />
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
              {ROLE_LABELS[user?.role || ''] || 'Seller'}
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
        <div className="dealer-content">
          {children}
        </div>
      </div>
    </div>
  );
}
