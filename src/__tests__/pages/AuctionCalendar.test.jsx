import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuctionCalendar from '../../pages/AuctionCalendar';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));

describe('AuctionCalendar', () => {
  afterEach(() => { cleanup(); });

  it('renders auction calendar heading', () => {
    render(
      <MemoryRouter>
        <AuctionCalendar />
      </MemoryRouter>
    );
    expect(screen.getByText('Auction House')).toBeInTheDocument();
  });

  it('shows filter tabs', () => {
    render(
      <MemoryRouter>
        <AuctionCalendar />
      </MemoryRouter>
    );
    expect(screen.getByText('All Auctions')).toBeInTheDocument();
    expect(screen.getByText('🟢 Live Now')).toBeInTheDocument();
    expect(screen.getByText('⏳ Upcoming')).toBeInTheDocument();
  });
});
