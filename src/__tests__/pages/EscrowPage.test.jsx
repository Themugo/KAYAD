import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EscrowPage from '../../pages/EscrowPage';

vi.mock('../../api/api', () => ({
  escrowAPI: { mine: vi.fn().mockResolvedValue({ escrows: [] }) },
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1' }, isAuth: true }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ 
    connected: true, 
    emit: vi.fn(), 
    on: vi.fn(() => vi.fn()), 
    off: vi.fn() 
  }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../utils/helpers', () => ({
  timeAgo: () => '2mo ago',
  formatDate: () => 'Jan 15, 2024',
  formatKES: (v) => `KES ${(v / 1000).toFixed(0)}K`,
}));

describe('EscrowPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders escrow heading', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText('🔒 Escrow Vault')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText(/Every purchase on KAYAD is protected by M-Pesa escrow/i)).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(await screen.findByText('No escrow records')).toBeInTheDocument();
  });

  it('shows browse cars link', async () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(await screen.findByText('Browse Cars →')).toBeInTheDocument();
  });

  it('renders summary cards', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText('Total Escrows')).toBeInTheDocument();
    expect(screen.getByText('Currently Locked')).toBeInTheDocument();
    expect(screen.getByText('Total Released')).toBeInTheDocument();
  });

  it('renders how-it-works steps', () => {
    render(<MemoryRouter><EscrowPage /></MemoryRouter>);
    expect(screen.getByText('You Pay')).toBeInTheDocument();
    expect(screen.getByText('Funds Locked')).toBeInTheDocument();
    expect(screen.getByText('Car Delivered')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
  });
});
