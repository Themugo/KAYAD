import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useMediaQuery from '../hooks/useMediaQuery';

const ACCOUNT_PREFIXES = ['/profile', '/dashboard', '/favorites', '/payments', '/chat', '/notifications', '/escrow', '/disputes', '/inspector'];

export default function MobileBottomNav() {
  const { user, isAuth } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');

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
      to: user?.role === 'dealer' ? '/dealer/add-car' : '/register?role=dealer',
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
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
      background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      height: 64,
    }}>
      {tabs.map(tab => {
        const isActive = tab.active;
        const isSell = tab.highlight;
        return (
          <Link
            key={tab.key}
            to={tab.to}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 1, textDecoration: 'none', position: 'relative',
              color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
              transition: 'color 0.15s',
              paddingTop: isSell ? 0 : 4,
            }}
          >
            {isSell ? (
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--gold)', marginTop: -16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 20px rgba(212,196,168,0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'box-shadow 0.15s',
              }}>
                <tab.icon size={22} style={{ color: '#000' }} />
              </div>
            ) : (
              <tab.icon size={22} />
            )}
            <span>{isSell ? 'Sell' : tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
