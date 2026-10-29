import { useState, useEffect, type ReactNode, useRef } from 'react';
import { loginPathFor } from '../../utils/authIntent';
import AdminAccountMenu from './AdminAccountMenu';
import AdminSidebar from './AdminSidebar';
import { useAuth, SessionRecovery } from '../../context/AuthContext';
import { useLocation, useNavigationType, Navigate } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import { ADMIN_ROLE_LABELS as ROLE_LABELS } from './adminRoleLabels';
import '../../styles/kayad-admin-shell.css';
import '../../styles/kayad-admin-legacy-surface.css';


const ACRONYMS = new Set(['ntsa', 'ai', 'cms', 'seo', 'vxp', 'xos', 'kyc', 'rbac', 'api']);
const crumbLabel = (segment: string) => segment.split('-').map(word => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word)).join(' ');

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuth, loading, sessionStatus } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const navigationType = useNavigationType();
  // Scroll positions per history entry (location.key), so Back/Forward return to where the user was.
  const scrollPositions = useRef(new Map<string, { win: number; box: number }>());
  const activeKey = useRef(location.key);
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

  useEffect(() => {
    const save = () => {
      scrollPositions.current.set(activeKey.current, { win: window.scrollY, box: contentRef.current?.scrollTop ?? 0 });
    };
    const box = contentRef.current;
    window.addEventListener('scroll', save, { passive: true });
    box?.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      box?.removeEventListener('scroll', save);
    };
  }, [loading, isAuth]);

  useEffect(() => {
    activeKey.current = location.key;
    const saved = navigationType === 'POP' ? scrollPositions.current.get(location.key) : undefined;
    const target = saved ?? { win: 0, box: 0 };
    let tries = 0;
    let timer = 0;
    // Pages load data asynchronously, so keep trying briefly until the page is tall enough to reach the saved offset.
    const apply = () => {
      window.scrollTo(0, target.win);
      if (contentRef.current) contentRef.current.scrollTop = target.box;
      const reachedWin = Math.abs(window.scrollY - target.win) < 2;
      const reachedBox = !contentRef.current || Math.abs(contentRef.current.scrollTop - target.box) < 2;
      if ((!reachedWin || !reachedBox) && tries++ < 20) timer = window.setTimeout(apply, 100);
    };
    apply();
    return () => window.clearTimeout(timer);
  }, [location.key, navigationType]);

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
          <nav className="kayad-admin-header__breadcrumb" aria-label="Breadcrumb">
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
                  {crumbLabel(segment)}
                </span>
              </span>
            ))}
          </nav>
          <div className="kayad-admin-header__identity" role="group" aria-label={`Signed in as ${displayName}, ${roleLabel}`}>
            <AdminAccountMenu displayName={displayName} roleLabel={roleLabel} initials={initials} />
          </div>
        </header>
        <main ref={contentRef} className="kayad-admin-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
