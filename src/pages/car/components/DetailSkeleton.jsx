export default function DetailSkeleton() {
  return (
    <div className="car-detail-page">
      <div className="detail-breadcrumb">
        <div style={{ width: 120, height: 14, borderRadius: 4, background: 'var(--card)', opacity: 0.4 }} />
      </div>
      <div className="detail-grid">
        <div className="detail-left">
          <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)', background: 'var(--card)', opacity: 0.3, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--card) 0%, var(--card-hover) 50%, var(--card) 100%)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ width: 88, height: 60, borderRadius: 8, background: 'var(--card)', opacity: 0.3, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--card) 0%, var(--card-hover) 50%, var(--card) 100%)' }} />)}
          </div>
        </div>
        <div>
          <div style={{ width: '100%', height: 300, borderRadius: 'var(--radius-lg)', background: 'var(--card)', opacity: 0.3, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--card) 0%, var(--card-hover) 50%, var(--card) 100%)' }} />
        </div>
      </div>
    </div>
  );
}
