// src/components/Navbar.jsx — Premium Navigation with Mega Menu
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notifAPI } from '../api/api';
import { initials, timeAgo } from '../utils/helpers';
import { Badge, Avatar, Tooltip } from './ui';

const NAV_LINKS = [
  { label: 'Home',           to: '/' },
  { label: 'Gallery',        to: '/browse' },
  { label: 'Auctions',       to: '/auctions' },
  { label: 'Escrow Vault',   to: '/escrow' },
  { label: 'Pre-Inspection', to: '/inspection' },
  { label: 'Support',        to: '/support' },
];

const MEGA_MENU_SECTIONS = [
  {
    title: 'Browse by Type',
    links: [
      { label: 'SUVs & Crossovers', to: '/browse?bodyType=SUV', icon: '🚙' },
      { label: 'Sedans',            to: '/browse?bodyType=Sedan', icon: '🚗' },
      { label: 'Pickups & Trucks',  to: '/browse?bodyType=Pickup', icon: '🛻' },
      { label: 'Coupes',             to: '/browse?bodyType=Coupe', icon: '🏎️' },
    ],
  },
  {
    title: 'Browse by Brand',
    links: [
      { label: 'Toyota',       to: '/browse?brand=Toyota', icon: '🚗' },
      { label: 'Mercedes-Benz', to: '/browse?brand=Mercedes', icon: '🚙' },
      { label: 'BMW',          to: '/browse?brand=BMW', icon: '🏎️' },
      { label: 'Land Rover',   to: '/browse?brand=Land Rover', icon: '🛻' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Live Auctions',     to: '/auctions', icon: '🔴' },
      { label: 'Escrow Protection', to: '/escrow', icon: '🔒' },
      { label: 'Pre-Inspection',   to: '/inspection', icon: '🔍' },
      { label: 'Financing',         to: '/support', icon: '💳' },
    ],
  },
];

export default function Navbar() {
  const { user, isAuth, isAdmin, isDealer, logout } = useAuth();
  const { connected, joinNotifications, leaveChannel } = useSocket();
  const loc = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const [notifDrop, setNotifDrop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const megaRef = useRef(null);
  const dropRef = useRef(null);
  const megaTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false); setUserDrop(false); setNotifDrop(false); setMegaOpen(false); setSearchOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const h = (e) => {
      if (megaRef.current && !megaRef.current.contains(e.target)) setMegaOpen(false);
      if (dropRef.current && !dropRef.current.contains(e.target)) { setUserDrop(false); setNotifDrop(false); }
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

  const openMega = useCallback(() => {
    clearTimeout(megaTimer.current);
    setMegaOpen(true);
  }, []);

  const closeMega = useCallback(() => {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 200);
  }, []);

  const isActive = (to) => {
    if (to === '/') return loc.pathname === '/';
    return loc.pathname === to || loc.pathname.startsWith(to + '/');
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          height: 68,
          background: scrolled ? 'rgba(7,9,12,0.97)' : 'rgba(7,9,12,0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
          transition: 'background 0.3s, border-color 0.3s',
        }}
        aria-label="Main navigation"
      >
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          height: '100%', display: 'flex', alignItems: 'center', gap: 0,
        }}>

          {/* ── Logo ── */}
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 9,
            textDecoration: 'none', flexShrink: 0, marginRight: 36,
          }} aria-label="KAYAD — Home">
            <span style={{ fontSize: 22, lineHeight: 1 }}>🚗</span>
            <span style={{
              fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.04em', color: '#fff',
            }}>KAYAD</span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {NAV_LINKS.map(({ label, to }) => {
              const active = isActive(to);
              const isBrowse = to === '/browse';
              return (
                <div
                  key={to}
                  ref={isBrowse ? megaRef : null}
                  onMouseEnter={isBrowse ? openMega : undefined}
                  onMouseLeave={isBrowse ? closeMega : undefined}
                  style={{ position: 'relative' }}
                >
                  <Link
                    to={to}
                    style={{
                      padding: '6px 14px', fontSize: 14, fontWeight: active ? 600 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.72)',
                      textDecoration: 'none', borderRadius: 6,
                      transition: 'color 0.18s, background 0.18s',
                      whiteSpace: 'nowrap',
                      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {label}
                    {isBrowse && <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>}
                  </Link>

                  {/* Mega Menu */}
                  {isBrowse && megaOpen && (
                    <div
                      style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 8,
                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                        padding: 20, width: 580, zIndex: 300,
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24,
                        animation: 'modal-in 0.25s ease',
                      }}
                      onMouseEnter={openMega}
                      onMouseLeave={closeMega}
                    >
                      {MEGA_MENU_SECTIONS.map(section => (
                        <div key={section.title}>
                          <div style={{
                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold-400)',
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
                          }}>
                            {section.title}
                          </div>
                          {section.links.map(link => (
                            <Link
                              key={link.to}
                              to={link.to}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 0', fontSize: 13, color: 'var(--text-muted)',
                                textDecoration: 'none', transition: 'color 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <span style={{ fontSize: 14 }}>{link.icon}</span>
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isDealer && (
              <Link to="/dealer" style={{
                padding: '6px 14px', fontSize: 14, fontWeight: isActive('/dealer') ? 600 : 400,
                color: isActive('/dealer') ? '#fff' : 'rgba(255,255,255,0.72)',
                textDecoration: 'none', borderRadius: 6, whiteSpace: 'nowrap',
                background: isActive('/dealer') ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}>Dealer Hub</Link>
            )}
            {isAdmin && (
              <Link to="/admin" style={{
                padding: '6px 14px', fontSize: 14, fontWeight: isActive('/admin') ? 600 : 400,
                color: 'var(--gold)', textDecoration: 'none', borderRadius: 6, whiteSpace: 'nowrap',
                background: isActive('/admin') ? 'rgba(212,168,67,0.1)' : 'transparent',
              }}>Admin</Link>
            )}
          </div>

          {/* ── Right side ── */}
          <div ref={dropRef} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>

            {/* Search */}
            <button
              className="desktop-nav"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: searchOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.18s',
              }}
            >
              🔍
            </button>

            {/* Sell link */}
            <Link
              to={isAuth ? '/dealer/add-car' : '/register?role=dealer'}
              className="desktop-nav"
              style={{
                fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.82)',
                textDecoration: 'none', padding: '6px 4px', marginRight: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.82)'}
            >
              Sell
            </Link>

            {isAuth ? (
              <>
                {/* Connection dot */}
                <Tooltip text={connected ? 'Live connection' : 'Reconnecting…'}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: connected ? '#22c55e' : '#6b7280', flexShrink: 0,
                  }} />
                </Tooltip>

                {/* Notifications */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setNotifDrop(!notifDrop); setUserDrop(false); }}
                    aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
                    aria-expanded={notifDrop}
                    style={{
                      background: notifDrop ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, width: 38, height: 38,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, cursor: 'pointer', position: 'relative',
                    }}
                  >
                    🔔
                    {unread > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#ef4444', color: '#fff', borderRadius: '50%',
                        width: 18, height: 18, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #07090C',
                      }}>{unread > 9 ? '9+' : unread}</span>
                    )}
                  </button>

                  {notifDrop && (
                    <div style={{
                      position: 'absolute', right: 0, top: 48,
                      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                      borderRadius: 12, width: 320, maxHeight: 400, overflow: 'hidden',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 300,
                    }}>
                      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                        {unread > 0 && (
                          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer' }}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {notifs.length === 0 ? (
                          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            No notifications yet
                          </div>
                        ) : notifs.map((n, i) => (
                          <div key={n.id || i} style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--border)',
                            background: n.read ? 'transparent' : 'rgba(212,168,67,0.05)',
                          }}>
                            <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13 }}>{n.title || n.message}</div>
                            {n.title && n.message !== n.title && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                            )}
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                              {n.created_at ? timeAgo(n.created_at) : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <div className="desktop-nav" style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setUserDrop(!userDrop); setNotifDrop(false); }}
                    aria-expanded={userDrop}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: userDrop ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '5px 10px 5px 5px',
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar size="sm" variant="gold" initials={initials(user?.name)} />
                    <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>
                      {user?.name?.split(' ')[0]}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>▾</span>
                  </button>

                  {userDrop && (
                    <div style={{
                      position: 'absolute', right: 0, top: 48, minWidth: 210,
                      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                      borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 300,
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                        <div style={{ marginTop: 6 }}>
                          <Badge variant={user?.role === 'admin' || user?.role === 'superadmin' ? 'red' : user?.role === 'dealer' ? 'gold' : 'blue'}>
                            {user?.role}
                          </Badge>
                        </div>
                      </div>
                      {[
                        { to: '/profile',   icon: '👤', label: 'My Profile' },
                        { to: '/favorites', icon: '❤️', label: 'Favourites' },
                        { to: '/escrow',    icon: '🔒', label: 'Escrow Vault' },
                        { to: '/payments',  icon: '💳', label: 'Payments' },
                        { to: '/chat',      icon: '💬', label: 'Messages' },
                        ...(isDealer ? [{ to: '/dealer',         icon: '🏪', label: 'Dealer Hub' }] : []),
                        ...(isDealer ? [{ to: '/dealer/add-car', icon: '➕', label: 'Add Listing' }] : []),
                        ...(isAdmin  ? [{ to: '/admin',          icon: '🔑', label: 'Admin Panel' }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', fontSize: 13, color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border)', textDecoration: 'none',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span aria-hidden="true">{item.icon}</span> {item.label}
                        </Link>
                      ))}
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                        textAlign: 'left', fontSize: 13, color: '#ef4444', cursor: 'pointer',
                      }}>
                        <span aria-hidden="true">🚪</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" style={{
                padding: '7px 20px', fontSize: 14, fontWeight: 500,
                color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 7, textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'rgba(255,255,255,0.88)'; }}
              >
                Sign In
              </Link>
            )}

            {/* Hamburger */}
            <button
              className="hamburger"
              style={{ display: 'none' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, margin: '5px 0', opacity: mobileOpen ? 0 : 1, transition: 'opacity 0.3s' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
          </div>
        </div>

        {/* Search bar dropdown */}
        {searchOpen && (
          <div className="desktop-nav" style={{
            position: 'absolute', top: 68, left: 0, right: 0,
            background: 'rgba(7,9,12,0.97)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)', padding: '16px 24px',
            zIndex: 299,
          }}>
            <form onSubmit={handleSearch} style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="ui-input"
                placeholder="Search by brand, model, or keyword…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{ flex: 1 }}
                aria-label="Search vehicles"
              />
              <button type="submit" className="ui-btn ui-btn--primary">Search</button>
            </form>
          </div>
        )}
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setMobileOpen(false)}>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 'min(85vw, 320px)', background: '#0d1520',
            borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto',
            padding: '80px 0 24px',
          }} onClick={e => e.stopPropagation()}>
            {isAuth ? (
              <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar size="md" variant="gold" initials={initials(user?.name)} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
                <Link to="/login" className="ui-btn ui-btn--secondary" style={{ flex: 1, justifyContent: 'center' }}>Sign In</Link>
                <Link to="/register" className="ui-btn ui-btn--primary" style={{ flex: 1, justifyContent: 'center' }}>Join Free</Link>
              </div>
            )}
            {NAV_LINKS.map(({ label, to }) => {
              const active = isActive(to);
              return (
                <Link key={to} to={to} style={{
                  display: 'block', padding: '13px 20px', fontSize: 15, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)', textDecoration: 'none',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent',
                }}>{label}</Link>
              );
            })}
            {isAuth && (
              <>
                <div style={{ padding: '12px 20px 4px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Account</div>
                {[
                  { to: '/profile', label: 'My Profile' },
                  { to: '/favorites', label: 'Favourites' },
                  { to: '/escrow', label: 'Escrow Vault' },
                  { to: '/payments', label: 'Payments' },
                  { to: '/chat', label: 'Messages' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} style={{
                    display: 'block', padding: '12px 20px', fontSize: 14, color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none', borderLeft: isActive(to) ? '3px solid var(--gold)' : '3px solid transparent',
                  }}>{label}</Link>
                ))}
                {isDealer && [
                  { to: '/dealer', label: 'Dealer Hub' },
                  { to: '/dealer/add-car', label: 'Add Listing' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} style={{
                    display: 'block', padding: '12px 20px', fontSize: 14, color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none', borderLeft: isActive(to) ? '3px solid var(--gold)' : '3px solid transparent',
                  }}>{label}</Link>
                ))}
                {isAdmin && (
                  <Link to="/admin" style={{
                    display: 'block', padding: '12px 20px', fontSize: 14, color: 'var(--gold)',
                    textDecoration: 'none', borderLeft: '3px solid var(--gold)',
                  }}>Admin Panel</Link>
                )}
                <button onClick={handleLogout} style={{
                  display: 'block', width: '100%', padding: '13px 20px', fontSize: 14, color: '#ef4444',
                  background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', marginTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}>Sign Out</button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .desktop-nav { display: flex !important; }
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </>
  );
}
