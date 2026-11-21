import { KenyaFlag } from './CountryBadge';
import { useMyDealership } from '../features/DealershipWorkspace/useMyDealership';
import { hasSessionHint } from '../utils/sessionHint';
import { isStaffRole, staffRoleLabel } from '../utils/staffRoles';
import { isSellerRole } from '../utils/authRoutes';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  PlusCircle,
  Menu,
  Search,
  X,
  MapPin,
  ShieldCheck,
  User,
  ChevronDown,
  Gavel,
  CreditCard,
  HelpCircle,
  Heart,
  Bell,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  Building2,
  Settings,
  BarChart3,
  Layers,
  Calendar,
  FileText,
  Sliders,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';
import { useBranding, onBrandLogoError, DEFAULT_LOGO_URL } from '../context/BrandingContext';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { applyNavigationConfig, visibleChildren, type NavPrimary } from './navigation/navConfig';
import '../styles/kayad-navigation.css';

interface AccountAvatarProps { src?: string | null; name?: string | null; className: string }

/** A real account image when available; initials are the deterministic fallback. */
function AccountAvatar({ src, name, className }: AccountAvatarProps) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => { setFailed(!src); }, [src]);
  const initials = (name || 'KAYARD KE').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'K';
  if (!src || failed) {
    return <span className={`${className} inline-flex items-center justify-center bg-[#DDF4F0] text-[#0A3340] font-bold`} aria-hidden="true">{initials}</span>;
  }
  return <img src={src} alt="" aria-hidden="true" className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

