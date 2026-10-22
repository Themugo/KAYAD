import { useState, useEffect, type ReactNode, useRef } from 'react';
import { loginPathFor } from '../../utils/authIntent';
import AdminSidebar from './AdminSidebar';
import { useAuth, SessionRecovery } from '../../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import '../../styles/kayad-admin-shell.css';

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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const closeSidebar = () => {
    setSidebarOpen(false);
    sidebarToggleRef.current?.focus();
  };

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

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) return null;
  if (!isAuth && sessionStatus === 'error') return <SessionRecovery />;
  if (!isAuth) return <Navigate to={loginPathFor(location)} replace />;

  const STAFF_ROLES = ['admin', 'superadmin', 'moderator', 'marketing', 'technical_support', 'hr', 'accounts', 'escrow_officer', 'ad_manager', 'ghost_checker'];
  if (!STAFF_ROLES.includes(user?.role || '')) return <Navigate to="/" replace />;
  const segments = location.pathname.split('/').filter(Boolean);
  const roleLabel = ROLE_LABELS[user?.role || ''] || user?.role || 'Staff';
  const displayName = user?.name?.trim() || 'Administrator';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A';

  return (
    <div className="kayad-admin-shell">
      <AdminSidebar mobileOpen={sidebarOpen} onToggle={closeSidebar} />
      <div className="kayad-admin-shell__main">
        <header className="kayad-admin-header">
          <div className="kayad-admin-header__breadcrumb" aria-label="Breadcrumb">
            <button
              ref={sidebarToggleRef}
              type="button"
              className="sidebar-toggle-btn"
              aria-label={sidebarOpen ? 'Close admin navigation' : 'Open admin navigation'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar-navigation"
              onClick={() => setSidebarOpen(value => !value)}
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <span className="kayad-admin-header__brand">KAYAD</span>
            {segments.map((segment, index) => (
              <span className="kayad-admin-header__crumb" key={`${segment}-${index}`}>
                <ChevronRight size={13} aria-hidden="true" />
                <span aria-current={index === segments.length - 1 ? 'page' : undefined} className={index === segments.length - 1 ? 'is-current' : ''}>
                  {segment.replace(/-/g, ' ')}
                </span>
              </span>
            ))}
          </div>
          <div className="kayad-admin-header__identity" aria-label={`Signed in as ${displayName}, ${roleLabel}`}>
            <div className="kayad-admin-header__identity-copy">
              <span className="kayad-admin-header__identity-name">{displayName}</span>
              <span className="kayad-admin-header__identity-role">{roleLabel}</span>
            </div>
            <div className="kayad-admin-header__avatar" aria-hidden="true">{initials}</div>
          </div>
        </header>
        <main className="kayad-admin-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
