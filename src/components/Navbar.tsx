import { useState, useEffect, useRef } from 'react';
import {
  Search, X, Menu, LogIn, LogOut, LayoutDashboard,
  ChevronDown, Home, Images, Gavel, Shield, ClipboardCheck,
  MessageCircle, Tag, Heart, BarChart3, Bell, User,
} from 'lucide-react';

interface AuthUser {
  name: string;
  email: string;
  role: 'private-seller' | 'dealer' | 'admin';
  dealership?: string;
}

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
  authUser: AuthUser | null;
  onSignOut: () => void;
}

const navLinks = [
  { label: 'Home',           page: 'home',           href: '/',          icon: Home },
  { label: 'Gallery',        page: 'gallery',        href: '/gallery',   icon: Images },
  { label: 'Auction',        page: 'auction',        href: '/auction',   icon: Gavel },
  { label: 'Escrow Vault',   page: 'escrow',         href: '/escrow',    icon: Shield },
  { label: 'Pre-Inspection', page: 'pre-inspection', href: '/pre-inspection', icon: ClipboardCheck },
  { label: 'Support',        page: 'support',        href: '/support',   icon: MessageCircle },
];

const ROLE_LABEL: Record<string, string> = {
  'private-seller': 'Private Seller',
  dealer:           'Dealer',
  admin:            'Admin',
};

export default function Navbar({ currentPage, setPage, authUser, onSignOut }: NavbarProps) {
  const [scrolled,     setScrolled]     = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (page: string) => {
    setPage(page);
    setMobileOpen(false);
    setUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSell = () => handleNav(authUser ? 'dashboard' : 'create-account');

  const initials = authUser
    ? authUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-charcoal-900/98 backdrop-blur-md shadow-lg shadow-black/30'
            : 'bg-charcoal-900/85 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 group flex-shrink-0"
            >
              <div className="w-9 h-9 bg-gold-600 rounded-lg flex items-center justify-center group-hover:bg-gold-500 transition-colors duration-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13l2-6h14l2 6" />
                  <path d="M1 17h22" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                  <path d="M5 13v-2" />
                  <path d="M19 13v-2" />
                </svg>
              </div>
              <span className="text-white font-sans font-bold text-lg tracking-[0.15em] uppercase">KAYAD</span>
            </button>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(({ label, page }) => (
                <button
                  key={page}
                  onClick={() => handleNav(page)}
                  className={`nav-link ${currentPage === page ? 'active' : ''}`}
                >
                  {label}
                  {currentPage === page && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Desktop right actions */}
            <div className="hidden md:flex items-center gap-3">
              {searchOpen ? (
                <div className="flex items-center bg-white/10 rounded-full px-4 py-1.5 gap-2 border border-white/20">
                  <Search size={15} className="text-white/60" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search cars..."
                    className="bg-transparent text-white text-sm outline-none placeholder-white/40 w-36"
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                    <X size={14} className="text-white/60 hover:text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="text-white/60 hover:text-white transition-colors p-1.5"
                >
                  <Search size={17} />
                </button>
              )}

              <button
                onClick={handleSell}
                className="text-gold-400 font-sans text-sm font-semibold hover:text-gold-300 transition-colors px-1"
              >
                Sell
              </button>

              {authUser ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full px-2.5 py-1.5 transition-all"
                  >
                    <div className="w-6 h-6 bg-gold-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-sans text-white text-[10px] font-bold">{initials}</span>
                    </div>
                    <span className="font-sans text-white text-xs font-semibold max-w-[5rem] truncate">
                      {authUser.name.split(' ')[0]}
                    </span>
                    <ChevronDown size={12} className={`text-white/50 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-charcoal-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="font-sans text-xs font-bold text-white truncate">{authUser.name}</p>
                        <p className="font-sans text-[10px] text-white/40 truncate">{authUser.email}</p>
                        <span className="inline-block mt-1 bg-gold-400/15 text-gold-400 font-sans text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                          {ROLE_LABEL[authUser.role]}
                        </span>
                      </div>
                      <button
                        onClick={() => handleNav('profile')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 font-sans text-xs font-semibold transition-colors text-left"
                      >
                        <User size={14} /> My Profile
                      </button>
                      <button
                        onClick={() => handleNav('favorites')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 font-sans text-xs font-semibold transition-colors text-left"
                      >
                        <Heart size={14} /> Saved Vehicles
                      </button>
                      <button
                        onClick={() => handleNav('compare')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 font-sans text-xs font-semibold transition-colors text-left"
                      >
                        <BarChart3 size={14} /> Compare
                      </button>
                      <button
                        onClick={() => handleNav('notifications')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 font-sans text-xs font-semibold transition-colors text-left"
                      >
                        <Bell size={14} /> Notifications
                      </button>
                      <div className="border-t border-white/10" />
                      <button
                        onClick={() => handleNav('dashboard')}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 font-sans text-xs font-semibold transition-colors text-left"
                      >
                        <LayoutDashboard size={14} /> Dashboard
                      </button>
                      <button
                        onClick={() => { onSignOut(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-sans text-xs font-semibold transition-colors text-left border-t border-white/10"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleNav('sign-in')}
                  className={`flex items-center gap-2 font-sans text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                    currentPage === 'sign-in'
                      ? 'bg-gold-600 text-white'
                      : 'bg-white text-charcoal-900 hover:bg-cream-100'
                  }`}
                >
                  <LogIn size={14} /> Sign In
                </button>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE FULL-SCREEN OVERLAY ─────────────────────────────── */}
      {/* Backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[70] w-[min(320px,100vw)] bg-charcoal-900 md:hidden flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gold-600 rounded-md flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13l2-6h14l2 6" /><path d="M1 17h22" />
                <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <span className="text-white font-sans font-bold text-base tracking-[0.15em] uppercase">KAYAD</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Auth section (if signed in) */}
        {authUser && (
          <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-sans text-white font-bold text-sm">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-bold text-white truncate">{authUser.name}</p>
                <span className="inline-block bg-gold-400/15 text-gold-400 font-sans text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {ROLE_LABEL[authUser.role]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {navLinks.map(({ label, page, icon: Icon }) => (
              <button
                key={page}
                onClick={() => handleNav(page)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-semibold transition-all text-left ${
                  currentPage === page
                    ? 'bg-gold-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon size={17} className={currentPage === page ? 'text-white' : 'text-white/40'} />
                {label}
              </button>
            ))}

            {authUser && (
              <button
                onClick={() => handleNav('dashboard')}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-semibold transition-all text-left ${
                  currentPage === 'dashboard'
                    ? 'bg-gold-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/8'
                }`}
              >
                <LayoutDashboard size={17} className={currentPage === 'dashboard' ? 'text-white' : 'text-white/40'} />
                Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="px-5 py-5 border-t border-white/10 flex-shrink-0 space-y-3">
          <button
            onClick={handleSell}
            className="w-full flex items-center justify-center gap-2 border border-gold-400/50 text-gold-400 font-sans text-sm font-semibold py-3 rounded-full hover:bg-gold-400/10 transition-colors"
          >
            <Tag size={14} /> Sell a Vehicle
          </button>
          {authUser ? (
            <button
              onClick={() => { onSignOut(); setMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-white/8 text-red-400 font-sans text-sm font-semibold py-3 rounded-full hover:bg-red-500/15 transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          ) : (
            <button
              onClick={() => handleNav('sign-in')}
              className="w-full flex items-center justify-center gap-2 bg-white text-charcoal-900 font-sans text-sm font-semibold py-3 rounded-full hover:bg-cream-100 transition-colors"
            >
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </div>
    </>
  );
}
