import { useEffect, useState } from 'react';
import { House, Search, PlusCircle, MessageCircle, UserRound } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';

/** Event the Navbar listens for to open its existing mobile menu (single menu implementation). */
export const OPEN_MOBILE_MENU_EVENT = 'kayad:open-mobile-menu';

interface MobileBottomNavProps {
  /** Retained for call-site compatibility. Account identity does not select a different mobile dock. */
  authUser?: { id?: string; _id?: string; role?: string } | null;
  activeNav: string;
  activeSection?: string;
  onNavigate: (nav: string) => void;
  /** Kept for call-site compatibility; secondary destinations remain in the canonical account/navigation surfaces. */
  onOpenCompare?: () => void;
  onOpenAuth?: () => void;
}

/**
 * One KAYAD personal-account dock for buying and selling.
 * A person's account identity is not switched when they move between marketplace,
 * selling tools, messages or account management. Business tools remain capability-
 * and permission-gated inside the existing destinations, not by a second dock.
 */
export default function MobileBottomNav({ authUser, activeNav, activeSection = 'overview', onNavigate }: MobileBottomNavProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedTab, setSelectedTab] = useState('home');

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom;
    const syncSafeSpace = () => {
      document.body.style.paddingBottom = window.innerWidth < 1024
        ? 'calc(104px + env(safe-area-inset-bottom))'
        : previousPadding;
    };
    syncSafeSpace();
    window.addEventListener('resize', syncSafeSpace);
    return () => {
      window.removeEventListener('resize', syncSafeSpace);
      document.body.style.paddingBottom = previousPadding;
    };
  }, []);

  useEffect(() => {
    if (activeNav === 'marketplace') setSelectedTab('home');
    else if (activeNav === 'dashboard') {
      if (activeSection === 'messages') setSelectedTab('messages');
      else setSelectedTab(['my-vehicles', 'create-listing', 'performance'].includes(activeSection) ? 'sell' : 'account');
    }
    else if (['seller-platform', 'seller-dashboard', 'seller', 'sell', 'dealer-dashboard', 'dealership-workspace'].includes(activeNav)) setSelectedTab('sell');
    else if (activeNav === 'chat') setSelectedTab('messages');
    else if (['profile', 'buyer-platform'].includes(activeNav)) setSelectedTab('account');
  }, [activeNav, activeSection]);

  const scrollToResults = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('market-results')?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  // Dealer organizations retain their own independent workspace navigation and mobile drawer.
  // The personal five-item dock must never replace or obscure that business navigation.
  if (String(authUser?.role || '').toLowerCase() === 'dealer') return null;

  const items = [
    { key: 'home', label: 'Home', icon: House,
      action: () => { setSelectedTab('home'); onNavigate('marketplace'); window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }); } },
    { key: 'search', label: 'Search', icon: Search,
      action: () => { setSelectedTab('search'); onNavigate('marketplace'); scrollToResults(); } },
    { key: 'sell', label: 'Sell', icon: PlusCircle,
      action: () => { setSelectedTab('sell'); onNavigate('dashboard:create-listing'); } },
    { key: 'messages', label: 'Messages', icon: MessageCircle,
      action: () => { setSelectedTab('messages'); onNavigate('chat'); } },
    { key: 'account', label: 'Account', icon: UserRound,
      action: () => { setSelectedTab('account'); onNavigate('dashboard:account'); } },
  ];

  return (
    <nav className="kayad-mobile-bottom-nav lg:hidden" aria-label="Personal account navigation">
      {items.map(({ key, label, icon: Icon, action }) => {
        const active = selectedTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={action}
            className={`kayad-mobile-bottom-nav__item kayad-mobile-bottom-nav__item--${key} ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="kayad-mobile-bottom-nav__icon" aria-hidden="true">
              <Icon size={23} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
