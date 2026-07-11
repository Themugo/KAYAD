import { memo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Premium mobile bottom navigation with animations
const NAV_ITEMS = [
  { id: '/', label: 'Home', icon: '🏠' },
  { id: '/browse', label: 'Browse', icon: '🚗' },
  { id: '/sell', label: 'Sell', icon: '+', isFab: true },
  { id: '/saved', label: 'Saved', icon: '♥' },
  { id: '/profile', label: 'Profile', icon: '👤' },
];

function MobileBottomNav({ className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = useCallback((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handlePress = useCallback((e, item) => {
    // Haptic feedback simulation via scale animation
    e.currentTarget.style.transform = 'scale(0.92)';
    setTimeout(() => {
      e.currentTarget.style.transform = '';
    }, 100);
    
    navigate(item.id);
  }, [navigate]);

  return (
    <nav 
      className={`mobile-bottom-nav ${className}`}
      aria-label="Mobile navigation"
      role="navigation"
    >
      {NAV_ITEMS.map((item) => {
        if (item.isFab) {
          return (
            <button
              key={item.id}
              className="mobile-bottom-nav__fab"
              onClick={(e) => handlePress(e, item)}
              aria-label="List a vehicle for sale"
            >
              <span aria-hidden="true">{item.icon}</span>
            </button>
          );
        }

        const active = isActive(item.id);
        return (
          <button
            key={item.id}
            className={`mobile-bottom-nav__item ${active ? 'mobile-bottom-nav__item--active' : ''}`}
            onClick={(e) => handlePress(e, item)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default memo(MobileBottomNav);
