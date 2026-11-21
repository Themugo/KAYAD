import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileFilterDrawer from '../../components/mobile/MobileFilterDrawer';

// STAGE 12 PHASE C REGRESSION TEST
//
// This dialog already had role="dialog"/aria-modal="true" and an Escape
// handler before Stage 12 -- those were not the gap. Tracing it revealed
// it never actually moved keyboard focus into itself on open, never
// trapped Tab/Shift+Tab inside the panel while open, and never restored
// focus to whatever opened it once closed. These tests assert the actual
// focus behavior, not just the static role attributes that already
// existed.

const baseFilters = {
  brand: 'All',
  fuel: 'All',
  transmission: 'All',
  bodyType: 'All',
  condition: 'All',
  yearMin: 'All',
  yearMax: 'All',
  auctionOnly: false,
  verifiedOnly: false,
  inspectedOnly: false,
};

function Harness({ open, onClose }) {
  return (
    <div>
      <button type="button">Open filters</button>
      <MobileFilterDrawer
        open={open}
        onClose={onClose}
        filters={baseFilters}
        onFilterChange={() => {}}
        onApply={() => {}}
        onReset={() => {}}
      />
    </div>
  );
}

describe('MobileFilterDrawer focus management (Stage 12 Phase C)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves focus to the close button when it opens', async () => {
    vi.useFakeTimers();
    const trigger = document.createElement('button');
    trigger.textContent = 'Open filters (real)';
    document.body.appendChild(trigger);
    trigger.focus();

    render(<Harness open={true} onClose={() => {}} />);
    await vi.runAllTimersAsync();

    expect(screen.getByLabelText('Close filters')).toHaveFocus();
    document.body.removeChild(trigger);
  });

  it('traps Tab within the panel instead of letting focus leave to the page behind it', async () => {
    vi.useFakeTimers();
    render(<Harness open={true} onClose={() => {}} />);
    await vi.runAllTimersAsync();

    const closeButton = screen.getByLabelText('Close filters');
    const applyButton = screen.getByRole('button', { name: /Show.*Results|Show \d+ Filters/i });

    // Shift+Tab from the first focusable element (the close button) must
    // wrap around to the last focusable element (the Apply button), not
    // escape the dialog.
    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(applyButton).toHaveFocus();

    // Tab from the last element must wrap back to the first.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(closeButton).toHaveFocus();
  });

  it('returns focus to whatever opened it once closed', async () => {
    vi.useFakeTimers();
    const trigger = document.createElement('button');
    trigger.textContent = 'Open filters (real)';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<Harness open={true} onClose={() => {}} />);
    await vi.runAllTimersAsync();
    expect(screen.getByLabelText('Close filters')).toHaveFocus();

    rerender(<Harness open={false} onClose={() => {}} />);

    expect(trigger).toHaveFocus();
    document.body.removeChild(trigger);
  });

  it('still closes on Escape (pre-existing behavior, unchanged)', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Harness open={true} onClose={onClose} />);
    await vi.runAllTimersAsync();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
