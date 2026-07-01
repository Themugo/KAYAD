import { useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSellerRole } from '../utils/authRoutes';
import useMediaQuery from '../hooks/useMediaQuery';

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
              gap: 2, textDecoration: 'none', position: 'relative',
              color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
              transition: 'color 0.2s',
              paddingTop: isSell ? 0 : 6,
            }}
          >
            {isSell ? (
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--gold)', marginTop: -20, marginBottom: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 24px rgba(212,196,168,0.5)' : '0 6px 16px rgba(0,0,0,0.4)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
                <tab.icon size={22} style={{ color: '#000' }} />
              </div>
            ) : (
              <>
                <tab.icon size={20} style={{ position: 'relative', top: isActive ? 0 : 0 }} />
                {isActive && (
                  <span style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 16, height: 2, borderRadius: 2,
                    background: 'var(--gold)',
                  }} />
                )}
              </>
            )}
            <span style={{ marginTop: isSell ? 0 : 1 }}>{isSell ? 'Sell' : tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
