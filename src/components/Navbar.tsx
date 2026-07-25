import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Menu,
  LogIn,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Home,
  Images,
  Gavel,
  Shield,
  ClipboardCheck,
  MessageCircle,
  Tag,
  Palette,
  Bell,
  Heart,
} from 'lucide-react';
import { useDesignTheme } from '../theme/DesignThemeProvider';

const ROLE_LABEL: Record<string, string> = {
  'private-seller': 'Private Seller',
  dealer: 'Dealer',
  admin: 'Admin',
};

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
  authUser: {
    name: string;
    email: string;
    role: 'private-seller' | 'dealer' | 'admin';
    dealership?: string;
  } | null;
  onSignOut: () => void;
}

const NAV_ITEMS = [
  { key: 'home', label: 'Home', path: '/', icon: Home },
  { key: 'listings', label: 'Browse Cars', path: '/listings', icon: Images },
  { key: 'auctions', label: 'Auctions', path: '/auctions', icon: Gavel },
  { key: 'sell', label: 'Sell', path: '/sell', icon: Tag },
];

const AUTH_NAV_ITEMS = [
  { key: 'messages', label: 'Messages', path: '/messages', icon: MessageCircle },
  { key: 'watchlist', label: 'Watchlist', path: '/watchlist', icon: Heart },
];

