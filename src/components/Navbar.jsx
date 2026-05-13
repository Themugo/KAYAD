// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notifAPI } from '../api/api';
import { initials, timeAgo } from '../utils/helpers';

export default function Navbar() {
  const { user, isAuth, isAdmin, isDealer, logout } = useAuth();
  const { connected, on }  = useSocket();
  const loc      = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop,   setUserDrop]   = useState(false);
  const [notifDrop,  setNotifDrop]  = useState(false);
  const [notifs,     setNotifs]     = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const dropRef = useRef(null);

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserDrop(false);
    setNotifDrop(false);
    setSearchTerm('');
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

  // Real-time notification push
  useEffect(() => {
    if (!isAuth) return;
    const off = on('notification', (n) => {
      setNotifs(prev => [n, ...prev.slice(0, 7)]);
      setUnread(c => c + 1);
    });
    return off;
  }, [isAuth, on]);

  const markAllRead = async () => {
    await notifAPI.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') return loc.pathname === '/' || loc.pathname.startsWith('/cars/') || loc.pathname.startsWith('/auction/');
    return loc.pathname === path || loc.pathname.startsWith(path + '/');
  };

  const NavLink = ({ to, children, mobile }) => {
    const active = isActive(to);
    return (
      <Link to={to} className={mobile ? `mobile-nav-link${active ? ' active' : ''}` : ''}
        style={!mobile ? {
          color: active ? 'var(--gold)' : 'var(--text-muted)',
          fontWeight: 500, fontSize: 14, transition: 'color 0.2s',
          display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        } : {}}>
        {children}
      </Link>
    );
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) {
      navigate('/showroom');
    } else {
      navigate(`/showroom?q=${encodeURIComponent(q)}`);
    }
    // close mobile menu after searching
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── Main nav bar ───────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 72, display: 'flex', alignItems: 'center',
        background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🚗</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1 }}>
                Kayad
              </div>
              <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Kenya's Premium Market
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
            <NavLink to="/showroom">The Gallery</NavLink>
            <NavLink to="/showroom?filter=auction">
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              Live Auctions
            </NavLink>
            <NavLink to="/showroom?filter=fixed">Direct Buy</NavLink>
            {isDealer && <NavLink to="/dealer">Dealer Hub</NavLink>}
            {isAdmin  && <NavLink to="/admin">Admin</NavLink>}

            {/* Search (desktop) */}
            <form onSubmit={onSearchSubmit} style={{ marginLeft: 12, flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '60%', maxWidth: 560 }}>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cars, brand, model or location..."
                  aria-label="Search cars"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 14,
                  }}
                />
              </div>
            </form>
          </div>

          {/* Right side */}
          <div ref={dropRef} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

            {/* Live connection dot */}
            {isAuth && (
              <div title={connected ? 'Live connected' : 'Reconnecting...'}
                style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--green)' : '#4b5563', flexShrink: 0 }} />
            )}

            {isAuth ? (
              <>
                {/* Notifications bell */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setNotifDrop(!notifDrop); setUserDrop(false); }}
                    style={{
                      background: notifDrop ? 'var(--gold-glow)' : 'var(--surface)',
                      border: `1px solid ${notifDrop ? 'var(--gold-muted)' : 'var(--border)'}`,
                      borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16, cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                    }}>
                    🔔
                    {unread > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        background: 'var(--red)', color: '#fff', borderRadius: '50%',
                        width: 18, height: 18, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)',
                      }}>{unread > 9 ? '9+' : unread}</span>
                    )}
                  </button>

                  {notifDrop && (
                    <div style={{
                      position: 'absolute', right: 0, top: 48,
                      background: 'var(--card)', border: '1px solid var(--border-soft)',
                      borderRadius: 'var(--radius-lg)', width: 320,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 200,
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
                        ) : notifs.map(n => (
                          <div key={n._id} style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--border)',
                            background: n.read ? 'transparent' : 'var(--gold-glow)',
                            cursor: 'default',
                          }}>
                            <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13 }}>{n.title || n.message}</div>
                            {n.title && n.message !== n.title && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                            )}
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                              {n.createdAt ? timeAgo(n.createdAt) : ''}
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

                {/* User menu (desktop only) */}
                <div className="desktop-nav" style={{ position: 'relative' }}>
                  <button onClick={() => { setUserDrop(!userDrop); setNotifDrop(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: userDrop ? 'var(--gold-glow)' : 'var(--surface)',
                      border: `1px solid ${userDrop ? 'var(--gold-muted)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '6px 10px 6px 6px',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: '#0A1628', fontWeight: 700, flexShrink: 0,
                    }}>{initials(user?.name)}</div>
                    <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                      {user?.name?.split(' ')[0]}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>▾</span>
                  </button>

                  {userDrop && (
                    <div style={{
                      position: 'absolute', right: 0, top: 48, minWidth: 210,
                      background: 'var(--card)', border: '1px solid var(--border-soft)',
                      borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                      overflow: 'hidden', zIndex: 200,
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                        <div style={{ marginTop: 6 }}>
                          <span className={`badge ${user?.role === 'admin' ? 'badge-red' : user?.role === 'dealer' ? 'badge-gold' : user?.role === 'broker' ? 'badge-orange' : 'badge-blue'}`}>
                            {user?.role === 'broker' ? 'broker' : user?.role}
                          </span>
                        </div>
                      </div>
                      {[
                        { to: '/profile',   icon: '👤', label: 'My Profile' },
                        { to: '/favorites', icon: '❤️', label: 'Favourites' },
                        { to: '/escrow',    icon: '🔒', label: 'Escrow' },
                        { to: '/payments',  icon: '💳', label: 'Payments' },
                        { to: '/chat',      icon: '💬', label: 'Messages' },
                        ...(isDealer ? [{ to: '/dealer', icon: '🏪', label: 'Dealer Hub' }] : []),
                        ...(isAdmin  ? [{ to: '/admin',  icon: '🔑', label: 'Admin Panel' }] : []),
                        ...(isAdmin  ? [{ to: '/admin/settings', icon: '⚙', label: 'Settings' }] : []),
                        ...(isAdmin  ? [{ to: '/admin/panic-room', icon: '🚨', label: 'Panic Room' }] : []),
                        ...(isAdmin  ? [{ to: '/admin/ads', icon: '📢', label: 'Ad Manager' }] : []),
                      ].map(item => (
                        <Link key={item.to} to={item.to} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', fontSize: 13, color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border)', transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {item.icon} {item.label}
                        </Link>
                      ))}
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                        textAlign: 'left', fontSize: 13, color: 'var(--red)', cursor: 'pointer',
                      }}>
                        🚪 Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="desktop-nav" style={{ display: 'flex', gap: 8 }}>
                <Link to="/login"    className="btn btn-outline btn-sm">Sign In</Link>
                <Link to="/register" className="btn btn-gold btn-sm">Join Free</Link>
              </div>
            )}

            {/* Hamburger (mobile only) */}
            <button
              className={`hamburger ${mobileOpen ? 'open' : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu ────────────────────────────────── */}
      {mobileOpen && (
        <div className="mobile-menu" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>

            {/* Mobile search */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cars, brand, model or location..."
                  aria-label="Search cars"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 14,
                  }}
                />
                <button type="submit" style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--gold)', color: '#071026', border: 'none', cursor: 'pointer' }}>Search</button>
              </form>
            </div>

            {/* User header */}
            {isAuth ? (
              <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#0A1628', fontWeight: 700, flexShrink: 0,
                  }}>{initials(user?.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                    <span className={`badge ${user?.role === 'admin' ? 'badge-red' : user?.role === 'dealer' ? 'badge-gold' : user?.role === 'broker' ? 'badge-orange' : 'badge-blue'}`}>
                      {user?.role === 'broker' ? 'broker' : user?.role}
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

            {/* Nav links */}
            <NavLink to="/"    mobile>🏠 Home</NavLink>
            <NavLink to="/showroom" mobile>🎨 The Gallery</NavLink>
            <NavLink to="/showroom?filter=auction" mobile>
              <span className="live-dot" style={{ width: 7, height: 7 }} /> Live Auctions
            </NavLink>
            <NavLink to="/showroom?filter=fixed" mobile>💳 Direct Buy</NavLink>

            {isAuth && (
              <>
                <div style={{ padding: '8px 20px 4px', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Account</div>
                <NavLink to="/profile"   mobile>👤 My Profile</NavLink>
                <NavLink to="/favorites" mobile>❤️ Favourites</NavLink>
                <NavLink to="/escrow"    mobile>🔒 Escrow</NavLink>
                <NavLink to="/payments"  mobile>💳 Payments</NavLink>
                <NavLink to="/chat"      mobile>💬 Messages</NavLink>
              </>
            )}

            {isDealer && (
              <>
                <div style={{ padding: '8px 20px 4px', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Dealer</div>
                <NavLink to="/dealer"           mobile>🏪 Dealer Hub</NavLink>
                <NavLink to="/dealer/add-car"   mobile>➕ Add Listing</NavLink>
                <NavLink to="/dealer/analytics" mobile>📊 Analytics</NavLink>
              </>
            )}

            {isAdmin && (
              <>
                <div style={{ padding: '8px 20px 4px', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Admin</div>
                <NavLink to="/admin" mobile>📊 Reports Dashboard</NavLink>
                <NavLink to="/admin/panic-room" mobile>🚨 Panic Room</NavLink>
                <NavLink to="/admin/sellers" mobile>🏪 Dealer Approvals</NavLink>
                <NavLink to="/admin/escrows" mobile>🔒 Escrow Ledger</NavLink>
              </>
            )}

            {isAuth && (
              <button onClick={handleLogout} className="mobile-nav-link"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', textAlign: 'left', marginTop: 8, borderTop: '1px solid var(--border)' }}>
                🚪 Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
