import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EscrowPage from '../../pages/EscrowPage';

vi.mock('../../utils/helpers', () => ({
  timeAgo: vi.fn(() => '2mo ago'),
  formatDate: vi.fn(() => 'Jan 15, 2024'),
  formatKES: vi.fn((v) => `KES ${(v / 1000).toFixed(0)}K`),
}));

describe('EscrowPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders escrow heading', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText('My Escrow Transactions')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText(/All your escrow-protected transactions/i)).toBeInTheDocument();
  });

  it('displays escrow transactions', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText('Toyota Land Cruiser GX-R 2024')).toBeInTheDocument();
    expect(screen.getByText('Mercedes GLE 450 2023')).toBeInTheDocument();
  });
});
