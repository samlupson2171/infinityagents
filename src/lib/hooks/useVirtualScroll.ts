import { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

/**
 * Custom hook for virtual scrolling to handle large lists efficiently
 * Only renders visible items plus a small buffer (overscan)
 */
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult & {
  scrollElementProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
  getItemProps: (index: number) => {
    style: React.CSSProperties;
    key: string | number;
  };
} {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const virtualScrollResult = useMemo((): VirtualScrollResult => {
    const totalHeight = items.length * itemHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItems + overscan * 2
    );

    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [items.length, itemHeight, containerHeight, scrollTop, overscan]);

  const scrollElementProps = useMemo(
    () => ({
      style: {
        height: containerHeight,
        overflowY: 'auto' as const,
        position: 'relative' as const,
      },
      onScroll: handleScroll,
    }),
    [containerHeight, handleScroll]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      style: {
        position: 'absolute' as const,
        top: (virtualScrollResult.startIndex + index) * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      },
      key: virtualScrollResult.startIndex + index,
    }),
    [virtualScrollResult.startIndex, itemHeight]
  );

  return {
    ...virtualScrollResult,
    scrollElementProps,
    getItemProps,
  };
}

/**
 * Hook for infinite scrolling with automatic loading
 */
export function useInfiniteScroll(
  hasNextPage: boolean,
  isLoading: boolean,
  loadMore: () => void,
  threshold: number = 100
) {
  const [isFetching, setIsFetching] = useState(false);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      if (
        scrollHeight - scrollTop <= clientHeight + threshold &&
        hasNextPage &&
        !isLoading &&
        !isFetching
      ) {
        setIsFetching(true);
        loadMore();
      }
    },
    [hasNextPage, isLoading, isFetching, loadMore, threshold]
  );

  useEffect(() => {
    if (!isLoading) {
      setIsFetching(false);
    }
  }, [isLoading]);

  return { handleScroll, isFetching };
}

/**
 * Hook for managing window-based virtual scrolling
 */
export function useWindowVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    const updateWindowHeight = () => {
      setWindowHeight(window.innerHeight);
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    updateWindowHeight();
    window.addEventListener('resize', updateWindowHeight);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', updateWindowHeight);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const virtualResult = useMemo(() => {
    const visibleItems = Math.ceil(windowHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollY / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItems + overscan * 2
    );

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items.length, itemHeight, scrollY, windowHeight, overscan]);

  return virtualResult;
}
