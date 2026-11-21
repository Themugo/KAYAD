import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DealerAuctionSetup from '../../pages/dealer/DealerAuctionSetup';

// ============================================================
// STAGE 3 MARKETPLACE/VEHICLE/AUCTION CONVERGENCE — "draft counted as live"
// finding.
//
// groupedCars previously classified a car as "live" if EITHER its
// auctionStatus was 'live' OR its auctionEnd was still in the future
// (`isLive = !isEnded && (car.auctionStatus === 'live' || end > now)`).
// auctionSetup.service.js's publishAuctionSetup writes the real, future
// auctionEnd onto the car row at PUBLISH time, while auctionStatus stays
// 'draft' until the auction engine's timer actually starts it — so a
// published-but-not-yet-started auction was counted and rendered under the
// "Live" tab (ticking countdown, working-looking "End Auction" button) well
// before the backend would accept any bid on it.
// ============================================================

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../pages/dealer/components/DealerAuctionDraftCard', () => ({ default: () => <div data-testid="draft-card" /> }));
vi.mock('../../pages/dealer/components/DealerAuctionLiveCard', () => ({ default: () => <div data-testid="live-card" /> }));
vi.mock('../../pages/dealer/components/DealerAuctionEndedCard', () => ({ default: () => <div data-testid="ended-card" /> }));

vi.mock('../../api/api', () => ({
  dealerAPI: {
    cars: vi.fn().mockResolvedValue({
      cars: [
        {
          _id: 'car-published-not-started',
          title: 'Published, not yet started',
          auctionStatus: 'draft',
          // 3 days out — computed inline since vi.mock factories are
          // hoisted above any top-level variable in this file.
          auctionEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ],
    }),
  },
  dealerAuctionAPI: {},
}));

const renderPage = () => render(
  <MemoryRouter>
    <DealerAuctionSetup />
  </MemoryRouter>,
);

describe('DealerAuctionSetup — groupedCars authoritative status', () => {
  afterEach(() => { cleanup(); });

  it('counts a published-but-not-started (draft status, future auctionEnd) car under Setup, not Live', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Setup')).toBeInTheDocument());

    const setupTab = screen.getByText('Setup').closest('button');
    const liveTab = screen.getByText('Live').closest('button');

    // The count badge is the only other text node inside each tab button.
    expect(setupTab).toHaveTextContent('1');
    expect(liveTab).toHaveTextContent('0');
  });
});
