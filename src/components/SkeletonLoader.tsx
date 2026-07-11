/**
 * Comprehensive Skeleton Loading System
 * Provides consistent, performant loading states across the application
 */

import { memo, CSSProperties, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────
// Skeleton Base Component
// ─────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton = memo(function Skeleton({
  width,
  height = 20,
  borderRadius = 4,
  className = '',
  style,
  animation = 'wave',
}: SkeletonProps) {
  const animationStyle: CSSProperties = animation === 'wave' 
    ? {
        background: 'linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-highlight) 50%, var(--skeleton-base) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-wave 1.5s ease-in-out infinite',
      }
    : animation === 'pulse'
    ? {
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }
    : {};

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        backgroundColor: 'var(--skeleton-base)',
        ...animationStyle,
        ...style,
      }}
      aria-hidden="true"
    />
  );
});

// ─────────────────────────────────────────────────────────────
// Car Card Skeleton
// ─────────────────────────────────────────────────────────────

interface CarCardSkeletonProps {
  variant?: 'default' | 'compact' | 'list';
}

const CarCardSkeleton = memo(function CarCardSkeleton({ 
  variant = 'default' 
}: CarCardSkeletonProps) {
  if (variant === 'list') {
    return (
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        padding: 12, 
        background: 'var(--surface)', 
        borderRadius: 12,
        marginBottom: 12,
      }}>
        <Skeleton width={120} height={90} borderRadius={8} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
          <Skeleton width="30%" height={14} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <Skeleton width={80} height={20} style={{ marginBottom: 8 }} />
          <Skeleton width={60} height={12} />
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div style={{ padding: 12 }}>
        <Skeleton width="100%" height={100} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={12} />
      </div>
    );
  }

  // Default card
  return (
    <div style={{ 
      background: 'var(--card)', 
      borderRadius: 12, 
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      <Skeleton width="100%" height={180} borderRadius={0} animation="wave" />
      <div style={{ padding: 16 }}>
        <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 12 }} />
        <Skeleton width="40%" height={24} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <Skeleton width="25%" height={12} />
          <Skeleton width="25%" height={12} />
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Grid Skeleton
// ─────────────────────────────────────────────────────────────

interface GridSkeletonProps {
  count?: number;
  columns?: number;
  gap?: number;
  renderItem?: (index: number) => ReactNode;
}

const GridSkeleton = memo(function GridSkeleton({
  count = 8,
  columns = 4,
  gap = 16,
  renderItem,
}: GridSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {items.map(index => 
        renderItem 
          ? renderItem(index) 
          : <CarCardSkeleton key={index} />
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// List Skeleton
// ─────────────────────────────────────────────────────────────

interface ListSkeletonProps {
  count?: number;
  renderItem?: (index: number) => ReactNode;
}

const ListSkeleton = memo(function ListSkeleton({
  count = 5,
  renderItem,
}: ListSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  
  return (
    <div>
      {items.map(index =>
        renderItem
          ? renderItem(index)
          : <CarCardSkeleton key={index} variant="list" />
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Dashboard Skeleton
// ─────────────────────────────────────────────────────────────

const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Skeleton width={200} height={32} style={{ marginBottom: 8 }} />
          <Skeleton width={150} height={16} />
        </div>
        <Skeleton width={120} height={40} borderRadius={8} />
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ 
            padding: 20, 
            background: 'var(--surface)', 
            borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            <Skeleton width={32} height={32} borderRadius={8} style={{ marginBottom: 12 }} />
            <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={28} />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column */}
        <div>
          <Skeleton width={180} height={20} style={{ marginBottom: 16 }} />
          <GridSkeleton count={4} columns={2} />
        </div>

        {/* Right Column */}
        <div>
          <Skeleton width={150} height={20} style={{ marginBottom: 16 }} />
          <div style={{ 
            padding: 16, 
            background: 'var(--surface)', 
            borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ 
                display: 'flex', 
                gap: 12, 
                padding: '12px 0',
                borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              }}>
                <Skeleton width={40} height={40} borderRadius="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="40%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Table Skeleton
// ─────────────────────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  columnWidths?: (string | number)[];
}

const TableSkeleton = memo(function TableSkeleton({
  rows = 5,
  columns = 4,
  columnWidths,
}: TableSkeletonProps) {
  return (
    <div style={{ 
      background: 'var(--surface)', 
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: columnWidths 
          ? `repeat(${columns}, ${columnWidths.join(' ')})`
          : `repeat(${columns}, 1fr)`,
        gap: 16,
        padding: '14px 20px',
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
      }}>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} width={columnWidths?.[i] || 80} height={14} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: columnWidths
              ? `repeat(${columns}, ${columnWidths.join(' ')})`
              : `repeat(${columns}, 1fr)`,
            gap: 16,
            padding: '16px 20px',
            borderBottom: rowIndex < rows - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              width={typeof columnWidths?.[colIndex] === 'number' ? columnWidths[colIndex] * 0.7 : '70%'} 
              height={14} 
            />
          ))}
        </div>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// Page Skeleton
// ─────────────────────────────────────────────────────────────

interface PageSkeletonProps {
  type?: 'browse' | 'detail' | 'dashboard' | 'profile' | 'list';
  itemCount?: number;
}

const PageSkeleton = memo(function PageSkeleton({
  type = 'browse',
  itemCount = 8,
}: PageSkeletonProps) {
  switch (type) {
    case 'detail':
      return (
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Left: Image gallery */}
            <div>
              <Skeleton width="100%" height={400} borderRadius={12} style={{ marginBottom: 16 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} width="100%" height={80} borderRadius={8} />
                ))}
              </div>
            </div>

            {/* Right: Details */}
            <div>
              <Skeleton width="70%" height={32} style={{ marginBottom: 16 }} />
              <Skeleton width="40%" height={24} style={{ marginBottom: 24 }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <Skeleton width="50%" height={12} style={{ marginBottom: 8 }} />
                    <Skeleton width="80%" height={16} />
                  </div>
                ))}
              </div>

              <Skeleton width="100%" height={48} borderRadius={8} />
            </div>
          </div>
        </div>
      );

    case 'dashboard':
      return <DashboardSkeleton />;

    case 'profile':
      return (
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
            <Skeleton width={100} height={100} borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width={200} height={28} style={{ marginBottom: 8 }} />
              <Skeleton width={150} height={16} style={{ marginBottom: 16 }} />
              <Skeleton width="60%" height={14} />
            </div>
          </div>
          <GridSkeleton count={itemCount} columns={3} />
        </div>
      );

    case 'list':
      return <ListSkeleton count={itemCount} />;

    default: // browse
      return (
        <div style={{ padding: 24 }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Skeleton width={180} height={20} style={{ marginBottom: 8 }} />
            <Skeleton width={250} height={32} />
          </div>

          {/* Filters */}
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} width={100} height={40} borderRadius={8} />
            ))}
          </div>

          {/* Grid */}
          <GridSkeleton count={itemCount} columns={4} />
        </div>
      );
  }
});

