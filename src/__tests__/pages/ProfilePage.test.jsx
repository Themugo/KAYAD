import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../../pages/Profile';

vi.mock('../../hooks/usePageMeta', () => ({ default: () => {} }));
vi.mock('../../api/api', () => ({
  authAPI: { me: vi.fn().mockResolvedValue({}) },
  paymentsAPI: { list: vi.fn().mockResolvedValue({ payments: [] }) },
  reviewsAPI: {
    aboutMe: vi.fn().mockResolvedValue({ reviews: [] }),
    forDealer: vi.fn().mockResolvedValue({ reviews: [] }),
  },
  carsAPI: { analytics: vi.fn().mockResolvedValue({}) },
  formatKES: vi.fn(v => `KES ${(v / 1000).toFixed(0)}K`),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'TestUser', email: 'test@test.com', joined: '2024-01-01', role: 'dealer' },
    isAuth: true,
    isDealer: true,
    isSeller: true,
    updateUser: vi.fn(),
  }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../utils/helpers', () => ({
  timeAgo: () => '1mo ago',
  formatDate: () => 'Jan 1, 2024',
  initials: () => 'TU',
  validatePassword: () => ({ score: 0, label: 'Weak' }),
}));
vi.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null, SkeletonText: () => null }));
vi.mock('../../components/ReferralStats', () => ({ default: () => null }));
vi.mock('../../components/BackButton', () => ({ default: () => null }));

describe('ProfilePage', () => {
  afterEach(() => { cleanup(); });

  it('renders profile section', () => {
    render(<MemoryRouter><ProfilePage setPage={vi.fn()} authUser={null} /></MemoryRouter>);
    // Profile page should render without crashing
    expect(document.body).toBeInTheDocument();
  });
});
