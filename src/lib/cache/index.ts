/**
 * Cache Module
 * Provides in-memory caching with TTL and invalidation support
 * Can be extended to use Redis when deployed to production
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

// Default TTL values
export const CACHE_TTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 2 * 60 * 1000, // 2 minutes
  LONG: 10 * 60 * 1000, // 10 minutes
  DASHBOARD: 60 * 1000, // 1 minute for dashboard
} as const;

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_STATS: "dashboard:stats",
  DASHBOARD_MONTHLY: "dashboard:monthly",
  RECENT_TRANSACTIONS: "dashboard:recent",
  TRIAL_BALANCE: "reports:trial-balance",
  ACCOUNTS_LIST: "accounts:list",
  ACCOUNTS_TREE: "accounts:tree",
} as const;

class CacheStore {
  private cache = new Map<string, CacheEntry<unknown>>();
  private subscribers = new Map<string, Set<() => void>>();

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.notifySubscribers(key);
  }

  /**
   * Invalidate cache keys matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace("*", ".*"));
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.notifySubscribers(key);
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.subscribers.forEach((_, key) => this.notifySubscribers(key));
  }

  /**
   * Subscribe to cache invalidation
   */
  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of cache invalidation
   */
  private notifySubscribers(key: string): void {
    this.subscribers.get(key)?.forEach((callback) => callback());

    // Also notify pattern subscribers
    this.subscribers.forEach((callbacks, pattern) => {
      if (
        pattern.includes("*") &&
        new RegExp(pattern.replace("*", ".*")).test(key)
      ) {
        callbacks.forEach((callback) => callback());
      }
    });
  }

  /**
   * Get cache size for debugging
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const cache = new CacheStore();

/**
 * Wrapper for cached async functions
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM } = options;

  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  cache.set(key, data, ttl);

  return data;
}

/**
 * Invalidate dashboard-related caches
 * Call this after any transaction changes
 */
export function invalidateDashboardCache(): void {
  cache.invalidatePattern("dashboard:*");
}

/**
 * Invalidate transaction-related caches
 */
export function invalidateTransactionCache(): void {
  cache.invalidatePattern("dashboard:*");
  cache.invalidatePattern("reports:*");
}

/**
 * Invalidate accounts-related caches
 */
export function invalidateAccountsCache(): void {
  cache.invalidatePattern("accounts:*");
  cache.invalidatePattern("reports:*");
}
