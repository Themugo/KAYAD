import { useState, useRef, useEffect } from 'react';

function OptimizedImg({ src, alt, width, height, className, style, loading = 'lazy', imageTransform }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (loading !== 'lazy') { setInView(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '200px' }
    );
    if (imgRef.current) obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [loading]);

  // Supabase Storage owns media delivery. The backend may return a fully
  // qualified transformed URL; the component does not rewrite vendor URLs.
  const imgSrc = src;
  const srcSet = null;

  return (
    <div ref={imgRef} className={`opt-img-wrap${className ? ' ' + className : ''}`} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {!loaded && <div className="opt-img-placeholder" style={{ width: '100%', height: '100%', background: 'var(--skeleton)', animation: 'pulse 1.5s infinite' }} />}
      {inView && (
        <img
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          srcSet={srcSet || undefined}
          onLoad={() => setLoaded(true)}
          className={loaded ? 'opt-img opt-img--loaded' : 'opt-img'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        />
      )}
    </div>
  );
}

export default OptimizedImg;
