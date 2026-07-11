/**
 * High-Performance Virtual Gallery
 * Optimized for 100,000+ vehicles with:
 * - Virtual scrolling (only renders visible items)
 * - Windowed rendering
 * - Skeleton loading for items outside viewport
 * - Infinite scroll with pagination
 * - Memory-efficient rendering
 */

import { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo, 
  memo,
  CSSProperties,
  ReactNode,
} from 'react';

interface VirtualGalleryProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  estimatedItemSize?: number;
  itemMinSize?: number;
  itemMaxSize?: number;
  columnCount?: number;
  gap?: number;
  overscan?: number; // Extra items to render outside viewport
  className?: string;
  style?: CSSProperties;
  onEndReached?: () => void;
  onStartReached?: () => void;
  endReachedThreshold?: number;
  startReachedThreshold?: number;
  hasMore?: boolean;
  loading?: boolean;
  loadingComponent?: ReactNode;
  emptyComponent?: ReactNode;
  skeletonCount?: number;
  skeletonComponent?: (index: number, style: CSSProperties) => ReactNode;
  useWindowScroll?: boolean;
}

const OVERSCAN_DEFAULT = 5;
const ESTIMATED_ITEM_SIZE_DEFAULT = 300;
const SKELETON_COUNT_DEFAULT = 12;

