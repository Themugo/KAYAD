import React, { useState, useRef, useEffect } from 'react';
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
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const countyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // The mobile dock's Menu tab opens this same drawer (no second menu implementation).
  useEffect(() => {
    const openMenu = () => {
      setMobileMenuOpen(true);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    };
    window.addEventListener('kayad:open-mobile-menu', openMenu);
    return () => window.removeEventListener('kayad:open-mobile-menu', openMenu);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('kayad-mobile-menu-is-open', mobileMenuOpen);
    return () => document.body.classList.remove('kayad-mobile-menu-is-open');
  }, [mobileMenuOpen]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countyRef.current && !countyRef.current.contains(e.target as Node)) {
        setShowCountyDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAuthNavigation = (path: '/login' | '/register') => {
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleNavSelect = (navId: string) => {
    onNavClick(navId);
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
  };

  const effectiveUnread = user?.unreadMessagesCount ?? unreadCount;
  const hasNotifications = (user?.unreadNotificationsCount ?? 0) > 0 || effectiveUnread > 0;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#D7E7E4] shadow-[0_4px_20px_rgba(11,29,58,.06)] text-slate-800">
      {/* The broadcast notice board is rendered by TopNoticeStrip above this navigation. */}

      {/* Main Navigation Container */}
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-7 xl:px-8">
        <div className="flex min-h-16 items-center justify-between gap-2 sm:gap-3 lg:min-h-[72px]">

          {/* LEFT SECTION: Logo, Marketplace, Auctions */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5 lg:gap-6">
            {/* KAYAD Logo */}
            <button
              onClick={() => handleNavSelect('marketplace')}
              className="flex items-center gap-2.5 group focus:outline-none shrink-0 min-w-0"
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
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] text-white flex items-center justify-center font-black shadow-sm group-hover:bg-[#12576D] transition-colors shrink-0">
                  <Car className="w-5 h-5 stroke-[2]" />
                </div>
              )}
              {branding.logoType !== 'image' && (
                <div className="flex min-w-0 flex-col text-left">
                  <span className="font-black text-[clamp(1.2rem,2vw,1.55rem)] tracking-tight text-[#0A3340] font-display leading-none flex items-center gap-1.5 truncate">
                    {branding.logoText || 'KAYAD'}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#DDF4F0] text-[#12576D] border border-[#BDE5DE] font-sans font-extrabold shrink-0">
                      EA
                    </span>
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold tracking-[0.12em] uppercase mt-1 truncate max-w-[180px]">{branding.brandTagline || 'Automotive Marketplace'}</span>
                </div>
              )}
            </button>

            {/* Desktop Left Nav Items */}
            {/* Fixed: removed the Auctions/Services dropdowns per
                explicit direction - most functions live on each
                car's own page, so the navbar only needs these flat,
                direct links now. */}
            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto border-l border-slate-200/60 pl-3 text-[11px] font-semibold text-slate-600 lg:flex xl:gap-1.5 xl:pl-5 xl:text-xs" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => handleNavSelect('marketplace')}
                className={`px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'marketplace'
                    ? 'bg-[#0A3340] text-white font-bold shadow-2xs'
                    : 'hover:text-[#0A3340] hover:bg-[#F0FAF8]'
                }`}
              >
                Marketplace
              </button>

              <button
                onClick={() => handleNavSelect('discovery')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'discovery'
                    ? 'bg-[#0A3340] text-white font-bold shadow-2xs'
                    : 'hover:text-[#0A3340] hover:bg-[#F0FAF8]'
                }`}
              >
                <Gavel className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                <span>Auction</span>
              </button>

              <button
                onClick={() => handleNavSelect('inspections')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'inspections'
                    ? 'bg-[#0A3340] text-white font-bold shadow-2xs'
                    : 'hover:text-[#0A3340] hover:bg-[#F0FAF8]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[1.75]" />
                <span>Pre-Purchase Inspection</span>
              </button>

              <button
                onClick={() => handleNavSelect('escrow')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'escrow'
                    ? 'bg-[#0A3340] text-white font-bold shadow-2xs'
                    : 'hover:text-[#0A3340] hover:bg-[#F0FAF8]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[1.75]" />
                <span>Escrow</span>
              </button>

              {user && (
                <button onClick={() => handleNavSelect('payments')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${activeNav === 'payments' ? 'bg-[#0A3340] text-white font-bold shadow-2xs' : 'hover:text-[#0A3340] hover:bg-[#F0FAF8]'}`}>
                  <CreditCard className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>Payment History</span>
                </button>
              )}

              <button
                onClick={() => handleNavSelect('support')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'support'
                    ? 'bg-[#0A3340] text-white font-bold shadow-2xs'
                    : 'hover:text-[#0A3340] hover:bg-[#F0FAF8]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[1.75]" />
                <span>Support</span>
              </button>
            </nav>
          </div>

          {/* RIGHT SECTION: List Vehicle & Login/Register OR User Profile Dropdown */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Communication Hub Button */}
            <button
              onClick={() => handleNavSelect('chat')}
              className={`p-2 rounded-xl text-slate-600 hover:text-[#0A3340] hover:bg-[#F0FAF8] transition-colors relative ${
                activeNav === 'chat' ? 'bg-[#0A3340] text-white' : ''
              }`}
              title="Unified Communication Hub"
            >
              <MessageSquare className={`w-5 h-5 stroke-[1.75] ${activeNav === 'chat' ? 'text-white' : 'text-slate-600'}`} />
              {/* Fixed: this badge was hardcoded to "3" unconditionally,
                  always showing regardless of whether there was any
                  real unread message - unlike the Favorites badge
                  right below it, which correctly only renders when
                  its real count is actually > 0. effectiveUnread was
                  already computed above and already used correctly
                  in this same component's dropdown menu - this badge
                  just wasn't wired to it. */}
              {effectiveUnread > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-[#13B8A6] text-[#0A3340] shadow-2xs">
                  {effectiveUnread}
                </span>
              )}
            </button>

            {/* Favorites Icon */}
            {/* Fixed: this was always shown, even to signed-out
                visitors, even though favorites are inherently
                per-user (require being signed in to mean anything -
                the "saved" destination has nothing real to show a
                logged-out visitor). Now only shown once genuinely
                signed in, matching the same real gating already used
                elsewhere in this navbar (e.g. the profile dropdown). */}
            {user && (
              <button
                onClick={() => handleNavSelect('saved')}
                className={`p-2 rounded-xl text-slate-600 hover:text-[#0A3340] hover:bg-[#F0FAF8] transition-colors relative ${
                  activeNav === 'saved' ? 'bg-[#DDF4F0] text-[#0A3340]' : ''
                }`}
                title="Saved Vehicles"
              >
                <Heart className="w-5 h-5 text-slate-600 stroke-[1.75]" />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#176B87] text-white shadow-2xs">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            {/* List Vehicle Button (Primary CTA: Muted Terracotta) */}
            <button
              onClick={() => handleNavSelect('seller-platform')}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs bg-[#176B87] hover:bg-[#12576D] text-white transition-all shadow-2xs active:scale-[0.98] shrink-0"
              id="cta-sell-car"
            >
              <PlusCircle className="w-4 h-4 stroke-[2]" />
              <span>Sell Vehicle</span>
            </button>

            {/* AUTHENTICATED USER DROPDOWN OR LOGIN BUTTON (Secondary CTA: White bg, Navy border) */}
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
                <div className="w-24 h-9 rounded-xl bg-slate-100 animate-pulse" />
              </div>
            ) : user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-[#F0FAF8] border border-slate-200 transition-all focus:outline-none"
                  id="user-profile-menu-button"
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
                    <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Authenticated Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                    {/* User Header Info */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-[#DDF4F0]/60 rounded-t-2xl">
                      <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#0A3340]/30" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#0A3340] text-white font-semibold text-[9px] rounded uppercase">
                          {user.role === 'dealer' ? 'Verified Dealer' : user.role === 'mechanic' ? 'NTSA Mechanic' : user.role === 'admin' ? 'Administrator' : 'Private Seller / Buyer'}
                        </span>
                      </div>
                    </div>

                    {/* Standard Links */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavSelect('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Buyer Command Center</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('seller-dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-bold text-[#0A3340]"
                      >
                        <Car className="w-4 h-4 text-amber-600 stroke-[1.75]" />
                        <span>Private Seller Dashboard</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('chat')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center justify-between font-bold text-[#0A3340]"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-blue-600 stroke-[1.75]" />
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
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <Car className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Sell Vehicle</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('saved')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center justify-between font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Heart className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                          <span>Saved Cars</span>
                        </div>
                        {savedCount > 0 && (
                          <span className="text-slate-400 font-medium text-[11px]">{savedCount} items</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleNavSelect('kayadlive')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <Sparkles className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>KAYAD Live</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('buyer-platform')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <Car className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>My Garage</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('finance')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <CreditCard className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Vehicle Financing</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('profile')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F0FAF8] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#0A3340]"
                      >
                        <Settings className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    {/* ROLE-SPECIFIC OPTIONS */}
                    {user.role === 'dealer' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-[#DDF4F0]/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-emerald-50/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Pre-Purchase Inspection Portal
                        </div>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Pre-Purchase Inspection OS</span>
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
                          <span>150-Point Reports</span>
                        </button>
                      </div>
                    )}

                    {user.role === 'admin' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-slate-100/80 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          System Administration
                        </div>
                        <button
                          onClick={() => handleNavSelect('admin')}
                          className="w-full text-left px-4 py-1.5 hover:bg-slate-200 flex items-center gap-2.5 font-bold text-slate-900"
                        >
                          <Lock className="w-4 h-4 text-slate-700" />
                          <span>Admin Panel</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('admin')}
                          className="w-full text-left px-4 py-1.5 hover:bg-slate-200 flex items-center gap-2.5 font-bold text-slate-900"
                        >
                          <Sliders className="w-4 h-4 text-slate-700" />
                          <span>System Management</span>
                        </button>
                      </div>
                    )}

                    {/* Logout Button */}
                    <div className="border-t border-slate-100 pt-1 mt-1">
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
                  className="flex items-center gap-2 rounded-xl border border-[#0A3340] bg-[#0A3340] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(10,51,64,.12)] transition-all hover:bg-[#12576D]"
                  id="btn-auth-main"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Sign In / Sign Up</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:bg-[#F0FAF8] rounded-xl focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#0A3340]" /> : <Menu className="w-6 h-6 text-[#0A3340]" />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE DRAWER NAVIGATION — one premium, scroll-safe surface. */}
      {mobileMenuOpen && (
        <>
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-[55] bg-[#031E27]/55 backdrop-blur-[2px] lg:hidden" />
          <aside className="kayad-mobile-menu absolute left-0 right-0 top-full z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="KAYAD mobile navigation">
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

                <section className="mb-4">
                  <div className="mb-2 flex items-center justify-between px-1"><span className="text-[9px] font-black uppercase tracking-[.2em] text-[#79A9AE]">Marketplace</span><span className="text-[9px] font-semibold text-white/35">Explore KAYAD</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'marketplace', label: 'Marketplace', icon: Car },
                      { id: 'discovery', label: 'Auction', icon: Gavel },
                      { id: 'inspections', label: 'Pre-Purchase Inspection', icon: ShieldCheck },
                      { id: 'escrow', label: 'Escrow', icon: Lock },
                      { id: 'financing', label: 'Financing', icon: Landmark },
                      { id: 'support', label: 'Support & Disputes', icon: HelpCircle },
                    ].map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => handleNavSelect(id)} className={`group flex min-h-[58px] items-center gap-3 rounded-[18px] border px-3.5 text-left transition-all active:scale-[.985] ${activeNav === id ? 'border-[#39C9BB]/45 bg-[#0F5968] text-white shadow-[0_10px_24px_rgba(0,0,0,.12)]' : 'border-white/[0.07] bg-white/[0.055] text-white/82 hover:bg-white/[0.09]'}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${activeNav === id ? 'bg-[#DDF4F0] text-[#0A3340]' : 'bg-[#0A4150] text-[#7BD9CF]'}`}><Icon className="h-[18px] w-[18px]" /></span><span className="text-[11px] font-black leading-4">{label}</span>
                      </button>
                    ))}
                  </div>
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
                <div className="flex items-center justify-between border-t border-white/[0.08] px-1 pt-4 text-[10px] text-white/50"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#79D8CF]" />{selectedCounty}</span><button type="button" onClick={() => { onOpenAlerts(); setMobileMenuOpen(false); }} className="font-black text-white/65">Price alerts</button></div>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
};

export default Navbar;
