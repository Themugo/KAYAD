import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DealerProfileModal } from '../../features/DealersView/components/DealerProfileModal';
import { INITIAL_DEALER_BUSINESSES } from '../../data/mockDealersData';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('DealerProfileModal', () => {
  const baseProps = {
    allDealers: INITIAL_DEALER_BUSINESSES,
    vehicles: INITIAL_VEHICLES,
    onClose: () => {},
    onQuickViewVehicle: () => {},
    onStartEscrow: () => {},
  };

  it('renders every dealer in INITIAL_DEALER_BUSINESSES without throwing', () => {
    for (const dealer of INITIAL_DEALER_BUSINESSES) {
      const { unmount } = render(<DealerProfileModal dealer={dealer} {...baseProps} />);
      unmount();
    }
  });

  it('renders nothing when dealer is null (closed state)', () => {
    const { container } = render(<DealerProfileModal dealer={null} {...baseProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('opens correctly when re-rendered from closed to open on the same instance (the real click path)', () => {
    // Same regression shape as VehicleDetailModal.test.tsx: this modal
    // is always mounted by DealersView.tsx, with open/closed controlled
    // by the `dealer` prop going from null to a real value on the SAME
    // instance - not a fresh mount. Every hook in this component used
    // to sit after an `if (!dealer) return null` guard at the very top,
    // so going from closed (0 hooks reached) to open (30 hooks reached)
    // was a hooks-count mismatch - the same bug and same crash
    // ("Minified React error #310") found in VehicleDetailModal.tsx.
    const dealer = INITIAL_DEALER_BUSINESSES[0];
    const { rerender } = render(<DealerProfileModal dealer={null} {...baseProps} />);

    expect(() => {
      rerender(<DealerProfileModal dealer={dealer} {...baseProps} />);
    }).not.toThrow();

    expect(screen.getByText(dealer.name)).toBeTruthy();

    expect(() => {
      rerender(<DealerProfileModal dealer={null} {...baseProps} />);
    }).not.toThrow();
  });
});
