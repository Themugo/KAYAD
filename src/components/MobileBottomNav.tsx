import { Home, Search, PlusCircle, User, Heart, BarChart3 } from 'lucide-react';

interface MobileBottomNavProps {
  authUser?: { id?: string; _id?: string } | null;
  activeNav: string;
  onNavigate: (nav: string) => void;
  onOpenCompare: () => void;
  onOpenAuth: () => void;
}

export default function MobileBottomNav({
  authUser,
  activeNav,
  onNavigate,
  onOpenCompare,
  onOpenAuth,
}: MobileBottomNavProps) {
  const items = [
    { key: 'home', label: 'Home', icon: Home, action: () => onNavigate('marketplace') },
    {
      key: 'search',
      label: 'Search',
      icon: Search,
      action: () => {
        onNavigate('marketplace');
        window.requestAnimationFrame(() => {
          document.getElementById('market-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      },
    },
    { key: 'saved', label: 'Saved', icon: Heart, action: () => onNavigate('saved') },
    { key: 'compare', label: 'Compare', icon: BarChart3, action: onOpenCompare },
    {
      key: 'account',
      label: authUser ? 'Account' : 'Sign In',
      icon: authUser ? User : PlusCircle,
      action: authUser ? () => onNavigate('dashboard') : onOpenAuth,
    },
  ];

  const isActive = (key: string) => {
    if (key === 'home' || key === 'search') return activeNav === 'marketplace';
    return key === activeNav;
  };

  return (
    <nav className="kayad-mobile-bottom-nav lg:hidden" aria-label="Mobile marketplace navigation">
      {items.map(({ key, label, icon: Icon, action }) => (
        <button
          key={key}
          type="button"
          onClick={action}
          className={`kayad-mobile-bottom-nav__item ${isActive(key) ? 'is-active' : ''}`}
          aria-current={isActive(key) ? 'page' : undefined}
        >
          <span className="kayad-mobile-bottom-nav__icon" aria-hidden="true">
            <Icon size={19} strokeWidth={isActive(key) ? 2.5 : 2} />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
