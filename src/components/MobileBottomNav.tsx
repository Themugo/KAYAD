import { useEffect, useState } from 'react';
import { House, CarFront, Gavel, Heart } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';

/** Event the Navbar listens for to open its existing mobile menu (single menu implementation). */
export const OPEN_MOBILE_MENU_EVENT = 'kayad:open-mobile-menu';

interface MobileBottomNavProps {
  authUser?: { id?: string; _id?: string } | null;
  activeNav: string;
  onNavigate: (nav: string) => void;
  /** Kept for call-site compatibility; Compare/Saved/Account remain in the existing menu. */
  onOpenCompare?: () => void;
  onOpenAuth?: () => void;
}

/** Small, purpose-drawn vector: mechanic leaning over an open bonnet. */
function MechanicRepairIcon({ size = 24, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* vehicle body, wheel and open bonnet */}
        <path d="M3.5 20.5h2.1l2-5.1c.5-1.2 1.4-1.9 2.8-1.9h5.8l4.4 3.1h5.7c1.2 0 2.2 1 2.2 2.2v3.8h-3.2" />
        <path d="M7.6 15.3 5.1 11l9.1-5.2 5.1 5.5" />
        <path d="M8.2 23a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 0 0-4.6 0ZM22.2 23a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 0 0-4.6 0Z" />
        {/* mechanic's head, cap, bent torso and reaching arm */}
        <path d="M17.1 4.6c1.7-1.2 4.2-.6 5.1 1.2l-4.9 1.5-1.4-1.2 1.2-1.5Z" />
        <path d="M18.1 8.2c1.6-.5 3.1.5 3.5 2 .4 1.6-.6 3.1-2.1 3.5-1.6.4-3.1-.6-3.5-2.1" />
        <path d="M17 13.3 13.7 16l-1.2 3.1 4.1.8 2.6-4.1 3.2-1.1" />
        <path d="m21.9 14.7 2.4 2.3 2.1-.6M13.4 19.1l-1.7 3.2M16.2 19.8l-1.1 3.1" />
      </g>
    </svg>
  );
}

export default function MobileBottomNav({ activeNav, onNavigate }: MobileBottomNavProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedTab, setSelectedTab] = useState('home');

  useEffect(() => {
    // Route changes outside this dock reset its local Home/Showroom distinction.
    // Both use the canonical marketplace surface; Showroom simply scrolls to results.
    if (activeNav === 'marketplace') {
      setSelectedTab((current) => current === 'showroom' ? current : 'home');
    } else if (activeNav === 'discovery' || activeNav === 'auctions') {
      setSelectedTab('auction');
    } else if (activeNav === 'inspections' || activeNav === 'inspection-marketplace') {
      setSelectedTab('services');
    } else if (activeNav === 'saved') {
      setSelectedTab('saved');
    } else {
      setSelectedTab('home');
    }
  }, [activeNav]);

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom;
    const syncSafeSpace = () => {
      const isMobile = window.innerWidth < 1024;
      document.body.style.paddingBottom = isMobile
        ? 'calc(84px + env(safe-area-inset-bottom))'
        : previousPadding;
    };
    syncSafeSpace();
    window.addEventListener('resize', syncSafeSpace);
    return () => {
      window.removeEventListener('resize', syncSafeSpace);
      document.body.style.paddingBottom = previousPadding;
    };
  }, []);

  const scrollToResults = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('market-results')?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const items = [
    {
      key: 'home', label: 'Home', tone: 'home', icon: House,
      action: () => { setSelectedTab('home'); onNavigate('marketplace'); window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }); },
    },
    {
      key: 'showroom', label: 'Showroom', tone: 'showroom', icon: CarFront,
      action: () => { setSelectedTab('showroom'); onNavigate('marketplace'); scrollToResults(); },
    },
    { key: 'auction', label: 'Auction', tone: 'auction', icon: Gavel, action: () => { setSelectedTab('auction'); onNavigate('discovery'); } },
    { key: 'services', label: 'Services', tone: 'services', icon: MechanicRepairIcon, action: () => { setSelectedTab('services'); onNavigate('inspections'); } },
    { key: 'saved', label: 'Saved', tone: 'saved', icon: Heart, action: () => { setSelectedTab('saved'); onNavigate('saved'); } },
  ];

  const isActive = (key: string) => {
    if (key === 'home' || key === 'showroom') return activeNav === 'marketplace' && selectedTab === key;
    if (key === 'auction') return selectedTab === key && (activeNav === 'discovery' || activeNav === 'auctions');
    if (key === 'services') return selectedTab === key && (activeNav === 'inspections' || activeNav === 'inspection-marketplace');
    return key === 'saved' && activeNav === 'saved';
  };

  return (
    <nav className="kayad-mobile-bottom-nav lg:hidden" aria-label="Mobile marketplace navigation">
      {items.map(({ key, label, icon: Icon, tone, action }) => {
        const active = isActive(key);
        return (
          <button
            key={key}
            type="button"
            onClick={action}
            className={`kayad-mobile-bottom-nav__item kayad-mobile-bottom-nav__item--${tone} ${active ? 'is-active' : ''}`}
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
