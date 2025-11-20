/**
 * CacheService - Production-Ready Offline-First Cache
 * Implements cache-first strategy with automatic background sync
 * @module shared/services/cache/CacheService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from '@shared/services/network/networkService';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('CacheService');

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
}

class CacheService {
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_PREFIX = '@civiclens_cache:';
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Get data with cache-first strategy
   * 1. Return cached data if valid
   * 2. If stale, return cached + fetch fresh in background
   * 3. If no cache, fetch fresh
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = this.DEFAULT_TTL,
      forceRefresh = false,
      staleWhileRevalidate = true,
    } = options;

    const cacheKey = this.getCacheKey(key);

    // Check for pending request to avoid duplicate fetches
    if (this.pendingRequests.has(cacheKey)) {
      log.debug(`Returning pending request for: ${key}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    try {
      // Try to get cached data
      if (!forceRefresh) {
        const cached = await this.getCached<T>(cacheKey);
        
        if (cached) {
          const isExpired = Date.now() > cached.expiresAt;
          
          if (!isExpired) {
            log.debug(`Cache HIT (fresh): ${key}`);
            return cached.data;
          }
          
          // Stale data - return it while fetching fresh
          if (staleWhileRevalidate && networkService.isOnline()) {
            log.debug(`Cache HIT (stale): ${key} - revalidating in background`);
            
            // Return stale data immediately
            const staleData = cached.data;
            
            // Fetch fresh data in background (don't await)
            this.fetchAndCache(cacheKey, fetcher, ttl).catch(err => {
              log.error(`Background revalidation failed for ${key}`, err);
            });
            
            return staleData;
          }
        }
      }

      // No cache or force refresh - fetch fresh data
      log.debug(`Cache MISS: ${key} - fetching fresh data`);
      return await this.fetchAndCache(cacheKey, fetcher, ttl);
      
    } catch (error) {
      log.error(`Cache error for ${key}`, error);
      
      // Try to return stale cache as fallback
      const cached = await this.getCached<T>(cacheKey);
      if (cached) {
        log.warn(`Returning stale cache as fallback for: ${key}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Fetch data and cache it
   */
  private async fetchAndCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Create pending request promise
    const fetchPromise = (async () => {
      try {
        const data = await fetcher();
        
        // Cache the result
        await this.set(cacheKey, data, ttl);
        
        return data;
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    this.pendingRequests.set(cacheKey, fetchPromise);
    
    return fetchPromise;
  }

  /**
   * Get cached data if exists and not expired
   */
  private async getCached<T>(cacheKey: string): Promise<CacheEntry<T> | null> {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      return entry;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      log.debug(`Cached: ${key} (TTL: ${ttl / 1000}s)`);
    } catch (error) {
      log.error('Error setting cache', error);
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.removeItem(cacheKey);
      log.debug(`Invalidated cache: ${key}`);
    } catch (error) {
      log.error('Error invalidating cache', error);
    }
  }

  /**
   * Invalidate multiple cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) && key.includes(pattern)
      );

      await AsyncStorage.multiRemove(matchingKeys);
      log.debug(`Invalidated ${matchingKeys.length} cache entries matching: ${pattern}`);
    } catch (error) {
      log.error('Error invalidating cache pattern', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      await AsyncStorage.multiRemove(cacheKeys);
      log.info(`Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      log.error('Error clearing cache', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          
          try {
            const entry = JSON.parse(value);
            if (entry.timestamp) {
              if (!oldestEntry || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
              }
              if (!newestEntry || entry.timestamp > newestEntry) {
                newestEntry = entry.timestamp;
              }
            }
          } catch {
            // Skip invalid entries
          }
        }
      }

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let removedCount = 0;
      const now = Date.now();

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const entry = JSON.parse(value);
            if (entry.expiresAt && now > entry.expiresAt) {
              await AsyncStorage.removeItem(key);
              removedCount++;
            }
          } catch {
            // Remove invalid entries
            await AsyncStorage.removeItem(key);
            removedCount++;
          }
        }
      }

      if (removedCount > 0) {
        log.info(`Cleaned up ${removedCount} expired cache entries`);
      }

      return removedCount;
    } catch (error) {
      log.error('Error cleaning up cache', error);
      return 0;
    }
  }

  /**
   * Get full cache key with prefix
   */
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Initialize cache service
   */
  async initialize(): Promise<void> {
    log.info('Initializing Cache Service');
    
    // Clean up expired entries on init
    await this.cleanup();
    
    // Log cache stats
    const stats = await this.getStats();
    log.info(`Cache Stats: ${stats.totalEntries} entries, ${(stats.totalSize / 1024).toFixed(2)} KB`);
    
    log.info('Cache Service initialized successfully');
  }
}

// Export singleton instance
export const cacheService = new CacheService();
