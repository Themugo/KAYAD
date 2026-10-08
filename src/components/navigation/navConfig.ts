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

/**
 * ── Admin navigation authority (Stage 14A) ───────────────────────────────
 *
 * The admin (PUT /api/admin/config -> platform_config.navigation, read back
 * through GET /api/admin/public/config) may control PRESENTATION STATE of the
 * destinations above: primary visible/hidden, primary order, dropdown on/off,
 * child visible/hidden, child order. It can NOT add a destination, route,
 * label, href, icon, style or markup: this function only ever selects and
 * reorders entries of the code-owned NAV_PRIMARY.
 *
 * It is total and defensive. Anything missing, malformed or unknown is
 * ignored, and the canonical NAV_PRIMARY is the result for any config that is
 * absent, unusable or would leave no navigation. Marketplace and Support can
 * never be hidden (mirrors backend NAVIGATION_LOCKED_VISIBLE).
 */
export const NAV_LOCKED_VISIBLE: readonly string[] = ['marketplace', 'support'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Items named in `listed` first (in that order), then the rest in canonical order. */
function orderByListed<T extends { id: string }>(canonical: T[], listed: string[]): T[] {
  const byId = new Map(canonical.map((c) => [c.id, c] as const));
  const out: T[] = [];
  const used = new Set<string>();
  for (const id of listed) {
    const hit = byId.get(id);
    if (hit && !used.has(id)) { out.push(hit); used.add(id); }
  }
  for (const c of canonical) if (!used.has(c.id)) out.push(c);
  return out;
}

export function applyNavigationConfig(raw: unknown, base: NavPrimary[] = NAV_PRIMARY): NavPrimary[] {
  try {
    if (!isRecord(raw) || !Array.isArray(raw.items) || raw.items.length === 0) return base;
    const entries = new Map<string, Record<string, unknown>>();
    const listedIds: string[] = [];
    for (const e of raw.items) {
      if (!isRecord(e) || typeof e.id !== 'string' || entries.has(e.id)) continue;
      if (!base.some((b) => b.id === e.id)) continue;
      entries.set(e.id, e);
      listedIds.push(e.id);
    }
    if (entries.size === 0) return base;

    const resolved: NavPrimary[] = [];
    for (const item of orderByListed(base, listedIds)) {
      const e = entries.get(item.id);
      const hidden = !!e && e.visible === false && !NAV_LOCKED_VISIBLE.includes(item.id);
      if (hidden) continue;
      if (!item.children || !e) { resolved.push(item); continue; }

      let children = item.children;
      if (Array.isArray(e.children)) {
        const kids = e.children.filter((c): c is Record<string, unknown> => isRecord(c) && typeof c.id === 'string');
        const hiddenKids = new Set(kids.filter((c) => c.visible === false).map((c) => c.id as string));
        children = orderByListed(children, kids.map((c) => c.id as string)).filter((c) => !hiddenKids.has(c.id));
      }
      // dropdown off (or every child hidden) => direct link, same destination.
      if (e.dropdown === false || children.length === 0) {
        resolved.push({ ...item, children: undefined });
      } else {
        resolved.push({ ...item, children });
      }
    }
    return resolved.length > 0 ? resolved : base;
  } catch {
    return base;
  }
}
