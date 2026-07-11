import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

const OVERSCAN = 5;

function VirtualList({ items, height, itemHeight, renderItem, gap = 0, className, onEndReached, endReachedThreshold = 200 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(height || 600);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) setContainerHeight(entry.contentRect.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const totalHeight = items.length * itemHeight + Math.max(0, items.length - 1) * gap;

  const visibleRange = useMemo(() => {
    if (!containerHeight) return { start: 0, end: 0 };
    const start = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - OVERSCAN);
    const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + OVERSCAN);
    return { start, end };
  }, [scrollTop, containerHeight, items.length, itemHeight, gap]);

  const visibleItems = useMemo(
    () => items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange.start, visibleRange.end]
  );

  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (onEndReached && el.scrollHeight - el.scrollTop - el.clientHeight < endReachedThreshold) {
      onEndReached();
    }
  }, [onEndReached, endReachedThreshold]);

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      style={{ height: height || '100%', overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = visibleRange.start + i;
          return (
            <div
              key={item.key ?? index}
              style={{
                position: 'absolute',
                top: index * (itemHeight + gap),
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualList;