interface NavbarProps {
  user: UserProfile | null;
  savedCount?: number;
  activeNav: string;
  onNavClick: (nav: string) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  onOpenAuth: () => void;
  onOpenAlerts: () => void;
  onOpenCompare?: () => void;
  onLogout?: () => void;
  unreadCount?: number;
  notificationUnreadCount?: number;
  /** STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: whether the
   * authoritative session check (AuthContext's mount-time getMe()) is
   * still in flight. `user` is always null during this window regardless
   * of whether the visitor is actually signed in - rendering off `user`
   * alone, as this component previously did unconditionally, means an
   * already-authenticated customer sees the "Sign In / Sign Up" button
   * flash on every reload until that request resolves. Optional and
   * defaulted to false so any caller that doesn't track loading state
   * keeps today's exact behavior. */
  authLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  savedCount = 0,
  activeNav,
  onNavClick,
  selectedCounty,
  onCountyChange,
  onOpenAuth,
  onOpenAlerts,
  onOpenCompare,
  onLogout,
  unreadCount = 0,
  notificationUnreadCount = 0,
  authLoading = false,
}) => {
  const { branding, navigation } = useBranding();
  // Admin-controlled presentation state over the code-owned destinations;
  // falls back to the canonical navigation for any missing/invalid config.
  const navItems = useMemo(() => applyNavigationConfig(navigation), [navigation]);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // A wide, self-contained logo (lock-up with wordmark + descriptor) is drawn alone at its natural aspect ratio;
  // a square mark keeps the mark + live wordmark + tagline layout. Decided from the loaded image, so any admin-uploaded logo works.
  const [brandWide, setBrandWide] = useState(false);
  const onBrandLogoLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setBrandWide(naturalHeight > 0 && naturalWidth / naturalHeight >= 1.8);
  }, []);
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({ marketplace: true });
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const countyRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [mobileDrawerTop, setMobileDrawerTop] = useState(0);
  const [mobileDrawerHeight, setMobileDrawerHeight] = useState(0);

  // Expand the current section when the drawer opens; keep other sections
  // collapsed until requested so the menu remains short and scannable.
  // Runs ONLY when the drawer opens. It must not depend on navItems/activeNav: those change identity whenever the navigation
  // configuration or the signed-in account finishes loading, and re-running this would reset the groups the person has just
  // expanded — the menu would "open and collapse immediately", most visibly for a personal account whose data loads after sign-in.
  const latestNav = useRef({ navItems, activeNav });
  latestNav.current = { navItems, activeNav };
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const { navItems: items, activeNav: current } = latestNav.current;
    const currentSection = items.find((item) =>
      item.match.includes(current) || item.children?.some((child) => child.navId === current),
    );
    setMobileExpandedGroups(currentSection ? { [currentSection.id]: true } : { marketplace: true });
  }, [mobileMenuOpen]);

  const openMobileMenu = useCallback(() => {
    const headerAnchor = headerRef.current?.querySelector('.kayad-header__bar') as HTMLElement | null;
    const headerBottom = headerAnchor?.getBoundingClientRect().bottom ?? headerRef.current?.getBoundingClientRect().bottom ?? 0;
    const top = Math.max(0, Math.round(headerBottom));
    const viewport = window.visualViewport;
    const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    setMobileDrawerTop(top);
    setMobileDrawerHeight(Math.max(0, Math.round(viewportBottom - top)));
    setMobileMenuOpen(true);
  }, []);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  // A menu opened by an explicit click/keypress is "pinned": pointer-leave must not
  // close it, and the next click on its toggle closes it. Hover-opened menus are not pinned.
  const pinnedMenu = useRef<string | null>(null);
  // STAGE 11 REDUCED-MOTION CONVERGENCE: reuse the shared hook instead of a
  // local matchMedia implementation (decorative/presentational only — does
  // not affect any auction/bid/payment/escrow state).
  const prefersReducedMotion = usePrefersReducedMotion();

  // The mobile dock's Menu tab opens this same drawer (no second menu implementation).
  useEffect(() => {
    const openMenu = () => {
      openMobileMenu();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    };
    window.addEventListener('kayad:open-mobile-menu', openMenu);
    return () => window.removeEventListener('kayad:open-mobile-menu', openMenu);
  }, [openMobileMenu, prefersReducedMotion]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const syncDrawerViewport = () => {
      const headerAnchor = headerRef.current?.querySelector('.kayad-header__bar') as HTMLElement | null;
      const headerBottom = headerAnchor?.getBoundingClientRect().bottom ?? headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(0, Math.round(headerBottom));
      // Mobile browser chrome can shrink the visual viewport without a matching
      // layout-viewport resize. Keep the drawer sized to the actually visible area.
      const viewport = window.visualViewport;
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      setMobileDrawerTop(top);
      setMobileDrawerHeight(Math.max(0, Math.round(viewportBottom - top)));
    };
    syncDrawerViewport();
    window.addEventListener('resize', syncDrawerViewport);
    window.addEventListener('orientationchange', syncDrawerViewport);
    window.visualViewport?.addEventListener('resize', syncDrawerViewport);
    window.visualViewport?.addEventListener('scroll', syncDrawerViewport);
    return () => {
      window.removeEventListener('resize', syncDrawerViewport);
      window.removeEventListener('orientationchange', syncDrawerViewport);
      window.visualViewport?.removeEventListener('resize', syncDrawerViewport);
      window.visualViewport?.removeEventListener('scroll', syncDrawerViewport);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;

    body.classList.toggle('kayad-mobile-menu-is-open', mobileMenuOpen);
    if (mobileMenuOpen) {
      // Lock both scrolling roots while the drawer is modal. The drawer's own
      // content pane remains scrollable; restoring the exact prior inline
      // values avoids overriding host-page or embedded-layout preferences.
      body.style.overflow = 'hidden';
      root.style.overflow = 'hidden';
    }

    return () => {
      body.classList.remove('kayad-mobile-menu-is-open');
      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
    };
  }, [mobileMenuOpen]);

  // Close dropdowns on click outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (countyRef.current && !countyRef.current.contains(target)) {
        setShowCountyDropdown(false);
      }
      if (!(target as HTMLElement).closest?.('.kayad-nav__group')) {
        setOpenMenu(null);
        pinnedMenu.current = null;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape closes whatever is open and returns focus to the control that
  // opened it, so keyboard focus never gets lost behind a closed panel.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      } else if (openMenu) {
        const toggle = document.querySelector<HTMLButtonElement>(`[data-nav-toggle="${openMenu}"]`);
        setOpenMenu(null);
        pinnedMenu.current = null;
        toggle?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, openMenu]);

  // The mobile drawer is a real modal dialog: move focus into it on open and
  // keep Tab inside it until it closes.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const drawer = drawerRef.current;
    drawer?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [mobileMenuOpen]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const handleAuthNavigation = (path: '/login' | '/register') => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleAdminRoute = (path: string) => {
    setMobileMenuOpen(false);
    setOpenMenu(null);
    pinnedMenu.current = null;
    navigate(path);
  };

  const handleNavSelect = (navId: string) => {
    if (navId === 'admin') {
      handleAdminRoute('/admin');
      return;
    }
    onNavClick(navId);
    setMobileMenuOpen(false);
    setOpenMenu(null);
    pinnedMenu.current = null;
  };

  // Mobile header search: go to the catalogue and put the cursor in its (single, canonical) search box.
  const focusMobileSearch = () => {
    handleNavSelect('marketplace');
    window.setTimeout(() => {
      const box = document.querySelector<HTMLInputElement>('input[aria-label="Search vehicles by make, model or keyword"]');
      box?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      box?.focus({ preventScroll: true });
    }, 120);
  };

  // Real <a href> links that the SPA intercepts: plain clicks navigate in-app,
  // modified clicks (new tab, copy link, middle-click) keep native behaviour.
  const handleLinkClick = (e: React.MouseEvent, navId: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    handleNavSelect(navId);
  };

  const signedIn = Boolean(user);
  // A dealer works only in the Dealer workspace: the buyer / private-seller pages are not part of a dealer account's menu.
  const isDealerUser = user?.role === 'dealer';
  const { membership: dealershipMembership } = useMyDealership(user?.id, user?.role);
  const isStaffAccount = isStaffRole(user?.role);
  const isMechanicAccount = user?.role === 'mechanic';
  const isRestrictedWorkspace = isDealerUser || isStaffAccount;
  // A returning member sees a neutral placeholder while the session check runs; everyone else gets a working Sign In at once.
  const sessionHinted = React.useMemo(() => hasSessionHint(), []);
  const isSectionActive = (item: NavPrimary) => item.match.includes(activeNav);

  const openGroup = useCallback((id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu((current) => {
      if (current !== id) pinnedMenu.current = null;
      return id;
    });
  }, []);
  const scheduleClose = useCallback((id: string) => {
    window.clearTimeout(closeTimer.current);
    if (pinnedMenu.current === id) return;
    closeTimer.current = window.setTimeout(() => setOpenMenu((current) => (current === id ? null : current)), 140);
  }, []);
  const toggleGroup = (id: string) => {
    window.clearTimeout(closeTimer.current);
    if (openMenu === id && pinnedMenu.current === id) {
      pinnedMenu.current = null;
      setOpenMenu(null);
    } else {
      pinnedMenu.current = id;
      setOpenMenu(id);
    }
  };

  const effectiveUnread = Math.max(0, Math.floor(unreadCount));
  const hasNotifications = notificationUnreadCount > 0 || effectiveUnread > 0;

  return (
    <header ref={headerRef} className={`kayad-header${brandWide ? ' kayad-header--lockup' : ''}`}>
      {/* The broadcast notice board is rendered by TopNoticeStrip above this navigation. */}
      <div className="kayad-header__bar">

        {/* BRAND FIELD — the mark, wordmark, descriptor and country badge are
            independent elements. The mark itself contains no lettering or tagline. */}
        <a
          href="/?nav=marketplace"
          onClick={(e) => { if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); handleNavSelect('marketplace'); }}
          className={`kayad-brand group${brandWide ? ' kayad-brand--lockup' : ''}`}
          id="brand-logo"
          aria-label="KAYARD KE marketplace home"
        >
          {(() => {
            const lockupAlt = `${branding.logoText || 'KAYARD KE'}${branding.brandTagline ? ` – ${branding.brandTagline}` : ''}`;
            const src = branding.logoType === 'image' && branding.logoUrl ? branding.logoUrl : DEFAULT_LOGO_URL;
            return (
              <img
                src={src}
                onError={onBrandLogoError}
                onLoad={onBrandLogoLoad}
                alt={brandWide ? lockupAlt : ''}
                aria-hidden={brandWide ? undefined : true}
                className="kayad-brand__image"
                {...(brandWide ? {} : { width: 52, height: 52 })}
                decoding="async"
              />
            );
          })()}
          <span className="kayad-brand__text">
            <span className="kayad-brand__word">
              {(branding.logoText || 'KAYARD KE').replace(/\s*[-–]?\s*KE$/i, '')}
              <span className="kayad-brand__word-ke">KE</span>
              <KenyaFlag className="kayad-brand__kenya-flag" />
            </span>
            <span className="kayad-brand__tag kayad-brand__tag--reserved">
              {branding.brandTagline || 'Premium Vehicle Marketplace'}
            </span>
          </span>
        </a>

        {/* NAVIGATION FIELD — primary destinations; dropdowns expose existing
            destinations only (see navigation/navConfig.ts). */}
        <nav className="kayad-navfield" aria-label="Primary">
          <ul>
            {navItems.map((item) => {
              const children = visibleChildren(item, signedIn, isRestrictedWorkspace);
              const hasChildren = children.length > 0;
              const isOpen = openMenu === item.id;
              const active = isSectionActive(item);
              const Icon = item.icon;
              const panelId = `kayad-menu-${item.id}`;
              return (
                <li
                  key={item.id}
                  className={`kayad-nav__group ${hasChildren ? 'has-children' : ''} ${isOpen ? 'is-open' : ''} ${active ? 'is-active' : ''}`}
                  onMouseEnter={hasChildren ? () => openGroup(item.id) : undefined}
                  onMouseLeave={hasChildren ? () => scheduleClose(item.id) : undefined}
                  onBlur={hasChildren ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { if (pinnedMenu.current === item.id) pinnedMenu.current = null; setOpenMenu((c) => (c === item.id ? null : c)); } } : undefined}
                >
                  <a
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.navId)}
                    className="kayad-nav__link"
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="kayad-nav__icon w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />
                    {item.compactLabel ? (
                      <>
                        <span className="kayad-nav__label-compact" aria-hidden="true">{item.compactLabel}</span>
                        <span className="kayad-nav__label-full">{item.label}</span>
                      </>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </a>
                  {hasChildren && (
                    <>
                      <button
                        type="button"
                        className="kayad-nav__toggle"
                        data-nav-toggle={item.id}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        aria-label={`${item.label} menu`}
                        onClick={() => toggleGroup(item.id)}
                      >
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <div className="kayad-menu" id={panelId}>
                          <p className="kayad-menu__title">{item.label}</p>
                          <ul>
                            {children.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive = active && child.navId.split(':')[0] === activeNav && !child.navId.includes(':');
                              return (
                                <li key={child.id}>
                                  <a
                                    href={child.href}
                                    onClick={(e) => handleLinkClick(e, child.navId)}
                                    className="kayad-menu__item"
                                    aria-current={childActive ? 'page' : undefined}
                                  >
                                    <span className="kayad-menu__icon"><ChildIcon className="w-4 h-4 stroke-[1.9]" aria-hidden="true" /></span>
                                    <span>
                                      <span className="kayad-menu__label">{child.label}</span>
                                      <span className="kayad-menu__desc">{child.description}</span>
                                    </span>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* UTILITY FIELD — visually separate from primary navigation. */}
        <div className="kayad-utilities">
          {/* Communication hub (existing message utility). Hidden below 640px so the
              Sell Vehicle action and menu button always fit; the drawer lists Messages for signed-in users. */}
          <button
            type="button"
            onClick={() => handleNavSelect('chat')}
            className={`kayad-util kayad-hide-sm ${activeNav === 'chat' ? 'is-active' : ''}`}
            aria-label={effectiveUnread > 0 ? `Messages, ${effectiveUnread} unread` : 'Messages'}
            aria-current={activeNav === 'chat' ? 'page' : undefined}
            title="Messages"
          >
            <MessageSquare className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
            {effectiveUnread > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 text-[9px] font-black rounded-full bg-[#13B8A6] text-[#0A3340] shadow-2xs">
                {effectiveUnread}
              </span>
            )}
          </button>

          {/* Saved vehicles are per-user: shown only once signed in. */}
          {user && !isDealerUser && (
            <button
              type="button"
              onClick={() => handleNavSelect('saved')}
              className={`kayad-util kayad-hide-sm ${activeNav === 'saved' ? 'is-active' : ''}`}
              aria-label={savedCount > 0 ? `Saved vehicles, ${savedCount}` : 'Saved vehicles'}
              aria-current={activeNav === 'saved' ? 'page' : undefined}
              title="Saved Vehicles"
            >
              <Heart className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 text-[10px] font-bold rounded-full bg-[#176B87] text-white shadow-2xs">
                  {savedCount}
                </span>
              )}
            </button>
          )}

          <span className="kayad-util__divider" aria-hidden="true" />

          <button
            type="button"
            onClick={() => handleNavSelect(isDealerUser ? 'dealer:inventory:new' : 'dashboard:create-listing')}
            className="kayad-cta"
            id="cta-sell-car"
            aria-label={isDealerUser ? 'Add Vehicle' : 'Sell Vehicle'}
          >
            <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            <span className="max-[359px]:hidden">{isDealerUser ? 'Add Vehicle' : 'Sell Vehicle'}</span>
            <span className="min-[360px]:hidden" aria-hidden="true">{isDealerUser ? 'Add' : 'Sell'}</span>
          </button>

            {/* STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: while the
                authoritative session check is still in flight, `user` is
                always null, so rendering straight off `user` here showed
                the signed-out "Sign In / Sign Up" button to an
                already-authenticated customer on every reload until
                getMe() resolved. Render a neutral, same-sized placeholder
                instead during that window - it never claims either auth
                state, unlike both branches it replaces. */}
            {authLoading && sessionHinted ? (
              <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
                <div className="w-28 h-10 rounded-xl bg-[#EEF7F5] animate-pulse" />
              </div>
            ) : user ? (
              <div className="relative">
                <button
                  type="button"
                  ref={userButtonRef}
                  onClick={() => {
                    // Account identity is a destination, not a second navigation menu.
                    // All account/workspace actions live in the canonical KAYAD drawer.
                    handleNavSelect('profile');
                  }}
                  className="flex items-center gap-2 p-1.5 pr-2.5 min-h-10 rounded-xl hover:bg-[#F0FAF8] border border-[#D7E7E4] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13B8A6]"
                  id="user-profile-menu-button"
                  aria-label={`Open account profile for ${user.name}`}
                >
                  <div className="relative">
                    <AccountAvatar
                      src={user.avatar}
                      name={user.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#0A3340]/30 shadow-2xs text-[9px]"
                    />
                    {hasNotifications && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-[#0A3340] leading-none">{user.name}</span>
                    <span className="text-[10px] text-[#64748B]">{['user', 'buyer', 'individual_seller'].includes(String(user.role || '').toLowerCase()) ? 'Personal account' : isStaffRole(user.role) ? staffRoleLabel(user.role) : user.role === 'dealer' ? 'Verified Dealer' : user.role === 'mechanic' ? 'NTSA Mechanic' : String(user.role || 'Account').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAuthNavigation('/login')}
                  className="kayad-signin"
                  id="btn-auth-main"
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign In / Sign Up</span>
                </button>
              </div>
            )}

        </div>

        {/* Keep the mobile menu as the final, independent header control.
            This guarantees the mobile order: brand, utility actions, menu. */}
        <button
          type="button"
          onClick={focusMobileSearch}
          className="kayad-util kayad-search-mobile"
          aria-label="Search vehicles"
          id="btn-mobile-search"
        >
          <Search className="w-5 h-5 text-[#0A3340]" aria-hidden="true" />
        </button>
        <button
          type="button"
          ref={hamburgerRef}
          onClick={() => { if (mobileMenuOpen) setMobileMenuOpen(false); else openMobileMenu(); }}
          className="kayad-util kayad-hamburger"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="kayad-mobile-drawer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-[#0A3340]" aria-hidden="true" /> : <Menu className="w-6 h-6 text-[#0A3340]" aria-hidden="true" />}
        </button>
      </div>

      {/* MOBILE DRAWER NAVIGATION — one premium, scroll-safe surface. */}
      {mobileMenuOpen && (
        <>
          <button type="button" aria-label="Dismiss navigation backdrop" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-[55] bg-[#031E27]/55 backdrop-blur-[2px] lg:hidden" />
          <aside ref={drawerRef} id="kayad-mobile-drawer" tabIndex={-1} className="kayad-mobile-menu fixed inset-x-0 bottom-0 z-[60] lg:hidden focus:outline-none" style={{ top: `${mobileDrawerTop}px`, height: `${mobileDrawerHeight}px` }} role="dialog" aria-modal="true" aria-label="KAYARD KE mobile navigation">
            <div className="kayad-mobile-menu__surface mx-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden rounded-t-[28px] border-x border-t border-[#2C6671] bg-[#062E3A] text-white shadow-[0_30px_90px_rgba(3,30,39,.38)]">
              <div className="kayad-mobile-menu__topbar flex min-h-[58px] shrink-0 items-center justify-between border-b border-white/10 bg-[#071B2E] px-5">
                <div className="min-w-0"><p className="text-[13px] font-black tracking-[.08em] text-white">KAYARD MENU</p><p className="text-[10px] text-white/55">Explore, manage and get support</p></div>
                <button type="button" onClick={() => { setMobileMenuOpen(false); hamburgerRef.current?.focus(); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]" aria-label="Close navigation menu"><X className="h-5 w-5" aria-hidden="true" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {authLoading && sessionHinted ? (
                  <section className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.05] p-3.5" aria-label="Checking your account" role="status" aria-live="polite">
                    <div className="flex items-center gap-3">
                      <span className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-white/10" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block h-3 w-32 max-w-full animate-pulse rounded bg-white/15" aria-hidden="true" />
                        <span className="mt-2 block h-2.5 w-44 max-w-full animate-pulse rounded bg-white/10" aria-hidden="true" />
                        <span className="sr-only">Checking your account session</span>
                      </span>
                    </div>
                  </section>
                ) : user ? (
                  <section className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.07] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {user.avatar ? <img src={user.avatar} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-white/15" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0D7187]"><User className="h-5 w-5" /></div>}
                        <div className="min-w-0"><p className="truncate text-sm font-black">{user.name}</p><p className="truncate text-[10px] text-white/55">{user.email}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.14em] text-[#61D7CA]" data-testid="drawer-role-label">{isStaffRole(user.role) ? staffRoleLabel(user.role) : user.role === 'dealer' ? 'Verified Dealer' : user.role === 'mechanic' ? 'NTSA Mechanic' : 'Personal account'}</p></div>
                      </div>
                      <button type="button" onClick={() => { if (onLogout) onLogout(); setMobileMenuOpen(false); }} className="shrink-0 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-[10px] font-black text-rose-200">Log out</button>
                    </div>
                  </section>
                ) : (
                  <section className="mb-4 rounded-[22px] border border-[#3B7E88] bg-gradient-to-br from-[#0B3E4B] to-[#07313D] p-4">
                    <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#DDF4F0] text-[#0A3340]"><User className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-black">Welcome to KAYARD KE</p><p className="mt-0.5 text-[11px] leading-5 text-white/60">Sign in to access saved vehicles, escrow and your account.</p></div></div>
                    <button type="button" onClick={() => handleAuthNavigation('/login')} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#13B8A6] px-4 text-sm font-black text-[#062E3A] shadow-[0_10px_25px_rgba(19,184,166,.18)]">Sign In / Sign Up <ChevronDown className="h-4 w-4 -rotate-90" /></button>
                  </section>
                )}

                <section className="mb-4" aria-labelledby="kayad-drawer-explore">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1"><span id="kayad-drawer-explore" className="text-[10px] font-black uppercase tracking-[.19em] text-[#A9DAD7]">Explore KAYARD</span><span className="text-[10px] font-semibold text-white/45">Your vehicle journey, all in one place</span></div>
                  <nav className="kayad-mobile-drawer-primary" aria-label="Primary">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isSectionActive(item);
                      const children = visibleChildren(item, signedIn, isRestrictedWorkspace);
                      return (
                        <div key={item.id} className="kayad-drawer-group">
                          <div className={`kayad-drawer-group__row ${active ? 'is-active' : ''}`}>
                            <a
                              href={item.href}
                              onClick={(e) => handleLinkClick(e, item.navId)}
                              className={`kayad-drawer-group__head ${active ? 'is-active' : ''}`}
                              aria-current={active ? 'page' : undefined}
                            >
                              <span className={`kayad-drawer-group__icon kayad-drawer-group__icon--${item.id}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                              <span className="flex-1">{item.id === 'support' ? 'Support & Disputes' : item.label}</span>
                            </a>
                            {children.length > 0 && (
                              <button
                                type="button"
                                className="kayad-drawer-group__expand"
                                aria-label={`${mobileExpandedGroups[item.id] ? 'Collapse' : 'Expand'} ${item.label} links`}
                                aria-expanded={!!mobileExpandedGroups[item.id]}
                                aria-controls={`kayad-drawer-links-${item.id}`}
                                onClick={() => setMobileExpandedGroups((current) => ({
                                  ...current,
                                  [item.id]: !current[item.id],
                                }))}
                              >
                                <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpandedGroups[item.id] ? 'rotate-180' : ''}`} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          {children.length > 0 && (
                            <div id={`kayad-drawer-links-${item.id}`} className="kayad-drawer-group__links" hidden={!mobileExpandedGroups[item.id]}>
                              {children.map((child) => {
                                const ChildIcon = child.icon;
                                return (
                                  <a key={child.id} href={child.href} onClick={(e) => handleLinkClick(e, child.navId)} className="kayad-drawer-chip" aria-current={activeNav === child.navId ? 'page' : undefined}>
                                    <ChildIcon className={`kayad-drawer-chip__icon kayad-drawer-chip__icon--${item.id}`} aria-hidden="true" />
                                    <span>{child.label}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </section>

                {user && (
                  <section className="kayad-drawer-panel mb-4 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-2" aria-labelledby="kayad-drawer-workspace">
                    <span id="kayad-drawer-workspace" className="block px-2 pb-1 pt-1 text-[9px] font-black uppercase tracking-[.2em] text-[#79A9AE]">
                      {isDealerUser ? 'Dealer workspace' : isStaffAccount ? 'Staff workspace' : isMechanicAccount ? 'Provider workspace' : 'Your KAYARD KE'}
                    </span>
                    <div className="kayad-drawer-list">
                      {user && isDealerUser && <>
                        <button type="button" onClick={() => handleNavSelect('dealer:overview')} className="kayad-drawer-tile"><LayoutDashboard className="h-4 w-4" />Dashboard</button>
                        <button type="button" onClick={() => handleNavSelect('dealer:inventory')} className="kayad-drawer-tile"><Layers className="h-4 w-4" />Inventory</button>
                        <button type="button" onClick={() => handleNavSelect('dealer:leads')} className="kayad-drawer-tile"><MessageSquare className="h-4 w-4" />Leads</button>
                        <button type="button" onClick={() => handleNavSelect('dealer:analytics')} className="kayad-drawer-tile"><BarChart3 className="h-4 w-4" />Analytics</button>
                        <button type="button" onClick={() => handleNavSelect('dealer:settings')} className="kayad-drawer-tile"><Settings className="h-4 w-4" />Settings</button>
                        <button type="button" onClick={() => handleNavSelect('chat')} className="kayad-drawer-tile"><MessageSquare className="h-4 w-4" />Messages {effectiveUnread > 0 && <span className="kayad-drawer-count">{effectiveUnread}</span>}</button>
                        <button type="button" onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} className="kayad-drawer-tile"><Bell className="h-4 w-4" />Notifications {notificationUnreadCount > 0 && <span className="kayad-drawer-count kayad-drawer-count--alert">{notificationUnreadCount}</span>}</button>
                      </>}
                      {user && isStaffAccount && <>
                        <button type="button" onClick={() => handleNavSelect('chat')} className="kayad-drawer-tile"><MessageSquare className="h-4 w-4" />Messages {effectiveUnread > 0 && <span className="kayad-drawer-count">{effectiveUnread}</span>}</button>
                        <button type="button" onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} className="kayad-drawer-tile"><Bell className="h-4 w-4" />Notifications {notificationUnreadCount > 0 && <span className="kayad-drawer-count kayad-drawer-count--alert">{notificationUnreadCount}</span>}</button>
                        <button type="button" onClick={() => handleAdminRoute('/admin')} className="kayad-drawer-tile"><Settings className="h-4 w-4" />Admin Console</button>
                        <button type="button" onClick={() => handleNavSelect('profile')} className="kayad-drawer-tile"><User className="h-4 w-4" />Account Settings</button>
                      </>}
                      {user && isMechanicAccount && <>
                        <button type="button" onClick={() => handleNavSelect('dashboard')} className="kayad-drawer-tile"><LayoutDashboard className="h-4 w-4" />Dashboard</button>
                        <button type="button" onClick={() => handleNavSelect('inspections')} className="kayad-drawer-tile"><ShieldCheck className="h-4 w-4" />Inspection Portal</button>
                        <button type="button" onClick={() => handleNavSelect('chat')} className="kayad-drawer-tile"><MessageSquare className="h-4 w-4" />Messages {effectiveUnread > 0 && <span className="kayad-drawer-count">{effectiveUnread}</span>}</button>
                        <button type="button" onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} className="kayad-drawer-tile"><Bell className="h-4 w-4" />Notifications</button>
                        <button type="button" onClick={() => handleNavSelect('profile')} className="kayad-drawer-tile"><User className="h-4 w-4" />Account Settings</button>
                        <button type="button" onClick={() => handleNavSelect('payments')} className="kayad-drawer-tile"><CreditCard className="h-4 w-4" />Payment History</button>
                      </>}
                      {user && !isRestrictedWorkspace && !isMechanicAccount && <>
                        <button type="button" onClick={() => handleNavSelect('dashboard')} className="kayad-drawer-tile"><LayoutDashboard className="h-4 w-4" />My Account</button>
                        {isSellerRole(user.role) && <button type="button" onClick={() => handleNavSelect('dashboard:my-vehicles')} className="kayad-drawer-tile"><Car className="h-4 w-4" />My Vehicles</button>}
                        <button type="button" onClick={() => handleNavSelect('profile')} className="kayad-drawer-tile"><User className="h-4 w-4" />Account Settings</button>
                        <button type="button" onClick={() => handleNavSelect('chat')} className="kayad-drawer-tile"><MessageSquare className="h-4 w-4" />Messages {effectiveUnread > 0 && <span className="kayad-drawer-count">{effectiveUnread}</span>}</button>
                        <button type="button" onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} className="kayad-drawer-tile"><Bell className="h-4 w-4" />Notifications {notificationUnreadCount > 0 && <span className="kayad-drawer-count kayad-drawer-count--alert">{notificationUnreadCount}</span>}</button>
                        <button type="button" onClick={() => handleNavSelect('payments')} className="kayad-drawer-tile"><CreditCard className="h-4 w-4" />Payment History</button>
                      </>}
                    </div>
                  </section>
                )}

                <section className="kayad-drawer-panel mb-4 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-2" aria-labelledby="kayad-drawer-quick-access">
                  <span id="kayad-drawer-quick-access" className="block px-2 pb-1 pt-1 text-[9px] font-black uppercase tracking-[.2em] text-[#79A9AE]">Quick access</span>
                  <div className="kayad-drawer-list">
                    <button type="button" onClick={() => { onOpenAlerts(); setMobileMenuOpen(false); }} className="kayad-drawer-tile"><Bell className="h-4 w-4" />Price Alerts</button>
                    {onOpenCompare && <button type="button" onClick={() => { onOpenCompare(); setMobileMenuOpen(false); }} className="kayad-drawer-tile"><Sliders className="h-4 w-4" />Compare Vehicles</button>}
                  </div>
                </section>

                {!isStaffAccount && (
                  <button type="button" onClick={() => handleNavSelect(isDealerUser ? 'dealer:inventory:new' : 'dashboard:create-listing')} id="mobile-cta-sell-car" className="mb-4 flex min-h-14 w-full items-center justify-between rounded-[20px] border border-[#43D0C2]/40 bg-gradient-to-r from-[#0D7187] to-[#176B87] px-4 text-left text-white shadow-[0_16px_35px_rgba(7,57,68,.22)] active:scale-[.99]"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><PlusCircle className="h-5 w-5" /></span><span><strong className="block text-sm font-black">{isDealerUser ? 'Add Vehicle' : 'Sell Vehicle'}</strong><small className="text-[10px] text-white/60">{isDealerUser ? 'Add stock to your inventory' : 'List your vehicle with KAYARD KE'}</small></span></span><ChevronDown className="h-5 w-5 -rotate-90 text-[#8DE4DB]" /></button>
                )}
                <div className="flex items-center justify-between border-t border-white/[0.08] px-1 pt-4 text-[10px] text-white/50"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#79D8CF]" />{selectedCounty}</span></div>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
};

export default Navbar;
