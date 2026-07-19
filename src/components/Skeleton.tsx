interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-cream-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// Preset skeleton components
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
      <Skeleton variant="rectangular" height={200} className="w-full" />
      <div className="p-5 space-y-3">
        <Skeleton width={80} height={12} />
        <Skeleton width="75%" height={20} />
        <div className="flex gap-2">
          <Skeleton width={60} height={24} variant="rounded" />
          <Skeleton width={60} height={24} variant="rounded" />
          <Skeleton width={60} height={24} variant="rounded" />
        </div>
        <Skeleton width={100} height={14} />
        <div className="h-px bg-cream-200" />
        <div className="flex justify-between">
          <Skeleton width={100} height={28} />
          <Skeleton width={60} height={24} variant="rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-cream-200">
          <Skeleton width={80} height={60} variant="rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
            <Skeleton width="30%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={14} />
      ))}
    </div>
  );
}
