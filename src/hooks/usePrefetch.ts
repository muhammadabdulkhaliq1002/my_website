import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
  priority: number;
}

interface PendingRequest {
  promise: Promise<any>;
  subscribers: Set<(value: any) => void>;
}

interface Options {
  ttl?: number;
  staleTime?: number;
  prefetch?: boolean;
  revalidate?: boolean;
  priority?: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 100;

class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private networkStatus: 'online' | 'offline' = 'online';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupNetworkListener();
      this.startPeriodicCleanup();
    }
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private setupNetworkListener() {
    window.addEventListener('online', () => {
      this.networkStatus = 'online';
      this.revalidateStaleEntries();
    });
    window.addEventListener('offline', () => {
      this.networkStatus = 'offline';
    });
  }

  private startPeriodicCleanup() {
    setInterval(() => {
      this.cleanCache();
    }, 60000); // Clean every minute
  }

  private cleanCache() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now > entry.timestamp + DEFAULT_TTL) {
        this.cache.delete(key);
      }
    });

    // If still over size limit, remove lowest priority entries
    if (this.cache.size > MAX_CACHE_SIZE) {
      entries
        .sort((a, b) => a[1].priority - b[1].priority)
        .slice(0, entries.length - MAX_CACHE_SIZE)
        .forEach(([key]) => this.cache.delete(key));
    }
  }

  private async revalidateStaleEntries() {
    const now = Date.now();
    const staleEntries = Array.from(this.cache.entries())
      .filter(([_, entry]) => now > entry.staleAt);

    await Promise.all(
      staleEntries.map(async ([key, entry]) => {
        try {
          const newData = await entry.data;
          this.set(key, newData, entry.priority);
        } catch (error) {
          console.warn('Failed to revalidate:', key, error);
        }
      })
    );
  }

  get<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  set<T>(key: string, data: T, priority: number = 0): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      staleAt: now + DEFAULT_STALE_TIME,
      priority
    });
  }

  async fetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    // Check for existing request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return new Promise(resolve => {
        pending.subscribers.add(resolve);
      });
    }

    // Create new request
    const request: PendingRequest = {
      promise: fetchFn(),
      subscribers: new Set()
    };
    this.pendingRequests.set(key, request);

    try {
      const data = await request.promise;
      this.set(key, data, priority);
      request.subscribers.forEach(resolve => resolve(data));
      return data;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  getPendingRequest(key: string): PendingRequest | undefined {
    return this.pendingRequests.get(key);
  }

  isOnline(): boolean {
    return this.networkStatus === 'online';
  }
}

export function usePrefetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: Options = {}
) {
  const {
    ttl = DEFAULT_TTL,
    staleTime = DEFAULT_STALE_TIME,
    prefetch = true,
    revalidate = false,
    priority = 0
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchTimestamp = useRef<number>(0);
  const router = useRouter();
  const cacheManager = CacheManager.getInstance();

  const fetchData = useCallback(async (skipCache = false) => {
    const now = Date.now();
    const cached = !skipCache && cacheManager.get<T>(key);

    if (cached) {
      if (now - cached.timestamp < ttl) {
        setData(cached.data);
        setIsLoading(false);
        
        // Background revalidate if stale
        if (now > cached.staleAt && cacheManager.isOnline()) {
          fetchData(true).catch(console.error);
        }
        return;
      }
    }

    try {
      const currentFetch = now;
      fetchTimestamp.current = currentFetch;

      const result = await cacheManager.fetch(key, fetchFn, priority);

      // Prevent race conditions
      if (fetchTimestamp.current === currentFetch) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      setError(err as Error);
      // On error, keep stale data if available
      if (cached) {
        setData(cached.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, fetchFn, ttl, priority]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup prefetching
  useEffect(() => {
    if (!prefetch) return;

    // Prefetch on route change
    const prefetchHandler = () => {
      const cached = cacheManager.get(key);
      const pending = cacheManager.getPendingRequest(key);
      
      if (!cached && !pending && cacheManager.isOnline()) {
        cacheManager.fetch(key, fetchFn, priority).catch(console.error);
      }
    };

    router.events.on('routeChangeStart', prefetchHandler);
    return () => {
      router.events.off('routeChangeStart', prefetchHandler);
    };
  }, [key, fetchFn, prefetch, priority, router.events]);

  // Setup revalidation
  useEffect(() => {
    if (!revalidate) return;

    const interval = setInterval(() => {
      if (cacheManager.isOnline()) {
        fetchData(true);
      }
    }, staleTime);

    return () => clearInterval(interval);
  }, [revalidate, staleTime, fetchData]);

  return {
    data,
    error,
    isLoading,
    isStale: data !== null && Date.now() > (cacheManager.get(key)?.staleAt || 0),
    refetch: () => fetchData(true),
  };
}