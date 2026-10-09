import type { BackendEscrow, EscrowPartyAction, EscrowStatus, EscrowViewerRole } from '../../services/escrowApi';

/**
 * Plain-language model of the escrow lifecycle, one-to-one with the backend's
 * eight states (backend/services/escrowStateMachine.js and the
 * kayad_transition_escrow_atomic RPC). Nothing here decides whether an action
 * is allowed — the server returns `availableActions` — this file only words
 * what the states and facts mean, without claiming more than the records prove.
 */

export type Tone = 'neutral' | 'progress' | 'attention' | 'success' | 'danger';

export const STATUS_ORDER: EscrowStatus[] = ['pending', 'funded', 'vehicle_confirmed', 'delivered', 'released', 'closed'];

export const STATUS_LABEL: Record<EscrowStatus, string> = {
  pending: 'Awaiting funding',
  funded: 'Funds held',
  vehicle_confirmed: 'Vehicle accepted',
  delivered: 'Delivery confirmed',
  disputed: 'In dispute',
  released: 'Released for settlement',
  refunded: 'Refund approved',
  closed: 'Closed',
};

export const STATUS_TONE: Record<EscrowStatus, Tone> = {
  pending: 'neutral', funded: 'progress', vehicle_confirmed: 'progress', delivered: 'progress',
  disputed: 'attention', released: 'success', refunded: 'attention', closed: 'neutral',
};

export const formatKes = (n: number | null | undefined): string => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

export const formatDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ACTION_LABEL: Record<EscrowPartyAction, string> = {
  view_funding_instructions: 'Funding instructions',
  confirm_vehicle: 'I have inspected and accept this vehicle',
  request_release: 'Ask KAYAD to release the funds',
  confirm_delivery: 'Confirm the vehicle was delivered',
  open_dispute: 'Raise a dispute',
};

export interface StatusStory {
  headline: string;
  detail: string;
  /** Who has to move next. */
  waitingOn: 'you' | 'other' | 'kayad' | 'none';
  /** What the records do and do not show about the money. Never "vault"/"locked" language. */
  funds: string;
}

