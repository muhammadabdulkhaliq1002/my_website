import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useGesture } from '@/hooks/useGesture';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { animator } from '@/lib/animations';

interface RouteCache {
  path: string;
  timestamp: number;
  data?: any;
  scrollPosition?: { x: number; y: number };
}

interface NavigationOptions {
  data?: any;
  replace?: boolean;
  preserveScroll?: boolean;
  preserveState?: boolean;
  animation?: 'slide' | 'fade' | 'none';
}

class NavigationManager {
  private static instance: NavigationManager;
  private history: string[] = [];
  private routeCache: Map<string, RouteCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_HISTORY = 50;
  private isTransitioning = false;
  private preloadQueue: Set<string> = new Set();
  private preloadTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.history = [window.location.pathname];
      this.setupPeriodicCleanup();
      this.setupPreloadObserver();
    }
  }

  static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  private setupPeriodicCleanup() {
    // Clean up old cache entries and optimize memory usage
    setInterval(() => {
      this.cleanCache();
      if (this.history.length > this.MAX_HISTORY) {
        this.history = this.history.slice(-this.MAX_HISTORY);
      }
    }, 60000);
  }

  private setupPreloadObserver() {
    if (!window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            this.queuePreload(link.pathname);
          }
        });
      },
      { rootMargin: '50px' }
    );

    // Observe navigation links
    document.addEventListener('mouseover', (e) => {
      const link = (e.target as HTMLElement).closest('a');
      if (link?.pathname && !this.routeCache.has(link.pathname)) {
        observer.observe(link);
      }
    });
  }

  private queuePreload(path: string) {
    if (this.preloadQueue.has(path)) return;
    this.preloadQueue.add(path);

    // Debounce preload requests
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
    }

    this.preloadTimeout = setTimeout(() => {
      this.processPreloadQueue();
    }, 100);
  }

  private async processPreloadQueue() {
    const currentPriority = Array.from(this.preloadQueue)
      .map(path => ({
        path,
        priority: this.calculatePathPriority(path)
      }))
      .sort((a, b) => b.priority - a.priority);

    for (const { path } of currentPriority) {
      if (!this.routeCache.has(path)) {
        try {
          // Preload route data
          const response = await fetch(path);
          if (response.ok) {
            const data = await response.json();
            this.cacheRoute(path, data);
          }
        } catch (error) {
          console.warn('Failed to preload:', path);
        }
      }
      this.preloadQueue.delete(path);
    }
  }

  private calculatePathPriority(path: string): number {
    // Higher priority for paths that are:
    // 1. Historically visited
    // 2. Parent/child of current path
    // 3. Have shorter path length (usually main navigation)
    let priority = 0;
    const currentPath = window.location.pathname;

    if (this.history.includes(path)) {
      priority += 3;
    }
    if (path.startsWith(currentPath) || currentPath.startsWith(path)) {
      priority += 2;
    }
    priority += 1 / path.split('/').length;

    return priority;
  }

  addToHistory(path: string) {
    const lastPath = this.history[this.history.length - 1];
    if (lastPath !== path) {
      this.history.push(path);
      // Save scroll position for the previous path
      this.updateScrollPosition(lastPath);
    }
  }

  getPreviousRoute(): string | undefined {
    return this.history[this.history.length - 2];
  }

  private updateScrollPosition(path: string) {
    const cached = this.routeCache.get(path);
    if (cached) {
      cached.scrollPosition = {
        x: window.scrollX,
        y: window.scrollY
      };
      this.routeCache.set(path, cached);
    }
  }

  cacheRoute(path: string, data?: any) {
    this.routeCache.set(path, {
      path,
      timestamp: Date.now(),
      data,
      scrollPosition: { x: 0, y: 0 }
    });
  }

  getCachedRoute(path: string): RouteCache | undefined {
    const cached = this.routeCache.get(path);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached;
    }
    this.routeCache.delete(path);
    return undefined;
  }

  private cleanCache() {
    const now = Date.now();
    for (const [path, cache] of this.routeCache.entries()) {
      if (now - cache.timestamp >= this.CACHE_DURATION) {
        this.routeCache.delete(path);
      }
    }
  }

  setTransitioning(value: boolean) {
    this.isTransitioning = value;
    if (value) {
      document.body.style.pointerEvents = 'none';
    } else {
      document.body.style.pointerEvents = '';
    }
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }
}

export function useNavigationManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationManager = NavigationManager.getInstance();
  const transitionTimeout = useRef<NodeJS.Timeout>();
  const lastNavigation = useRef<{ path: string; options?: NavigationOptions }>();

  // Memoize current full URL
  const currentUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
  }, [pathname, searchParams]);

  // Reset transition state after timeout
  const resetTransitionState = useCallback(() => {
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
    }
    transitionTimeout.current = setTimeout(() => {
      navigationManager.setTransitioning(false);
    }, 1000);
  }, []);

  // Handle navigation events and animations
  useEffect(() => {
    const handleStart = (url: string) => {
      navigationManager.setTransitioning(true);

      // Apply transition animation
      if (lastNavigation.current?.options?.animation) {
        const isForward = navigationManager.history.indexOf(url) === -1;
        animator.animate(
          document.getElementById('page-content'),
          lastNavigation.current.options.animation,
          isForward
        );
      }
    };

    const handleComplete = (url: string) => {
      resetTransitionState();

      // Restore scroll position if needed
      const cached = navigationManager.getCachedRoute(url);
      if (cached?.scrollPosition && lastNavigation.current?.options?.preserveScroll) {
        window.scrollTo(cached.scrollPosition.x, cached.scrollPosition.y);
      } else {
        window.scrollTo(0, 0);
      }

      lastNavigation.current = undefined;
    };

    router.events?.on('routeChangeStart', handleStart);
    router.events?.on('routeChangeComplete', handleComplete);
    router.events?.on('routeChangeError', handleComplete);

    return () => {
      router.events?.off('routeChangeStart', handleStart);
      router.events?.off('routeChangeComplete', handleComplete);
      router.events?.off('routeChangeError', handleComplete);
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
    };
  }, [router.events, resetTransitionState]);

  // Enhanced gesture navigation
  useGesture({
    onSwipeRight: () => {
      if (!navigationManager.isInTransition()) {
        const previousRoute = navigationManager.getPreviousRoute();
        if (previousRoute) {
          lastNavigation.current = {
            path: previousRoute,
            options: { animation: 'slide' }
          };
          router.back();
        }
      }
    },
    onSwipeLeft: () => {
      if (!navigationManager.isInTransition() && window.history?.state?.forward) {
        lastNavigation.current = {
          path: window.history.state.forward,
          options: { animation: 'slide' }
        };
        router.forward();
      }
    },
    threshold: 100,
  });

  const navigate = useCallback((
    path: string,
    options?: NavigationOptions
  ) => {
    if (navigationManager.isInTransition()) return;

    navigationManager.addToHistory(pathname);
    if (options?.data) {
      navigationManager.cacheRoute(path, options.data);
    }

    lastNavigation.current = { path, options };

    if (options?.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
  }, [pathname, router]);

  const prefetch = useCallback((path: string) => {
    if (!navigationManager.getCachedRoute(path)) {
      router.prefetch(path);
    }
  }, [router]);

  return {
    navigate,
    prefetch,
    currentPath: pathname,
    currentUrl,
    getCachedData: (path: string) => navigationManager.getCachedRoute(path)?.data,
    isTransitioning: () => navigationManager.isInTransition(),
    history: navigationManager.history,
  };
}