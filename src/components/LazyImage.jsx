import { useState, useEffect } from 'react';
import useIntersectionObserver from '../hooks/useIntersectionObserver';

export default function LazyImage({ src, alt, fallback, style, className, onLoad, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [inView, setInView] = useState(false);
  const [imgRef, entry] = useIntersectionObserver({ once: true });

  useEffect(() => {
    if (entry?.isIntersecting) setInView(true);
  }, [entry]);

  const imgSrc = (!errored && src) || fallback ||
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

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
      {inView && (
        <img
          src={imgSrc}
          alt={alt || ''}
          decoding="async"
          loading="lazy"
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={() => { setErrored(true); onError?.(); }}
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