/** The story of a deal from the point of view of the person reading it. */
export function storyFor(deal: BackendEscrow, role: EscrowViewerRole): StatusStory {
  const buyer = role === 'buyer';
  const seller = role === 'seller';
  const amount = formatKes(deal.amount);
  const wasFunded = Boolean(deal.fundedAt);
  const releaseBy = formatDate(deal.autoReleaseEligibleAt);

  switch (deal.status) {
    case 'pending':
      return {
        headline: buyer ? 'Waiting for your funding to be verified' : seller ? 'Waiting for the buyer’s funding' : 'Awaiting funding',
        detail: buyer
          ? 'Pay using the instructions below. Starting a payment is not the same as KAYAD confirming it: this escrow only becomes funded after KAYAD verifies your transfer.'
          : 'Nothing should change hands until KAYAD confirms the escrow is funded.',
        waitingOn: buyer ? 'you' : 'other',
        funds: 'No funds are recorded as held yet.',
      };
    case 'funded':
      return {
        headline: buyer ? 'Inspect the vehicle, then confirm it' : seller ? 'Waiting for the buyer to inspect and accept' : 'Funds held',
        detail: buyer
          ? `Check the vehicle against the listing. Accepting it tells KAYAD you are satisfied; it does not pay the seller by itself.${releaseBy ? ` If nobody acts, the escrow becomes eligible for automatic release from ${releaseBy}.` : ''}`
          : `The buyer must inspect and accept the vehicle before delivery is confirmed.${releaseBy ? ` The escrow becomes eligible for automatic release from ${releaseBy} if nobody acts.` : ''}`,
        waitingOn: buyer ? 'you' : 'other',
        funds: `${amount} is recorded as held in escrow by KAYAD.`,
      };
    case 'vehicle_confirmed':
      return {
        headline: seller ? 'Confirm delivery' : buyer ? 'Waiting for the seller to confirm delivery' : 'Vehicle accepted',
        detail: seller
          ? 'The buyer has accepted the vehicle. Confirm delivery once the handover is complete.'
          : `You have accepted the vehicle. When the handover is complete you can ask KAYAD to release the funds, or raise a dispute if something is wrong.${releaseBy ? ` Automatic release becomes possible from ${releaseBy}.` : ''}`,
        waitingOn: seller ? 'you' : 'other',
        funds: `${amount} is recorded as held in escrow by KAYAD.`,
      };
    case 'delivered':
      return {
        headline: buyer ? 'Release the funds or raise an issue' : seller ? 'Waiting for KAYAD to release the funds' : 'Delivery confirmed',
        detail: buyer
          ? 'The seller confirmed delivery. Releasing is done by KAYAD staff after your request; if something is wrong, raise a dispute before release.'
          : 'Delivery is confirmed. KAYAD staff release the funds; the buyer can still raise a dispute until then.',
        waitingOn: buyer ? 'you' : 'kayad',
        funds: `${amount} is recorded as held in escrow by KAYAD.`,
      };
    case 'disputed':
      return {
        headline: 'A dispute is open',
        detail: 'KAYAD staff are reviewing it. The escrow cannot be released or refunded until staff decide.',
        waitingOn: 'kayad',
        funds: wasFunded ? `${amount} stays recorded as held while the dispute is reviewed.` : 'No funds were recorded as received before the dispute was opened.',
      };
    case 'released':
      return {
        headline: seller ? 'Released — payout is processed separately' : 'Released to the seller',
        detail: seller
          ? 'The escrow has been released for settlement. Paying it out to you is a separate step handled by KAYAD; closing the escrow does not by itself prove the money has arrived.'
          : 'The escrow has been released for settlement to the seller. Payout is a separate step handled by KAYAD.',
        waitingOn: seller ? 'kayad' : 'none',
        funds: 'Released for settlement. This screen does not show whether the payout has reached the seller.',
      };
    case 'refunded':
      return {
        headline: buyer ? 'Your refund was approved' : 'Refund approved',
        detail: 'A refund to the buyer was approved. Paying it out is a separate step handled by KAYAD; you will be notified when it is settled.',
        waitingOn: buyer ? 'kayad' : 'none',
        funds: 'A refund was approved. This screen does not show whether it has been paid out.',
      };
    case 'closed':
    default:
      return {
        headline: 'Closed',
        detail: 'KAYAD has closed this escrow. A closed escrow is an administrative record; check your payment history for the money movements.',
        waitingOn: 'none',
        funds: 'Closed. No further action is available.',
      };
  }
}

export interface TimelineStep { key: string; label: string; at?: string | null; state: 'done' | 'current' | 'upcoming' }

/** Happy-path progress with honest dates; disputes and refunds are shown as their own banner, not as a step. */
export function timelineFor(deal: BackendEscrow): TimelineStep[] {
  const done: Record<string, string | null | undefined> = {
    funded: deal.fundedAt,
    vehicle_confirmed: deal.vehicleConfirmedAt,
    delivered: deal.deliveredAt,
    released: deal.releasedAt,
    closed: deal.closedAt,
  };
  const steps: Array<{ key: EscrowStatus; label: string }> = [
    { key: 'funded', label: 'Funding verified' },
    { key: 'vehicle_confirmed', label: 'Vehicle accepted' },
    { key: 'delivered', label: 'Delivery confirmed' },
    { key: 'released', label: 'Released' },
    { key: 'closed', label: 'Closed' },
  ];
  const reached = steps.filter((s) => Boolean(done[s.key]));
  const lastIdx = reached.length ? steps.findIndex((s) => s.key === reached[reached.length - 1].key) : -1;
  const terminalSideways = deal.status === 'refunded' || deal.status === 'disputed';
  return steps.map((s, i) => ({
    key: s.key,
    label: s.label,
    at: done[s.key],
    state: done[s.key] ? 'done' : !terminalSideways && i === lastIdx + 1 && deal.status !== 'closed' ? 'current' : 'upcoming',
  }));
}

export const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: 'Opened', under_review: 'Under review', mediation: 'In mediation', resolved: 'Resolved', appealed: 'Appealed', closed: 'Closed',
};

/** Roles for which the operations desk is offered; the server still decides everything. */
export const STAFF_ROLES = ['admin', 'superadmin', 'escrow_officer', 'accounts'];
export const isStaffRole = (role?: string | null) => STAFF_ROLES.includes(String(role || ''));
