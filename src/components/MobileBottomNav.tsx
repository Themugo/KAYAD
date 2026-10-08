import { useEffect } from 'react';
import { Home, Search, Gavel, ShieldCheck, Menu } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';

/** Event the Navbar listens for to open its existing mobile menu (single menu implementation). */
export const OPEN_MOBILE_MENU_EVENT = 'kayad:open-mobile-menu';

interface MobileBottomNavProps {
  authUser?: { id?: string; _id?: string } | null;
  activeNav: string;
  onNavigate: (nav: string) => void;
  /** Kept for call-site compatibility; Compare/Saved/Account now live in the Menu tab. */
  onOpenCompare?: () => void;
  onOpenAuth?: () => void;
}

export default function MobileBottomNav({
  activeNav,
  onNavigate,
}: MobileBottomNavProps) {
  // STAGE 11 REDUCED-MOTION CONVERGENCE: reuse the shared hook instead of a
  // local matchMedia implementation (decorative scroll-behavior only — does
  // not affect any auction/bid/payment/escrow state).
  const prefersReducedMotion = usePrefersReducedMotion();

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

  const items = [
    { key: 'home', label: 'Home', icon: Home, action: () => onNavigate('marketplace') },
    {
      key: 'search',
      label: 'Search',
      icon: Search,
      action: () => {
        onNavigate('marketplace');
        window.requestAnimationFrame(() => {
          document.getElementById('market-results')?.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start',
          });
        });
      },
    },
    // Same destinations as the desktop navigation: 'discovery' is the canonical
    // Auction surface and 'inspections' is Pre-Purchase Inspection ("Inspection").
    { key: 'auction', label: 'Auction', icon: Gavel, action: () => onNavigate('discovery') },
    { key: 'inspection', label: 'Inspection', icon: ShieldCheck, action: () => onNavigate('inspections') },
    {
      key: 'menu',
      label: 'Menu',
      icon: Menu,
      action: () => window.dispatchEvent(new CustomEvent(OPEN_MOBILE_MENU_EVENT)),
    },
  ];

  const isActive = (key: string) => {
    if (key === 'home') return activeNav === 'marketplace';
    if (key === 'auction') return activeNav === 'discovery' || activeNav === 'auctions';
    if (key === 'inspection') return activeNav === 'inspections' || activeNav === 'inspection-marketplace';
    return false;
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
          aria-haspopup={key === 'menu' ? 'dialog' : undefined}
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
