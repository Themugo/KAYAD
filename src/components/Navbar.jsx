import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notifAPI } from '../api/api';
import { initials, timeAgo } from '../utils/helpers';

// ─── PACKAGES MEGA-DATA ───────────────────────────────────────
const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    period: '30-day trial',
    listings: '3 listings',
    color: '#22c55e',
    highlight: false,
    badge: 'Start Free',
    perks: ['3 listings for 30 days free', 'Then KES 2,500/mo for 10 listings', 'Standard gallery position', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'KES 6,500',
    period: '/month',
    listings: '30 listings',
    color: '#3b82f6',
    highlight: false,
    perks: ['30 active listings', 'Priority search ranking', 'Chat support'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 'KES 14,000',
    period: '/month',
    listings: '100 listings',
    color: 'var(--gold)',
    highlight: true,
    badge: 'Most Popular',
    perks: ['100 active listings', 'Homepage featured slots', 'Priority search', 'Dedicated account manager'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    listings: 'Unlimited',
    color: '#a855f7',
    highlight: false,
    perks: ['Unlimited listings', 'All Elite perks', 'API access', 'White-label options', 'SLA guarantee'],
  },
];

export default function Navbar() {
  const { user, isAuth, isAdmin, isDealer, isSuperAdmin, logout } = useAuth();
  const socketCtx  = useSocket();
  const connected  = socketCtx?.connected;
  const on         = socketCtx?.on;
  const loc      = useLocation();
  const navigate = useNavigate();

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [userDrop,    setUserDrop]    = useState(false);
  const [notifDrop,   setNotifDrop]   = useState(false);
  const [pkgDrop,     setPkgDrop]     = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [scrolled,    setScrolled]    = useState(false);

  const dropRef  = useRef(null);
  const pkgRef   = useRef(null);

  useEffect(() => { setMobileOpen(false); setUserDrop(false); setNotifDrop(false); setPkgDrop(false); }, [loc.pathname]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) { setUserDrop(false); setNotifDrop(false); }
      if (pkgRef.current && !pkgRef.current.contains(e.target)) setPkgDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    notifAPI.list({ limit: 8 }).then(d => {
      const list = d.notifications || [];
      setNotifs(list);
      setUnread(list.filter(n => !n.read).length);
    }).catch(() => {});
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth || !on) return;
    const off = on('notification', (n) => { setNotifs(p => [n, ...p.slice(0, 7)]); setUnread(c => c + 1); });
    return off;
  }, [isAuth, on]);

  const markAllRead = async () => {
    await notifAPI.markAllRead().catch(() => {});
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const isActive = (path) => {
    if (path === '/') return loc.pathname === '/';
    return loc.pathname === path || loc.pathname.startsWith(path + '/');
  };

  // Nav link style factory
  const navLink = (active) => ({
    padding: '10px 18px', borderRadius: 10,
    fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
    textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  });

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          NAVBAR — 100px tall, scroll-aware glass
          ══════════════════════════════════════════════════════════ */}
      <nav aria-label="Main navigation" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 100,
        display: 'flex', alignItems: 'center',
        background: scrolled ? 'rgba(3,3,3,0.97)' : 'linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 100%)',
        backdropFilter: 'blur(32px)',
        borderBottom: scrolled ? '1px solid rgba(212,168,67,0.1)' : '1px solid transparent',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* ── LOGO ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, textDecoration: 'none', marginRight: 'auto' }} aria-label="Kayad home">
            <div style={{
              width: 58, height: 58, borderRadius: 16,
              background: 'linear-gradient(135deg, #B8860B 0%, #F0CC6A 40%, #C8960C 70%, #A37800 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(212,168,67,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
              flexShrink: 0, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)', borderRadius: '16px 16px 0 0' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: '#000', lineHeight: 1, fontStyle: 'italic', zIndex: 1 }}>K</span>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.85rem', lineHeight: 0.95, color: '#fff', letterSpacing: '0.03em', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
                KAYAD
              </div>
              <div style={{ fontSize: 9, color: 'rgba(212,168,67,0.75)', letterSpacing: '0.26em', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>
                Premium · Est. 2024
              </div>
            </div>
          </Link>

          {/* ── DESKTOP NAV ── */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Gallery */}
            <Link to="/showroom" style={navLink(isActive('/showroom'))}
              onMouseEnter={e => { if (!isActive('/showroom')) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}}
              onMouseLeave={e => { if (!isActive('/showroom')) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent'; }}}
            >Gallery</Link>

            {/* Live Auctions */}
            <Link to="/showroom?filter=auction" style={navLink(false)}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                Live Auctions
              </span>
            </Link>

            {/* Dealer Packages dropdown */}
            <div ref={pkgRef} style={{ position: 'relative' }}>
              <button onClick={() => setPkgDrop(p => !p)} style={{
                ...navLink(false),
                border: pkgDrop ? '1px solid rgba(212,168,67,0.25)' : '1px solid transparent',
                background: pkgDrop ? 'rgba(212,168,67,0.07)' : 'transparent',
                color: pkgDrop ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
                onMouseEnter={e => { if (!pkgDrop) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}}
                onMouseLeave={e => { if (!pkgDrop) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent'; }}}
              >
                For Dealers
                <span style={{ fontSize: 8, color: 'currentColor', opacity: 0.6 }}>{pkgDrop ? '▲' : '▼'}</span>
              </button>

              {/* PACKAGE MEGA-DROPDOWN */}
              {pkgDrop && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 14px)', left: '50%', transform: 'translateX(-50%)',
                  width: 760, background: '#0D0D0D',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.9)', zIndex: 300, overflow: 'hidden',
                }}>
                  {/* header */}
                  <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.2rem', color: '#fff' }}>Dealer Listing Packages</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>No per-listing fees — choose a plan, list freely within your limit.</div>
                    </div>
                    <Link to="/register?role=dealer" onClick={() => setPkgDrop(false)} style={{ padding: '9px 20px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 11, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      Become a Dealer →
                    </Link>
                  </div>

                  {/* package cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
                    {PACKAGES.map((pkg, i) => (
                      <div key={pkg.id} style={{
                        padding: '20px 20px 22px',
                        borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        background: pkg.highlight ? 'rgba(212,168,67,0.04)' : 'transparent',
                        position: 'relative',
                      }}>
                        {pkg.badge && (
                          <div style={{ position: 'absolute', top: 14, right: 14, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{pkg.badge}</div>
                        )}
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: pkg.color, marginBottom: 8 }}>{pkg.name}</div>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.5rem', color: '#fff' }}>{pkg.price}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 3 }}>{pkg.period}</span>
                        </div>
                        <div style={{ fontSize: 11, color: pkg.color, fontWeight: 700, marginBottom: 14 }}>{pkg.listings}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pkg.perks.map((p, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                              <span style={{ color: pkg.color, flexShrink: 0, marginTop: 1, fontSize: 10 }}>✓</span>{p}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* footer note */}
                  <div style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    🎁 Dealers: 30-day free trial (3 listings) · Private sellers: 1st vehicle always free · No escrow for verified dealers
                  </div>
                </div>
              )}
            </div>

            {/* Dealer Hub (authenticated dealers only) */}
            {(isDealer || user?.role === 'broker' || user?.role === 'individual_seller') && (
              <Link to="/dealer" style={navLink(isActive('/dealer'))}
                onMouseEnter={e => { if (!isActive('/dealer')) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}}
                onMouseLeave={e => { if (!isActive('/dealer')) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent'; }}}
              >Dealer Hub</Link>
            )}

            {/* Admin */}
            {isAdmin && (
              <Link to="/admin" style={navLink(isActive('/admin'))}
                onMouseEnter={e => { if (!isActive('/admin')) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}}
                onMouseLeave={e => { if (!isActive('/admin')) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent'; }}}
              >Admin</Link>
            )}
          </div>

          {/* ── RIGHT SIDE ── */}
          <div ref={dropRef} style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 24, flexShrink: 0 }}>

            {/* Live indicator */}
            {connected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9999, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'block', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, color: 'rgba(34,197,94,0.85)', fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
              </div>
            )}

            {isAuth ? (
              <>
                {/* Notifications */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setNotifDrop(p => !p); setUserDrop(false); }} aria-label="Notifications"
                    style={{ width: 44, height: 44, borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                  >🔔
                    {unread > 0 && (
                      <span style={{ position: 'absolute', top: 4, right: 4, width: 17, height: 17, borderRadius: '50%', background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #050505' }}>{unread > 9 ? '9+' : unread}</span>
                    )}
                  </button>

                  {notifDrop && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 340, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, boxShadow: '0 28px 70px rgba(0,0,0,0.85)', overflow: 'hidden', zIndex: 200 }}>
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Notifications</span>
                        {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
                      </div>
                      {notifs.length === 0 ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No notifications yet</div>
                      ) : notifs.map((n, i) => (
                        <div key={i} style={{ padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.read ? 'transparent' : 'rgba(212,168,67,0.03)' }}>
                          <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13, color: n.read ? 'rgba(255,255,255,0.55)' : '#fff' }}>{n.title || n.message}</div>
                          {n.message && n.title && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{n.message}</div>}
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 5 }}>{timeAgo(n.createdAt)}</div>
                        </div>
                      ))}
                      <Link to="/profile" style={{ display: 'block', padding: '13px 20px', textAlign: 'center', fontSize: 13, color: 'var(--gold)', borderTop: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setUserDrop(p => !p); setNotifDrop(false); }}
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
                    <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 230, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, boxShadow: '0 28px 70px rgba(0,0,0,0.85)', overflow: 'hidden', zIndex: 200 }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{user?.email}</div>
                        <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6, opacity: 0.85 }}>{user?.role}</div>
                      </div>
                      {[
                        { to: '/profile',   label: '👤  Profile' },
                        { to: '/dashboard', label: '📊  Dashboard' },
                        { to: '/favorites', label: '❤️  Saved Cars' },
                        ...(isDealer ? [{ to: '/dealer', label: '🏪  Dealer Hub' }] : []),
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
                <Link to="/register" style={{ padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 800, color: '#000', background: 'var(--gold)', textDecoration: 'none', transition: 'all 0.2s', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(212,168,67,0.28)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,168,67,0.42)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,168,67,0.28)'; }}
                >Join Free</Link>
              </div>
            )}

            {/* Hamburger */}
            <button className={`hamburger ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" style={{ marginLeft: 4 }}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          MOBILE MENU
          ══════════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div className="mobile-menu" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', fontStyle: 'italic', color: '#fff', letterSpacing: '0.03em' }}>KAYAD</div>
              <div style={{ fontSize: 10, color: 'rgba(212,168,67,0.7)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>Premium Marketplace</div>
            </div>
            <div style={{ padding: '14px 10px' }}>
              {[
                { to: '/',                        label: 'Home' },
                { to: '/showroom',                label: 'The Gallery' },
                { to: '/showroom?filter=auction', label: '🔴  Live Auctions' },
                { to: '/register?role=dealer',    label: '📦  Dealer Packages' },
                ...(isAuth ? [
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/profile',   label: 'Profile' },
                  { to: '/favorites', label: 'Saved Cars' },
                ] : [
                  { to: '/login',    label: 'Sign In' },
                  { to: '/register', label: 'Join Free' },
                ]),
                ...(isDealer ? [{ to: '/dealer', label: '🏪  Dealer Hub' }] : []),
                ...(isAdmin  ? [{ to: '/admin',  label: '⚙️  Admin Panel' }] : []),
              ].map(({ to, label }) => (
                <Link key={to} to={to} className={`mobile-nav-link${isActive(to.split('?')[0]) ? ' active' : ''}`} onClick={() => setMobileOpen(false)} style={{ fontSize: 15 }}>{label}</Link>
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
