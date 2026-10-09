import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockUser = { id: 'd1', role: 'dealer', status: 'pending' };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, setUser: () => {} }) }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../api/api', () => ({ dealerAPI: { getOnboarding: vi.fn().mockResolvedValue({ dealer: null }), completeOnboarding: vi.fn() } }));

import DealerOnboarding from '../../pages/dealer/DealerOnboarding';

describe('DealerOnboarding completion screen', () => {
  const show = () => {
    window.history.pushState({}, '', '/dealer/onboarding?complete=1');
    render(<MemoryRouter><DealerOnboarding /></MemoryRouter>);
  };
  it('says submitted for review, not "all set up", for a pending dealer', () => {
    mockUser = { id: 'd1', role: 'dealer', status: 'pending' };
    show();
    expect(screen.getByText('Submitted for review')).toBeInTheDocument();
    expect(screen.getByText(/cannot list vehicles until your dealer account is approved/i)).toBeInTheDocument();
    expect(screen.queryByText(/all set up/i)).toBeNull();
  });
  it('the ?complete=1 flag alone never claims approval', () => {
    mockUser = { id: 'd1', role: 'dealer', status: 'rejected' };
    show();
    expect(screen.getByText('Submitted for review')).toBeInTheDocument();
    expect(screen.queryByText('Your dealer account is approved')).toBeNull();
  });
  it('an approved account is told so', () => {
    mockUser = { id: 'd1', role: 'dealer', status: 'approved' };
    show();
    expect(screen.getByText('Your dealer account is approved')).toBeInTheDocument();
  });
});
