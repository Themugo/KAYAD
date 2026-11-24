import BrandMark from '../BrandMark';
import { useState, useEffect, type ReactNode, useRef } from 'react';
import { loginPathFor } from '../../utils/authIntent';
import AdminAccountMenu from './AdminAccountMenu';
import AdminSidebar from './AdminSidebar';
import { useAuth, SessionRecovery } from '../../context/AuthContext';
import { Link, useLocation, useNavigationType, Navigate } from 'react-router-dom';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { adminAPI } from '../../api/api';
import { ADMIN_ROLE_LABELS as ROLE_LABELS } from './adminRoleLabels';
import '../../styles/kayad-admin-shell.css';
import '../../styles/kayad-admin-legacy-surface.css';
import PageJourneyNavigation from '../navigation/PageJourneyNavigation';
import SkipLink from '../ui/SkipLink';


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
  const mainRef = useRef<HTMLDivElement>(null);
  const navigationType = useNavigationType();
  // Scroll positions per history entry (location.key), so Back/Forward return to where the user was.
  const scrollPositions = useRef(new Map<string, number>());
  const activeKey = useRef(location.key);
  const closeSidebar = () => setSidebarOpen(false);
  // Unread admin alerts for the bell. Only a verified number is shown; a failed request keeps the last verified value (never a fake zero).
  const [unreadAlerts, setUnreadAlerts] = useState<number | null>(null);
  useEffect(() => {
    if (!isAuth) return undefined;
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      Promise.resolve(adminAPI.alerts?.({ limit: 1, read: 'false' }))
        .then((data: any) => { if (active && Number.isFinite(Number(data?.unreadCount))) setUnreadAlerts(Math.max(0, Number(data.unreadCount))); })
        .catch(() => { /* keep last verified value */ });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAuth]);

  // The document is the single vertical scroll owner at every breakpoint.
  // While the mobile drawer is open, lock the body without losing a pre-existing inline value.
  useEffect(() => {
    if (!sidebarOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [sidebarOpen]);

  // Keep background content out of the tab order while the modal drawer is open.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const wasInert = main.hasAttribute('inert');
    if (sidebarOpen) main.setAttribute('inert', '');
    else if (!wasInert) main.removeAttribute('inert');
    return () => {
      if (!wasInert) main.removeAttribute('inert');
    };
  }, [sidebarOpen]);

  const wasSidebarOpen = useRef(false);
  useEffect(() => {
    if (wasSidebarOpen.current && !sidebarOpen) {
      sidebarToggleRef.current?.focus({ preventScroll: true });
    }
    wasSidebarOpen.current = sidebarOpen;
  }, [sidebarOpen]);

  // Accessible modal-drawer behaviour: initial focus, Escape, and a contained Tab sequence.
  useEffect(() => {
    if (!sidebarOpen) return;
    const drawer = document.getElementById('admin-sidebar-navigation');
    if (!drawer) return;
    const focusableSelector = 'a[href]:not([tabindex="-1"]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(element => element.getClientRects().length > 0 && !element.closest('[hidden]'));
    const closeButton = drawer.querySelector<HTMLElement>('.admin-sidebar__mobile-close');
    (closeButton ?? getFocusable()[0] ?? drawer).focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const save = () => scrollPositions.current.set(activeKey.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  useEffect(() => {
    activeKey.current = location.key;
    const target = navigationType === 'POP' ? (scrollPositions.current.get(location.key) ?? 0) : 0;
    let tries = 0;
    let timer = 0;
    // Async specialist pages may grow after navigation; restore only the document scroll position.
    const apply = () => {
      window.scrollTo({ top: target, left: 0, behavior: 'auto' });
      const reached = Math.abs(window.scrollY - target) < 2;
      if (!reached && tries++ < 20) timer = window.setTimeout(apply, 100);
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
      <SkipLink />
      <AdminSidebar mobileOpen={sidebarOpen} onToggle={closeSidebar} />
      <div ref={mainRef} className="kayad-admin-shell__main">
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
            <span className="kayad-admin-header__brand"><BrandMark tone="dark" size={22} nameClassName="kayad-admin-header__brand-name" /></span>
            {segments.map((segment, index) => (
              <span className="kayad-admin-header__crumb" key={`${segment}-${index}`}>
                <ChevronRight size={13} aria-hidden="true" />
                <span aria-current={index === segments.length - 1 ? 'page' : undefined} className={index === segments.length - 1 ? 'is-current' : ''}>
                  {crumbLabel(segment)}
                </span>
              </span>
            ))}
          </nav>
          <nav className="kayad-admin-header__context" aria-label="Workspaces">
            <span className="kayad-admin-header__workspace" aria-current="true">Admin Console</span>
            <Link to="/">Marketplace</Link>
            <Link to="/?nav=auctions">Auctions</Link>
            <Link to="/?nav=inspections">Vehicle inspections</Link>
          </nav>
          <Link to="/admin#admin-alerts" className="kayad-admin-header__bell" aria-label={unreadAlerts ? `Notifications, ${unreadAlerts} unread` : 'Notifications'}>
            <Bell size={18} aria-hidden="true" />
            {unreadAlerts ? <b className="kayad-admin-header__bell-count" data-testid="header-bell-count">{unreadAlerts > 99 ? '99+' : unreadAlerts}</b> : null}
          </Link>
          <div className="kayad-admin-header__identity" role="group" aria-label={`Signed in as ${displayName}, ${roleLabel}`}>
            <AdminAccountMenu displayName={displayName} roleLabel={roleLabel} initials={initials} />
          </div>
        </header>
        <main id="main-content" className="kayad-admin-shell__content">
          <PageJourneyNavigation fallbackHref="/admin" />
          {children}
        </main>
      </div>
    </div>
  );
}
