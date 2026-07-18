import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    const onScroll = () => setScrolled(window.scrollY > 20);
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
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: scrolled ? 'rgba(15, 23, 42, 0.98)' : 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(241, 245, 249, 0.1)' : '1px solid transparent',
          transition: 'all 0.3s ease',
          boxShadow: scrolled ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
        }}
        aria-label="Main navigation"
      >
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 32px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          {/* Logo */}
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            flexShrink: 0,
          }} aria-label="KAYAD — Home">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
            }}>
              🚗
            </div>
            <span style={{
              fontWeight: 700,
              fontSize: '1.4rem',
              letterSpacing: '-0.02em',
              color: '#F1F5F9',
              fontFamily: 'Outfit, sans-serif',
            }}>KAYAD</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="desktop-nav" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flex: 1,
            justifyContent: 'center',
          }}>
            {NAV_LINKS.map(({ label, to }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#FDBA74' : 'rgba(241, 245, 249, 0.65)',
                    textDecoration: 'none',
                    borderRadius: 8,
                    transition: 'all 0.2s ease',
                    background: active ? 'rgba(249, 115, 22, 0.14)' : 'transparent',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#F1F5F9';
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'rgba(241, 245, 249, 0.65)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                  {active && (
                    <div style={{
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 20,
                      height: 3,
                      background: 'linear-gradient(90deg, #F97316, #C2410C)',
                      borderRadius: 2,
                    }} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="desktop-nav" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}>
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(241, 245, 249, 0.12)',
                color: 'rgba(241, 245, 249, 0.75)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.14)';
                e.currentTarget.style.borderColor = '#F97316';
                e.currentTarget.style.color = '#FDBA74';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(241, 245, 249, 0.12)';
                e.currentTarget.style.color = '#475569';
              }}
              aria-label="Search"
            >
              🔍
            </button>

            {/* Notifications (Auth Only) */}
            {isAuth && (
              <div ref={notifDrop ? dropRef : null} style={{ position: 'relative' }}>
                <button
                  onClick={() => setNotifDrop(!notifDrop)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.04)',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                    e.currentTarget.style.borderColor = '#3B82F6';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  aria-label="Notifications"
                >
                  🔔
                  {unread > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#EF4444',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifDrop && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: 360,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
                    overflow: 'hidden',
                    zIndex: 200,
                  }}>
                    <div style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>Notifications</span>
                      {unread > 0 && (
                        <button
                          onClick={markAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3B82F6',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {notifs.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifs.map(n => (
                          <div key={n._id || n.id} style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid #F1F5F9',
                            background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                          }}>
                            <div style={{ fontSize: 13, color: '#0F172A', marginBottom: 4 }}>{n.title || n.message}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{timeAgo(n.createdAt)}</div>
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
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
                borderRadius: 10,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              🚗 Sell
            </Link>

            {/* User Menu / Sign In */}
            {isAuth ? (
              <div ref={userDrop ? dropRef : null} style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserDrop(!userDrop)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#F1F5F9';
                    e.currentTarget.style.borderColor = '#3B82F6';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                >
                  <Avatar size="sm" variant="blue" initials={initials(user?.name)} />
                  <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 500 }}>
                    {user?.name?.split(' ')[0]}
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: 12 }}>▾</span>
                </button>

                {/* User Dropdown */}
                {userDrop && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: 240,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
                    overflow: 'hidden',
                    zIndex: 200,
                  }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{user?.name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{user?.email}</div>
                    </div>
                    {[
                      { to: '/profile', icon: '👤', label: 'My Profile' },
                      { to: '/favorites', icon: '❤️', label: 'Favorites' },
                      { to: '/payments', icon: '💳', label: 'Payments' },
                      ...(isDealer ? [{ to: '/dealer', icon: '🏪', label: 'Dealer Hub' }] : []),
                      ...(isAdmin ? [{ to: '/admin', icon: '⚙️', label: 'Admin Panel' }] : []),
                    ].map(item => (
                      <Link key={item.to} to={item.to} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 20px',
                        color: '#475569',
                        textDecoration: 'none',
                        fontSize: 13,
                        transition: 'background 0.2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                      >
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: '1px solid #E2E8F0', padding: '8px 0' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '12px 20px',
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          fontSize: 13,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: 16 }}>🚪</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#F1F5F9',
                  background: 'transparent',
                  border: '1px solid rgba(241, 245, 249, 0.18)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#F97316';
                  e.currentTarget.style.color = '#FDBA74';
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(241, 245, 249, 0.18)';
                  e.currentTarget.style.color = '#F1F5F9';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="hamburger"
              style={{
                display: 'none',
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span style={{
                display: 'block',
                width: 20,
                height: 2,
                background: '#F1F5F9',
                borderRadius: 2,
                transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none',
                transition: 'transform 0.3s',
              }} />
              <span style={{
                display: 'block',
                width: 20,
                height: 2,
                background: '#fff',
                borderRadius: 2,
                opacity: mobileOpen ? 0 : 1,
                transition: 'opacity 0.3s',
              }} />
              <span style={{
                display: 'block',
                width: 20,
                height: 2,
                background: '#fff',
                borderRadius: 2,
                transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
                transition: 'transform 0.3s',
              }} />
            </button>
          </div>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid #E2E8F0',
            padding: '24px 32px',
            zIndex: 99,
          }}>
            <form onSubmit={handleSearch} style={{
              maxWidth: 700,
              margin: '0 auto',
              display: 'flex',
              gap: 12,
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '0 16px',
              }}>
                <span style={{ fontSize: 18, marginRight: 12 }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search by brand, model, or keyword…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#0F172A',
                    fontSize: 15,
                    padding: '14px 0',
                  }}
                  aria-label="Search vehicles"
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
          </div>
        )}
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(85vw, 320px)',
              background: '#FFFFFF',
              borderLeft: '1px solid #E2E8F0',
              overflowY: 'auto',
              paddingTop: 80,
            }}
            onClick={e => e.stopPropagation()}
          >
            {isAuth ? (
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                <Avatar size="md" variant="blue" initials={initials(user?.name)} />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{user?.email}</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 24px', display: 'flex', gap: 12 }}>
                <Link
                  to="/login"
                  className="ui-btn"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'transparent',
                    border: '1px solid #E2E8F0',
                    color: '#0F172A',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="ui-btn"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
                    color: '#FFFFFF',
                  }}
                >
                  Join Free
                </Link>
              </div>
            )}

            <div style={{ padding: '8px 0' }}>
              {NAV_LINKS.map(({ label, to }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 24px',
                      fontSize: 15,
                      fontWeight: active ? 600 : 400,
                      color: active ? '#3B82F6' : '#475569',
                      textDecoration: 'none',
                      background: active ? 'rgba(249, 115, 22, 0.14)' : 'transparent',
                      borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent',
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {isAuth && (
              <>
                <div style={{
                  padding: '12px 24px 4px',
                  fontSize: 10,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Account
                </div>
                {[
                  { to: '/profile', label: 'My Profile', icon: '👤' },
                  { to: '/favorites', label: 'Favorites', icon: '❤️' },
                  { to: '/escrow', label: 'Escrow Vault', icon: '🔒' },
                  { to: '/payments', label: 'Payments', icon: '💳' },
                ].map(({ to, label, icon }) => (
                  <Link
                    key={to}
                    to={to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 24px',
                      fontSize: 14,
                      color: '#475569',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{icon}</span>
                    {label}
                  </Link>
                ))}
                {isDealer && (
                  <Link
                    to="/dealer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 24px',
                      fontSize: 14,
                      color: '#3B82F6',
                      textDecoration: 'none',
                    }}
                  >
                    <span>🏪</span>
                    Dealer Hub
                  </Link>
                )}
                <div style={{ padding: '8px 0', borderTop: '1px solid #E2E8F0', marginTop: 8 }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      padding: '14px 24px',
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .desktop-nav { display: flex !important; }
        @media (max-width: 1024px) {
          .desktop-nav:not(:last-child) { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
