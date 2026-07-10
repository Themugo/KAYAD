// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notifAPI } from '../api/api';
import { initials, timeAgo } from '../utils/helpers';

const NAV_LINKS = [
  { label: 'Home',           to: '/' },
  { label: 'Gallery',        to: '/browse' },
  { label: 'Auctions',       to: '/auctions' },
  { label: 'Escrow Vault',   to: '/escrow' },
  { label: 'Pre-Inspection', to: '/inspection' },
  { label: 'Support',        to: '/support' },
];

export default function Navbar() {
  const { user, isAuth, isAdmin, isDealer, logout } = useAuth();
  const { connected, joinNotifications, leaveChannel } = useSocket();
  const loc      = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop,   setUserDrop]   = useState(false);
  const [notifDrop,  setNotifDrop]  = useState(false);
  const [notifs,     setNotifs]     = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [scrolled,   setScrolled]   = useState(false);
  const dropRef = useRef(null);

  // Scroll detection for nav background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserDrop(false);
    setNotifDrop(false);
  }, [loc.pathname]);

  // Close dropdowns on outside click
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

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Load notifications
  useEffect(() => {
    if (!isAuth) return;
    notifAPI.list({ limit: 8 }).then(d => {
      const list = d.notifications || [];
      setNotifs(list);
      setUnread(list.filter(n => !n.read).length);
    }).catch(() => {});
  }, [isAuth]);

  // Real-time notifications via Supabase Realtime
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

  const isActive = (to) => {
    if (to === '/') return loc.pathname === '/';
    return loc.pathname === to || loc.pathname.startsWith(to + '/');
  };

  return (
    <>
      {/* ── Main navbar ──────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          height: 68,
          background: scrolled ? 'rgba(7,9,12,0.97)' : 'rgba(7,9,12,0.88)',
          backdropFilter: 'blur(24px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
          transition: 'background 0.3s, border-color 0.3s',
        }}
        aria-label="Main navigation"
      >
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}>

          {/* ── Logo ── */}
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              textDecoration: 'none', flexShrink: 0, marginRight: 40,
            }}
            aria-label="Gari Motors — Home"
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>🚗</span>
            <span style={{
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '0.04em',
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
            }}>
              KAYAD
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <div
            className="desktop-nav"
            style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}
          >
            {NAV_LINKS.map(({ label, to }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    padding: '6px 14px',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#fff' : 'rgba(255,255,255,0.72)',
                    textDecoration: 'none',
                    borderRadius: 6,
                    transition: 'color 0.18s, background 0.18s',
                    whiteSpace: 'nowrap',
                    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              );
            })}

            {/* Dealer & Admin links visible when logged in */}
            {isDealer && (
              <Link
                to="/dealer"
                style={{
                  padding: '6px 14px', fontSize: 14, fontWeight: isActive('/dealer') ? 600 : 400,
                  color: isActive('/dealer') ? '#fff' : 'rgba(255,255,255,0.72)',
                  textDecoration: 'none', borderRadius: 6, transition: 'color 0.18s',
                  background: isActive('/dealer') ? 'rgba(255,255,255,0.06)' : 'transparent',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!isActive('/dealer')) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (!isActive('/dealer')) e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; }}
              >
                Dealer Hub
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                style={{
                  padding: '6px 14px', fontSize: 14, fontWeight: isActive('/admin') ? 600 : 400,
                  color: isActive('/admin') ? 'var(--gold)' : 'var(--gold-light)',
                  textDecoration: 'none', borderRadius: 6, transition: 'color 0.18s',
                  background: isActive('/admin') ? 'rgba(212,168,67,0.1)' : 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                Admin
              </Link>
            )}
          </div>

          {/* ── Right side actions ── */}
          <div
            ref={dropRef}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}
          >
            {/* Sell CTA */}
            <Link
              to={isAuth ? '/dealer/add-car' : '/register?role=dealer'}
              className="desktop-nav"
              style={{
                fontSize: 14, fontWeight: 500,
                color: 'rgba(255,255,255,0.82)',
                textDecoration: 'none',
                padding: '6px 4px',
                marginRight: 6,
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.82)'}
            >
              Sell
            </Link>

            {isAuth ? (
              <>
                {/* Live connection indicator */}
                <div
                  title={connected ? 'Live' : 'Connecting…'}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: connected ? '#22c55e' : '#6b7280',
                    flexShrink: 0,
                    transition: 'background 0.3s',
                  }}
                />

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
                      transition: 'background 0.18s',
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
                      background: 'var(--card)', border: '1px solid var(--border-soft)',
                      borderRadius: 12, width: 320,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 300,
                    }}>
                      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                        {unread > 0 && (
                          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {notifs.length === 0 ? (
                          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            No notifications yet
                          </div>
                        ) : notifs.map((n, i) => (
                          <div key={n.id || n._id || i} style={{
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
                      <Link to="/profile" style={{ display: 'block', padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--gold)', borderTop: '1px solid var(--border)' }}>
                        View all →
                      </Link>
                    </div>
                  )}
                </div>

                {/* User avatar + dropdown */}
                <div className="desktop-nav" style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setUserDrop(!userDrop); setNotifDrop(false); }}
                    aria-expanded={userDrop}
                    aria-label="User menu"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: userDrop ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '5px 10px 5px 5px',
                      cursor: 'pointer', transition: 'background 0.18s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: '#0A1628', fontWeight: 800, flexShrink: 0,
                    }}>{initials(user?.name)}</div>
                    <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>
                      {user?.name?.split(' ')[0]}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>▾</span>
                  </button>

                  {userDrop && (
                    <div style={{
                      position: 'absolute', right: 0, top: 48, minWidth: 210,
                      background: 'var(--card)', border: '1px solid var(--border-soft)',
                      borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                      overflow: 'hidden', zIndex: 300,
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                        <div style={{ marginTop: 6 }}>
                          <span className={`badge ${user?.role === 'admin' || user?.role === 'superadmin' ? 'badge-red' : user?.role === 'dealer' ? 'badge-gold' : user?.role === 'broker' ? 'badge-orange' : 'badge-blue'}`}>
                            {user?.role}
                          </span>
                        </div>
                      </div>
                      {[
                        { to: '/profile',   icon: '👤', label: 'My Profile' },
                        { to: '/favorites', icon: '❤️', label: 'Favourites' },
                        { to: '/escrow',    icon: '🔒', label: 'Escrow Vault' },
                        { to: '/payments',  icon: '💳', label: 'Payments' },
                        { to: '/chat',      icon: '💬', label: 'Messages' },
                        ...(isDealer ? [{ to: '/dealer',           icon: '🏪', label: 'Dealer Hub' }] : []),
                        ...(isDealer ? [{ to: '/dealer/add-car',   icon: '➕', label: 'Add Listing' }] : []),
                        ...(isAdmin  ? [{ to: '/admin',            icon: '🔑', label: 'Admin Panel' }] : []),
                        ...(isAdmin  ? [{ to: '/admin/settings',   icon: '⚙️', label: 'Settings' }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', fontSize: 13, color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border)', textDecoration: 'none',
                          transition: 'background 0.15s',
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
              /* Not logged in */
              <Link
                to="/login"
                style={{
                  padding: '7px 20px',
                  fontSize: 14, fontWeight: 500,
                  color: 'rgba(255,255,255,0.88)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 7,
                  textDecoration: 'none',
                  transition: 'border-color 0.18s, color 0.18s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'rgba(255,255,255,0.88)'; }}
              >
                Sign In
              </Link>
            )}

            {/* Hamburger (mobile only) */}
            <button
              className="hamburger"
              style={{ display: 'none' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span
                style={{
                  display: 'block', width: 22, height: 2,
                  background: '#fff', borderRadius: 2,
                  transition: 'transform 0.3s, opacity 0.3s',
                  transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none',
                }}
              />
              <span
                style={{
                  display: 'block', width: 22, height: 2,
                  background: '#fff', borderRadius: 2,
                  margin: '5px 0',
                  transition: 'opacity 0.3s',
                  opacity: mobileOpen ? 0 : 1,
                }}
              />
              <span
                style={{
                  display: 'block', width: 22, height: 2,
                  background: '#fff', borderRadius: 2,
                  transition: 'transform 0.3s, opacity 0.3s',
                  transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
                }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 'min(85vw, 320px)',
              background: '#0d1520',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              overflowY: 'auto',
              padding: '80px 0 24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* User header */}
            {isAuth ? (
              <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#0A1628', fontWeight: 700, flexShrink: 0,
                  }}>{initials(user?.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</div>
                    <span className={`badge ${user?.role === 'admin' || user?.role === 'superadmin' ? 'badge-red' : user?.role === 'dealer' ? 'badge-gold' : 'badge-blue'}`} style={{ marginTop: 4 }}>
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
                <Link to="/login"    className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Sign In</Link>
                <Link to="/register" className="btn btn-gold"    style={{ flex: 1, justifyContent: 'center' }}>Join Free</Link>
              </div>
            )}

            {/* Main nav */}
            {NAV_LINKS.map(({ label, to }) => {
              const active = isActive(to);
              return (
                <Link key={to} to={to} style={{
                  display: 'block', padding: '13px 20px',
                  fontSize: 15, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  textDecoration: 'none',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}>
                  {label}
                </Link>
              );
            })}

            <Link to={isAuth ? '/dealer/add-car' : '/register?role=dealer'} style={{
              display: 'block', padding: '13px 20px',
              fontSize: 15, fontWeight: 400,
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              borderLeft: '3px solid transparent',
            }}>
              Sell
            </Link>

            {isAuth && (
              <>
                <div style={{ padding: '12px 20px 4px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Account</div>
                {[
                  { to: '/profile',   label: 'My Profile' },
                  { to: '/favorites', label: 'Favourites' },
                  { to: '/escrow',    label: 'Escrow Vault' },
                  { to: '/payments',  label: 'Payments' },
                  { to: '/chat',      label: 'Messages' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} style={{
                    display: 'block', padding: '12px 20px',
                    fontSize: 14, color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    borderLeft: isActive(to) ? '3px solid var(--gold)' : '3px solid transparent',
                    background: isActive(to) ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}>
                    {label}
                  </Link>
                ))}
              </>
            )}

            {isDealer && (
              <>
                <div style={{ padding: '12px 20px 4px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Dealer</div>
                {[
                  { to: '/dealer',           label: 'Dealer Hub' },
                  { to: '/dealer/add-car',   label: 'Add Listing' },
                  { to: '/dealer/analytics', label: 'Analytics' },
                  { to: '/dealer/settings',  label: 'Settings' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} style={{
                    display: 'block', padding: '12px 20px',
                    fontSize: 14, color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    borderLeft: isActive(to) ? '3px solid var(--gold)' : '3px solid transparent',
                    background: isActive(to) ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}>
                    {label}
                  </Link>
                ))}
              </>
            )}

            {isAdmin && (
              <>
                <div style={{ padding: '12px 20px 4px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Admin</div>
                {[
                  { to: '/admin',          label: 'Dashboard' },
                  { to: '/admin/users',    label: 'Users' },
                  { to: '/admin/cars',     label: 'Listings' },
                  { to: '/admin/settings', label: 'Settings' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} style={{
                    display: 'block', padding: '12px 20px',
                    fontSize: 14, color: 'var(--gold)',
                    textDecoration: 'none',
                    borderLeft: isActive(to) ? '3px solid var(--gold)' : '3px solid transparent',
                    background: isActive(to) ? 'rgba(212,168,67,0.08)' : 'transparent',
                  }}>
                    {label}
                  </Link>
                ))}
              </>
            )}

            {isAuth && (
              <button
                onClick={handleLogout}
                style={{
                  display: 'block', width: '100%', padding: '13px 20px',
                  fontSize: 14, color: '#ef4444', background: 'none', border: 'none',
                  textAlign: 'left', cursor: 'pointer', marginTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; background: none; border: none; cursor: pointer; padding: 6px; }
        }
        @media (min-width: 901px) {
          .hamburger { display: none !important; }
        }
      `}</style>
    </>
  );
}
