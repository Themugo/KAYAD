import { Vehicle } from '../types';

/**
 * Evaluates whether Escrow Vault protection is applicable for a given vehicle.
 * Rules:
 * 1. Private Seller listings MUST ALWAYS require Escrow Vault protection.
 * 2. Dealer listings ONLY display/use Escrow Vault protection if explicitly enabled (escrowEligible === true).
 */
export function isEscrowApplicable(vehicle: Vehicle | null | undefined): boolean {
  if (!vehicle) return false;
  if (vehicle.sellerType === 'Private Seller') return true;
  if (vehicle.sellerType === 'Verified Dealer') return Boolean(vehicle.escrowEligible);
  return Boolean(vehicle.escrowEligible);
}

/**
 * Returns the dynamic label for the Escrow status badge based on backend vehicle seller properties.
 */
export function getEscrowBadgeLabel(vehicle: Vehicle): string {
  if (vehicle.sellerType === 'Private Seller') {
    return 'Escrow Mandatory';
  }
  return 'Escrow Vault Enabled';
}
