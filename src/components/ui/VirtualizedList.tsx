'use client';

import { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import { useGesture } from '@/hooks/useGesture';
import { animator } from '@/lib/animations';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  overscanCount?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  scrollRestoration?: boolean;
  smoothScrolling?: boolean;
  itemKey?: (item: T, index: number) => string | number;
}

interface ScrollState {
  offset: number;
  velocity: number;
  timestamp: number;
}

// Pool for recycling DOM nodes
class NodePool {
  private pool: Map<string, HTMLElement[]> = new Map();
  private maxSize: number = 50;

  acquire(type: string): HTMLElement | undefined {
    const nodes = this.pool.get(type) || [];
    return nodes.pop();
  }

  release(type: string, node: HTMLElement): void {
    if (!this.pool.has(type)) {
      this.pool.set(type, []);
    }
    const nodes = this.pool.get(type)!;
    if (nodes.length < this.maxSize) {
      nodes.push(node);
    }
  }

  clear(): void {
    this.pool.clear();
  }
}

function VirtualizedListInner<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 400,
  overscanCount = 3,
  onEndReached,
  endReachedThreshold = 0.8,
  className = '',
  scrollRestoration = true,
  smoothScrolling = true,
  itemKey = (_, index) => index
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollState = useRef<ScrollState>({ offset: 0, velocity: 0, timestamp: 0 });
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollAnchorRef = useRef<{ index: number; offset: number } | null>(null);
  const nodePool = useRef<NodePool>(new NodePool());
  const resizeObserver = useRef<ResizeObserver>();
  const itemCacheRef = useRef<Map<number, { node: HTMLElement; key: string | number }>>(new Map());
  const frameId = useRef<number>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasCalledEndReached = useRef(false);

  // Memoize visible range calculations
  const {
    visibleStartIndex,
    visibleEndIndex,
    totalHeight,
    visibleCount
  } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
    const endIndex = Math.min(
      items.length,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscanCount
    );

    return {
      visibleStartIndex: startIndex,
      visibleEndIndex: endIndex,
      totalHeight: items.length * itemHeight,
      visibleCount
    };
  }, [scrollTop, containerHeight, itemHeight, overscanCount, items.length]);

  // Setup scroll restoration
  useEffect(() => {
    if (!scrollRestoration || !containerRef.current) return;

    const key = window.location.pathname;
    const savedScroll = sessionStorage.getItem(`scroll-${key}`);
    
    if (savedScroll) {
      const { offset, index } = JSON.parse(savedScroll);
      scrollAnchorRef.current = { index, offset };
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({ top: offset });
      });
    }

    return () => {
      if (scrollState.current.offset > 0) {
        sessionStorage.setItem(`scroll-${key}`, JSON.stringify({
          offset: scrollState.current.offset,
          index: Math.floor(scrollState.current.offset / itemHeight)
        }));
      }
    };
  }, [scrollRestoration, itemHeight]);

  // Monitor container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserver.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && scrollAnchorRef.current) {
        const { index, offset } = scrollAnchorRef.current;
        requestAnimationFrame(() => {
          containerRef.current?.scrollTo({
            top: index * itemHeight + offset,
            behavior: smoothScrolling ? 'smooth' : 'auto'
          });
        });
      }
    });

    resizeObserver.current.observe(containerRef.current);
    return () => resizeObserver.current?.disconnect();
  }, [itemHeight, smoothScrolling]);

  // Setup intersection observer for infinite loading
  useEffect(() => {
    if (!onEndReached || !sentinelRef.current || !containerRef.current) return;

    const options = {
      root: containerRef.current,
      threshold: endReachedThreshold,
      rootMargin: `${containerHeight * 0.5}px`
    };

    const observer = new IntersectionObserver((entries) => {
      const sentinel = entries[0];
      if (
        sentinel.isIntersecting &&
        !hasCalledEndReached.current &&
        !isScrollingRef.current
      ) {
        hasCalledEndReached.current = true;
        onEndReached();
      }
    }, options);

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onEndReached, endReachedThreshold, containerHeight]);

  // Reset end reached flag when items change
  useEffect(() => {
    hasCalledEndReached.current = false;
  }, [items.length]);

  // Optimized scroll handling with momentum
  const updateScroll = useCallback((timestamp: number) => {
    if (!containerRef.current || !isScrollingRef.current) return;

    const { offset, velocity, timestamp: lastTimestamp } = scrollState.current;
    const delta = timestamp - lastTimestamp;
    
    if (delta > 0) {
      const newVelocity = velocity * 0.95; // Apply friction
      const newOffset = offset + newVelocity * delta;

      if (Math.abs(newVelocity) > 0.1) {
        scrollState.current = {
          offset: newOffset,
          velocity: newVelocity,
          timestamp
        };
        containerRef.current.scrollTop = newOffset;
        frameId.current = requestAnimationFrame(updateScroll);
      } else {
        isScrollingRef.current = false;
      }
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    const timestamp = performance.now();

    // Calculate velocity
    const delta = timestamp - scrollState.current.timestamp;
    const velocity = delta > 0 
      ? (newScrollTop - scrollState.current.offset) / delta 
      : 0;

    scrollState.current = {
      offset: newScrollTop,
      velocity,
      timestamp
    };

    isScrollingRef.current = true;

    // Use rAF for smooth updates
    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
    }
    frameId.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
    });

    // Reset scrolling state after delay
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      hasCalledEndReached.current = false;
    }, 150);

    // Update scroll anchor
    scrollAnchorRef.current = {
      index: Math.floor(newScrollTop / itemHeight),
      offset: newScrollTop % itemHeight
    };
  }, [itemHeight]);

  // Enhanced gesture handling with momentum scrolling
  useGesture({
    onSwipeUp: (velocity) => {
      if (!containerRef.current) return;
      const initialVelocity = Math.min(velocity * 0.5, 2);
      scrollState.current = {
        offset: scrollState.current.offset,
        velocity: initialVelocity,
        timestamp: performance.now()
      };
      isScrollingRef.current = true;
      frameId.current = requestAnimationFrame(updateScroll);
    },
    onSwipeDown: (velocity) => {
      if (!containerRef.current) return;
      const initialVelocity = Math.max(-velocity * 0.5, -2);
      scrollState.current = {
        offset: scrollState.current.offset,
        velocity: initialVelocity,
        timestamp: performance.now()
      };
      isScrollingRef.current = true;
      frameId.current = requestAnimationFrame(updateScroll);
    },
    threshold: 50,
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      nodePool.current.clear();
      itemCacheRef.current.clear();
    };
  }, []);

  // Render visible items with recycling
  const visibleItems = useMemo(() => {
    // Clear out old cache entries
    const visibleIndices = new Set(
      Array.from(
        { length: visibleEndIndex - visibleStartIndex },
        (_, i) => visibleStartIndex + i
      )
    );
    
    for (const [index, cache] of itemCacheRef.current.entries()) {
      if (!visibleIndices.has(index)) {
        nodePool.current.release('item', cache.node);
        itemCacheRef.current.delete(index);
      }
    }

    return items.slice(visibleStartIndex, visibleEndIndex).map((item, index) => {
      const absoluteIndex = visibleStartIndex + index;
      const key = itemKey(item, absoluteIndex);
      
      // Try to reuse existing node
      let cacheEntry = itemCacheRef.current.get(absoluteIndex);
      if (!cacheEntry || cacheEntry.key !== key) {
        const node = nodePool.current.acquire('item') as HTMLDivElement || document.createElement('div');
        cacheEntry = { node, key };
        itemCacheRef.current.set(absoluteIndex, cacheEntry);
      }

      return (
        <div
          key={key}
          ref={node => {
            if (node && cacheEntry) {
              cacheEntry.node = node;
            }
          }}
          style={{
            position: 'absolute',
            top: absoluteIndex * itemHeight,
            height: itemHeight,
            width: '100%',
            transform: 'translateZ(0)',
            willChange: 'transform',
            contain: 'strict',
          }}
        >
          {renderItem(item, absoluteIndex)}
        </div>
      );
    });
  }, [items, visibleStartIndex, visibleEndIndex, itemHeight, itemKey, renderItem]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative overflow-y-auto overscroll-contain ${className}`}
      style={{
        height: containerHeight,
        willChange: 'transform',
        WebkitOverflowScrolling: 'touch',
        contain: 'strict',
      }}
    >
      <div 
        style={{ 
          height: totalHeight, 
          position: 'relative',
          contain: 'strict',
        }}
      >
        {visibleItems}
        {onEndReached && (
          <div
            ref={sentinelRef}
            style={{
              position: 'absolute',
              bottom: 0,
              height: '1px',
              width: '100%',
              contain: 'strict',
            }}
          />
        )}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;