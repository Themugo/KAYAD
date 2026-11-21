import { Vehicle } from '../types';
import { readEscrowRulesConfig } from '../features/Admin/hooks/escrowRulesConfig';

/**
 * Escrow applicability and labeling, driven by the admin-configurable
 * escrow rules (features/Admin/hooks/escrowRulesConfig) rather than
 * hardcoded rules.
 *
 * Live-mode gate: the platform is not yet CBK-certified to operate a
 * live escrow/payment-holding service, so liveMode defaults to false
 * and every escrow badge is labeled "(Preview)". Escrow must never be
 * presented as a live financial guarantee until an admin deliberately
 * flips liveMode on (an action recorded in the admin audit log).
 *
 * Per-sale override: an admin can enforce or revoke escrow on an
 * individual vehicle (escrowOverride). The override takes precedence
 * over the global seller-type rules in both directions.
 */

type EscrowOverride = 'enforce' | 'revoke' | null | undefined;

function getOverride(vehicle: Vehicle): EscrowOverride {
  return (vehicle as Vehicle & { escrowOverride?: EscrowOverride }).escrowOverride;
}

function isPrivateSeller(vehicle: Vehicle): boolean {
  return vehicle.sellerType === 'Private Seller';
}

/** Effective requirement from the global admin rules, before per-sale override. */
function globalRequirement(vehicle: Vehicle): 'mandatory' | 'optional' | 'disabled' {
  const config = readEscrowRulesConfig();
  return isPrivateSeller(vehicle) ? config.privateSellerRequirement : config.dealerRequirement;
}

/**
 * Evaluates whether Escrow Vault protection is applicable for a given vehicle.
 *
 * STAGE 8 FIX: vehicle.escrowEligible (sourced from the backend's
 * server-enforced cars.escrow_enabled field — see vehicleApi.ts) is now an
 * absolute precondition for every branch below. Previously, the
 * "mandatory" global-policy tier returned true unconditionally, without
 * even checking escrowEligible. Since the admin-configurable rules
 * (features/Admin/hooks/escrowRulesConfig.ts) are a client-side
 * presentation/policy layer, not a backend grant, that meant an admin
 * setting "Dealer requirement: Mandatory" in the in-app admin panel would
 * display an "Escrow Mandatory" trust badge on every dealer vehicle even
 * though the backend hard-enforces escrow_enabled=false for every
 * dealer-owned car (vehicle escrow is a private-seller-only product —
 * see backend/controllers/carController.js). That is exactly the
 * fabricated trust signal the master prompt prohibits ("Never show the
 * escrow badge merely because... the admin has globally configured
 * escrow... The badge must belong to the actual vehicle/listing").
 *
 * Corrected precedence:
 * 1. Not escrowEligible (backend-authoritative capability) -> never
 *    applicable, regardless of policy tier or override. This is the one
 *    rule nothing below may bypass.
 * 2. A per-sale admin "revoke" override still wins -> never applicable.
 *    (escrowOverride has no backend write path yet; see
 *    ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md — this remains
 *    inert scaffolding today, kept for forward compatibility.)
 * 3. A per-sale "enforce" override requires eligibility too (it can no
 *    longer manufacture capability for an ineligible vehicle) — but once
 *    eligible, it still forces the badge on even under a "disabled"
 *    global policy tier, same as before.
 * 4. Otherwise the admin-configured global rule applies: "disabled" turns
 *    it off even for an eligible vehicle; "mandatory"/"optional" both
 *    resolve to true once eligibility is already confirmed.
 */
export function isEscrowApplicable(vehicle: Vehicle | null | undefined): boolean {
  if (!vehicle) return false;
  if (!vehicle.escrowEligible) return false;

  const override = getOverride(vehicle);
  if (override === 'revoke') return false;
  if (override === 'enforce') return true;

  const requirement = globalRequirement(vehicle);
  if (requirement === 'disabled') return false;
  return true;
}

/**
 * True only when an admin has deliberately activated live escrow mode.
 * Defaults to false — the platform is not yet CBK-certified, so escrow
 * runs as a clearly-labeled preview, not a live financial product.
 */
export function isEscrowLive(): boolean {
  return readEscrowRulesConfig().liveMode === true;
}

/**
 * Returns the escrow status badge label, reflecting the effective
 * requirement (including any per-sale override). While liveMode is off
 * the label carries a "(Preview)" suffix so no UI presents escrow as a
 * live financial guarantee.
 */
export function getEscrowBadgeLabel(vehicle: Vehicle): string {
  const override = getOverride(vehicle);
  const mandatory =
    override === 'enforce'
      ? true
      : override === 'revoke'
        ? false
        : globalRequirement(vehicle) === 'mandatory';

  const base = mandatory ? 'Escrow Mandatory' : 'Escrow Vault Enabled';
  return isEscrowLive() ? base : `${base} (Preview)`;
}
