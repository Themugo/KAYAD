import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSellerRole } from '../utils/authRoutes';
import { Menu, X, Car, User, LogOut, Shield, Search, HelpCircle, Plus, Gavel, Home } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/showroom', label: 'Browse Cars', icon: Search },
  { to: '/auctions', label: 'Auctions', icon: Gavel },
  { to: '/escrow-vault', label: 'Escrow Vault', icon: Shield },
  { to: '/pre-inspection', label: 'Pre-Inspection', icon: Search },
  { to: '/contact', label: 'Support', icon: HelpCircle },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuth, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const sellLink = isAuth
    ? (isSellerRole(user?.role) ? '/dealer/add-car' : '/sell')
    : '/register?sell=1';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#0D0D0D] border-b border-white/[0.07]">
      <div className="section-container">
        <div className="flex items-center h-14 relative">
          {/* Logo - far left */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <Car className="w-5 h-5 text-gold" />
            <span className="font-display text-lg font-semibold gradient-text tracking-wide">KAYAD</span>
          </Link>

          {/* Desktop — centered */}
          <div className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-[13px] font-medium transition-colors whitespace-nowrap tracking-wide ${
                  isActive(item.to)
                    ? 'text-gold'
                    : 'text-white/50 hover:text-white/90'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="w-px h-4 bg-white/[0.08]" />

            <Link
              to={sellLink}
              className={`text-[13px] font-medium transition-colors whitespace-nowrap tracking-wide ${
                isActive(sellLink)
                  ? 'text-gold'
                  : 'text-white/55 hover:text-gold'
              }`}
            >
              Sell
            </Link>

            {isAuth ? (
              <>
                <Link to="/dashboard" className="text-[13px] font-medium text-white/50 hover:text-white/90 transition-colors whitespace-nowrap tracking-wide">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[13px] font-medium text-white/35 hover:text-white/70 transition-colors whitespace-nowrap tracking-wide"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-md text-[13px] font-medium bg-gold text-bg hover:bg-gold-light transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile toggle - far right */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-1.5 text-white/55 hover:text-white transition-colors ml-auto"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-white/[0.07] bg-[#0D0D0D]">
          <div className="section-container py-3 flex flex-col gap-0.5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Sell a Vehicle
            </Link>
            {isAuth ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/[0.05]">
                  <User className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/[0.05] w-full text-left">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-1 pt-1">
                <Link to="/login" onClick={() => setOpen(false)} className="btn-outline btn-sm flex-1 justify-center">Sign In</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-gold btn-sm flex-1 justify-center">Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
