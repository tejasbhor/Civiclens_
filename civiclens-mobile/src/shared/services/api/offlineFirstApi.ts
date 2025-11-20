/**
 * Offline-First API Wrapper
 * Wraps API calls with cache-first strategy
 */

import { apiClient } from './apiClient';
import { cacheService } from '../cache/CacheService';
import { networkService } from '../network/networkService';

interface OfflineFirstOptions {
  ttl?: number; // Cache TTL in milliseconds
  forceRefresh?: boolean; // Skip cache and fetch fresh
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
  offlineOnly?: boolean; // Only use cache, never fetch
}

class OfflineFirstApi {
  /**
   * GET request with cache-first strategy
   */
  async get<T>(
    url: string,
    options: OfflineFirstOptions = {}
  ): Promise<T> {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      forceRefresh = false,
      staleWhileRevalidate = true,
      offlineOnly = false,
    } = options;

    const cacheKey = `api:${url}`;

    // If offline-only mode, return cached data or throw
    if (offlineOnly) {
      const cached = await this.getCachedData<T>(cacheKey);
      if (cached) {
        return cached;
      }
      throw new Error('No cached data available and offline-only mode enabled');
    }

    // Use cache service with automatic background revalidation
    return cacheService.get<T>(
      cacheKey,
      async () => {
        // Only fetch if online
        if (!networkService.isOnline() && !forceRefresh) {
          throw new Error('Device is offline');
        }

        // Fetch from API
        return await apiClient.get<T>(url);
      },
      { ttl, forceRefresh, staleWhileRevalidate }
    );
  }

  /**
   * POST request (no caching, but invalidates related cache)
   */
  async post<T>(
    url: string,
    data?: any,
    invalidatePatterns: string[] = []
  ): Promise<T> {
    const result = await apiClient.post<T>(url, data);

    // Invalidate related cache entries
    for (const pattern of invalidatePatterns) {
      await cacheService.invalidatePattern(pattern);
    }

    return result;
  }

  /**
   * PUT request (no caching, but invalidates related cache)
   */
  async put<T>(
    url: string,
    data?: any,
    invalidatePatterns: string[] = []
  ): Promise<T> {
    const result = await apiClient.put<T>(url, data);

    // Invalidate related cache entries
    for (const pattern of invalidatePatterns) {
      await cacheService.invalidatePattern(pattern);
    }

    return result;
  }

  /**
   * DELETE request (no caching, but invalidates related cache)
   */
  async delete<T>(
    url: string,
    invalidatePatterns: string[] = []
  ): Promise<T> {
    const result = await apiClient.delete<T>(url);

    // Invalidate related cache entries
    for (const pattern of invalidatePatterns) {
      await cacheService.invalidatePattern(pattern);
    }

    return result;
  }

  /**
   * Get cached data directly (for offline-only scenarios)
   */
  private async getCachedData<T>(cacheKey: string): Promise<T | null> {
    try {
      // Try to get from cache without fetching
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const cached = await AsyncStorage.getItem(`@civiclens_cache:${cacheKey}`);
      
      if (!cached) {
        return null;
      }

      const entry = JSON.parse(cached);
      return entry.data as T;
    } catch {
      return null;
    }
  }

  /**
   * Invalidate cache for specific URL
   */
  async invalidateCache(url: string): Promise<void> {
    const cacheKey = `api:${url}`;
    await cacheService.invalidate(cacheKey);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCachePattern(pattern: string): Promise<void> {
    await cacheService.invalidatePattern(pattern);
  }

  /**
   * Clear all API cache
   */
  async clearAllCache(): Promise<void> {
    await cacheService.invalidatePattern('api:');
  }
}

// Export singleton instance
export const offlineFirstApi = new OfflineFirstApi();

// Export convenience methods
export const {
  get: getWithCache,
  post: postWithInvalidation,
  put: putWithInvalidation,
  delete: deleteWithInvalidation,
  invalidateCache,
  invalidateCachePattern,
  clearAllCache,
} = offlineFirstApi;
