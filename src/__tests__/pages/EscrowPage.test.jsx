import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EscrowPage from '../../pages/EscrowPage';

vi.mock('../../utils/helpers', () => ({
  timeAgo: vi.fn(() => '2mo ago'),
  formatDate: vi.fn(() => 'Jan 15, 2024'),
  formatKES: vi.fn((v) => `KES ${(v / 1000).toFixed(0)}K`),
}));

vi.mock('../../api/api', () => ({
  formatKES: vi.fn((v) => `KES ${(v / 1000).toFixed(0)}K`),
  escrowAPI: {
    mine: vi.fn().mockResolvedValue({
      escrows: [
        { id: '1', status: 'active', amount: 8500000, car: { title: 'Toyota Land Cruiser GX-R 2024', image: '' }, seller: 'Dealer A', buyer: 'Buyer A' },
        { id: '2', status: 'pending', amount: 4500000, car: { title: 'Mercedes GLE 450 2023', image: '' }, seller: 'Dealer B', buyer: 'Buyer B' },
      ],
    }),
  },
}));

vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ 
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', name: 'Test User' } }),
}));

describe('EscrowPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders escrow heading', async () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('🔒 My Escrow')).toBeInTheDocument();
    });
  });

  it('renders description', async () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/All your car purchase payments protected in escrow/i)).toBeInTheDocument();
    });
  });

  it('displays escrow transactions', async () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Toyota Land Cruiser GX-R 2024')).toBeInTheDocument();
      expect(screen.getByText('Mercedes GLE 450 2023')).toBeInTheDocument();
    });
  });
});
