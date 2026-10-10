import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  PlusCircle,
  Menu,
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
  Lock,
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
import { useBranding } from '../context/BrandingContext';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { applyNavigationConfig, visibleChildren, type NavPrimary } from './navigation/navConfig';
import '../styles/kayad-navigation.css';

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
  authLoading = false,
}) => {
  const { branding, navigation } = useBranding();
  // Admin-controlled presentation state over the code-owned destinations;
  // falls back to the canonical navigation for any missing/invalid config.
  const navItems = useMemo(() => applyNavigationConfig(navigation), [navigation]);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const countyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
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
      setMobileMenuOpen(true);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    };
    window.addEventListener('kayad:open-mobile-menu', openMenu);
    return () => window.removeEventListener('kayad:open-mobile-menu', openMenu);
  }, [prefersReducedMotion]);

  useEffect(() => {
    document.body.classList.toggle('kayad-mobile-menu-is-open', mobileMenuOpen);
    return () => document.body.classList.remove('kayad-mobile-menu-is-open');
  }, [mobileMenuOpen]);

  // Close dropdowns on click outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (countyRef.current && !countyRef.current.contains(target)) {
        setShowCountyDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setShowUserDropdown(false);
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
      } else if (showUserDropdown) {
        setShowUserDropdown(false);
        userButtonRef.current?.focus();
      } else if (openMenu) {
        const toggle = document.querySelector<HTMLButtonElement>(`[data-nav-toggle="${openMenu}"]`);
        setOpenMenu(null);
        pinnedMenu.current = null;
        toggle?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, showUserDropdown, openMenu]);

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
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleNavSelect = (navId: string) => {
    onNavClick(navId);
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
    setOpenMenu(null);
    pinnedMenu.current = null;
  };

  // Real <a href> links that the SPA intercepts: plain clicks navigate in-app,
  // modified clicks (new tab, copy link, middle-click) keep native behaviour.
  const handleLinkClick = (e: React.MouseEvent, navId: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    handleNavSelect(navId);
  };

  const signedIn = Boolean(user);
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

  const effectiveUnread = user?.unreadMessagesCount ?? unreadCount;
  const hasNotifications = (user?.unreadNotificationsCount ?? 0) > 0 || effectiveUnread > 0;

  return (
    <header className="kayad-header">
      {/* The broadcast notice board is rendered by TopNoticeStrip above this navigation. */}
      <div className="kayad-header__bar">

        {/* BRAND FIELD — logo, EA marker and tagline keep their own visual authority. */}
        <a
          href="/?nav=marketplace"
          onClick={(e) => { if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); handleNavSelect('marketplace'); }}
          className="kayad-brand group"
          id="brand-logo"
          aria-label={`${branding.logoText || 'KAYAD'} marketplace`}
        >
          {branding.logoType === 'image' && branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.logoText || 'KAYAD'}
              className="h-10 w-auto max-w-[180px] object-contain shrink-0"
            />
          ) : (
            <span className="kayad-brand__mark"><Car className="w-5 h-5 stroke-[2]" aria-hidden="true" /></span>
          )}
          {branding.logoType !== 'image' && (
            <span className="kayad-brand__text">
              <span className="kayad-brand__word">
                {branding.logoText || 'KAYAD'}
                <span className="kayad-brand__ea">EA</span>
              </span>
              <span className="kayad-brand__tag">{branding.brandTagline || 'Automotive Marketplace'}</span>
            </span>
          )}
        </a>

        {/* NAVIGATION FIELD — primary destinations; dropdowns expose existing
            destinations only (see navigation/navConfig.ts). */}
        <nav className="kayad-navfield" aria-label="Primary">
          <ul>
            {navItems.map((item) => {
              const children = visibleChildren(item, signedIn);
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
          {user && (
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
            onClick={() => handleNavSelect('seller-platform')}
            className="kayad-cta"
            id="cta-sell-car"
            aria-label="Sell Vehicle"
          >
            <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            <span className="max-[359px]:hidden">Sell Vehicle</span>
            <span className="min-[360px]:hidden" aria-hidden="true">Sell</span>
          </button>

            {/* STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: while the
                authoritative session check is still in flight, `user` is
                always null, so rendering straight off `user` here showed
                the signed-out "Sign In / Sign Up" button to an
                already-authenticated customer on every reload until
                getMe() resolved. Render a neutral, same-sized placeholder
                instead during that window - it never claims either auth
                state, unlike both branches it replaces. */}
            {authLoading ? (
              <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
                <div className="w-28 h-10 rounded-xl bg-[#EEF7F5] animate-pulse" />
              </div>
            ) : user ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  ref={userButtonRef}
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 min-h-10 rounded-xl hover:bg-[#F0FAF8] border border-[#D7E7E4] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13B8A6]"
                  id="user-profile-menu-button"
                  aria-expanded={showUserDropdown}
                  aria-controls="kayad-account-panel"
                  aria-label={`Account menu for ${user.name}`}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#0A3340]/30 shadow-2xs"
                    />
                    {hasNotifications && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-[#0A3340] leading-none">{user.name}</span>
                    <span className="text-[10px] text-[#64748B] capitalize">{user.role}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {/* Authenticated Dropdown Menu */}
                {showUserDropdown && (
                  <div id="kayad-account-panel" className="absolute right-0 mt-2 w-64 max-h-[calc(100svh-96px)] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#D7E7E4] py-2 z-50 animate-fade-in text-xs">
                    {/* User Header Info */}
                    <div className="px-4 py-3 border-b border-[#D7E7E4] flex items-center gap-3 bg-[#DDF4F0]/60 rounded-t-2xl">
                      <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#0A3340]/30" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-[#0A3340] truncate">{user.name}</p>
                        <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#0A3340] text-white font-semibold text-[9px] rounded uppercase">
                          {user.role === 'dealer' ? 'Verified Dealer' : user.role === 'mechanic' ? 'NTSA Mechanic' : user.role === 'admin' ? 'Administrator' : 'Private Seller / Buyer'}
                        </span>
                      </div>
                    </div>

                    {/* Standard Links */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavSelect('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>Buyer Command Center</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('seller-dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-bold text-[#0A3340]"
                      >
                        <Car className="w-4 h-4 text-[#176B87] stroke-[1.75]" />
                        <span>Private Seller Dashboard</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('chat')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center justify-between font-bold text-[#0A3340]"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-[#176B87] stroke-[1.75]" />
                          <span>Communication Hub</span>
                        </div>
                        {effectiveUnread > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                            {effectiveUnread}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleNavSelect('seller-platform')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <Car className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>Sell Vehicle</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('saved')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center justify-between font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Heart className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                          <span>Saved Cars</span>
                        </div>
                        {savedCount > 0 && (
                          <span className="text-[#94A3B8] font-medium text-[11px]">{savedCount} items</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleNavSelect('kayadlive')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <Sparkles className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>KAYAD Live</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('buyer-platform')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <Car className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>My Garage</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('payments')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <CreditCard className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>Payment History</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('finance')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <CreditCard className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>Vehicle Financing</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('profile')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-[#12576D] hover:text-[#0A3340]"
                      >
                        <Settings className="w-4 h-4 text-[#64748B] stroke-[1.75]" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    {/* ROLE-SPECIFIC OPTIONS */}
                    {user.role === 'dealer' && (
                      <div className="border-t border-[#D7E7E4] pt-1.5 mt-1.5 bg-[#DDF4F0]/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Dealer Management
                        </div>
                        <button
                          onClick={() => handleNavSelect('dealer-dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-bold text-[#0A3340]"
                        >
                          <Building2 className="w-4 h-4 text-[#0A3340]" />
                          <span>Dealer Dashboard</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('dealer-dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-bold text-[#0A3340]"
                        >
                          <Layers className="w-4 h-4 text-[#0A3340]" />
                          <span>Dealer Inventory</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('dealer-dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-bold text-[#0A3340]"
                        >
                          <BarChart3 className="w-4 h-4 text-[#0A3340]" />
                          <span>Dealer Analytics</span>
                        </button>
                      </div>
                    )}

                    {user.role === 'mechanic' && (
                      <div className="border-t border-[#D7E7E4] pt-1.5 mt-1.5 bg-emerald-50/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Pre-Purchase Inspection Portal
                        </div>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Inspections</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>Bookings Intake</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>Inspection reports</span>
                        </button>
                      </div>
                    )}

                    {user.role === 'admin' && (
                      <div className="border-t border-[#D7E7E4] pt-1.5 mt-1.5 bg-[#EEF7F5]/80 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[#12576D]">
                          System Administration
                        </div>
                        <button
                          onClick={() => handleNavSelect('admin')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#DDF4F0] flex items-center gap-2.5 font-bold text-[#0A3340]"
                        >
                          <Lock className="w-4 h-4 text-[#12576D]" />
                          <span>Admin Panel</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('admin')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#DDF4F0] flex items-center gap-2.5 font-bold text-[#0A3340]"
                        >
                          <Sliders className="w-4 h-4 text-[#12576D]" />
                          <span>System Management</span>
                        </button>
                      </div>
                    )}

                    {/* Logout Button */}
                    <div className="border-t border-[#D7E7E4] pt-1 mt-1">
                      <button
                        onClick={() => {
                          if (onLogout) onLogout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 font-bold transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
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

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              ref={hamburgerRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="kayad-util kayad-hamburger"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="kayad-mobile-drawer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#0A3340]" aria-hidden="true" /> : <Menu className="w-6 h-6 text-[#0A3340]" aria-hidden="true" />}
            </button>
        </div>
      </div>

      {/* MOBILE DRAWER NAVIGATION — one premium, scroll-safe surface. */}
      {mobileMenuOpen && (
        <>
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-[55] bg-[#031E27]/55 backdrop-blur-[2px] lg:hidden" />
          <aside ref={drawerRef} id="kayad-mobile-drawer" tabIndex={-1} className="kayad-mobile-menu absolute left-0 right-0 top-full z-[60] lg:hidden focus:outline-none" role="dialog" aria-modal="true" aria-label="KAYAD mobile navigation">
            <div className="mx-auto flex max-h-[calc(100svh-78px)] w-full max-w-[760px] flex-col overflow-hidden rounded-b-[28px] border-x border-b border-[#2C6671] bg-[#062E3A] text-white shadow-[0_30px_90px_rgba(3,30,39,.38)]">
              <div className="flex min-h-1.5 items-center justify-center bg-[#0A3340]"><span className="h-1 w-10 rounded-full bg-white/20" /></div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {user ? (
                  <section className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.07] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {user.avatar ? <img src={user.avatar} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-white/15" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0D7187]"><User className="h-5 w-5" /></div>}
                        <div className="min-w-0"><p className="truncate text-sm font-black">{user.name}</p><p className="truncate text-[10px] text-white/55">{user.email}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.14em] text-[#61D7CA]">{user.role}</p></div>
                      </div>
                      <button type="button" onClick={() => { if (onLogout) onLogout(); setMobileMenuOpen(false); }} className="shrink-0 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-[10px] font-black text-rose-200">Log out</button>
                    </div>
                  </section>
                ) : (
                  <section className="mb-4 rounded-[22px] border border-[#3B7E88] bg-gradient-to-br from-[#0B3E4B] to-[#07313D] p-4">
                    <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#DDF4F0] text-[#0A3340]"><User className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-black">Welcome to KAYAD</p><p className="mt-0.5 text-[11px] leading-5 text-white/60">Sign in to access saved vehicles, escrow and your account.</p></div></div>
                    <button type="button" onClick={() => handleAuthNavigation('/login')} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#13B8A6] px-4 text-sm font-black text-[#062E3A] shadow-[0_10px_25px_rgba(19,184,166,.18)]">Sign In / Sign Up <ChevronDown className="h-4 w-4 -rotate-90" /></button>
                  </section>
                )}

                <section className="mb-4" aria-labelledby="kayad-drawer-explore">
                  <div className="mb-2 flex items-center justify-between px-1"><span id="kayad-drawer-explore" className="text-[9px] font-black uppercase tracking-[.2em] text-[#79A9AE]">Explore KAYAD</span></div>
                  <nav aria-label="Primary">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isSectionActive(item);
                      const children = visibleChildren(item, signedIn);
                      return (
                        <div key={item.id} className="kayad-drawer-group">
                          <a
                            href={item.href}
                            onClick={(e) => handleLinkClick(e, item.navId)}
                            className={`kayad-drawer-group__head ${active ? 'is-active' : ''}`}
                            aria-current={active ? 'page' : undefined}
                          >
                            <span className="kayad-drawer-group__icon"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                            <span className="flex-1">{item.id === 'support' ? 'Support & Disputes' : item.label}</span>
                            <ChevronDown className="h-4 w-4 -rotate-90 text-[#8DE4DB]" aria-hidden="true" />
                          </a>
                          {children.length > 0 && (
                            <div className="kayad-drawer-group__links">
                              {children.map((child) => (
                                <a key={child.id} href={child.href} onClick={(e) => handleLinkClick(e, child.navId)} className="kayad-drawer-chip">
                                  {child.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </section>

                <section className="mb-4 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-2">
                  <span className="block px-2 pb-1 pt-1 text-[9px] font-black uppercase tracking-[.2em] text-[#79A9AE]">Your KAYAD</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {user && <>
                      <button type="button" onClick={() => handleNavSelect('dashboard')} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><LayoutDashboard className="h-4 w-4 text-[#79D8CF]" />Dashboard</button>
                      <button type="button" onClick={() => handleNavSelect('chat')} className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#79D8CF]" />Messages</span>{effectiveUnread > 0 && <span className="rounded-full bg-[#13B8A6] px-1.5 text-[9px] font-black text-[#062E3A]">{effectiveUnread}</span>}</button>
                      <button type="button" onClick={() => handleNavSelect('payments')} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><CreditCard className="h-4 w-4 text-[#79D8CF]" />Payment History</button>
                      <button type="button" onClick={() => handleNavSelect('saved')} className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><span className="flex items-center gap-2"><Heart className="h-4 w-4 text-[#79D8CF]" />Saved Vehicles</span>{savedCount > 0 && <span className="rounded-full bg-[#176B87] px-1.5 text-[9px] font-black text-white">{savedCount}</span>}</button>
                      {onOpenCompare && <button type="button" onClick={() => { onOpenCompare(); setMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><Sliders className="h-4 w-4 text-[#79D8CF]" />Compare</button>}
                    </>}
                    <button type="button" onClick={() => { onOpenAlerts(); setMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><Bell className="h-4 w-4 text-[#79D8CF]" />Price Alerts</button>
                  </div>
                </section>

                {user?.role === 'dealer' && <section className="mb-4 rounded-[20px] border border-white/[0.07] bg-white/[0.035] p-3"><span className="block px-1 pb-2 text-[9px] font-black uppercase tracking-[.2em] text-[#79A9AE]">Dealer Tools</span><div className="grid grid-cols-2 gap-1.5"><button type="button" onClick={() => handleNavSelect('dealer-dashboard')} className="rounded-xl bg-white/[0.05] px-3 py-3 text-left text-[10px] font-bold text-white/75"><Building2 className="mb-1 h-4 w-4 text-[#79D8CF]" />Dashboard</button><button type="button" onClick={() => handleNavSelect('dealer-dashboard')} className="rounded-xl bg-white/[0.05] px-3 py-3 text-left text-[10px] font-bold text-white/75"><Layers className="mb-1 h-4 w-4 text-[#79D8CF]" />Inventory</button></div></section>}
                {user?.role === 'mechanic' && <section className="mb-4 rounded-[20px] border border-emerald-300/10 bg-emerald-400/[0.05] p-3"><span className="block px-1 pb-2 text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">Inspection Tools</span><button type="button" onClick={() => handleNavSelect('inspections')} className="flex w-full items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-3 text-left text-[10px] font-bold text-emerald-100"><ShieldCheck className="h-4 w-4" />Inspection Portal</button></section>}
                {user?.role === 'admin' && <section className="mb-4 rounded-[20px] border border-white/[0.07] bg-white/[0.035] p-3"><span className="block px-1 pb-2 text-[9px] font-black uppercase tracking-[.2em] text-[#A8B8BC]">Administration</span><button type="button" onClick={() => handleNavSelect('admin')} className="flex w-full items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-3 text-left text-[10px] font-bold text-white/75"><Settings className="h-4 w-4" />Admin Console</button></section>}

                <button type="button" onClick={() => handleNavSelect('seller-platform')} id="mobile-cta-sell-car" className="mb-4 flex min-h-14 w-full items-center justify-between rounded-[20px] border border-[#43D0C2]/40 bg-gradient-to-r from-[#0D7187] to-[#176B87] px-4 text-left text-white shadow-[0_16px_35px_rgba(7,57,68,.22)] active:scale-[.99]"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><PlusCircle className="h-5 w-5" /></span><span><strong className="block text-sm font-black">Sell Vehicle</strong><small className="text-[10px] text-white/60">List your vehicle with KAYAD</small></span></span><ChevronDown className="h-5 w-5 -rotate-90 text-[#8DE4DB]" /></button>
                <div className="flex items-center justify-between border-t border-white/[0.08] px-1 pt-4 text-[10px] text-white/50"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#79D8CF]" />{selectedCounty}</span><button type="button" onClick={() => { onOpenAlerts(); setMobileMenuOpen(false); }} className="inline-flex min-h-11 items-center px-2 font-black text-white/65">Price alerts</button></div>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
};

export default Navbar;
