import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import LazyImage from './LazyImage';

function firstImage(car, idx = 0) {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

export default function GalleryModal({ car, initialIdx = 0, onClose }) {
  const [idx, setIdx] = useState(initialIdx);
  const touchX = useRef(null);

  const images = car?.images || [];
  const total = images.length;

  const prev = useCallback(() => setIdx(i => (i > 0 ? i - 1 : total - 1)), [total]);
  const next = useCallback(() => setIdx(i => (i < total - 1 ? i + 1 : 0)), [total]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleTouchStart = useCallback((e) => { touchX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    touchX.current = null;
  }, [prev, next]);

  if (!car || total === 0) return null;

  const src = firstImage(car, idx);

  return (
    <div
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16, zIndex: 10,
        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '50%', width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
      >
        <X size={18} />
      </button>

      {total > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev(); }} style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
          >
            <ChevronLeft size={22} />
          </button>
          <button onClick={e => { e.stopPropagation(); next(); }} style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <div onClick={e => e.stopPropagation()} className="gallery-modal-image" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '60px 80px', width: '100%', maxHeight: 'calc(100vh - 120px)',
        cursor: 'default',
      }}>
        <div style={{
          position: 'relative', maxWidth: '100%', maxHeight: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LazyImage
            src={src}
            alt={car?.title || 'Vehicle'}
            style={{
              maxWidth: '100%', maxHeight: 'calc(100vh - 120px)',
              width: 'auto', height: 'auto',
              borderRadius: 4,
              objectFit: 'contain',
            }}
          />
          {car?.isPromoted && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(212,196,168,0.92)', backdropFilter: 'blur(8px)',
              borderRadius: 8, padding: '5px 10px',
            }}>
              <Star size={10} style={{ color: '#000' }} />
              <span style={{ fontSize: 10, color: '#000', fontWeight: 800, letterSpacing: '0.08em' }}>FEATURED</span>
            </div>
          )}
        </div>
      </div>

      <div onClick={e => e.stopPropagation()} style={{
        height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '0 16px', width: '100%',
        background: 'rgba(0,0,0,0.4)',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
          {idx + 1} / {total}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflow: 'auto', padding: '0 12px', flex: 1, justifyContent: 'center' }}>
          {images.map((img, i) => {
            const thumbSrc = typeof img === 'string' ? img : (img?.thumb || img?.url);
            return (
              <button key={i} onClick={() => setIdx(i)} style={{
                width: 48, height: 36, flexShrink: 0,
                border: i === idx ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.1)',
                borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
                padding: 0, background: '#111', transition: 'border 0.2s',
                opacity: i === idx ? 1 : 0.5,
              }}>
                <img src={thumbSrc} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
