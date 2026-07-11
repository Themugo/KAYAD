import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DealerVerificationStatus from '../../../pages/dealer/DealerVerificationStatus';

vi.mock('../../../api/api', () => ({
  dealerAPI: {
    getVerificationStatus: vi.fn().mockResolvedValue({
      status: 'pending',
      steps: [
        { id: 'business', status: 'verified' },
        { id: 'phone', status: 'verified' },
        { id: 'email', status: 'pending' },
        { id: 'identity', status: 'unverified' },
        { id: 'location', status: 'unverified' },
      ],
    }),
    submitVerification: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'Test Dealer', role: 'dealer', approved: true },
    isAuth: true,
  }),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../../components/dealer', () => ({
  DealerHub: ({ children }) => <div data-testid="dealer-hub">{children}</div>,
}));

describe('DealerVerificationStatus', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders verification page', async () => {
    render(
      <MemoryRouter>
        <DealerVerificationStatus />
      </MemoryRouter>
    );
    expect(await screen.findByText('Account Verification')).toBeInTheDocument();
  });

  it('loads verification status from API', async () => {
    const { dealerAPI } = await import('../../../api/api');
    
    render(
      <MemoryRouter>
        <DealerVerificationStatus />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(dealerAPI.getVerificationStatus).toHaveBeenCalled();
    });
  });

  it('displays verification steps', async () => {
    render(
      <MemoryRouter>
        <DealerVerificationStatus />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Business Verification')).toBeInTheDocument();
    });
  });

  it('shows progress bar for incomplete verification', async () => {
    render(
      <MemoryRouter>
        <DealerVerificationStatus />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Verification Progress')).toBeInTheDocument();
    });
  });

  it('displays verified status for completed steps', async () => {
    render(
      <MemoryRouter>
        <DealerVerificationStatus />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    });
  });

  it('shows benefits section', async () => {
    render(
      <MemoryRouter>
        <DealerVerificationStatus />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Benefits of Verification')).toBeInTheDocument();
    });
  });
});
