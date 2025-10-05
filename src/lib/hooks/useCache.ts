import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  enabled?: boolean; // Whether caching is enabled
}

/**
 * In-memory cache implementation with TTL and LRU eviction
 */
class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(private options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      staleWhileRevalidate: true,
      ...options,
    };
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      if (!this.options.staleWhileRevalidate) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        return null;
      }
      // Return stale data but mark for revalidation
      return entry.data;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (this.options.ttl || 5 * 60 * 1000),
    };

    // Evict if at max size
    if (this.cache.size >= (this.options.maxSize || 100)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() <= entry.expiresAt;
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() > entry.expiresAt;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        isExpired: Date.now() > entry.expiresAt,
      })),
    };
  }
}

// Global cache instances
const globalCaches = new Map<string, MemoryCache<any>>();

/**
 * Hook for caching data with automatic revalidation
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & {
    cacheName?: string;
    enabled?: boolean;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
  } = {}
) {
  const {
    cacheName = 'default',
    enabled = true,
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    ...cacheOptions
  } = options;

  // Get or create cache instance
  if (!globalCaches.has(cacheName)) {
    globalCaches.set(cacheName, new MemoryCache<T>(cacheOptions));
  }
  const cache = globalCaches.get(cacheName)!;

  const [data, setData] = useState<T | null>(() =>
    enabled ? cache.get(key) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(
    async (isRevalidation = false) => {
      if (!enabled) return;

      try {
        if (!isRevalidation) {
          setIsLoading(true);
        } else {
          setIsValidating(true);
        }
        setError(null);

        const result = await fetcherRef.current();

        cache.set(key, result);
        setData(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // If revalidation fails, keep existing data
        if (!isRevalidation) {
          setData(null);
        }
      } finally {
        setIsLoading(false);
        setIsValidating(false);
      }
    },
    [key, enabled, cache]
  );

  const mutate = useCallback(
    async (newData?: T | ((current: T | null) => T)) => {
      if (!enabled) return;

      if (typeof newData === 'function') {
        const updatedData = (newData as (current: T | null) => T)(data);
        cache.set(key, updatedData);
        setData(updatedData);
      } else if (newData !== undefined) {
        cache.set(key, newData);
        setData(newData);
      } else {
        // Revalidate
        await fetchData(true);
      }
    },
    [data, key, enabled, cache, fetchData]
  );

  // Initial fetch or when key changes
  useEffect(() => {
    if (!enabled) return;

    const cachedData = cache.get(key);
    const isStale = cache.isStale(key);

    if (cachedData && !isStale) {
      setData(cachedData);
    } else if (cachedData && isStale && cacheOptions.staleWhileRevalidate) {
      setData(cachedData);
      fetchData(true); // Revalidate in background
    } else {
      fetchData();
    }
  }, [key, enabled, cache, fetchData, cacheOptions.staleWhileRevalidate]);

  // Revalidate on window focus
  useEffect(() => {
    if (!revalidateOnFocus || !enabled) return;

    const handleFocus = () => {
      if (cache.isStale(key)) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, enabled, revalidateOnFocus, cache, fetchData]);

  // Revalidate on network reconnect
  useEffect(() => {
    if (!revalidateOnReconnect || !enabled) return;

    const handleOnline = () => {
      if (cache.isStale(key)) {
        fetchData(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [key, enabled, revalidateOnReconnect, cache, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    revalidate: () => fetchData(true),
  };
}

/**
 * Hook for caching filter options specifically
 */
export function useFilterCache() {
  const cacheOptions = {
    ttl: 10 * 60 * 1000, // 10 minutes for filter options
    maxSize: 50,
    staleWhileRevalidate: true,
  };

  const {
    data: locations,
    isLoading: locationsLoading,
    error: locationsError,
  } = useCache(
    'activity-locations',
    async () => {
      const response = await fetch('/api/activities/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    { ...cacheOptions, cacheName: 'filters' }
  );

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCache(
    'activity-categories',
    async () => {
      const response = await fetch('/api/activities/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    { ...cacheOptions, cacheName: 'filters' }
  );

  return {
    locations: locations || [],
    categories: categories || [],
    isLoading: locationsLoading || categoriesLoading,
    error: locationsError || categoriesError,
  };
}

/**
 * Hook for caching search results with query-based keys
 */
export function useSearchCache<T>(
  query: Record<string, any>,
  fetcher: (query: Record<string, any>) => Promise<T>,
  options: CacheOptions = {}
) {
  // Create cache key from query parameters
  const cacheKey = JSON.stringify(query);

  return useCache(cacheKey, () => fetcher(query), {
    ttl: 2 * 60 * 1000, // 2 minutes for search results
    maxSize: 200,
    cacheName: 'search',
    ...options,
  });
}

/**
 * Utility to clear all caches
 */
export function clearAllCaches() {
  for (const cache of globalCaches.values()) {
    cache.clear();
  }
}

/**
 * Utility to get cache statistics
 */
export function getCacheStats() {
  const stats: Record<string, any> = {};

  for (const [name, cache] of globalCaches) {
    stats[name] = cache.getStats();
  }

  return stats;
}
