/**
 * Cache Service
 * Handles caching of API responses for offline-first architecture
 * Stores dashboard stats, reports, and other data in SQLite for offline access
 */

import { database } from '@shared/database/database';
import { DashboardStats } from '@shared/types/dashboard';
import { UserProfileDetails } from '@shared/types/user';
import { UserStats } from '@shared/services/api/userApi';
import type { Notification } from '@shared/types/notification';

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number | null;
}

class CacheService {
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_TABLE = 'cache_data';

  /**
   * Initialize cache service
   * Note: cache_data table is now created during database initialization
   */
  async initialize(): Promise<void> {
    try {
      // Table is created in database schema, just verify it exists
      await database.getFirstAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name='${this.CACHE_TABLE}'`);
      console.log('✅ Cache service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize cache service:', error);
    }
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const timestamp = Date.now();
      const expiresAt = ttl > 0 ? timestamp + ttl : null;

      await database.runAsync(
        `INSERT OR REPLACE INTO ${this.CACHE_TABLE} (key, data, timestamp, expires_at)
         VALUES (?, ?, ?, ?)`,
        [key, JSON.stringify(data), timestamp, expiresAt]
      );

      console.log(`💾 Cached: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to cache ${key}:`, error);
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await database.getFirstAsync<{
        key: string;
        data: string;
        timestamp: number;
        expires_at: number | null;
      }>(
        `SELECT * FROM ${this.CACHE_TABLE} WHERE key = ?`,
        [key]
      );

      if (!entry) {
        console.log(`📭 Cache miss: ${key}`);
        return null;
      }

      // Check if expired
      if (entry.expires_at && Date.now() > entry.expires_at) {
        console.log(`⏰ Cache expired: ${key}`);
        await this.delete(key);
        return null;
      }

      console.log(`📬 Cache hit: ${key}`);
      return JSON.parse(entry.data) as T;
    } catch (error) {
      console.error(`❌ Failed to get cache ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      await database.runAsync(
        `DELETE FROM ${this.CACHE_TABLE} WHERE key = ?`,
        [key]
      );
      console.log(`🗑️ Deleted cache: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to delete cache ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await database.runAsync(`DELETE FROM ${this.CACHE_TABLE}`);
      console.log('🧹 Cleared all cache');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<void> {
    try {
      const now = Date.now();
      await database.runAsync(
        `DELETE FROM ${this.CACHE_TABLE} WHERE expires_at IS NOT NULL AND expires_at < ?`,
        [now]
      );
      console.log('🧹 Cleared expired cache');
    } catch (error) {
      console.error('❌ Failed to clear expired cache:', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Get cache age in milliseconds
   */
  async getAge(key: string): Promise<number | null> {
    try {
      const entry = await database.getFirstAsync<{
        timestamp: number;
      }>(
        `SELECT timestamp FROM ${this.CACHE_TABLE} WHERE key = ?`,
        [key]
      );

      if (!entry) {
        return null;
      }

      return Date.now() - entry.timestamp;
    } catch (error) {
      console.error(`❌ Failed to get cache age ${key}:`, error);
      return null;
    }
  }

  // Specific cache methods for common data types

  /**
   * Cache dashboard stats
   */
  async cacheDashboardStats(stats: DashboardStats): Promise<void> {
    await this.set('dashboard:stats', stats, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Get cached dashboard stats
   */
  async getCachedDashboardStats(): Promise<DashboardStats | null> {
    return await this.get<DashboardStats>('dashboard:stats');
  }

  /**
   * Cache user reports list
   */
  async cacheUserReports(reports: any[]): Promise<void> {
    await this.set('user:reports', reports, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get cached user reports
   */
  async getCachedUserReports(): Promise<any[] | null> {
    return await this.get<any[]>('user:reports');
  }

  /**
   * Cache combined user profile + stats snapshot
   */
  async cacheUserProfileSummary(data: {
    profile: UserProfileDetails;
    stats: UserStats | null;
  }): Promise<void> {
    await this.set('user:profileSummary', data, 15 * 60 * 1000); // 15 minutes
  }

  /**
   * Get cached user profile + stats snapshot
   */
  async getCachedUserProfileSummary(): Promise<{
    profile: UserProfileDetails;
    stats: UserStats | null;
  } | null> {
    return await this.get('user:profileSummary');
  }

  /**
   * Cache notifications snapshot (list + unread count)
   */
  async cacheNotificationsSnapshot(data: {
    notifications: Notification[];
    unreadCount: number;
  }): Promise<void> {
    await this.set('notifications:snapshot', data, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get cached notifications snapshot
   */
  async getCachedNotificationsSnapshot(): Promise<{
    notifications: Notification[];
    unreadCount: number;
  } | null> {
    return await this.get('notifications:snapshot');
  }

  /**
   * Cache report detail
   */
  async cacheReportDetail(reportId: number, report: any): Promise<void> {
    await this.set(`report:${reportId}`, report, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Get cached report detail
   */
  async getCachedReportDetail(reportId: number): Promise<any | null> {
    return await this.get<any>(`report:${reportId}`);
  }

  /**
   * Cache nearby reports
   */
  async cacheNearbyReports(reports: any[]): Promise<void> {
    await this.set('nearby:reports', reports, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get cached nearby reports
   */
  async getCachedNearbyReports(): Promise<any[] | null> {
    return await this.get<any[]>('nearby:reports');
  }
}

export const cacheService = new CacheService();
