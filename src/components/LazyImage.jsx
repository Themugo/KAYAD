import { useState, useEffect } from 'react';
import useIntersectionObserver from '../hooks/useIntersectionObserver';

const FALLBACK_CHAIN = [
  'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=1200&auto=format&fit=crop',
  'https://placehold.co/800x533/1a1a2e/D4C4A8?text=Car+Image',
];

export default function LazyImage({ src, alt, fallback, style, className, onLoad, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [imgRef, entry] = useIntersectionObserver({ once: true });
  const [currentSrc, setCurrentSrc] = useState(null);
  const [chainIdx, setChainIdx] = useState(0);

  const chain = [src, fallback, ...FALLBACK_CHAIN].filter(Boolean);

  useEffect(() => {
    if (entry?.isIntersecting) setInView(true);
  }, [entry]);

  useEffect(() => {
    setLoaded(false);
    setChainIdx(0);
  }, [src, fallback]);

  useEffect(() => {
    if (inView) setCurrentSrc(chain[chainIdx]);
  }, [inView, chainIdx]);

  const handleError = () => {
    const next = chainIdx + 1;
    if (next < chain.length) {
      setChainIdx(next);
      setLoaded(false);
    }
    onError?.();
  };

  return (
    <div ref={imgRef} className={className} style={{ position: 'relative', overflow: 'hidden', background: '#111', ...style }}>
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)',
          backgroundSize: '200% 100%',
          animation: inView ? 'shimmer 1.5s infinite' : 'none',
        }} />
      )}
      {inView && currentSrc && (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt || ''}
          decoding="async"
          loading="lazy"
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={handleError}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: loaded ? 1 : 0.3,
            transition: 'opacity 0.4s ease',
            display: 'block',
          }}
          {...rest}
        />
      )}
    </div>
  );
}
