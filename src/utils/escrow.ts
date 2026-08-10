import { Vehicle } from '../types';
import { readEscrowRulesConfig } from '../features/Admin/hooks/escrowRulesConfig';

/**
 * Evaluates whether Escrow Vault protection is applicable for a given
 * vehicle. Previously hardcoded ("Private Seller listings MUST ALWAYS
 * require Escrow Vault protection; Dealer listings ONLY if
 * escrowEligible === true") - now reads from the admin-configurable
 * EscrowRulesConfig instead, per explicit direction to let admins set
 * rules like this without code changes. The default config
 * (DEFAULT_ESCROW_RULES_CONFIG in escrowRulesConfig.ts) matches this
 * function's exact previous hardcoded behavior, so nothing about the
 * app's actual behavior changes until an admin edits a setting.
 *
 * Eligibility itself (this function) is independent of the config's
 * liveMode flag - a vehicle is still correctly identified as
 * escrow-eligible even while liveMode is off (not yet CBK-certified),
 * so the UI and demo flows work exactly as they do today. What
 * liveMode gates is the disclosure/labeling shown to a real user (see
 * getEscrowBadgeLabel below) and, upstream, whether App.tsx's
 * handleStartEscrow actually lets someone proceed into a live escrow
 * flow - not whether this eligibility check itself returns true.
 */
export function isEscrowApplicable(vehicle: Vehicle | null | undefined): boolean {
  if (!vehicle) return false;
  const rules = readEscrowRulesConfig();
  const requirement =
    vehicle.sellerType === 'Private Seller' ? rules.privateSellerRequirement :
    vehicle.sellerType === 'Verified Dealer' ? rules.dealerRequirement :
    rules.dealerRequirement; // unrecognized/undefined sellerType falls back to the dealer rule, matching the original function's own fallback branch

  if (requirement === 'disabled') return false;
  if (requirement === 'mandatory') return true;
  // 'optional' - same as before, still gated on the specific listing's
  // own escrowEligible flag (an admin setting a seller type to
  // "optional" doesn't force it onto every listing of that type,
  // just permits it where the seller has opted in).
  return Boolean(vehicle.escrowEligible);
}

/** True once an admin has flipped the platform into live escrow mode
 * (i.e. CBK certification is in place). Exported separately from
 * isEscrowApplicable so callers can distinguish "is this vehicle
 * eligible" from "is escrow actually live on this platform right
 * now" - both are real, separate questions once liveMode exists. */
export function isEscrowLive(): boolean {
  return readEscrowRulesConfig().liveMode;
}

/**
 * Returns the dynamic label for the Escrow status badge based on
 * backend vehicle seller properties. Now also reflects liveMode: while
 * not yet live (pending CBK certification), appends a clear
 * "(Preview)" qualifier rather than silently presenting a
 * not-yet-real guarantee as fully active - an honest label matters
 * more here than anywhere else in the app, since this is about
 * financial protection specifically.
 */
export function getEscrowBadgeLabel(vehicle: Vehicle): string {
  const live = isEscrowLive();
  const base = vehicle.sellerType === 'Private Seller' ? 'Escrow Mandatory' : 'Escrow Vault Enabled';
  return live ? base : `${base} (Preview)`;
}
