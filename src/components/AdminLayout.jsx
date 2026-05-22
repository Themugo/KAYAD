import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import { Bell, ChevronRight, Menu } from 'lucide-react';

const ROLE_LABELS = {
  superadmin: 'Super Admin', admin: 'Admin', marketing: 'Marketing',
  technical_support: 'Tech Support', hr: 'HR', accounts: 'Accounts',
  escrow_officer: 'Escrow Officer', ad_manager: 'Ad Manager', moderator: 'Moderator',
  ghost_checker: 'Ghost Checker',
};

export default function AdminLayout({ children }) {
  const { user, isAuth, loading } = useAuth();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  const STAFF_ROLES = ['admin', 'superadmin', 'moderator', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'ghost_checker'];
  const isStaff = STAFF_ROLES.includes(user?.role);
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }
  const segments = loc.pathname.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050505' }}>
      <AdminSidebar mobileOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top header bar */}
        <div style={{
          height: 48, background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, marginRight: 4 }}
            >
              <Menu size={18} />
            </button>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Kayad</span>
            {segments.map((seg, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ChevronRight size={12} />
                <span style={{
                  color: i === segments.length - 1 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                  fontWeight: i === segments.length - 1 ? 600 : 400, textTransform: 'capitalize',
                }}>
                  {seg.replace(/-/g, ' ')}
                </span>
              </span>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
              {ROLE_LABELS[user?.role] || user?.role || 'Staff'}
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(212,196,168,0.15)', color: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {(user?.name || 'A')[0].toUpperCase()}
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
