import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useBranding } from '../context/BrandingContext';
import NotificationCenter from './NotificationCenter';
import { carsAPI } from '../api/api';
import { initials } from '../utils/helpers';
import { isSellerRole } from '../utils/authRoutes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Menu, X, LogOut, PlusCircle, Search } from 'lucide-react';

export default function Navbar() {
  const { user, isAuth, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { branding } = useBranding();

  const loc = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const [notifDrop, setNotifDrop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasLiveAuction, setHasLiveAuction] = useState(false);

  useEffect(() => {
    const check = () => {
      carsAPI.list({ limit: 50, category: 'all' })
        .then(data => {
          const all = data.cars || data.data || [];
          const now = Date.now();
          setHasLiveAuction(all.some((c) => {
            const start = c.auctionStartTime ? new Date(c.auctionStartTime).getTime() : 0;
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

  useEffect(() => {
    setMobileOpen(false); setUserDrop(false); setNotifDrop(false);
  }, [loc.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setUserDrop(false); setNotifDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const isActive = (path) => {
    if (path === '/') return loc.pathname === '/';
    return loc.pathname === path || loc.pathname.startsWith(path + '/');
  };

  const sellLink = isAuth
    ? (isSellerRole(user?.role) ? '/dealer/add-car' : '/sell')
    : '/register?sell=1';

  const NAV_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/showroom', label: 'Buy Cars' },
    { to: '/auctions/calendar', label: 'Live Auctions', badge: hasLiveAuction ? 'live' : null },
    { to: '/escrow-vault', label: 'Escrow Vault' },
    { to: '/pre-inspection', label: 'Pre-Inspection' },
    { to: '/showroom?dealer=true', label: 'Dealers' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/95 backdrop-blur-2xl border-b border-border shadow-2xl' : 'bg-gradient-to-b from-black/90 to-transparent backdrop-blur-xl'
      }`} aria-label="Main navigation">
        <div className="container h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            {branding?.logoType === 'image' && branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.logoText || 'KAYAD'} className="h-11 w-auto object-contain" decoding="async" />
            ) : (
              <>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold via-gold-light to-gold-dark flex items-center justify-center shadow-gold text-black text-3xl font-bold transition-transform group-hover:scale-105">
                  {(branding?.logoText || 'K')[0]}
                </div>
                <span className="font-display text-3xl font-bold tracking-tighter text-white">{branding?.logoText || 'KAYAD'}</span>
              </>
            )}
          </Link>

          <div className="flex-1" />

          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            {NAV_LINKS.map(({ to, label, badge }) => (
              <Link key={to} to={to} className={`nav-link ${isActive(to.replace('?dealer=true', '')) ? 'active' : ''}`}>
                {badge === 'live' && (
                  <span className="relative flex h-2 w-2 mr-1.5 inline-flex">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
                {label}
              </Link>
            ))}

            {isAdmin && <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>}

            <Link to={sellLink} className="nav-sell-btn flex items-center gap-1.5">
              <PlusCircle size={14} /> Sell
            </Link>
          </div>

          <div ref={dropRef} className="flex items-center gap-2">
            {isAuth ? (
              <>
                <button onClick={() => navigate('/showroom')} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-surface transition-colors" aria-label="Search">
                  <Search size={20} className="text-white/60" />
                </button>

                <div className="relative">
                  <button onClick={() => { setNotifDrop(!notifDrop); setUserDrop(false); }}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-surface transition-colors relative" aria-label="Notifications">
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-gold text-black text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-bg">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  <AnimatePresence>{notifDrop && <NotificationCenter onClose={() => setNotifDrop(false)} />}</AnimatePresence>
                </div>

                <div className="relative">
                  <button onClick={() => { setUserDrop(!userDrop); setNotifDrop(false); }}
                    className="flex items-center gap-2.5 bg-surface border border-border hover:border-gold pl-2 pr-3.5 py-1.5 rounded-2xl transition-all">
                    <div className="w-8 h-8 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center text-black font-bold text-sm">
                      {initials(user?.name || user?.email)}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-semibold text-white leading-none">{user?.name?.split(' ')[0]}</div>
                      <div className="text-[10px] text-text-muted capitalize">{user?.role?.replace('_', ' ')}</div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {userDrop && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-3 w-64 glass rounded-3xl shadow-2xl py-2 z-50 border border-border">
                        <div className="px-6 py-4 border-b border-border">
                          <div className="font-semibold">{user?.name}</div>
                          <div className="text-sm text-text-muted">{user?.email}</div>
                        </div>
                        <div className="py-2">
                          {[
                            { to: '/profile', label: 'Profile' },
                            { to: '/favorites', label: 'Saved Cars' },
                            { to: '/chat', label: 'Messages' },
                            ...(isSellerRole(user?.role) ? [{ to: '/dealer', label: 'Dealer Hub' }] : []),
                            ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel' }] : []),
                          ].map(({ to, label }) => (
                            <Link key={to} to={to}
                              className="block px-6 py-3 hover:bg-card text-text-muted hover:text-white transition-colors"
                              onClick={() => setUserDrop(false)}>{label}</Link>
                          ))}
                        </div>
                        <div className="border-t border-border pt-2">
                          <button onClick={handleLogout}
                            className="w-full px-6 py-3 text-danger hover:bg-card flex items-center gap-3 transition-colors">
                            <LogOut size={18} /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <button onClick={() => navigate('/showroom')} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-surface transition-colors" aria-label="Search">
                  <Search size={20} className="text-white/60" />
                </button>
                <Link to="/login" className="btn btn-outline px-5 text-xs">Sign In</Link>
                <Link to={sellLink} className="nav-sell-btn flex items-center gap-1.5 text-xs px-4 py-2">
                  <PlusCircle size={13} /> Sell
                </Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2.5 hover:bg-surface rounded-2xl transition-colors" aria-label="Toggle menu">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mobile-menu fixed inset-0 z-50 bg-black/95 pt-20" onClick={() => setMobileOpen(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <span className="text-xs font-bold text-white/50 tracking-[0.1em] uppercase">Menu</span>
                  <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
                    className="p-2.5 hover:bg-surface rounded-xl transition-colors"
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                    <X size={22} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
                  <Link to="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</Link>
                  <Link to="/showroom" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Buy Cars</Link>
                  <Link to="/auctions/calendar" className="mobile-nav-link flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    Live Auctions
                    {hasLiveAuction && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </Link>
                  <Link to="/escrow-vault" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Escrow Vault</Link>
                  <Link to="/pre-inspection" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Pre-Inspection</Link>
                  <Link to="/showroom?dealer=true" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Dealers</Link>

                  <hr className="border-border my-4" />

                  {isSellerRole(user?.role) && (
                    <Link to="/dealer" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Dealer Hub</Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Admin Panel</Link>
                  )}

                  {isAuth ? (
                    <>
                      <Link to="/notifications" className="mobile-nav-link flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                        Notifications
                        {unreadCount > 0 && <span className="bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                      </Link>
                      <Link to="/payments" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Payments</Link>
                      <Link to="/chat" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Messages</Link>
                      <Link to="/disputes" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Disputes</Link>
                      <Link to="/favorites" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Saved Cars</Link>
                      <div className="pt-4">
                        <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="mobile-nav-link text-danger">Sign Out</button>
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
