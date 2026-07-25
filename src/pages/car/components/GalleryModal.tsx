import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { firstImage } from './CarDetailWidgets';

interface GalleryModalProps {
  car: any;
  initialIdx?: number;
  onClose: () => void;
}

export default function GalleryModal({ car, initialIdx = 0, onClose }: GalleryModalProps) {
  const [idx, setIdx] = useState(initialIdx);
  const [zoom, setZoom] = useState(1);
  const images = car?.images || [];

  const total = images.length || 1;

  const prev = useCallback(() => {
    setIdx(i => (i - 1 + total) % total);
    setZoom(1);
  }, [total]);

  const next = useCallback(() => {
    setIdx(i => (i + 1) % total);
    setZoom(1);
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 3));
      else if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const src = firstImage(car, idx) || 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1600';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${car?.title || 'car'}-${idx + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
      >
        <X size={20} />
      </button>

      {/* Top info */}
      <div className="absolute top-4 left-4 flex items-center gap-4 z-10">
        <span className="text-white/60 text-sm font-medium">
          {idx + 1} / {total}
        </span>
        {car?.title && (
          <span className="text-white font-medium hidden sm:block truncate max-w-xs">
            {car.title}
          </span>
        )}
      </div>

      {/* Main image */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-zoom-in"
        onClick={() => setZoom(z => z > 1 ? 1 : 1.5)}
      >
        <img
          src={src}
          alt={car?.title || 'Vehicle'}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1600';
          }}
        />
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Bottom toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 z-10">
        <button
          onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <div className="w-16 text-center text-white text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => setZoom(z => Math.min(z + 0.5, 3))}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          onClick={handleDownload}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          title="Download image"
        >
          <Download size={18} />
        </button>
      </div>

      {/* Thumbnails strip */}
      {total > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-full px-4 z-10">
          {images.map((img: any, i: number) => {
            const thumbSrc = typeof img === 'string' ? img : img?.url;
            return (
              <button
                key={i}
                onClick={() => { setIdx(i); setZoom(1); }}
                className={`w-12 h-8 rounded overflow-hidden transition-all ${
                  i === idx
                    ? 'ring-2 ring-gold-500 opacity-100'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}

      {/* Touch swipe hint on mobile */}
      {total > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/40 text-xs sm:hidden">
          Swipe to navigate
        </div>
      )}
    </div>
  );
}
