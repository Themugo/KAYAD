import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Star, Maximize2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import LazyImage from './LazyImage';

interface CarImage {
  url?: string;
  thumb?: string;
  caption?: string;
}

interface Car {
  images?: (string | CarImage)[];
  title?: string;
  isPromoted?: boolean;
  year?: number;
  brand?: string;
  model?: string;
}

interface GalleryModalProps {
  car: Car | null;
  initialIdx?: number;
  onClose: () => void;
}

function firstImage(car: Car | null, idx = 0): string | null {
  const imgs = car?.images || [];
  const img = imgs[idx];
  if (!img) return null;
  return typeof img === 'string' ? img : img?.url || null;
}

function getImageCaption(img: string | CarImage | undefined): string {
  if (!img) return '';
  if (typeof img === 'string') return '';
  return img.caption || '';
}

export default function GalleryModal({ car, initialIdx = 0, onClose }: GalleryModalProps) {
  const [idx, setIdx] = useState(initialIdx);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const images = car?.images || [];
  const total = images.length;

  const prev = useCallback(() => {
    setIdx(i => (i > 0 ? i - 1 : total - 1));
    setZoom(1);
    setRotation(0);
  }, [total]);
  
  const next = useCallback(() => {
    setIdx(i => (i < total - 1 ? i + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [total]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 1)), []);
  const handleRotate = useCallback(() => setRotation(r => (r + 90) % 360), []);
  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoom > 1 || rotation !== 0) {
          handleReset();
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, prev, next, handleZoomIn, handleZoomOut, handleReset, zoom, rotation]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    touchX.current = null;
  }, [prev, next]);

  if (!car || total === 0) return null;

  const src = firstImage(car, idx);
  const caption = getImageCaption(images[idx]);

  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      aria-label="Close gallery"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: zoom > 1 ? 'grab' : 'zoom-out',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Header */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', zIndex: 20,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            {car?.year} {car?.brand} {car?.model}
          </span>
          {car?.isPromoted && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(212,196,168,0.2)', border: '1px solid rgba(212,196,168,0.3)',
              borderRadius: 9999, padding: '4px 10px',
            }}>
              <Star size={10} style={{ color: 'var(--gold)' }} />
              <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em' }}>FEATURED</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handleZoomOut} disabled={zoom <= 1} style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: zoom <= 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            opacity: zoom <= 1 ? 0.3 : 1,
          }}>
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 40, textAlign: 'center', fontWeight: 600 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} disabled={zoom >= 3} style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: zoom >= 3 ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            opacity: zoom >= 3 ? 0.3 : 1,
          }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={handleRotate} style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <RotateCw size={16} />
          </button>
          {(zoom > 1 || rotation !== 0) && (
            <button onClick={handleReset} style={{
              background: 'rgba(212,196,168,0.2)', border: '1px solid rgba(212,196,168,0.3)',
              borderRadius: 8, padding: '0 12px', height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold)', cursor: 'pointer', transition: 'all 0.2s', fontSize: 11, fontWeight: 700,
            }}>
              Reset
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev(); }} style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 52, height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
            backdropFilter: 'blur(8px)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
          >
            <ChevronLeft size={24} />
          </button>
          <button onClick={e => { e.stopPropagation(); next(); }} style={{
            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 52, height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
            backdropFilter: 'blur(8px)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Main image */}
      <div 
        ref={containerRef}
        onClick={e => e.stopPropagation()} 
        className="gallery-modal-image" 
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 100px', width: '100%', maxHeight: 'calc(100vh - 160px)',
          cursor: zoom > 1 ? 'grab' : 'default',
          overflow: 'hidden',
        }}
        onMouseDown={e => {
          if (zoom > 1) {
            e.currentTarget.style.cursor = 'grabbing';
          }
        }}
        onMouseUp={e => {
          if (zoom > 1) {
            e.currentTarget.style.cursor = 'grab';
          }
        }}
      >
        <div style={{
          position: 'relative', maxWidth: '100%', maxHeight: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.3s ease',
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
        }}>
          <LazyImage
            src={src}
            alt={car?.title || 'Vehicle'}
            style={{
              maxWidth: '100%', maxHeight: 'calc(100vh - 160px)',
              width: 'auto', height: 'auto',
              borderRadius: 8,
              objectFit: 'contain',
              boxShadow: zoom > 1 ? '0 20px 60px rgba(0,0,0,0.8)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '8px 16px',
          maxWidth: '80%', textAlign: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
            {caption}
          </span>
        </div>
      )}

      {/* Thumbnail strip */}
      <div onClick={e => e.stopPropagation()} style={{
        height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '0 24px', width: '100%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em', minWidth: 60 }}>
          {idx + 1} / {total}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflow: 'auto', padding: '0 8px', flex: 1, justifyContent: 'center' }}>
          {images.map((img, i) => {
            const thumbSrc = typeof img === 'string' ? img : (img?.thumb || img?.url);
            return (
              <button key={i} onClick={() => {
                setIdx(i);
                setZoom(1);
                setRotation(0);
              }} style={{
                width: 56, height: 42, flexShrink: 0,
                border: i === idx ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.15)',
                borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                padding: 0, background: '#111', transition: 'all 0.2s',
                opacity: i === idx ? 1 : 0.5,
                transform: i === idx ? 'scale(1.05)' : 'scale(1)',
              }}
                onMouseEnter={e => { if (i !== idx) { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                onMouseLeave={e => { if (i !== idx) { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.transform = 'scale(1)'; } }}
              >
                <img src={thumbSrc} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
