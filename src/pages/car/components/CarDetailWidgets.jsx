import { useState, useCallback, useRef, useEffect } from 'react';
import { useCompare } from '../../../context/CompareContext';
import { ChevronLeft, ChevronRight, Star, BarChart3, Expand } from 'lucide-react';

export function firstImage(car, idx = 0) {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

export function GalleryImage({ car, idx, onPrev, onNext, total, onExpand }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touchX = useRef(null);
  const src = (!err && firstImage(car, idx)) ||
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&fit=crop';

  useEffect(() => { setErr(false); setLoaded(false); }, [idx]);

  const handleTouchStart = useCallback((e) => { touchX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 60) onPrev();
    else if (dx < -60) onNext();
    touchX.current = null;
  }, [onPrev, onNext]);

  return (
    <div className="car-detail-gallery"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}
    >
      {!loaded && <div className="gallery-shimmer" />}
      <img key={idx} src={src} onError={() => setErr(true)} onLoad={() => setLoaded(true)}
        alt={car?.title || 'Vehicle'} decoding="async" fetchPriority="high"
        style={{
          width: '100%', aspectRatio: '16/9', objectFit: 'cover',
          opacity: loaded ? 1 : 0.3, transition: 'opacity 0.5s ease',
          display: 'block',
        }}
      />
      <div className="gallery-overlay" />

      {total > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="gallery-nav-btn gallery-nav-left"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="gallery-nav-btn gallery-nav-right"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
            <ChevronRight size={20} />
          </button>
          <div className="gallery-counter"
            style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 5, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              borderRadius: 20, padding: '3px 12px', fontSize: 11,
              color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em',
            }}>
            {idx + 1} / {total}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
            style={{
              position: 'absolute', bottom: 12, right: 12, zIndex: 5,
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
            aria-label="Fullscreen"
          >
            <Expand size={14} />
          </button>
        </>
      )}

      {car?.isPromoted && (
        <div className="gallery-badge-featured">
          <Star size={10} />
          <span>FEATURED</span>
        </div>
      )}

      {car?.isDemo && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 5,
          background: 'rgba(251,191,36,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '4px 10px',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <Star size={10} style={{ color: '#000' }} />
          <span style={{ fontSize: 9, color: '#000', fontWeight: 800, letterSpacing: '0.08em' }}>DEMO</span>
        </div>
      )}
    </div>
  );
}

export function SpecItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="spec-item">
      <div className="spec-icon-wrap"><Icon size={13} /></div>
      <div>
        <div className="spec-label">{label}</div>
        <div className="spec-value">{value}</div>
      </div>
    </div>
  );
}

export function CompareToggle({ car }) {
  const { compareIds, addCar, removeCar } = useCompare();
  if (!car) return null;
  const isIn = compareIds.includes(car._id);
  return (
    <div className="sidebar-block">
      <button onClick={() => isIn ? removeCar(car._id) : addCar(car._id)}
        className={`sidebar-block-btn ${isIn ? 'sidebar-block-btn-active' : ''}`}>
        <BarChart3 size={14} />
        {isIn ? 'Remove from Compare' : 'Add to Compare'}
      </button>
    </div>
  );
}
