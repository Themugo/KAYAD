// src/pages/car/components/CarDetailWidgets.jsx
// Extracted sub-components from CarDetailPage.jsx

import { useState, useCallback, useRef, useEffect } from 'react';
import { useCompare } from '../../../context/CompareContext';
import { ChevronLeft, ChevronRight, Star, BarChart3 } from 'lucide-react';

export function firstImage(car, idx = 0) {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

export function GalleryImage({ car, idx, onPrev, onNext, total }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touchX = useRef(null);
  const src = (!err && firstImage(car, idx)) ||
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1600&fit=crop';

  useEffect(() => { setErr(false); setLoaded(false); }, [idx]);

  const handleTouchStart = useCallback((e) => { touchX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 50) onPrev();
    else if (dx < -50) onNext();
    touchX.current = null;
  }, [onPrev, onNext]);

  return (
    <div className="car-detail-gallery"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {!loaded && <div className="gallery-shimmer" />}
      <img key={idx} src={src} onError={() => setErr(true)} onLoad={() => setLoaded(true)} alt={car?.title || 'Vehicle'} decoding="async"
        style={{ opacity: loaded ? 1 : 0.3, transition: 'opacity 0.5s ease' }} />

      <div className="gallery-overlay" />

      {total > 1 && (
        <>
          <button onClick={onPrev} className="gallery-nav-btn gallery-nav-left"><ChevronLeft size={18} /></button>
          <button onClick={onNext} className="gallery-nav-btn gallery-nav-right"><ChevronRight size={18} /></button>
          <div className="gallery-counter">{idx + 1} / {total}</div>
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
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(251,191,36,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '5px 12px',
          display: 'flex', alignItems: 'center', gap: 5,
          zIndex: 5,
        }}>
          <span style={{ fontSize: 10 }}>🧪</span>
          <span style={{ fontSize: 11, color: '#0A1628', fontWeight: 800, letterSpacing: '0.06em' }}>DEMO</span>
        </div>
      )}
    </div>
  );
}

export function SpecItem({ icon: Icon, label, value, delay = 0 }) {
  if (!value) return null;
  return (
    <div className="spec-item" style={{ animationDelay: `${delay}ms` }}>
      <div className="spec-item-header">
        <Icon size={12} className="spec-item-icon" />
        <span className="spec-item-label">{label}</span>
      </div>
      <div className="spec-item-value">{value}</div>
    </div>
  );
}

export function CompareToggle({ car }) {
  const { compareCount, maxCompare, addCar, removeCar, isComparing } = useCompare();
  const isComp = isComparing(car._id);
  const full = compareCount >= maxCompare;

  if (!car?._id) return null;

  return (
    <button onClick={() => isComp ? removeCar(car._id) : addCar(car._id)}
      disabled={!isComp && full}
      className={`compare-toggle ${isComp ? 'compare-active' : ''}`}>
      <BarChart3 size={13} />
      {isComp ? 'Added to Compare' : full ? 'Compare full (max 4)' : 'Add to Compare'}
    </button>
  );
}
