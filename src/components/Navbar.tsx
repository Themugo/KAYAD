import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { isSellerRole } from '../utils/authRoutes';
import NotificationCenter from './NotificationCenter';
import { carsAPI } from '../api/api';
import { initials } from '../utils/helpers';
import { Menu, X, Bell, User, LogOut, Plus, Car, Search, Gavel, Shield, HelpCircle, Home } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/showroom', label: 'Browse Cars', icon: Search },
  { to: '/auctions', label: 'Auctions', icon: Gavel },
  { to: '/escrow-vault', label: 'Escrow Vault', icon: Shield },
  { to: '/pre-inspection', label: 'Pre-Inspection', icon: Search },
  { to: '/contact', label: 'Support', icon: HelpCircle },
];

export default function Navbar() {
  const { user, isAuth, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const [notifDrop, setNotifDrop] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false); setUserDrop(false); setNotifDrop(false);
  }, [location.pathname]);

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

  const handleLogout = async () => { await logout(); navigate('/'); };

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  const sellLink = isAuth
    ? (isSellerRole(user?.role) ? '/dealer/add-car' : '/sell')
    : '/register?sell=1';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#0D0D0D] border-b border-white/[0.07]">
      <div className="section-container">
        <div className="flex items-center h-14 gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <Car className="w-5 h-5 text-gold" />
            <span className="font-display text-lg font-semibold gradient-text tracking-wide">KAYAD</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5 ml-auto">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                  isActive(item.to)
                    ? 'text-gold bg-gold/[0.1]'
                    : 'text-white/55 hover:text-white/90 hover:bg-white/[0.05]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/[0.07] shrink-0">
            <Link
              to={sellLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Sell
            </Link>
            {isAuth ? (
              <div ref={dropRef} className="flex items-center gap-1.5">
                {/* Notification bell */}
                <button
                  onClick={() => { setNotifDrop(!notifDrop); setUserDrop(false); }}
                  className="relative p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold text-black text-[9px] font-bold rounded-full flex items-center justify-center border border-[#0D0D0D]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifDrop && <NotificationCenter onClose={() => setNotifDrop(false)} />}

                {/* User avatar */}
                <button
                  onClick={() => { setUserDrop(!userDrop); setNotifDrop(false); }}
                  className="flex items-center gap-1.5 p-1 rounded-md text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-gold/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gold" />
                  </div>
                </button>

                {/* User dropdown */}
                {userDrop && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-sm font-semibold text-white">{user?.name}</div>
                      <div className="text-xs text-text-muted">{user?.email}</div>
                    </div>
                    <div className="py-1">
                      <Link to="/dashboard" onClick={() => setUserDrop(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                        Dashboard
                      </Link>
                      <Link to="/favorites" onClick={() => setUserDrop(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                        Saved Cars
                      </Link>
                      <Link to="/chat" onClick={() => setUserDrop(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                        Messages
                      </Link>
                      {isSellerRole(user?.role) && (
                        <Link to="/dealer" onClick={() => setUserDrop(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                          Dealer Hub
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserDrop(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                          Admin Panel
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-border pt-1">
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-white/[0.05] transition-colors">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-md text-[13px] font-medium bg-gold text-bg hover:bg-gold-light transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden ml-auto p-1.5 text-white/55 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/[0.07] bg-[#0D0D0D]">
          <div className="section-container py-3 flex flex-col gap-0.5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive(item.to)
                    ? 'text-gold bg-gold/[0.1]'
                    : 'text-white/55 hover:text-white/90 hover:bg-white/[0.05]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.07] my-2" />
            <Link
              to={sellLink}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Sell a Vehicle
            </Link>
            {isAuth ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors">
                  <User className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors w-full text-left">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-1 pt-1">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-outline btn-sm flex-1 justify-center">Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-gold btn-sm flex-1 justify-center">Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
