// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from './NotificationCenter';
import { initials } from '../utils/helpers';
import { isSellerRole } from '../utils/authRoutes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Menu, X, LogOut } from 'lucide-react';

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

          {/* Right: Nav + User */}
          <div className="flex items-center gap-3">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
              <Link to="/showroom" className={`px-3 py-2 rounded-xl transition-colors ${isActive('/showroom') ? 'text-gold bg-gold/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                Gallery
              </Link>
              <Link to="/showroom?filter=auction" className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-2 ${loc.pathname === '/showroom?filter=auction' ? 'text-gold bg-gold/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Live Auctions
              </Link>
              {isSellerRole(user?.role) && (
                <Link to="/dealer" className={`px-3 py-2 rounded-xl transition-colors ${isActive('/dealer') ? 'text-gold bg-gold/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                  Dealer Hub
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className={`px-3 py-2 rounded-xl transition-colors ${isActive('/admin') ? 'text-gold bg-gold/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                  Admin
                </Link>
              )}
            </div>
            {/* Socket Status */}
            {connected && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/30 bg-success/10 text-success text-xs font-bold">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                LIVE
              </div>
            )}

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
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '85%', maxWidth: 360, background: '#0a0a0a', overflowY: 'auto', padding: '24px 20px' }}
            >
              {/* Mobile Nav Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link to="/showroom" onClick={() => setMobileOpen(false)} style={{ padding: '14px 16px', borderRadius: 12, color: isActive('/showroom') ? 'var(--gold)' : 'rgba(255,255,255,0.7)', background: isActive('/showroom') ? 'rgba(212,196,168,0.08)' : 'transparent', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                  Gallery
                </Link>
                <Link to="/showroom?filter=auction" onClick={() => setMobileOpen(false)} style={{ padding: '14px 16px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
                  Live Auctions
                </Link>
                {isSellerRole(user?.role) && (
                  <Link to="/dealer" onClick={() => setMobileOpen(false)} style={{ padding: '14px 16px', borderRadius: 12, color: isActive('/dealer') ? 'var(--gold)' : 'rgba(255,255,255,0.7)', background: isActive('/dealer') ? 'rgba(212,196,168,0.08)' : 'transparent', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                    Dealer Hub
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} style={{ padding: '14px 16px', borderRadius: 12, color: isActive('/admin') ? 'var(--gold)' : 'rgba(255,255,255,0.7)', background: isActive('/admin') ? 'rgba(212,196,168,0.08)' : 'transparent', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                    Admin Panel
                  </Link>
                )}
              </div>

              {/* Mobile User Section */}
              {isAuth && (
                <>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 20, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      { to: '/dashboard', label: 'Dashboard' },
                      { to: '/profile', label: 'Profile' },
                      { to: '/favorites', label: 'Saved Cars' },
                      { to: '/chat', label: 'Messages' },
                      { to: '/notifications', label: 'Notifications' },
                    ].map(({ to, label }) => (
                      <Link key={to} to={to} onClick={() => setMobileOpen(false)} style={{ padding: '12px 16px', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}>
                        {label}
                      </Link>
                    ))}
                  </div>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }} style={{ marginTop: 16, width: '100%', padding: '14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
