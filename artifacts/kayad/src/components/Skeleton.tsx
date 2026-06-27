// src/components/Skeleton.tsx
// Usage: <SkeletonCard /> or <SkeletonRow /> or <SkeletonText lines={3} />

const pulse = {
  background: 'linear-gradient(90deg, var(--surface) 25%, var(--card) 50%, var(--surface) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s infinite',
};

// Inject keyframes once
if (typeof document !== 'undefined') {
  const id = 'skeleton-kf';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
    document.head.appendChild(style);
  }
}

interface BlockProps {
  w?: string | number;
  h?: string | number;
  r?: number;
  style?: React.CSSProperties;
}

const Block = ({ w = '100%', h = 16, r = 6, style = {} }: BlockProps) => (
  <div style={{ width: w, height: h, borderRadius: r, ...pulse, ...style }} />
);

export function SkeletonCard() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Image */}
      <div style={{ aspectRatio: '16/9', ...pulse }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Block h={18} w="75%" r={4} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Block h={12} w="30%" />
          <Block h={12} w="25%" />
          <Block h={12} w="20%" />
        </div>
        <Block h={1} style={{ margin: '4px 0', background: 'var(--border)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Block h={22} w="40%" r={4} />
          <Block h={12} w="15%" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
  return (
    <div className="car-grid">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <Block w={36} h={36} r={18} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Block h={14} w="50%" />
        <Block h={11} w="30%" />
      </div>
      <Block h={14} w="80px" />
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText({ lines = 3 }: SkeletonTextProps) {
  const widths = ['100%', '85%', '70%', '90%', '60%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Block key={i} h={14} w={widths[i % widths.length]} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="stat-box">
      <Block h={11} w="60%" style={{ marginBottom: 8 }} />
      <Block h={28} w="40%" />
    </div>
  );
}
