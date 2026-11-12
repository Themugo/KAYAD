/**
 * Canonical mapping from the stored listing status (`cars.status`) to the user-facing lifecycle shown in the
 * unified personal dashboard. It is a pure, read-only view of the EXISTING backend statuses; it introduces no second
 * status system and never writes anything.
 *
 * Stored values (cars_status_check): available | sold | pending | reserved | hidden | draft
 * (legacy aliases still seen in older payloads: active, approved, under_review, submitted).
 *
 * Known representational limit (owner decision D3, see backend/routes/adminRoutes.js ~807): the database has no
 * `rejected`, `changes_requested`, `withdrawn` or `archived` value. A moderation "reject" is stored as `hidden`.
 * `hidden` therefore means "not published" and is deliberately NOT presented as "Rejected": the stored data cannot
 * tell a moderation decision apart from an owner withdrawal, and inventing that distinction would misinform users.
 */
export type ListingLifecycleState = 'draft' | 'under_review' | 'active' | 'reserved' | 'hidden' | 'sold' | 'unknown';

export interface ListingLifecycleInfo {
  state: ListingLifecycleState;
  label: string;
  description: string;
  marketplaceVisible: boolean;
  /** Owner actions that make sense in this state (UI hints only: the backend enforces what is actually permitted). */
  ownerActions: Array<'edit' | 'submit' | 'view' | 'contact_support'>;
}

const INFO: Record<Exclude<ListingLifecycleState, 'unknown'>, Omit<ListingLifecycleInfo, 'state'>> = {
  draft: { label: 'Draft', description: 'Saved but not submitted. Only you can see it.', marketplaceVisible: false, ownerActions: ['edit', 'submit'] },
  under_review: { label: 'Under review', description: 'Submitted and waiting for a moderation decision. It stays here until a decision is recorded.', marketplaceVisible: false, ownerActions: ['view'] },
  active: { label: 'Active', description: 'Approved and visible on the marketplace.', marketplaceVisible: true, ownerActions: ['view', 'edit'] },
  reserved: { label: 'Reserved', description: 'A buyer has an active transaction on this vehicle.', marketplaceVisible: true, ownerActions: ['view'] },
  hidden: { label: 'Not published', description: 'Hidden from the marketplace (a moderation decision or removal). Contact support to find out what is needed to publish it.', marketplaceVisible: false, ownerActions: ['view', 'contact_support'] },
  sold: { label: 'Sold', description: 'Sale completed.', marketplaceVisible: false, ownerActions: ['view'] },
};

const ALIASES: Record<string, Exclude<ListingLifecycleState, 'unknown'>> = {
  draft: 'draft',
  pending: 'under_review',
  under_review: 'under_review',
  submitted: 'under_review',
  available: 'active',
  active: 'active',
  approved: 'active',
  reserved: 'reserved',
  hidden: 'hidden',
  sold: 'sold',
};

export function getListingLifecycle(status: string | null | undefined, sold?: boolean | null): ListingLifecycleInfo {
  const raw = String(status ?? '').trim().toLowerCase();
  const key = sold === true ? 'sold' : ALIASES[raw];
  if (!key) {
    return { state: 'unknown', label: raw ? `Status: ${raw}` : 'Status unavailable', description: 'This listing has a status the dashboard does not recognise.', marketplaceVisible: false, ownerActions: ['view', 'contact_support'] };
  }
  return { state: key, ...INFO[key] };
}

export function countByLifecycle(listings: Array<{ status?: string | null; sold?: boolean | null }>): Record<ListingLifecycleState, number> {
  const counts: Record<ListingLifecycleState, number> = { draft: 0, under_review: 0, active: 0, reserved: 0, hidden: 0, sold: 0, unknown: 0 };
  for (const l of listings) counts[getListingLifecycle(l.status, l.sold).state] += 1;
  return counts;
}