// ─────────────────────────────────────────────────────────────
// Inline Loading Spinner
// ─────────────────────────────────────────────────────────────

interface InlineSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const InlineSpinner = memo(function InlineSpinner({
  size = 'md',
  color = 'var(--gold)',
}: InlineSpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 32 };
  const px = sizeMap[size];

  return (
    <div 
      className="spinner"
      role="status"
      aria-label="Loading"
      style={{
        width: px,
        height: px,
        borderColor: 'var(--border)',
        borderTopColor: color,
      }}
    />
  );
});

// ─────────────────────────────────────────────────────────────
// Loading Button
// ─────────────────────────────────────────────────────────────

interface LoadingButtonProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const LoadingButton = memo(function LoadingButton({
  children,
  loading = false,
  disabled = false,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
}: LoadingButtonProps) {
  const sizeStyles: Record<string, CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: 13 },
    md: { padding: '12px 24px', fontSize: 14 },
    lg: { padding: '14px 32px', fontSize: 16 },
  };

  const variantStyles: Record<string, CSSProperties> = {
    primary: { 
      background: loading ? 'var(--gold-400)' : 'var(--gold)', 
      color: '#000',
    },
    secondary: { 
      background: 'var(--surface)', 
      color: '#fff',
      border: '1px solid var(--border)',
    },
    outline: { 
      background: 'transparent', 
      color: 'var(--gold)',
      border: '1px solid var(--gold)',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        borderRadius: 8,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {loading && <InlineSpinner size="sm" />}
      {children}
    </button>
  );
});

// ─────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

const ProgressBar = memo(function ProgressBar({
  value,
  color = 'var(--gold)',
  height = 4,
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={className}>
      {showLabel && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: 4,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          <span>Progress</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div style={{ 
        height, 
        background: 'var(--border)', 
        borderRadius: height / 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${clampedValue}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 0.3s ease-out',
        }} />
      </div>
    </div>
  );
});

// Export all components
export {
  Skeleton,
  CarCardSkeleton,
  GridSkeleton,
  ListSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  PageSkeleton,
  InlineSpinner,
  LoadingButton,
  ProgressBar,
};

export default Skeleton;
