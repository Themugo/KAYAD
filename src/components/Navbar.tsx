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
import { Bell, Menu, X, LogOut, PlusCircle, Search, ChevronDown, Car, Gavel, Shield, HelpCircle } from 'lucide-react';

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
  const [showBuyMenu, setShowBuyMenu] = useState(false);

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

  const buyMenuItems = [
    { to: '/showroom', label: 'All Vehicles', icon: Search },
    { to: '/auctions/calendar', label: 'Live Auctions', icon: Gavel },
    { to: '/showroom?category=suv', label: 'SUVs', icon: Car },
    { to: '/showroom?category=sedan', label: 'Sedans', icon: Car },
  ];

  const NAV_LINKS = [
    { to: '/escrow-vault', label: 'Escrow Vault' },
    { to: '/pre-inspection', label: 'Pre-Inspection' },
    { to: '/contact', label: 'Support' },
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

          <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
            {/* Buy Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBuyMenu(!showBuyMenu)}
                onBlur={() => setTimeout(() => setShowBuyMenu(false), 150)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  location.pathname.includes('showroom') || location.pathname.includes('auction')
                    ? 'text-gold bg-gold-muted'
                    : 'text-text-muted hover:text-text hover:bg-white/5'
                }`}
              >
                Buy Cars
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBuyMenu ? 'rotate-180' : ''}`} />
              </button>
              {showBuyMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in z-50">
                  {buyMenuItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-white/5 transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={`px-4 py-2 rounded-lg transition-colors ${isActive(to) ? 'text-gold bg-gold-muted' : 'text-text-muted hover:text-text hover:bg-white/5'}`}>
                {label}
              </Link>
            ))}

            <button onClick={() => navigate('/showroom')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors flex-shrink-0" aria-label="Search">
              <Search size={16} className="text-white/40 hover:text-gold transition-colors" />
            </button>

            {isAdmin && <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>}

            <Link to={sellLink} className="nav-sell-btn flex items-center gap-1.5">
              <PlusCircle size={14} /> Sell
            </Link>
          </div>

          <div ref={dropRef} className="flex items-center gap-2">
              {isAuth ? (
                <>
                  <div className="relative">
                  <button onClick={() => { setNotifDrop(!notifDrop); setUserDrop(false); }}
                    className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors relative ${unreadCount > 0 ? 'bg-gold/8' : 'hover:bg-surface'}`} aria-label="Notifications"
                    style={unreadCount > 0 ? { boxShadow: '0 0 20px rgba(212,196,168,0.15)' } : {}}>
                    <Bell size={20} className={unreadCount > 0 ? 'text-gold' : ''} />
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
                <Link to="/login" className="btn btn-outline px-5 text-xs">Sign In</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 hover:bg-surface rounded-2xl transition-colors" aria-label="Toggle menu">
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

                <motion.div variants={{ show: { transition: { staggerChildren: 0.04 } } }} initial="hidden" animate="show"
                  className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
                  {[
                    { to: '/', label: 'Home' },
                  ].map(({ to, label }) => (
                    <motion.div key={to} variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                      <Link to={to} className={`mobile-nav-link flex items-center gap-2 ${isActive(to) ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                        {label}
                      </Link>
                    </motion.div>
                  ))}

                  <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                    <div className="px-4 py-2 text-xs font-medium text-text-dim uppercase tracking-wider mb-2">Buy</div>
                  </motion.div>

                  {buyMenuItems.map((item) => (
                    <motion.div key={item.to} variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                      <Link to={item.to} className={`mobile-nav-link flex items-center gap-2 ${isActive(item.to) ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}

                  <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                    <Link to={sellLink}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gold/10 border border-gold/20 text-gold font-bold text-sm no-underline my-3"
                      onClick={() => setMobileOpen(false)}>
                      <PlusCircle size={16} /> Sell
                    </Link>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                    <hr className="border-border my-4" />
                  </motion.div>

                  {isSellerRole(user?.role) && (
                    <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                      <Link to="/dealer" className={`mobile-nav-link ${isActive('/dealer') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Dealer Hub</Link>
                    </motion.div>
                  )}
                  {isAdmin && (
                    <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                      <Link to="/admin" className={`mobile-nav-link ${isActive('/admin') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>Admin Panel</Link>
                    </motion.div>
                  )}

                  {isAuth ? (
                    <motion.div variants={{ show: { transition: { staggerChildren: 0.03 } } }} initial="hidden" animate="show">
                      {[
                        { to: '/notifications', label: 'Notifications', badge: unreadCount > 0 ? unreadCount : null },
                        { to: '/payments', label: 'Payments' },
                        { to: '/chat', label: 'Messages' },
                        { to: '/disputes', label: 'Disputes' },
                        { to: '/favorites', label: 'Saved Cars' },
                      ].map(({ to, label, badge }) => (
                        <motion.div key={to} variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                          <Link to={to} className={`mobile-nav-link flex items-center gap-2 ${isActive(to) ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                            {label}
                            {badge && <span className="bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">{badge > 9 ? '9+' : badge}</span>}
                          </Link>
                        </motion.div>
                      ))}
                      <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }} className="pt-4">
                        <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="mobile-nav-link text-danger w-full text-left">Sign Out</button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }} className="flex flex-col gap-3 pt-2">
                      <Link to="/login" className="btn btn-outline w-full text-center" onClick={() => setMobileOpen(false)}>Sign In</Link>
                      <Link to="/register" className="btn btn-gold w-full text-center" onClick={() => setMobileOpen(false)}>Join Free</Link>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
