import {
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Gavel,
  HelpCircle,
  Heart,
  Landmark,
  Lock,
  MapPin,
  PlusCircle,
  Radio,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Canonical KAYAD primary-navigation data.
 *
 * This is PRESENTATION structure only. It names destinations that already
 * exist in App.tsx's `activeNav` switch (and, for the Auction / Escrow tabs,
 * tabs that already exist inside AuctionsView / EscrowView). Nothing here
 * creates a page, a route, a permission or a feature.
 *
 *  - `navId` is what `onNavClick` receives. A `scope:value` id selects an
 *    existing tab of an existing destination (see App.handleNavClick).
 *  - `href` is the real, copyable/new-tab-able URL for the same destination
 *    (App.tsx resolves `?nav=` itself), so every entry is a genuine link.
 *  - `requiresAuth` only controls whether the entry is *shown*. It is not a
 *    security boundary: protected destinations are still gated by App.tsx's
 *    protectedNavs effect and by backend authorization.
 *  - Support is a direct link: its page has no separately addressable
 *    sub-destinations, so a dropdown would be invented structure.
 */
export interface NavChild {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  navId: string;
  href: string;
  requiresAuth?: boolean;
}

export interface NavPrimary {
  id: string;
  label: string;
  /** Compact presentation label for the 1024-1279px desktop band only. */
  compactLabel?: string;
  icon: LucideIcon;
  navId: string;
  href: string;
  /** Every `activeNav` value that means "the user is inside this section". */
  match: string[];
  children?: NavChild[];
}

export const NAV_PRIMARY: NavPrimary[] = [
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: Car,
    navId: 'marketplace',
    href: '/?nav=marketplace',
    match: ['marketplace', 'saved', 'financing', 'finance'],
    children: [
      { id: 'browse', label: 'Browse vehicles', description: 'Search listed vehicles across East Africa', icon: Car, navId: 'marketplace', href: '/?nav=marketplace' },
      { id: 'saved', label: 'Saved vehicles', description: 'The vehicles you have saved', icon: Heart, navId: 'saved', href: '/?nav=saved', requiresAuth: true },
      { id: 'financing', label: 'Vehicle financing', description: 'Explore financing for a vehicle purchase', icon: Landmark, navId: 'financing', href: '/?nav=financing' },
    ],
  },
  {
    id: 'auction',
    label: 'Auction',
    icon: Gavel,
    navId: 'discovery',
    href: '/?nav=discovery',
    match: ['discovery', 'auctions'],
    children: [
      { id: 'live', label: 'Live now', description: 'Vehicles open for bidding right now', icon: Radio, navId: 'auctions:live', href: '/?nav=auctions' },
      { id: 'scheduled', label: 'Starting soon', description: 'Scheduled auctions waiting to open', icon: Clock3, navId: 'auctions:scheduled', href: '/?nav=auctions&auctionTab=scheduled' },
      { id: 'ended', label: 'Completed', description: 'Closed auctions and their results', icon: CheckCircle2, navId: 'auctions:ended', href: '/?nav=auctions&auctionTab=ended' },
      { id: 'saved', label: 'Saved for you', description: 'Auctions you have saved', icon: Heart, navId: 'auctions:saved', href: '/?nav=auctions&auctionTab=saved', requiresAuth: true },
    ],
  },
  {
    id: 'inspection',
    label: 'Pre-Purchase Inspection',
    compactLabel: 'Inspection',
    icon: ShieldCheck,
    navId: 'inspections',
    href: '/?nav=inspections',
    match: ['inspections', 'inspection-marketplace'],
    children: [
      { id: 'request', label: 'Request an inspection', description: 'Inspect a vehicle before you commit', icon: ClipboardCheck, navId: 'inspections', href: '/?nav=inspections' },
      { id: 'providers', label: 'Find an inspection provider', description: 'Compare providers by location and service', icon: MapPin, navId: 'inspection-marketplace', href: '/?nav=inspection-marketplace' },
    ],
  },
  {
    id: 'escrow',
    label: 'Escrow',
    icon: Lock,
    navId: 'escrow:journey',
    href: '/?nav=escrow',
    match: ['escrow'],
    children: [
      { id: 'journey', label: 'Transaction journey', description: 'How a protected transaction moves to settlement', icon: Lock, navId: 'escrow:journey', href: '/?nav=escrow' },
      { id: 'deals', label: 'Protected deals', description: 'Follow your escrow transactions', icon: FileText, navId: 'escrow:deals', href: '/?nav=escrow', requiresAuth: true },
      { id: 'create', label: 'How escrow starts', description: 'How a deal enters escrow', icon: PlusCircle, navId: 'escrow:create', href: '/?nav=escrow' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: HelpCircle,
    navId: 'support',
    href: '/?nav=support',
    match: ['support'],
  },
];

export const visibleChildren = (item: NavPrimary, signedIn: boolean): NavChild[] =>
  (item.children || []).filter((child) => !child.requiresAuth || signedIn);