export default function Navbar({ currentPage, setPage, authUser, onSignOut }: NavbarProps) {
  const { theme } = useDesignTheme();
  const layout = theme.layouts.navbar;
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const handleNav = (path: string, key: string) => {
    navigate(path);
    setPage(key);
    setMobileOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
      setPage('listings');
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const layoutClass =
    layout === 'centered'
      ? 'justify-center'
      : layout === 'compact'
      ? 'justify-between'
      : 'justify-between';

  const innerClass =
    layout === 'centered'
      ? 'flex-row items-center justify-center gap-6'
      : layout === 'compact'
      ? 'flex-row items-center justify-between'
      : 'flex-row items-center justify-between';

  const userInitials = authUser
    ? authUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 font-sans"
        style={{
          backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
          color: 'var(--c-navbar-text, #ffffff)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          className={`mx-auto flex w-full max-w-7xl px-4 py-3 ${innerClass}`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleNav('/', 'home')}
              className="flex items-center gap-1 text-xl font-bold font-sans tracking-tight cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--c-navbar-accent, #e94560)' }}
            >
              KAYAD
            </button>
          </div>

          {/* Center nav links (centered layout) */}
          {layout === 'centered' && (
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.path, item.key)}
                  className={`nav-link px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer bg-transparent border-none ${
                    currentPage === item.key
                      ? 'nav-link active'
                      : ''
                  }`}
                  style={{
                    color:
                      currentPage === item.key
                        ? 'var(--c-navbar-accent, #e94560)'
                        : 'var(--c-navbar-text, #ffffff)',
                    backgroundColor:
                      currentPage === item.key
                        ? 'rgba(233, 69, 96, 0.1)'
                        : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
              {authUser &&
                AUTH_NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.path, item.key)}
                    className={`nav-link px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer bg-transparent border-none ${
                      currentPage === item.key ? 'nav-link active' : ''
                    }`}
                    style={{
                      color:
                        currentPage === item.key
                          ? 'var(--c-navbar-accent, #e94560)'
                          : 'var(--c-navbar-text, #ffffff)',
                      backgroundColor:
                        currentPage === item.key
                          ? 'rgba(233, 69, 96, 0.1)'
                          : 'transparent',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          )}

          {/* Split / compact nav links */}
          {layout !== 'centered' && (
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.path, item.key)}
                  className={`nav-link px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer bg-transparent border-none ${
                    currentPage === item.key ? 'nav-link active' : ''
                  }`}
                  style={{
                    color:
                      currentPage === item.key
                        ? 'var(--c-navbar-accent, #e94560)'
                        : 'var(--c-navbar-text, #ffffff)',
                    backgroundColor:
                      currentPage === item.key
                        ? 'rgba(233, 69, 96, 0.1)'
                        : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
              {authUser &&
                AUTH_NAV_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.path, item.key)}
                    className={`nav-link px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer bg-transparent border-none ${
                      currentPage === item.key ? 'nav-link active' : ''
                    }`}
                    style={{
                      color:
                        currentPage === item.key
                          ? 'var(--c-navbar-accent, #e94560)'
                          : 'var(--c-navbar-text, #ffffff)',
                      backgroundColor:
                        currentPage === item.key
                          ? 'rgba(233, 69, 96, 0.1)'
                          : 'transparent',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="relative p-2 rounded-full transition-colors cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--c-navbar-text, #ffffff)' }}
              aria-label="Toggle search"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* Desktop right actions */}
            <div className="hidden md:flex items-center gap-2">
              {authUser && (
                <>
                  {/* Notifications bell */}
                  <button
                    className="relative p-2 rounded-full transition-colors cursor-pointer bg-transparent border-none"
                    style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                  </button>

                  {/* Sell button */}
                  <button
                    onClick={() => handleNav('/sell', 'sell')}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                    style={{
                      backgroundColor: 'var(--c-navbar-accent, #e94560)',
                      color: '#ffffff',
                    }}
                  >
                    Sell a Vehicle
                  </button>

                  {/* User menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 px-2 py-1 rounded-full cursor-pointer bg-transparent border-none"
                      style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--c-navbar-accent, #e94560)',
                          color: '#ffffff',
                        }}
                      >
                        {userInitials}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {userMenuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border overflow-hidden font-sans"
                        style={{
                          backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
                          borderColor: 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <div
                          className="px-4 py-3 border-b"
                          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                          >
                            {authUser.name}
                          </p>
                          <p
                            className="text-xs opacity-60"
                            style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                          >
                            {authUser.email}
                          </p>
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: 'rgba(233, 69, 96, 0.15)',
                              color: 'var(--c-navbar-accent, #e94560)',
                            }}
                          >
                            {ROLE_LABEL[authUser.role] || authUser.role}
                          </span>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleNav('/dashboard', 'dashboard');
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                            style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                'rgba(255,255,255,0.05)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = 'transparent')
                            }
                          >
                            <LayoutDashboard size={16} />
                            Dashboard
                          </button>
                          {authUser.role === 'admin' && (
                            <button
                              onClick={() => {
                                handleNav('/theme-studio', 'theme-studio');
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                              style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  'rgba(255,255,255,0.05)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = 'transparent')
                              }
                            >
                              <Palette size={16} />
                              Theme Studio
                            </button>
                          )}
                          {authUser.role === 'admin' && (
                            <button
                              onClick={() => {
                                handleNav('/admin', 'admin');
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                              style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  'rgba(255,255,255,0.05)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = 'transparent')
                              }
                            >
                              <Shield size={16} />
                              Admin Panel
                            </button>
                          )}
                          {(authUser.role === 'dealer' || authUser.role === 'admin') && (
                            <button
                              onClick={() => {
                                handleNav('/dealer-verify', 'dealer-verify');
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                              style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  'rgba(255,255,255,0.05)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = 'transparent')
                              }
                            >
                              <ClipboardCheck size={16} />
                              Dealer Verification
                            </button>
                          )}
                        </div>
                        <div
                          className="border-t py-1"
                          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onSignOut();
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                            style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                'rgba(233, 69, 96, 0.1)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = 'transparent')
                            }
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!authUser && (
                <button
                  onClick={() => handleNav('/auth', 'auth')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                  style={{
                    backgroundColor: 'var(--c-navbar-accent, #e94560)',
                    color: '#ffffff',
                  }}
                >
                  <LogIn size={16} />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-full transition-colors cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--c-navbar-text, #ffffff)' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Expandable search bar */}
        {searchOpen && (
          <div
            className="border-t"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
            }}
          >
            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto max-w-7xl px-4 py-3"
            >
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                  style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for cars, makes, models..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-full text-sm border outline-none font-sans"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: 'var(--c-navbar-text, #ffffff)',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none p-0"
                    style={{ color: 'var(--c-navbar-text, #ffffff)', opacity: 0.5 }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </nav>

      {/* Mobile slide-in menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-in panel */}
          <div
            ref={mobileMenuRef}
            className="absolute right-0 top-0 bottom-0 w-72 shadow-2xl overflow-y-auto font-sans"
            style={{
              backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
              color: 'var(--c-navbar-text, #ffffff)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--c-navbar-accent, #e94560)' }}
              >
                KAYAD
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-full cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--c-navbar-text, #ffffff)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile search */}
            <form onSubmit={handleSearchSubmit} className="px-4 py-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                  style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cars..."
                  className="w-full pl-9 pr-4 py-2 rounded-full text-sm border outline-none font-sans"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: 'var(--c-navbar-text, #ffffff)',
                  }}
                />
              </div>
            </form>

            {/* Mobile nav links */}
            <div className="px-2 py-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.path, item.key)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-transparent border-none text-left ${
                      currentPage === item.key ? 'nav-link active' : ''
                    }`}
                    style={{
                      color:
                        currentPage === item.key
                          ? 'var(--c-navbar-accent, #e94560)'
                          : 'var(--c-navbar-text, #ffffff)',
                      backgroundColor:
                        currentPage === item.key
                          ? 'rgba(233, 69, 96, 0.1)'
                          : 'transparent',
                    }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
              {authUser &&
                AUTH_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNav(item.path, item.key)}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-transparent border-none text-left ${
                        currentPage === item.key ? 'nav-link active' : ''
                      }`}
                      style={{
                        color:
                          currentPage === item.key
                            ? 'var(--c-navbar-accent, #e94560)'
                            : 'var(--c-navbar-text, #ffffff)',
                        backgroundColor:
                          currentPage === item.key
                            ? 'rgba(233, 69, 96, 0.1)'
                            : 'transparent',
                      }}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
            </div>

            <div className="border-t my-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Mobile user section */}
            {authUser && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      backgroundColor: 'var(--c-navbar-accent, #e94560)',
                      color: '#ffffff',
                    }}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-navbar-text, #ffffff)' }}>
                      {authUser.name}
                    </p>
                    <p className="text-xs opacity-60 truncate" style={{ color: 'var(--c-navbar-text, #ffffff)' }}>
                      {authUser.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => handleNav('/dashboard', 'dashboard')}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                    style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </button>
                  {authUser.role === 'admin' && (
                    <button
                      onClick={() => handleNav('/theme-studio', 'theme-studio')}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                      style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                    >
                      <Palette size={16} />
                      Theme Studio
                    </button>
                  )}
                  {authUser.role === 'admin' && (
                    <button
                      onClick={() => handleNav('/admin', 'admin')}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                      style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                    >
                      <Shield size={16} />
                      Admin Panel
                    </button>
                  )}
                  {(authUser.role === 'dealer' || authUser.role === 'admin') && (
                    <button
                      onClick={() => handleNav('/dealer-verify', 'dealer-verify')}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                      style={{ color: 'var(--c-navbar-text, #ffffff)' }}
                    >
                      <ClipboardCheck size={16} />
                      Dealer Verification
                    </button>
                  )}
                </div>

                <div className="border-t mt-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onSignOut();
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                    style={{ color: 'var(--c-navbar-accent, #e94560)' }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {!authUser && (
              <div className="px-4 py-3">
                <button
                  onClick={() => handleNav('/auth', 'auth')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                  style={{
                    backgroundColor: 'var(--c-navbar-accent, #e94560)',
                    color: '#ffffff',
                  }}
                >
                  <LogIn size={16} />
                  Sign In
                </button>
              </div>
            )}

            {/* Mobile sell button */}
            {authUser && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleNav('/sell', 'sell')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                  style={{
                    backgroundColor: 'var(--c-navbar-accent, #e94560)',
                    color: '#ffffff',
                  }}
                >
                  <Tag size={16} />
                  Sell a Vehicle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
