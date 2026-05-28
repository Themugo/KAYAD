import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LoadingPage, LoadingList } from '../../components/LoadingPage';

vi.mock('../../components/Skeleton', () => ({
  SkeletonCard: () => <div data-testid="skeleton-card">Card</div>,
  SkeletonRow: () => <div data-testid="skeleton-row">Row</div>,
  SkeletonStat: () => <div data-testid="skeleton-stat">Stat</div>,
}));

describe('LoadingPage', () => {
  afterEach(() => { cleanup(); });

  it('renders 4 stats and 6 cards', () => {
    const { container } = render(<LoadingPage />);
    expect(container.querySelectorAll('[data-testid="skeleton-stat"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-testid="skeleton-card"]')).toHaveLength(6);
  });
});

describe('LoadingList', () => {
  afterEach(() => { cleanup(); });

  it('renders 5 rows', () => {
    const { container } = render(<LoadingList />);
    expect(container.querySelectorAll('[data-testid="skeleton-row"]')).toHaveLength(5);
  });
});
