// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from './NotificationCenter';
import { carsAPI } from '../api/api';
import { initials } from '../utils/helpers';
import { isSellerRole } from '../utils/authRoutes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Menu, X, LogOut } from 'lucide-react';

export default function Navbar({ branding }) {
  const { user, isAuth, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const socketCtx = useSocket();
  const connected = socketCtx?.connected;

  const loc = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const [notifDrop, setNotifDrop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasLiveAuction, setHasLiveAuction] = useState(false);

  // Check for live auctions on mount + every 60s
  useEffect(() => {
    const check = () => {
      carsAPI.list({ limit: 50, category: 'all' })
        .then(data => {
          const all = data.cars || data.data || [];
          const now = Date.now();
          setHasLiveAuction(all.some(c => {
            const start = c.auctionStart ? new Date(c.auctionStart).getTime() : 0;
            const end = c.auctionEnd ? new Date(c.auctionEnd).getTime() : 0;
            return start > 0 && end > 0 && start <= now && end > now;
          }));
        })
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, []);

  const dropRef = useRef(null);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserDrop(false);
    setNotifDrop(false);
  }, [loc.pathname]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setUserDrop(false);
        setNotifDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


  const isActive = (path) => {
    if (path === '/') return loc.pathname === '/';
    return loc.pathname === path || loc.pathname.startsWith(path + '/');
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-black/95 backdrop-blur-2xl border-b border-border shadow-2xl' 
            : 'bg-gradient-to-b from-black/90 to-transparent backdrop-blur-xl'
        }`}
        aria-label="Main navigation"
      >
        <div className="container h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            {branding?.logoType === 'image' && branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.logoText || 'KAYAD'} 
                className="h-11 w-auto object-contain" 
                decoding="async"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold via-gold-light to-gold-dark flex items-center justify-center shadow-gold text-black text-3xl font-bold transition-transform group-hover:scale-105">
                K
              </div>
            )}
            <span className="font-display text-3xl font-bold tracking-tighter text-white">
              {branding?.logoText || 'KAYAD'}
            </span>
          </Link>

          <div className="flex-1" />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Home
            </Link>

            <Link to="/showroom" className={`nav-link ${isActive('/showroom') ? 'active' : ''}`}>
              Gallery
            </Link>
            
            <Link to="/auctions/calendar" className="nav-link flex items-center gap-2">
              {hasLiveAuction && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
              <span>Auctions{hasLiveAuction ? <span style={{ fontSize: 9, marginLeft: 3, color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>LIVE</span> : ''}</span>
            </Link>

            {isSellerRole(user?.role) && (
              <Link to="/dealer" className={`nav-link ${isActive('/dealer') ? 'active' : ''}`}>
                Dealer Hub
              </Link>
            )}

            {isAdmin && (
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                Admin
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div ref={dropRef} className="flex items-center gap-3">
            {isAuth ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => { setNotifDrop(!notifDrop); setUserDrop(false); }}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-surface transition-colors relative"
                    aria-label="Notifications"
                  >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-gold text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-bg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {notifDrop && <NotificationCenter onClose={() => setNotifDrop(false)} />}
                  </AnimatePresence>
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => { setUserDrop(!userDrop); setNotifDrop(false); }}
                    className="flex items-center gap-3 bg-surface border border-border hover:border-gold pl-2 pr-4 py-2 rounded-2xl transition-all"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center text-black font-bold text-sm">
                      {initials(user?.name || user?.email)}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-semibold text-white leading-none">{user?.name?.split(' ')[0]}</div>
                      <div className="text-[10px] text-text-muted capitalize">{user?.role}</div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {userDrop && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-3 w-64 glass rounded-3xl shadow-2xl py-2 z-50 border border-border"
                      >
                        {/* User Info */}
                        <div className="px-6 py-4 border-b border-border">
                          <div className="font-semibold">{user?.name}</div>
                          <div className="text-sm text-text-muted">{user?.email}</div>
                        </div>

                        {/* Menu Links */}
                        <div className="py-2">
                          {[
                            { to: '/profile', label: 'Profile' },
                            { to: '/dashboard', label: 'Dashboard' },
                            { to: '/favorites', label: 'Saved Cars' },
                            ...(isSellerRole(user?.role) ? [{ to: '/dealer', label: 'Dealer Hub' }] : []),
                            ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel' }] : []),
                          ].map(({ to, label }) => (
                            <Link
                              key={to}
                              to={to}
                              className="block px-6 py-3 hover:bg-card text-text-muted hover:text-white transition-colors"
                              onClick={() => setUserDrop(false)}
                            >
                              {label}
                            </Link>
                          ))}
                        </div>

                        <div className="border-t border-border pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full px-6 py-3 text-danger hover:bg-card flex items-center gap-3 transition-colors"
                          >
                            <LogOut size={18} />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn btn-outline px-6">Sign In</Link>
                <Link to="/register" className="btn btn-gold px-6">Join Free</Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-3 hover:bg-surface rounded-2xl transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mobile-menu fixed inset-0 z-50 bg-black/95 pt-20"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mobile-menu-panel"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>Menu</span>
                  <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 hover:bg-surface rounded-xl transition-colors" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', padding: 8 }}>
                    <X size={22} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
                  <Link to="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                    Home
                  </Link>
                  <Link to="/showroom" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                    Gallery
                  </Link>
                  <Link to="/auctions/calendar" className="mobile-nav-link flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                    {hasLiveAuction && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                    <span>Auctions{hasLiveAuction ? <span style={{ fontSize: 9, marginLeft: 3, color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>LIVE</span> : ''}</span>
                  </Link>
                  {isSellerRole(user?.role) && (
                    <Link to="/dealer" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Dealer Hub
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <hr className="border-border my-4" />
                  {isAuth ? (
                    <>
                      <Link to="/profile" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Profile</Link>
                      <Link to="/dashboard" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                      <Link to="/favorites" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Saved Cars</Link>
                      <div className="pt-4">
                        <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="mobile-nav-link text-danger">
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3 pt-2">
                      <Link to="/login" className="btn btn-outline w-full text-center" onClick={() => setMobileOpen(false)}>Sign In</Link>
                      <Link to="/register" className="btn btn-gold w-full text-center" onClick={() => setMobileOpen(false)}>Join Free</Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
