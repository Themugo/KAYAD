import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SkeletonCard, SkeletonGrid, SkeletonRow, SkeletonText, SkeletonStat } from '../../components/Skeleton';

describe('Skeleton components', () => {
  afterEach(() => { cleanup(); });

  it('SkeletonCard renders card structure', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.card')).toBeTruthy();
  });

  it('SkeletonGrid renders N cards', () => {
    const { container } = render(<SkeletonGrid count={3} />);
    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(3);
  });

  it('SkeletonRow renders', () => {
    const { container } = render(<SkeletonRow />);
    expect(container.querySelector('[style]')).toBeTruthy();
  });

  it('SkeletonText renders N lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    const blocks = container.children[0].children;
    expect(blocks).toHaveLength(4);
  });

  it('SkeletonStat renders', () => {
    const { container } = render(<SkeletonStat />);
    expect(container.querySelector('.stat-box')).toBeTruthy();
  });
});
