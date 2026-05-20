import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from './NotificationCenter';
import { initials } from '../utils/helpers';
import { isSellerRole } from '../utils/authRoutes';

export default function Navbar({ branding }) {
  const { user, isAuth, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const socketCtx  = useSocket();
  const connected  = socketCtx?.connected;
  const loc      = useLocation();
  const navigate = useNavigate();

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [userDrop,    setUserDrop]    = useState(false);
  const [notifDrop,   setNotifDrop]   = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQ,     setSearchQ]     = useState('');

  const dropRef  = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => { setMobileOpen(false); setUserDrop(false); setNotifDrop(false); setSearchOpen(false); }, [loc.pathname]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) { setUserDrop(false); setNotifDrop(false); }
      if (searchRef.current && !searchRef.current.contains(e.target) && searchOpen) setSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/showroom?search=${encodeURIComponent(searchQ.trim())}`);
      setSearchOpen(false);
      setSearchQ('');
    }
  };

  const isActive = (path) => {
    if (path === '/') return loc.pathname === '/';
    return loc.pathname === path || loc.pathname.startsWith(path + '/');
  };

  const navLinkStyle = (active) => ({
    position: 'relative',
    padding: '8px 4px',
    fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    textDecoration: 'none', transition: 'color 0.25s',
    letterSpacing: '-0.01em',
    background: 'none',
  });

  const navLinkAfter = (active) => ({
    content: '""',
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2,
    borderRadius: 1,
    background: 'linear-gradient(90deg, rgba(212,196,168,0.2), var(--gold), rgba(212,196,168,0.2))',
    transform: active ? 'scaleX(1)' : 'scaleX(0)',
    transformOrigin: active ? 'left' : 'right',
    transition: 'transform 0.35s cubic-bezier(0.2,0,0,1), opacity 0.35s ease',
    opacity: active ? 1 : 0,
  });

  return (
    <>
      <nav aria-label="Main navigation" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 100,
        display: 'flex', alignItems: 'center',
        background: scrolled
          ? 'rgba(3,3,3,0.92)'
          : 'linear-gradient(180deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.10) 100%)',
        backdropFilter: scrolled ? 'blur(48px) saturate(1.3)' : 'blur(24px)',
        WebkitBackdropFilter: scrolled ? 'blur(48px) saturate(1.3)' : 'blur(24px)',
        borderBottom: scrolled ? '1px solid rgba(212,196,168,0.10)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 40px rgba(0,0,0,0.3)' : 'none',
        transition: 'background 0.5s ease, border-color 0.5s ease, backdrop-filter 0.5s ease, box-shadow 0.5s ease',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* ── LOGO ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none', transition: 'opacity 0.3s' }} aria-label="Kayad home">
            {branding?.logoType === 'image' && branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.logoText || 'Logo'} decoding="async"
                style={{ height: 44, width: 'auto', objectFit: 'contain', borderRadius: 8 }} />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #A89878 0%, var(--gold) 40%, #C4B498 70%, #8A7A5E 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(212,196,168,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
                flexShrink: 0, position: 'relative', overflow: 'hidden',
                transition: 'transform 0.3s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)', borderRadius: '14px 14px 0 0' }} />
                <span style={{ fontSize: 24, lineHeight: 1, zIndex: 1 }}>🚗</span>
              </div>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.02em' }}>
              {branding?.logoText || 'KAYAD'}
            </span>
          </Link>

          {/* ── SEARCH BAR (compact inline) ── */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 320, position: 'relative', display: 'none' }} className="desktop-search">
            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                type="text" placeholder="Search makes, models..." value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                style={{
                  width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: 13, outline: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </form>
          </div>

          {/* ── DESKTOP NAV ── */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
            <Link to="/showroom" style={navLinkStyle(isActive('/showroom'))}
              onMouseEnter={e => { if (!isActive('/showroom')) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { if (!isActive('/showroom')) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
              Gallery
              <span style={navLinkAfter(isActive('/showroom'))} className="nav-underline" />
            </Link>

            <Link to="/showroom?filter=auction" style={navLinkStyle(false)}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                Live Auctions
              </span>
              <span style={navLinkAfter(false)} className="nav-underline" />
            </Link>

            {isSellerRole(user?.role) && (
              <>
              <Link to="/dealer" style={navLinkStyle(isActive('/dealer'))}
                onMouseEnter={e => { if (!isActive('/dealer')) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (!isActive('/dealer')) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                Dealer Hub
                <span style={navLinkAfter(isActive('/dealer'))} className="nav-underline" />
              </Link>
              {!user?.onboardingComplete && (
                <Link to="/dealer/onboarding" style={{
                  ...navLinkStyle(isActive('/dealer/onboarding')),
                  color: 'var(--gold)', fontSize: 10,
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--gold)'; }}>
                  Setup
                </Link>
              )}
              </>
            )}

            {isAdmin && (
              <Link to="/admin" style={navLinkStyle(isActive('/admin'))}
                onMouseEnter={e => { if (!isActive('/admin')) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (!isActive('/admin')) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                Admin
                <span style={navLinkAfter(isActive('/admin'))} className="nav-underline" />
              </Link>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div ref={dropRef} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {connected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'block', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, color: 'rgba(34,197,94,0.85)', fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
              </div>
            )}

            {/* Quick search toggle (mobile) */}
            <button onClick={() => setSearchOpen(true)} className="mobile-search-toggle"
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </button>

            {isAuth ? (
              <>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setNotifDrop(p => !p); setUserDrop(false); }} aria-label="Notifications"
                    style={{ width: 44, height: 44, borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                  >🔔
                    {unreadCount > 0 && (
                      <span style={{ position: 'absolute', top: 4, right: 4, width: 17, height: 17, borderRadius: '50%', background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #050505' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                  {notifDrop && <NotificationCenter onClose={() => setNotifDrop(false)} />}
                </div>

                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setUserDrop(p => !p); setNotifDrop(false); }} aria-label="User menu"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '8px 14px 8px 8px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--gold), var(--gold-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#000', fontWeight: 900, flexShrink: 0 }}>
                      {initials(user?.name || user?.email)}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{user?.name?.split(' ')[0] || 'Account'}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize', marginTop: 1 }}>{user?.role}</div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 2 }}>▾</span>
                  </button>

                  {userDrop && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 240, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, boxShadow: '0 28px 70px rgba(0,0,0,0.85)', overflow: 'hidden', zIndex: 200 }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{user?.email}</div>
                        <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6, opacity: 0.85 }}>{user?.role}</div>
                      </div>
                      {[
                        { to: '/profile',   label: '👤  Profile' },
                        { to: '/notifications', label: '🔔  Notifications' },
                        { to: '/profile?tab=Security', label: '🔑  Change Password' },
                        { to: '/dashboard', label: '📊  Dashboard' },
                        { to: '/favorites', label: '❤️  Saved Cars' },
                        ...(isSellerRole(user?.role) ? [{ to: '/dealer', label: '🏪  Dealer Hub' }] : []),
                        ...(isAdmin  ? [{ to: '/admin',  label: '⚙️  Admin Panel' }] : []),
                        ...(user?.role === 'superadmin' ? [{ to: '/admin/staff', label: '👑  Staff Hierarchy' }] : []),
                      ].map(({ to, label }) => (
                        <Link key={to} to={to} style={{ display: 'block', padding: '11px 20px', fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                        >{label}</Link>
                      ))}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={handleLogout} style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, color: 'rgba(239,68,68,0.75)', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.75)'; }}
                        >↩ Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <Link to="/login" style={{ padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', textDecoration: 'none', transition: 'all 0.2s', letterSpacing: '-0.01em' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = 'transparent'; }}
                >Sign In</Link>
                <Link to="/register" style={{ padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#000', background: 'var(--gold)', textDecoration: 'none', transition: 'all 0.25s', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(212,196,168,0.28)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,196,168,0.42)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,196,168,0.28)'; }}
                >Join Free</Link>
              </div>
            )}

            <button className={`hamburger ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" style={{ marginLeft: 4 }}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE SEARCH OVERLAY ── */}
      {searchOpen && (
        <div style={{ position: 'fixed', top: 100, left: 0, right: 0, zIndex: 99, padding: '12px 20px', background: 'rgba(3,3,3,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
            <input type="text" placeholder="Search makes, models..." value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus
              style={{ flex: 1, padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(212,196,168,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, outline: 'none' }} />
            <button type="submit" style={{ padding: '14px 24px', borderRadius: 12, background: 'var(--gold)', color: '#000', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: 13 }}>Search</button>
            <button type="button" onClick={() => setSearchOpen(false)} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </form>
        </div>
      )}

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="mobile-menu" onClick={() => setMobileOpen(false)}
          style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}
            style={{ animation: 'slideIn 0.3s ease' }}>
            <div style={{ padding: '28px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {branding?.logoType === 'image' && branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.logoText || 'Logo'} decoding="async"
                  style={{ height: 36, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #A89878 0%, var(--gold) 40%, #C4B498 70%, #8A7A5E 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(212,196,168,0.3)',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: branding?.logoText?.length > 1 ? 18 : 26, color: '#000', lineHeight: 1, fontStyle: 'italic' }}>
                    {branding?.logoText || 'K'}
                  </span>
                </div>
              )}
            </div>
            {/* Mobile search */}
            <div style={{ padding: '12px 16px' }}>
              <form onSubmit={handleSearch}>
                <input type="text" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 15, outline: 'none' }} />
              </form>
            </div>
            <div style={{ padding: '6px 10px' }}>
              {[
                { to: '/',                        label: 'Home' },
                { to: '/showroom',                label: 'The Gallery' },
                { to: '/showroom?filter=auction', label: 'Live Auctions' },
                ...(isAuth ? [
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/notifications', label: 'Notifications' },
                  { to: '/profile',   label: 'Profile' },
                  { to: '/favorites', label: 'Saved Cars' },
                ] : [
                  { to: '/login',    label: 'Sign In' },
                  { to: '/register', label: 'Join Free' },
                ]),
                ...(isSellerRole(user?.role) ? [{ to: '/dealer', label: 'Dealer Hub' }] : []),
                ...(isAdmin  ? [{ to: '/admin',  label: 'Admin Panel' }] : []),
              ].map(({ to, label }, i) => (
                <Link key={to} to={to} className={`mobile-nav-link${isActive(to.split('?')[0]) ? ' active' : ''}`} onClick={() => setMobileOpen(false)}
                  style={{ fontSize: 15, animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>{label}</Link>
              ))}
              {isAuth && (
                <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '15px 18px', margin: '6px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'rgba(239,68,68,0.75)', borderRadius: 10 }}>
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