function VirtualGallery<T>({
  items,
  renderItem,
  getItemKey,
  estimatedItemSize = ESTIMATED_ITEM_SIZE_DEFAULT,
  itemMinSize = 200,
  itemMaxSize = 500,
  columnCount = 1,
  gap = 16,
  overscan = OVERSCAN_DEFAULT,
  className = '',
  style,
  onEndReached,
  onStartReached,
  endReachedThreshold = 200,
  startReachedThreshold = 200,
  hasMore = false,
  loading = false,
  loadingComponent,
  emptyComponent,
  skeletonCount = SKELETON_COUNT_DEFAULT,
  skeletonComponent,
  useWindowScroll = false,
}: VirtualGalleryProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(1000);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollHandlerRef = useRef<() => void>();
  
  // Calculate responsive column count
  const effectiveColumnCount = useMemo(() => {
    if (columnCount > 1) return columnCount;
    
    // Auto-calculate columns based on container width
    if (containerWidth >= 1400) return 4;
    if (containerWidth >= 1024) return 3;
    if (containerWidth >= 640) return 2;
    return 1;
  }, [columnCount, containerWidth]);
  
  // Calculate item width based on columns
  const itemWidth = useMemo(() => {
    const totalGap = gap * (effectiveColumnCount - 1);
    return (containerWidth - totalGap) / effectiveColumnCount;
  }, [containerWidth, effectiveColumnCount, gap]);
  
  // Measure container with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerWidth(width);
        setContainerHeight(height);
      }
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Scroll handler with throttling
  const handleScroll = useCallback(() => {
    const container = useWindowScroll ? window : containerRef.current;
    if (!container) return;
    
    const currentScrollTop = useWindowScroll 
      ? window.scrollY 
      : (container as HTMLDivElement).scrollTop;
    
    setScrollTop(currentScrollTop);
    
    // Check end reached
    if (onEndReached && hasMore && !loading) {
      const scrollHeight = useWindowScroll 
        ? document.documentElement.scrollHeight 
        : (container as HTMLDivElement).scrollHeight;
      const clientHeight = useWindowScroll 
        ? window.innerHeight 
        : (container as HTMLDivElement).clientHeight;
      
      const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight;
      
      if (distanceFromBottom < endReachedThreshold) {
        onEndReached();
      }
    }
    
    // Check start reached
    if (onStartReached && currentScrollTop < startReachedThreshold) {
      onStartReached();
    }
  }, [useWindowScroll, onEndReached, onStartReached, hasMore, loading, endReachedThreshold, startReachedThreshold]);
  
  // Attach scroll listener
  useEffect(() => {
    const target = useWindowScroll ? window : containerRef.current;
    if (!target) return;
    
    // Throttle scroll handler
    let ticking = false;
    scrollHandlerRef.current = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    target.addEventListener('scroll', scrollHandlerRef.current, { passive: true });
    
    // Initial measurement
    handleScroll();
    
    return () => {
      target.removeEventListener('scroll', scrollHandlerRef.current!);
    };
  }, [handleScroll, useWindowScroll]);
  
  // Calculate virtual items
  const { virtualItems, totalHeight, offsetIndex } = useMemo(() => {
    const rowHeight = estimatedItemSize;
    const rowGap = gap;
    const totalRowHeight = rowHeight + rowGap;
    
    // Calculate which rows are visible
    const startRow = Math.max(0, Math.floor(scrollTop / totalRowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / totalRowHeight) + overscan * 2;
    const endRow = Math.min(
      Math.ceil(items.length / effectiveColumnCount),
      startRow + visibleRows
    );
    
    // Calculate items for visible rows
    const startIndex = startRow * effectiveColumnCount;
    const endIndex = Math.min(endRow * effectiveColumnCount, items.length);
    
    const virtualItems: Array<{
      item: T;
      index: number;
      key: string | number;
      style: CSSProperties;
    }> = [];
    
    for (let i = startIndex; i < endIndex; i++) {
      const item = items[i];
      if (!item) continue;
      
      const row = Math.floor(i / effectiveColumnCount);
      const col = i % effectiveColumnCount;
      
      const style: CSSProperties = {
        position: 'absolute',
        top: row * totalRowHeight,
        left: col * (itemWidth + gap),
        width: itemWidth,
        height: estimatedItemSize,
        transition: 'transform 0.1s ease-out',
      };
      
      virtualItems.push({
        item,
        index: i,
        key: getItemKey(item, i),
        style,
      });
    }
    
    const totalHeight = Math.ceil(items.length / effectiveColumnCount) * totalRowHeight;
    
    return { virtualItems, totalHeight, offsetIndex: startIndex };
  }, [
    items, 
    scrollTop, 
    containerHeight, 
    estimatedItemSize, 
    effectiveColumnCount, 
    gap, 
    overscan, 
    itemWidth,
    getItemKey,
  ]);
  
  // Default skeleton component
  const renderSkeleton = useCallback((index: number, skeletonStyle: CSSProperties) => {
    return (
      <div
        key={`skeleton-${index}`}
        style={{
          ...skeletonStyle,
          background: 'var(--surface)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div 
          style={{ 
            width: '100%', 
            height: '60%', 
            background: 'linear-gradient(90deg, var(--surface) 0%, var(--bg-elevated) 50%, var(--surface) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: 8,
            marginBottom: 12,
          }} 
        />
        <div style={{ height: 12, background: 'var(--surface)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, width: '60%', background: 'var(--surface)', borderRadius: 4 }} />
      </div>
    );
  }, []);
  
  // Empty state
  if (items.length === 0 && !loading) {
    return emptyComponent ? (
      <div className={className} style={style}>
        {emptyComponent}
      </div>
    ) : (
      <div 
        className={className} 
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 400,
          color: 'var(--text-muted)',
        }}
      >
        No items to display
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={`virtual-gallery ${className}`}
      style={{
        height: useWindowScroll ? 'auto' : (style?.height || '100%'),
        overflowY: useWindowScroll ? 'visible' : 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={useWindowScroll ? handleScroll : undefined}
    >
      {/* Scroll container for window scroll */}
      {useWindowScroll ? (
        <div style={{ position: 'relative' }}>
          <div 
            style={{ 
              height: totalHeight,
              position: 'relative',
            }}
          >
            {virtualItems.map(({ item, index, key, style: itemStyle }) => (
              <div key={key} style={itemStyle}>
                {renderItem(item, index, { width: '100%', height: '100%' })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Fixed height container */
        <>
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualItems.map(({ item, index, key, style: itemStyle }) => (
              <div key={key} style={itemStyle}>
                {renderItem(item, index, { width: '100%', height: '100%' })}
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: 24,
          position: useWindowScroll ? 'relative' : 'absolute',
          width: '100%',
        }}>
          {loadingComponent || (
            <div className="spinner" />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(VirtualGallery) as typeof VirtualGallery;

// ─────────────────────────────────────────────────────────────
// Car Gallery Specific Implementation
// ─────────────────────────────────────────────────────────────

interface Car {
  _id: string;
  id: string;
  title: string;
  image?: string;
  images?: Array<string | { url?: string }>;
  price?: number;
  currentBid?: number;
  year?: number;
  location?: string | { city?: string };
  fuel?: string;
  [key: string]: any;
}

interface CarGalleryProps {
  cars: Car[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onCarClick?: (car: Car) => void;
  renderCarCard: (car: Car, style: CSSProperties) => ReactNode;
  columnCount?: number;
  className?: string;
}

export function CarGallery({
  cars,
  loading = false,
  hasMore = false,
  onLoadMore,
  renderCarCard,
  columnCount = 0,
  className = '',
}: CarGalleryProps) {
  const getCarKey = useCallback((car: Car) => car._id || car.id, []);
  
  return (
    <VirtualGallery
      items={cars}
      getItemKey={getCarKey}
      renderItem={renderCarCard}
      estimatedItemSize={320}
      columnCount={columnCount}
      gap={16}
      overscan={3}
      hasMore={hasMore}
      loading={loading}
      onEndReached={onLoadMore}
      className={className}
      emptyComponent={
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No vehicles found</div>
          <div style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search criteria</div>
        </div>
      }
    />
  );
}
