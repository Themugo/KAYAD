/**
 * Advanced Optimized Image Component
 * Features:
 * - Progressive blur-up loading
 * - Responsive srcset generation
 * - Lazy loading with intersection observer
 * - Multiple CDN support (Cloudinary, Unsplash, etc.)
 * - Error fallbacks with graceful degradation
 * - Memory-efficient image loading
 */

import { useState, useEffect, useRef, memo, useCallback, CSSProperties } from 'react';

interface ImageSource {
  src: string;
  width?: number;
  height?: number;
  type?: string;
}

interface OptimizedImageProps {
  src?: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  loading?: 'lazy' | 'eager' | 'auto';
  priority?: boolean; // High priority = preload
  placeholder?: 'blur' | 'color' | 'none';
  placeholderColor?: string;
  fallbackSrc?: string;
  fallbackChain?: string[];
  onLoad?: () => void;
  onError?: (error: Error) => void;
  sizes?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  objectPosition?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  decoding?: 'auto' | 'sync' | 'async';
}

// Responsive breakpoints for srcset
const BREAKPOINTS = [
  { name: '320w', width: 320 },
  { name: '480w', width: 480 },
  { name: '640w', width: 640 },
  { name: '800w', width: 800 },
  { name: '1024w', width: 1024 },
  { name: '1280w', width: 1280 },
  { name: '1600w', width: 1600 },
  { name: '1920w', width: 1920 },
];

// Generate optimized URL for different CDNs
function getOptimizedUrl(url: string | undefined, width: number, quality = 80): string {
  if (!url) return '';
  
  // Cloudinary
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/image/upload/', `/image/upload/w_${width},q_${quality},f_auto/`);
  }
  
  // Unsplash
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${quality}&auto=format&fit=crop`;
  }
  
  // Pexels
  if (url.includes('pexels.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${quality}&auto=compress&cs=tinysrgb`;
  }
  
  // Return original URL with cache-busting for other sources
  if (!url.includes('?')) {
    return `${url}?w=${width}&q=${quality}`;
  }
  return url;
}

// Generate srcset string
function generateSrcSet(url: string | undefined): string {
  if (!url) return '';
  return BREAKPOINTS
    .map(bp => `${getOptimizedUrl(url, bp.width)} ${bp.name}`)
    .join(', ');
}

// Generate blur placeholder (tiny base64)
function generateBlurPlaceholder(color = '#1a1a2e'): string {
  // Simple SVG blur placeholder
  return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="${color}" width="1" height="1"/></svg>`)}`;
}

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  loading = 'lazy',
  priority = false,
  placeholder = 'blur',
  placeholderColor = '#1a1a2e',
  fallbackSrc,
  fallbackChain = [],
  onLoad,
  onError,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  aspectRatio,
  objectFit = 'cover',
  objectPosition = 'center',
  crossOrigin,
  decoding = 'async',
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Build source chain: original + fallbacks
  const sourceChain = [
    src,
    fallbackSrc,
    ...fallbackChain,
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=800&auto=format&fit=crop', // Ultimate fallback
  ].filter(Boolean) as string[];
  
  // Current source
  const currentSrc = sourceChain[currentSrcIndex];
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager' || priority) {
      setInView(true);
      return;
    }
    
    const container = containerRef.current;
    if (!container) return;
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );
    
    observerRef.current.observe(container);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading, priority]);
  
  // Handle load success
  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  }, [onLoad]);
  
  // Handle error with fallback chain
  const handleError = useCallback(() => {
    if (currentSrcIndex < sourceChain.length - 1) {
      // Try next source in chain
      setCurrentSrcIndex(prev => prev + 1);
    } else {
      // All sources failed
      setError(true);
      onError?.(new Error(`Failed to load image: ${src}`));
    }
  }, [currentSrcIndex, sourceChain.length, src, onError]);
  
  // Generate optimized srcset
  const srcSet = useMemo(() => {
    if (!inView) return '';
    return generateSrcSet(currentSrc);
  }, [currentSrc, inView]);
  
  // Blur placeholder style
  const placeholderStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundColor: placeholderColor,
    transition: 'opacity 0.4s ease-out',
    opacity: loaded ? 0 : 1,
  };
  
  // Image style
  const imageStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
    opacity: loaded ? 1 : 0,
    transition: 'opacity 0.4s ease-out',
  };
  
  // Preload high priority images
  useEffect(() => {
    if (priority && currentSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getOptimizedUrl(currentSrc, 1920);
      if (crossOrigin) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, currentSrc, crossOrigin]);
  
  return (
    <div
      ref={containerRef}
      className={`optimized-image ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: placeholderColor,
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : '100%',
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : 'auto',
        aspectRatio,
        ...style,
      }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && !loaded && (
        <div style={placeholderStyle}>
          <img
            src={generateBlurPlaceholder(placeholderColor)}
            alt=""
            aria-hidden="true"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px)',
              transform: 'scale(1.1)', // Prevent blur edge artifacts
            }}
          />
        </div>
      )}
      
      {/* Color placeholder */}
      {placeholder === 'color' && !loaded && (
        <div style={placeholderStyle} />
      )}
      
      {/* Actual image */}
      {inView && currentSrc && !error && (
        <img
          ref={imgRef}
          src={getOptimizedUrl(currentSrc, 800)}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding={decoding}
          crossOrigin={crossOrigin}
          onLoad={handleLoad}
          onError={handleError}
          style={imageStyle}
        />
      )}
      
      {/* Error state */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '1.5rem',
          }}
        >
          🚗
        </div>
      )}
    </div>
  );
});

// Need to import useMemo for the component
import { useMemo } from 'react';

export default OptimizedImage;
