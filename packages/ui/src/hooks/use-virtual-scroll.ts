import { useState, useCallback, useMemo } from 'react';

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  itemCount: number;
}

export interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    size: number;
  }>;
  totalSize: number;
  scrollElementProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
  containerProps: {
    style: React.CSSProperties;
  };
}

/**
 * High-performance virtual scrolling hook for large datasets
 * Optimized for PixelTracer event lists with 1000+ items
 */
export function useVirtualScroll({
  itemHeight,
  containerHeight,
  overscan = 5,
  itemCount
}: VirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    // Add overscan items for smooth scrolling
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(itemCount - 1, endIndex + overscan);

    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      visibleStartIndex: startIndex,
      visibleEndIndex: endIndex
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        size: itemHeight
      });
    }
    return items;
  }, [visibleRange, itemHeight]);

  const totalSize = itemCount * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalSize,
    scrollElementProps: {
      style: {
        height: containerHeight,
        overflow: 'auto'
      },
      onScroll: handleScroll
    },
    containerProps: {
      style: {
        height: totalSize,
        position: 'relative' as const
      }
    }
  };
}