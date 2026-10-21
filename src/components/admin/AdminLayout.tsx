import { useState, useEffect, type ReactNode } from 'react';
import { loginPathFor } from '../../utils/authIntent';
import AdminSidebar from './AdminSidebar';
import { useAuth, SessionRecovery } from '../../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import '../../styles/kayad-admin-shell.css';
import { useRef } from 'react';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', marketing: 'Marketing',
  technical_support: 'Tech Support', hr: 'HR', accounts: 'Accounts',
  escrow_officer: 'Escrow Officer', ad_manager: 'Ad Manager', moderator: 'Moderator',
  ghost_checker: 'Ghost Checker',
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuth, loading, sessionStatus } = useAuth();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const closeSidebar = () => { setSidebarOpen(false); sidebarToggleRef.current?.focus(); };

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeSidebar();
    };
    document.addEventListener('keydown', onKeyDown);
    const firstLink = document.querySelector<HTMLElement>('.admin-sidebar a[href]');
    firstLink?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  if (loading) return null;

  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;

  if (!isAuth) {
    return <Navigate to={loginPathFor(loc)} replace />;
  }

  const STAFF_ROLES = ['admin', 'superadmin', 'moderator', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'ghost_checker'];
  const isStaff = STAFF_ROLES.includes(user?.role || '');
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }
  const segments = loc.pathname.split('/').filter(Boolean);

  return (
    <div className="kayad-admin-shell" style={{ display: 'flex', minHeight: '100vh', background: '#0a3340' }}>
      <AdminSidebar mobileOpen={sidebarOpen} onToggle={closeSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top header bar */}
        <div style={{
          height: 48, background: '#0a3340', borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <button
              ref={sidebarToggleRef}
              className="sidebar-toggle-btn"
              aria-label={sidebarOpen ? 'Close admin navigation' : 'Open admin navigation'}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 4, marginRight: 4 }}
            >
              <Menu size={18} />
            </button>
            <span style={{ color: 'var(--brand)', fontWeight: 700 }}>Kayad</span>
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
              {ROLE_LABELS[user?.role || ''] || user?.role || 'Staff'}
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(19, 184, 166, 0.15)', color: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </div>
        {/* Page content */}
        <div className="kayad-admin-shell__content" style={{ flex: 1, overflow: 'auto' }}> 
          {children}
        </div>
      </div>
    </div>
  );
}
