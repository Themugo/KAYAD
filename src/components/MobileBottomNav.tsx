import { useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSellerRole } from '../utils/authRoutes';
import useMediaQuery from '../hooks/useMediaQuery';
import '../styles/layout.css';

const ACCOUNT_PREFIXES = ['/profile', '/dashboard', '/favorites', '/payments', '/chat', '/notifications', '/escrow', '/disputes', '/inspector'];

export default function MobileBottomNav() {
  const { user, isAuth } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    const root = document.documentElement;
    if (isMobile) { root.style.setProperty('--bottom-nav-h', '64px'); }
    else { root.style.setProperty('--bottom-nav-h', '0px'); }
  }, [isMobile]);

  const path = location.pathname;

  const hidden = !isMobile || path.startsWith('/dealer') || path.startsWith('/admin');
  if (hidden) return null;

  const active = useMemo(() => ({
    home: path === '/',
    search: path.startsWith('/showroom'),
    sell: path.startsWith('/dealer/add-car') || path.startsWith('/dealer/edit'),
    auctions: path.startsWith('/auction'),
    account: isAuth && ACCOUNT_PREFIXES.some(p => path.startsWith(p)),
  }), [path, isAuth]);

  const tabs = [
    {
      key: 'home', to: '/', icon: Home, label: 'Home', active: active.home,
    },
    {
      key: 'search', to: '/showroom', icon: Search, label: 'Search', active: active.search,
    },
    {
      key: 'sell',
      to: isSellerRole(user?.role) ? '/dealer/add-car' : '/register?role=dealer',
      icon: PlusCircle, label: 'Sell', active: active.sell,
      highlight: true,
    },
    {
      key: 'auctions', to: '/auctions/calendar', icon: Trophy, label: 'Auctions', active: active.auctions,
    },
    {
      key: 'account', to: user ? '/profile' : '/login', icon: User, label: 'Account', active: active.account,
    },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const isActive = tab.active;
        const isSell = tab.highlight;
        return (
          <Link
            key={tab.key}
            to={tab.to}
            className={`bottom-nav-tab ${isSell ? 'bottom-nav-tab-sell' : ''} ${isActive ? 'bottom-nav-tab-active' : 'bottom-nav-tab-inactive'}`}
          >
            {isSell ? (
              <div className={`bottom-nav-sell-btn ${isActive ? 'bottom-nav-sell-btn-active' : 'bottom-nav-sell-btn-inactive'}`}>
                <tab.icon size={22} className="bottom-nav-sell-icon" />
              </div>
            ) : (
              <>
                <tab.icon size={20} />
                {isActive && (
                  <span className="bottom-nav-active-indicator" />
                )}
              </>
            )}
            <span className={isSell ? 'bottom-nav-label-sell' : 'bottom-nav-label'}>{isSell ? 'Sell' : tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
