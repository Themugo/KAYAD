import { SkeletonStat, SkeletonRow, CardSkeleton } from '../../ui/Skeleton';
import { SkeletonCard, SkeletonGrid } from './SkeletonCard';

export function LoadingPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className="car-grid">
        <SkeletonGrid count={6} />
      </div>
    </div>
  );
}

export function LoadingList() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
