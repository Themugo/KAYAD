import { useState, useRef, useEffect } from 'react';
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
  { key: 'gallery', label: 'Browse', path: '/gallery', icon: Images },
  { key: 'auction', label: 'Auctions', path: '/auction', icon: Gavel },
  { key: 'escrow', label: 'Escrow', path: '/escrow', icon: Shield },
];

const AUTH_NAV_ITEMS = [
  { key: 'chat', label: 'Messages', path: '/chat', icon: MessageCircle },
  { key: 'favorites', label: 'Watchlist', path: '/favorites', icon: Heart },
];

const NS = {
  navBar: {
    backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
    color: 'var(--c-navbar-text, #ffffff)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  logo: { color: 'var(--c-navbar-accent, #e94560)' },
  iconBtn: { color: 'var(--c-navbar-text, #ffffff)' },
  sellBtn: {
    backgroundColor: 'var(--c-navbar-accent, #e94560)',
    color: '#ffffff',
  },
  avatarCircle: {
    backgroundColor: 'var(--c-navbar-accent, #e94560)',
    color: '#ffffff',
  },
  dropdown: {
    backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownBorder: { borderColor: 'rgba(255,255,255,0.1)' },
  menuItemText: { color: 'var(--c-navbar-text, #ffffff)' },
  roleBadge: {
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    color: 'var(--c-navbar-accent, #e94560)',
  },
  divider: { borderColor: 'rgba(255,255,255,0.1)' },
  searchPanel: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
  },
  searchIcon: { color: 'var(--c-navbar-text, #ffffff)' },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
    color: 'var(--c-navbar-text, #ffffff)',
  },
  searchClear: { color: 'var(--c-navbar-text, #ffffff)', opacity: 0.5 },
  mobilePanel: {
    backgroundColor: 'var(--c-navbar-bg, #1a1a2e)',
    color: 'var(--c-navbar-text, #ffffff)',
  },
  registerBtn: {
    backgroundColor: 'transparent',
    color: 'var(--c-navbar-text, #ffffff)',
    border: '1.5px solid rgba(255,255,255,0.25)',
  },
  mobileSignOut: { color: 'var(--c-navbar-accent, #e94560)' },
};

const getNavItemStyle = (isActive: boolean): React.CSSProperties => ({
  color: isActive
    ? 'var(--c-navbar-accent, #e94560)'
    : 'var(--c-navbar-text, #ffffff)',
  backgroundColor: isActive
    ? 'rgba(233, 69, 96, 0.1)'
    : 'transparent',
});

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
      navigate(`/gallery?q=${encodeURIComponent(searchQuery.trim())}`);
      setPage('gallery');
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
        style={NS.navBar}
      >
        <div
          className={`mx-auto flex w-full max-w-7xl px-4 py-3 ${innerClass}`}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleNav('/', 'home')}
              className="flex items-center gap-2 text-lg font-bold tracking-tight cursor-pointer bg-transparent border-none"
              style={NS.logo}
            >
              <span className="text-[#16C4A4]">KAYAD</span>
            </button>
            <span className="hidden md:block text-[10px] text-white/40 uppercase tracking-widest">Motors</span>
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
                  style={getNavItemStyle(currentPage === item.key)}
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
                    style={getNavItemStyle(currentPage === item.key)}
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
                  style={getNavItemStyle(currentPage === item.key)}
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
                    style={getNavItemStyle(currentPage === item.key)}
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
              style={NS.iconBtn}
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
                    style={NS.iconBtn}
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                  </button>

                  {/* Sell button */}
                  <button
                    onClick={() => handleNav('/dealer/add-car', 'sell')}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                    style={NS.sellBtn}
                  >
                    Sell a Vehicle
                  </button>

                  {/* User menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 px-2 py-1 rounded-full cursor-pointer bg-transparent border-none"
                      style={NS.iconBtn}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={NS.avatarCircle}
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
                        style={NS.dropdown}
                      >
                        <div
                          className="px-4 py-3 border-b"
                          style={NS.dropdownBorder}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={NS.menuItemText}
                          >
                            {authUser.name}
                          </p>
                          <p
                            className="text-xs opacity-60"
                            style={NS.menuItemText}
                          >
                            {authUser.email}
                          </p>
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={NS.roleBadge}
                          >
                            {ROLE_LABEL[authUser.role] || authUser.role}
                          </span>
                        </div>
                        <div className="py-1">
                          <button
                  onClick={() => {
                    const dashPath = authUser.role === 'admin' ? '/admin' : authUser.role === 'dealer' ? '/dealer' : '/dashboard';
                    handleNav(dashPath, 'dashboard');
                  }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                            style={NS.menuItemText}
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
                              style={NS.menuItemText}
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
                              style={NS.menuItemText}
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
                              style={NS.menuItemText}
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
                          style={NS.divider}
                        >
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onSignOut();
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                            style={NS.menuItemText}
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
                <>
                  <button
                    onClick={() => handleNav('/register', 'register')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
                    style={NS.registerBtn}
                  >
                    Register
                  </button>
                  <button
                    onClick={() => handleNav('/login', 'login')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                    style={NS.sellBtn}
                  >
                    <LogIn size={16} />
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-full transition-colors cursor-pointer bg-transparent border-none"
              style={NS.iconBtn}
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
            style={NS.searchPanel}
          >
            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto max-w-7xl px-4 py-3"
            >
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                  style={NS.searchIcon}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for cars, makes, models..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-full text-sm border outline-none font-sans"
                  style={NS.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none p-0"
                    style={NS.searchClear}
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
            style={NS.mobilePanel}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b" style={NS.divider}>
              <span
                className="text-lg font-bold tracking-tight"
                style={NS.logo}
              >
                KAYAD
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-full cursor-pointer bg-transparent border-none"
                style={NS.iconBtn}
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
                  style={NS.searchIcon}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cars..."
                  className="w-full pl-9 pr-4 py-2 rounded-full text-sm border outline-none font-sans"
                  style={NS.searchInput}
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
                    style={getNavItemStyle(currentPage === item.key)}
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
                      style={getNavItemStyle(currentPage === item.key)}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
            </div>

            <div className="border-t my-2" style={NS.divider} />

            {/* Mobile user section */}
            {authUser && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={NS.sellBtn}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={NS.menuItemText}>
                      {authUser.name}
                    </p>
                    <p className="text-xs opacity-60 truncate" style={NS.menuItemText}>
                      {authUser.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => handleNav('/dashboard', 'dashboard')}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                    style={NS.menuItemText}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </button>
                  {authUser.role === 'admin' && (
                    <button
                      onClick={() => handleNav('/theme-studio', 'theme-studio')}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                      style={NS.menuItemText}
                    >
                      <Palette size={16} />
                      Theme Studio
                    </button>
                  )}
                  {authUser.role === 'admin' && (
                    <button
                      onClick={() => handleNav('/admin', 'admin')}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                      style={NS.menuItemText}
                    >
                      <Shield size={16} />
                      Admin Panel
                    </button>
                  )}
                  {(authUser.role === 'dealer' || authUser.role === 'admin') && (
                    <button
                      onClick={() => handleNav('/dealer-verify', 'dealer-verify')}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                      style={NS.menuItemText}
                    >
                      <ClipboardCheck size={16} />
                      Dealer Verification
                    </button>
                  )}
                </div>

                <div className="border-t mt-2 pt-2" style={NS.divider}>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onSignOut();
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer bg-transparent border-none text-left"
                    style={NS.mobileSignOut}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {!authUser && (
              <div className="px-4 py-3 space-y-2">
                <button
                  onClick={() => handleNav('/login', 'login')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                  style={NS.sellBtn}
                >
                  <LogIn size={16} />
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('/register', 'register')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
                  style={NS.registerBtn}
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile sell button */}
            {authUser && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleNav('/dealer/add-car', 'sell')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-none"
                  style={NS.sellBtn}
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
