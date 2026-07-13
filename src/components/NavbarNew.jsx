import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, Bell, User, Menu, X, LogOut, ChevronDown, Sparkles, Shield, Star, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notifAPI } from '../api/api';
import { initials, timeAgo } from '../utils/helpers';
import { Badge, Avatar, Tooltip } from './ui';

const NAV_LINKS = [
  { label: 'Home',           to: '/' },
  { label: 'Gallery',        to: '/gallery' },
  { label: 'Auctions',       to: '/auctions' },
  { label: 'Escrow Vault',   to: '/escrow' },
  { label: 'Pre-Inspection', to: '/inspection' },
  { label: 'Support',        to: '/support' },
];

function NavItem({ to, label, isActive, onClick }) {
  const active = isActive(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-[var(--accent)] bg-[var(--accent)]/10'
          : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-white/5'
      }`}
    >
      {label}
    </Link>
  );
}

export default function NavbarNew() {
  const { user, isAuth, isAdmin, isDealer, logout } = useAuth();
  const { connected, joinNotifications, leaveChannel } = useSocket();
  const loc = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const [notifDrop, setNotifDrop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false); setUserDrop(false); setNotifDrop(false); setSearchOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setUserDrop(false);
        setNotifDrop(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!isAuth) return;
    notifAPI.list({ limit: 8 }).then(d => {
      const list = d.notifications || [];
      setNotifs(list);
      setUnread(list.filter(n => !n.read).length);
    }).catch(() => {});
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth || !joinNotifications) return;
    const channel = joinNotifications({
      onNotification: (n) => {
        setNotifs(prev => [n, ...prev.slice(0, 7)]);
        setUnread(c => c + 1);
      },
    });
    return () => { if (channel && leaveChannel) leaveChannel(channel); };
  }, [isAuth]);

  const markAllRead = async () => {
    await notifAPI.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isActive = (to) => {
    if (to === '/') return loc.pathname === '/';
    return loc.pathname === to || loc.pathname.startsWith(to + '/');
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[var(--secondary)]/95 backdrop-blur-xl shadow-lg' : 'bg-transparent'
        }`}
        style={{ borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent' }}
        aria-label="Main navigation"
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10" style={{ maxWidth: 1440 }}>
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }} aria-label="KAYAD — Home">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: 'var(--accent)' }}>
                <span className="font-bold text-lg" style={{ color: 'var(--primary)', fontFamily: "'Space Grotesk', sans-serif" }}>K</span>
              </div>
              <span className="font-bold text-2xl tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>KAYAD</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(({ label, to }) => (
                <NavItem key={to} to={to} label={label} isActive={isActive} />
              ))}
            </div>

            {/* Right Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              {/* Favorites (Auth Only) */}
              {isAuth && (
                <Link to="/favorites" className="w-10 h-10 rounded-lg flex items-center justify-center transition-all" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Heart size={18} />
                </Link>
              )}

              {/* Notifications (Auth Only) */}
              {isAuth && (
                <div ref={notifDrop ? dropRef : null} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setNotifDrop(!notifDrop)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-all relative"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {unread > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{ background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18 }}>
                        {unread > 9 ? '9+' : unread}
                      </div>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifDrop && (
                    <div className="absolute top-full right-0 mt-3 w-90 rounded-2xl overflow-hidden" style={{ background: 'var(--secondary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 200, width: 360 }}>
                      <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Notifications</span>
                        {unread > 0 && (
                          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {notifs.length === 0 ? (
                          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No notifications yet</div>
                        ) : (
                          notifs.map(n => (
                            <div key={n._id || n.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'rgba(var(--accent-rgb, 212, 175, 55), 0.06)' }}>
                              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{n.title || n.message}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sell Button */}
              <Link
                to={isAuth ? "/dealer/add-car" : "/register"}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all hover:shadow-lg"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--accent-rgb, 212, 175, 55), 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span className="flex items-center gap-2"><Sparkles size={14} /> Sell</span>
              </Link>

              {/* User Menu / Sign In */}
              {isAuth ? (
                <div ref={userDrop ? dropRef : null} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setUserDrop(!userDrop)}
                    className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border transition-all"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface-raised, var(--surface))'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                  >
                    <Avatar size="sm" variant="gold" initials={initials(user?.name)} />
                    <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  {/* User Dropdown */}
                  {userDrop && (
                    <div className="absolute top-full right-0 mt-3 w-60 rounded-2xl overflow-hidden" style={{ background: 'var(--secondary)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 200, width: 240 }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                      </div>
                      {[
                        { to: '/profile', icon: User, label: 'My Profile' },
                        { to: '/favorites', icon: Heart, label: 'Favorites' },
                        { to: '/escrow', icon: Shield, label: 'Escrow Vault' },
                        ...(isDealer ? [{ to: '/dealer', icon: Star, label: 'Dealer Hub' }] : []),
                        ...(isAdmin ? [{ to: '/admin', icon: Sparkles, label: 'Admin Panel' }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to} className="flex items-center gap-3 px-5 py-3 text-sm transition-all" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          <item.icon size={16} />
                          {item.label}
                        </Link>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
                        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-5 py-3 text-sm transition-all" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="px-5 py-2.5 text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    Sign in
                  </Link>
                  <Link to="/register" className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all" style={{ background: 'var(--accent)', color: 'var(--primary)', textDecoration: 'none' }}>
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--text)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 border-b px-6 lg:px-10 py-4 animate-fade-in" style={{ background: 'var(--secondary)', borderColor: 'var(--border)' }}>
            <div className="max-w-[700px] mx-auto">
              <form onSubmit={handleSearch} className="flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onFocus={() => {}}>
                <Search size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by make, model, year, or location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none text-base"
                  style={{ color: 'var(--text)' }}
                  aria-label="Search vehicles"
                />
                <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: 'var(--accent)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                  Search
                </button>
              </form>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 transition-transform duration-400 lg:hidden ${
        mobileOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ background: 'var(--primary)' }}>
        <div className="flex flex-col h-full pt-24 px-8 pb-8 overflow-y-auto">
          {isAuth ? (
            <div className="flex items-center gap-4 pb-6 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <Avatar size="md" variant="gold" initials={initials(user?.name)} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pb-6 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <Link to="/login" className="flex-1 py-3 text-center text-sm font-medium rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                Sign in
              </Link>
              <Link to="/register" className="flex-1 py-3 text-center text-sm font-semibold rounded-lg" style={{ background: 'var(--accent)', color: 'var(--primary)', textDecoration: 'none' }}>
                Get Started
              </Link>
            </div>
          )}

          <div className="flex-1 space-y-2">
            {NAV_LINKS.map(({ label, to }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`block py-4 text-2xl font-semibold border-b transition-all`}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    borderColor: 'var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {isAuth && (
            <div className="pt-6 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 0' }}>
                Account
              </div>
              {[
                { to: '/profile', label: 'My Profile' },
                { to: '/favorites', label: 'Favorites' },
                { to: '/escrow', label: 'Escrow Vault' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ display: 'block', padding: '12px 0', fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  {label}
                </Link>
              ))}
              {isDealer && (
                <Link to="/dealer" style={{ display: 'block', padding: '12px 0', fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}>
                  Dealer Hub
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full"
                style={{ padding: '12px 0', background: 'none', border: 'none', color: 'var(--danger)', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
