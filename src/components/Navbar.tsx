import React, { useState, useRef, useEffect } from 'react';
import { Car, PlusCircle, Menu, X, MapPin, ShieldCheck, User, ChevronDown, Gavel, CreditCard, HelpCircle, Heart, Bell, LogOut, LayoutDashboard, MessageSquare, Building2, Lock, Settings, Bookmark, BarChart3, Layers, Calendar, FileText, Sliders, CheckCircle2, Landmark } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  savedCount?: number;
  activeNav: string;
  onNavClick: (nav: string) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  onOpenAuth: () => void;
  onOpenAlerts: () => void;
  onLogout?: () => void;
  unreadCount?: number;
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
  onLogout,
  unreadCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavSelect = (navId: string) => {
    onNavClick(navId);
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
  };

  const effectiveUnread = user?.unreadMessagesCount ?? unreadCount;
  const hasNotifications = (user?.unreadNotificationsCount ?? 0) > 0 || effectiveUnread > 0;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#17244B] to-[#1E3063] border-b border-white/10 shadow-sm text-white">
      {/* Main Navigation Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18 gap-4">
          
          {/* LEFT SECTION: Logo, Marketplace */}
          <div className="flex items-center space-x-6 md:space-x-8">
            {/* KAYAD Logo */}
            <button 
              onClick={() => handleNavSelect('marketplace')}
              className="flex items-center gap-2.5 group focus:outline-none shrink-0"
              id="brand-logo"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-400 text-[#17244B] flex items-center justify-center font-black shadow-2xs group-hover:bg-amber-300 transition-colors">
                <Car className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-2xl tracking-tight text-white font-display leading-none flex items-center gap-1.5">
                  KAYAD
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-amber-400 border border-white/20 font-sans font-bold">
                    EA
                  </span>
                </span>
                <span className="text-[9px] text-slate-300 font-semibold tracking-wider uppercase mt-0.5">Automotive Marketplace</span>
              </div>
            </button>

            {/* Desktop Primary Nav - 4 items per explicit direction:
                Marketplace, Auction, Pre-Purchase Inspection, Support.
                A revision of the previous "just Marketplace" pass - that
                one was also a direct, explicit instruction, so this
                isn't overriding a judgment call, it's implementing a
                changed decision. Escrow and Finance are not in this list
                and stay contextual-only (VehicleDetailModal's "Start
                Secure Escrow Purchase" / Financing Marketplace
                Estimator), matching what was actually asked for both
                times - the 4 requested here are the same 4 named in the
                original "every car has its own rules functions" request,
                just now as their own nav items rather than folded
                entirely into per-vehicle-only access.

                "Auction" links to 'auctions' (AuctionsView) specifically,
                not 'discovery' (AuctionDiscoveryNetwork) - confirmed in
                an earlier pass that AuctionsView is the functionally
                real bidding/browsing page (real vehicle data, filtering,
                escrow integration; 1786 lines) while AuctionDiscoveryNetwork
                is more of a schedule/education hub with no comparable
                vehicle-data integration. (AuctionDiscoveryNetwork was
                later confirmed genuinely orphaned - zero navigation
                callers anywhere - and deleted entirely in a subsequent
                frontend-cleanup pass; this comment is kept as the
                historical reasoning for why 'auctions' was chosen as
                the canonical link, not as a pointer to a file that still
                exists.) */}
            <nav className="hidden lg:flex items-center space-x-2 border-l border-white/15 pl-6 text-xs font-semibold text-slate-200">
              <button
                onClick={() => handleNavSelect('marketplace')}
                className={`px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'marketplace'
                    ? 'bg-amber-400 text-[#17244B] font-bold shadow-2xs'
                    : 'hover:text-amber-400 hover:bg-white/10'
                }`}
              >
                Marketplace
              </button>

              <button
                onClick={() => handleNavSelect('auctions')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'auctions'
                    ? 'bg-amber-400 text-[#17244B] font-bold shadow-2xs'
                    : 'hover:text-amber-400 hover:bg-white/10'
                }`}
              >
                <Gavel className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                <span>Auction</span>
              </button>

              <button
                onClick={() => handleNavSelect('inspections')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'inspections'
                    ? 'bg-amber-400 text-[#17244B] font-bold shadow-2xs'
                    : 'hover:text-amber-400 hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[1.75]" />
                <span>Pre-Purchase Inspection</span>
              </button>

              <button
                onClick={() => handleNavSelect('support')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'support'
                    ? 'bg-amber-400 text-[#17244B] font-bold shadow-2xs'
                    : 'hover:text-amber-400 hover:bg-white/10'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-300 shrink-0 stroke-[1.75]" />
                <span>Support</span>
              </button>
            </nav>
          </div>

          {/* RIGHT SECTION: List Vehicle & Login/Register OR User Profile Dropdown */}
          <div className="flex items-center space-x-3">
            {/* Communication Hub Button */}
            <button
              onClick={() => handleNavSelect('chat')}
              className={`p-2 rounded-xl text-slate-200 hover:text-amber-400 hover:bg-white/10 transition-colors relative ${
                activeNav === 'chat' ? 'bg-amber-400 text-[#17244B]' : ''
              }`}
              title="Unified Communication Hub"
            >
              <MessageSquare className={`w-5 h-5 stroke-[1.75] ${activeNav === 'chat' ? 'text-[#17244B]' : 'text-slate-200'}`} />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-amber-400 text-[#17244B] shadow-2xs">
                3
              </span>
            </button>

            {/* Favorites Icon */}
            <button
              onClick={() => handleNavSelect('saved')}
              className={`p-2 rounded-xl text-slate-200 hover:text-amber-400 hover:bg-white/10 transition-colors relative ${
                activeNav === 'saved' ? 'bg-white/10 text-amber-400' : ''
              }`}
              title="Saved Vehicles"
            >
              <Heart className="w-5 h-5 text-slate-200 stroke-[1.75]" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-[#17244B] shadow-2xs">
                  {savedCount}
                </span>
              )}
            </button>

            {/* List Vehicle Button (Primary CTA) - matches the footer's
                own accent (bg-amber-400 text-[#17244B], confirmed
                directly in App.tsx's footer markup) instead of the
                terracotta (#C85A32) this used before, which was a
                second, competing accent color not used in the footer at
                all. Also better contrast than the old white-on-terracotta -
                navy-on-amber is the same high-contrast pairing the
                footer already uses successfully. */}
            <button
              onClick={() => handleNavSelect('seller-platform')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-500 text-[#17244B] transition-all shadow-2xs active:scale-[0.98] shrink-0"
              id="cta-sell-car"
            >
              <PlusCircle className="w-4 h-4 stroke-[2]" />
              <span>Sell Vehicle</span>
            </button>

            {/* AUTHENTICATED USER DROPDOWN OR LOGIN BUTTON (Secondary CTA: White bg, Navy border) */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-white/10 border border-white/20 transition-all focus:outline-none"
                  id="user-profile-menu-button"
                >
                  <div className="relative">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full object-cover border border-amber-400/40 shadow-2xs"
                    />
                    {hasNotifications && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-white leading-none">{user.name}</span>
                    <span className="text-[10px] text-slate-300 capitalize">{user.role}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Authenticated Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                    {/* User Header Info */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-[#F5F2EB]/60 rounded-t-2xl">
                      <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#1E3063]/30" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#1E3063] text-white font-semibold text-[9px] rounded uppercase">
                          {user.role === 'dealer' ? 'Verified Dealer' : user.role === 'mechanic' ? 'NTSA Mechanic' : user.role === 'admin' ? 'Administrator' : 'Private Seller / Buyer'}
                        </span>
                      </div>
                    </div>

                    {/* Standard Links */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavSelect('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Buyer Command Center</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('seller-dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                      >
                        <Car className="w-4 h-4 text-amber-600 stroke-[1.75]" />
                        <span>Private Seller Dashboard</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('chat')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center justify-between font-bold text-[#1E3063]"
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
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Car className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Sell Vehicle</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('saved')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center justify-between font-medium text-slate-700 hover:text-[#1E3063]"
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
                        onClick={() => handleNavSelect('saved')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Bookmark className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Saved Searches</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Settings className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    {/* ROLE-SPECIFIC OPTIONS */}
                    {user.role === 'dealer' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-[#F5F2EB]/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Dealer Management
                        </div>
                        <button
                          onClick={() => handleNavSelect('dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                        >
                          <Building2 className="w-4 h-4 text-[#1E3063]" />
                          <span>Dealer Dashboard</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('dealers')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                        >
                          <Layers className="w-4 h-4 text-[#1E3063]" />
                          <span>Dealer Inventory</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                        >
                          <BarChart3 className="w-4 h-4 text-[#1E3063]" />
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

                    {user.role === 'bank_officer' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-blue-50/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-900">
                          Bank & Finance Underwriting Portal
                        </div>
                        <button
                          onClick={() => handleNavSelect('financing')}
                          className="w-full text-left px-4 py-1.5 hover:bg-blue-100/70 flex items-center gap-2.5 font-bold text-blue-950"
                        >
                          <Landmark className="w-4 h-4 text-blue-600" />
                          <span>Underwriting Desk</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('financing')}
                          className="w-full text-left px-4 py-1.5 hover:bg-blue-100/70 flex items-center gap-2.5 font-bold text-blue-950"
                        >
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>Applications Intake</span>
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
              <button
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-white hover:bg-[#F5F2EB] text-[#1E3063] border border-[#1E3063] transition-all shadow-2xs"
                id="btn-sign-in-main"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE DRAWER NAVIGATION */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#101935] text-white border-t border-slate-800 px-4 pt-4 pb-8 space-y-4 animate-fade-in max-h-[calc(100vh-80px)] overflow-y-auto">
          
          {/* User Account Banner or Login Prompt */}
          {user ? (
            <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#1E3063]" />
                <div>
                  <p className="font-bold text-xs text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">{user.role}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  setMobileMenuOpen(false);
                }}
                className="p-2 bg-rose-500/20 text-rose-300 rounded-xl font-bold text-xs hover:bg-rose-500 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#1E3063] rounded-2xl border border-slate-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-white">Guest Visitor</p>
                <p className="text-[10px] text-slate-300">Sign in to access Escrow & Saved Vehicles</p>
              </div>
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-1.5 bg-amber-400 text-[#17244B] font-bold rounded-xl text-xs"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Group 1: Public Services - 4 items matching the desktop nav:
              Marketplace, Auction, Pre-Purchase Inspection, Support.
              Escrow and Finance stay contextual-only (VehicleDetailModal),
              matching what was actually requested both times this nav
              was revised - these 4 are the ones asked for as their own
              destinations. */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Public Marketplace
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNavSelect('marketplace')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'marketplace' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Marketplace</span>
              </button>

              <button
                onClick={() => handleNavSelect('auctions')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'auctions' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span>Auction</span>
              </button>

              <button
                onClick={() => handleNavSelect('inspections')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'inspections' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Inspection</span>
              </button>

              <button
                onClick={() => handleNavSelect('support')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'support' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Support</span>
              </button>
            </div>
          </div>

          {/* Group 2: Authenticated Account & Role Links */}
          {user && (
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                Account & Dashboards
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavSelect('dashboard')}
                  className="p-2.5 bg-slate-800/80 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => handleNavSelect('chat')}
                  className="p-2.5 bg-slate-800/80 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>Messages</span>
                  </div>
                  {effectiveUnread > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold">
                      {effectiveUnread}
                    </span>
                  )}
                </button>
              </div>

              {/* Role Specific Mobile Links */}
              {user.role === 'dealer' && (
                <div className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Dealer Tools</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleNavSelect('dashboard')} className="text-xs font-bold text-slate-200 flex items-center gap-1.5 py-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Dashboard
                    </button>
                    <button onClick={() => handleNavSelect('dealers')} className="text-xs font-bold text-slate-200 flex items-center gap-1.5 py-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Inventory
                    </button>
                  </div>
                </div>
              )}

              {user.role === 'mechanic' && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase block">Mechanic Tools</span>
                  <button onClick={() => handleNavSelect('inspections')} className="text-xs font-bold text-emerald-200 flex items-center gap-1.5 py-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Inspections Portal
                  </button>
                </div>
              )}

              {user.role === 'admin' && (
                <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-bold text-slate-300 uppercase block">Administrator</span>
                  <button onClick={() => handleNavSelect('admin')} className="text-xs font-bold text-slate-200 flex items-center gap-1.5 py-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Admin Console
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Region Selector Mobile */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1 text-slate-400 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" /> Region: <strong className="text-white">{selectedCounty}</strong>
            </span>
            <button
              onClick={() => {
                onOpenAlerts();
                setMobileMenuOpen(false);
              }}
              className="text-slate-300 font-bold flex items-center gap-1"
            >
              <Bell className="w-3.5 h-3.5" /> Price Alerts
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
