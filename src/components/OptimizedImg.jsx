import { useState, useRef, useEffect } from 'react';

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Cloudinary transformation support
 * - Responsive srcset generation
 * - LQIP (Low Quality Image Placeholder) blur-up effect
 * - Error fallback handling
 * - WebP format auto-detection
 */
function OptimizedImg({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  style, 
  loading = 'lazy', 
  cloudinaryTransform,
  placeholder,
  fallbackSrc,
  aspectRatio,
}) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
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

  // Generate Cloudinary URL with transforms
  const getImageUrl = (url, transforms) => {
    if (!url) return null;
    
    // Cloudinary URL
    if (url.includes('res.cloudinary.com')) {
      const transform = transforms || cloudinaryTransform || 'f_auto,q_auto';
      return url.replace('/image/upload/', `/image/upload/${transform}/`);
    }
    
    // Supabase Storage URL - add width param if supported
    if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
      // CDN URLs typically support ?w= param
      const separator = url.includes('?') ? '&' : '?';
      return transforms ? `${url}${separator}width=1200` : url;
    }
    
    return url;
  };

  // Generate responsive srcset
  const getSrcSet = (url) => {
    if (!url) return null;
    
    if (url.includes('res.cloudinary.com')) {
      return [
        { w: 320, url: url.replace('/image/upload/', '/image/upload/w_320,f_auto,q_auto/') },
        { w: 640, url: url.replace('/image/upload/', '/image/upload/w_640,f_auto,q_auto/') },
        { w: 1024, url: url.replace('/image/upload/', '/image/upload/w_1024,f_auto,q_auto/') },
        { w: 1920, url: url.replace('/image/upload/', '/image/upload/w_1920,f_auto,q_auto/') },
      ].map(s => `${s.url} ${s.w}w`).join(', ');
    }
    
    return null;
  };

  const imgSrc = error ? (fallbackSrc || placeholder) : getImageUrl(src, cloudinaryTransform);
  const srcSet = getSrcSet(src);
  
  const handleError = () => {
    setError(true);
  };

  return (
    <div 
      ref={imgRef} 
      className={`opt-img-wrap${className ? ' ' + className : ''}`} 
      style={{ 
        position: 'relative', 
        overflow: 'hidden',
        aspectRatio: aspectRatio,
        ...style 
      }}
    >
      {/* Blur placeholder (LQIP) */}
      {placeholder && !loaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="opt-img-placeholder"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      
      {/* Loading skeleton */}
      {!loaded && !placeholder && (
        <div 
          className="opt-img-placeholder" 
          style={{ 
            width: '100%', 
            height: '100%', 
            background: 'var(--skeleton)', 
            animation: 'pulse 1.5s infinite' 
          }} 
        />
      )}
      
      {inView && imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          srcSet={srcSet || undefined}
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={loaded ? 'opt-img opt-img--loaded' : 'opt-img'}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            opacity: loaded ? 1 : 0, 
            transition: 'opacity 0.3s' 
          }}
        />
      )}
    </div>
  );
}

export default OptimizedImg;
