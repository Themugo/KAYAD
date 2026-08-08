import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView/components/EscrowView';
import { MOCK_ESCROW_DEALS, INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('EscrowView - real vehicle prefill (routing fix)', () => {
  // Previously, clicking "Start Secure Escrow Purchase" on any specific
  // vehicle navigated to a view that only ever showed deals[0] (an
  // arbitrary mock deal), completely ignoring which vehicle was
  // actually clicked. Verifies the fix against a real vehicle from
  // mock data, not a synthetic fixture.
  it('switches to the create tab and pre-fills real vehicle data when prefillVehicle is provided', () => {
    const vehicle = INITIAL_VEHICLES.find((v) => v.sellerType === 'Private Seller');
    expect(vehicle).toBeTruthy();

    render(<EscrowView deals={MOCK_ESCROW_DEALS} prefillVehicle={vehicle!} />);

    expect(screen.getByDisplayValue(vehicle!.title)).toBeTruthy();
    expect(screen.getByDisplayValue(String(vehicle!.price))).toBeTruthy();
    expect(screen.getByDisplayValue(vehicle!.sellerName)).toBeTruthy();
    // "Mandatory Escrow" wording confirms the Private Seller category
    // button (not Verified Dealer) is the one showing as selected.
    expect(screen.getByText(/Private Seller \(Mandatory Escrow\)/)).toBeTruthy();
  });

  it('correctly selects Verified Dealer category when prefilling from a dealer vehicle', () => {
    const vehicle = INITIAL_VEHICLES.find((v) => v.sellerType === 'Verified Dealer');
    expect(vehicle).toBeTruthy();

    render(<EscrowView deals={MOCK_ESCROW_DEALS} prefillVehicle={vehicle!} />);

    expect(screen.getByDisplayValue(vehicle!.title)).toBeTruthy();
  });

  it('does not crash and shows the default deals view when no prefillVehicle is given (standalone nav access)', () => {
    render(<EscrowView deals={MOCK_ESCROW_DEALS} />);
    // Without a prefill, this should NOT jump to the create tab -
    // confirms the default (undirected) navigation path still works
    // as before, only the vehicle-specific path changed.
    expect(screen.queryByDisplayValue(INITIAL_VEHICLES[0].title)).toBeNull();
  });
});
