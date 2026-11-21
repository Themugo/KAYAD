import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountdownDisplay } from '../../components/CountdownDisplay';
import { AuctionBidConfirmation, AuctionWinningCelebration } from '../../components/auction/AuctionWowExperience';

// STAGE 12 PHASE B REGRESSION TESTS
//
// Three previously-silent, purely-visual transitions that genuinely
// matter to a screen-reader user (an auction ending, a bid confirmation
// appearing, a win being confirmed) now carry role="status"/
// aria-live="polite". These tests render each component in isolation
// (no prior test file rendered any of them directly) and assert the
// actual announced role + text, not just that the text is present in the
// DOM -- the ticking countdown digits are deliberately NOT asserted as a
// live region, since the master prompt is explicit that a live region
// must not fire on every timer tick.

describe('CountdownDisplay (Stage 12 Phase B)', () => {
  it('announces "Auction Ended" via a polite status region once the countdown expires', () => {
    render(<CountdownDisplay endTime={new Date(Date.now() - 1000).toISOString()} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Auction Ended/i);
  });

  it('does not expose the ticking digits as a live region', () => {
    render(<CountdownDisplay endTime={new Date(Date.now() + 60 * 60 * 1000).toISOString()} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('AuctionBidConfirmation (Stage 12 Phase C/B)', () => {
  it('is a polite status announcement, not a focus-trapping dialog', () => {
    render(<AuctionBidConfirmation amount={3100000} open={true} onClose={() => {}} />);

    // Traced before fixing: this transient, auto-dismissing panel has no
    // confirm/cancel decision and closes itself after ~2.8s regardless of
    // user action, so it must NOT be exposed as a modal dialog (which
    // would imply a focus trap the panel can't honor once it vanishes on
    // its own).
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/BID REQUEST SENT/i);
    expect(status).toHaveTextContent(/3,100,000/);
  });

  it('renders nothing when closed', () => {
    render(<AuctionBidConfirmation amount={3100000} open={false} onClose={() => {}} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('AuctionWinningCelebration (Stage 12 Phase B)', () => {
  it('announces the winning moment via a polite status region', () => {
    render(
      <AuctionWinningCelebration
        title="2021 Toyota Prado"
        amount={3200000}
        onSettle={() => {}}
        onHistory={() => {}}
      />
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/You won 2021 Toyota Prado/i);
  });
});
