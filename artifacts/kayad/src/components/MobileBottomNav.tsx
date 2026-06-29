import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Gavel, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useMediaQuery from '../hooks/useMediaQuery';

const ACCOUNT_PREFIXES = [
  '/profile', '/dashboard', '/favorites', '/payments',
  '/chat', '/notifications', '/escrow', '/disputes', '/inspector',
];
const SELLER_ROLES = ['dealer', 'individual_seller'];

interface Tab {
  key: string;
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  highlight?: boolean;
}

export default function MobileBottomNav() {
  const { user, isAuth } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const path = location.pathname;

  const hidden = !isMobile || path.startsWith('/dealer') || path.startsWith('/admin');
  if (hidden) return null;

  const isSeller = SELLER_ROLES.includes(user?.role ?? '');

  const active = useMemo(() => ({
    home:     path === '/',
    search:   path.startsWith('/showroom'),
    sell:     path.startsWith('/dealer/add-car') || path.startsWith('/dealer/edit'),
    auctions: path.startsWith('/auction'),
    account:  isAuth && ACCOUNT_PREFIXES.some(p => path.startsWith(p)),
  }), [path, isAuth]);

  const tabs: Tab[] = [
    {
      key: 'home',
      to: '/',
      icon: Home,
      label: 'Home',
      active: active.home,
    },
    {
      key: 'search',
      to: '/showroom',
      icon: Search,
      label: 'Browse',
      active: active.search,
    },
    {
      key: 'sell',
      to: isSeller ? '/dealer/add-car' : '/register?role=individual_seller',
      icon: PlusCircle,
      label: 'Sell',
      active: active.sell,
      highlight: true,
    },
    {
      key: 'auctions',
      to: '/auctions/calendar',
      icon: Gavel,
      label: 'Auctions',
      active: active.auctions,
    },
    {
      key: 'account',
      to: user ? '/profile' : '/login',
      icon: User,
      label: isAuth ? 'Account' : 'Sign In',
      active: active.account,
    },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: 'rgba(7,7,7,0.97)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 64,
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04), 0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.active;
        const isHighlight = !!tab.highlight;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              position: 'relative',
              paddingTop: 6,
              paddingBottom: 4,
              transition: 'opacity 0.12s',
            }}
          >
            {/* Active indicator — thin gold bar at very top */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 2,
                  borderRadius: 9999,
                  background: 'linear-gradient(90deg, var(--gold-dark), var(--gold))',
                }}
              />
            )}

            {/* Icon container */}
            {isHighlight ? (
              /* Sell button — pill shape with gold border */
              <div
                style={{
                  width: 44,
                  height: 30,
                  borderRadius: 10,
                  background: isActive
                    ? 'rgba(212,196,168,0.2)'
                    : 'rgba(212,196,168,0.08)',
                  border: `1.5px solid ${isActive ? 'rgba(212,196,168,0.5)' : 'rgba(212,196,168,0.22)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={2.5}
                  style={{ color: isActive ? 'var(--gold)' : 'rgba(212,196,168,0.7)' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 44,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{
                    color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.28)',
                    transition: 'color 0.15s',
                  }}
                />
              </div>
            )}

            {/* Label */}
            <span
              style={{
                fontSize: 9,
                fontWeight: isActive ? 800 : 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isActive
                  ? 'var(--gold)'
                  : isHighlight
                  ? 'rgba(212,196,168,0.55)'
                  : 'rgba(255,255,255,0.25)',
                transition: 'color 0.15s',
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
