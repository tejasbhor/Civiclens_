/**
 * Data Preloader Service - Instagram-Like Experience
 * Preloads essential data for offline-first experience
 */

import { cacheService } from '@shared/services/cache/CacheService';
import { offlineFirstApi } from '@shared/services/api/offlineFirstApi';
import { networkService } from '@shared/services/network/networkService';
import { apiErrorHandler } from '@shared/services/api/errorHandler';
import { useAuthStore } from '../../../store/authStore';
// import { database } from '@shared/database/database'; // TODO: Use when needed
import { createLogger } from '@shared/utils/logger';

const log = createLogger('DataPreloader');

interface PreloadConfig {
  essential: string[];    // Must-have data (profile, dashboard)
  important: string[];    // Nice-to-have data (recent reports)
  background: string[];   // Background data (all reports, stats)
}

class DataPreloader {
  private isPreloading = false;
  
  /**
   * Get role-aware preload configuration
   */
  private getPreloadConfig(): PreloadConfig {
    const { user } = useAuthStore.getState();
    const isOfficer = user && ['NODAL_OFFICER', 'ADMIN', 'AUDITOR', 'nodal_officer', 'admin', 'auditor'].includes(user.role);
    
    if (isOfficer) {
      // Officer-specific configuration - avoid conflicts with useOfficerDashboard
      // Officers don't need preloading - useOfficerDashboard handles everything
      return {
        essential: [
          '/departments',
          // NOTE: Don't preload officer-specific endpoints - let useOfficerDashboard handle it
          // This prevents 403 errors and dashboard glitches
        ],
        important: [],
        background: [],
      };
    } else {
      // Regular user configuration
      return {
        essential: [
          '/users/me/stats',
          '/reports/my-reports?limit=10',
          '/departments',
        ],
        important: [
          '/reports/my-reports?limit=50',
        ],
        background: [],
      };
    }
  }

  /**
   * Preload essential data immediately on app start
   */
  async preloadEssentialData(): Promise<void> {
    if (this.isPreloading) return;
    
    // Check if user is authenticated before preloading
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      log.debug('User not authenticated - skipping data preload');
      return;
    }
    
    this.isPreloading = true;
    log.info('Starting essential data preload');

    try {
      // Get role-aware configuration
      const config = this.getPreloadConfig();
      
      // Preload essential data in parallel
      const essentialPromises = config.essential.map(endpoint =>
        this.preloadEndpoint(endpoint, { priority: 'essential' })
      );

      await Promise.allSettled(essentialPromises);
      log.info('Essential data preload completed');

      // Start important data preload in background
      this.preloadImportantData();

    } catch (error) {
      log.error('Essential data preload failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload important data in background
   */
  private async preloadImportantData(): Promise<void> {
    // Check authentication first
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      log.debug('User not authenticated - skipping important data preload');
      return;
    }
    
    if (!networkService.isOnline()) {
      log.info('Offline - skipping important data preload');
      return;
    }

    log.info('Starting important data preload');

    try {
      // Get role-aware configuration
      const config = this.getPreloadConfig();
      
      // Preload important data with delay to not block UI
      for (const endpoint of config.important) {
        await this.preloadEndpoint(endpoint, { priority: 'important' });
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      log.info('Important data preload completed');

      // Start background data preload
      this.preloadBackgroundData();

    } catch (error) {
      log.error('Important data preload failed:', error);
    }
  }

  /**
   * Preload background data with lowest priority
   */
  private async preloadBackgroundData(): Promise<void> {
    // Check authentication first
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      log.debug('User not authenticated - skipping background data preload');
      return;
    }
    
    if (!networkService.isOnline()) {
      log.info('Offline - skipping background data preload');
      return;
    }

    log.info('Starting background data preload');
    
    try {
      // Get role-aware configuration
      const config = this.getPreloadConfig();
      log.debug('Background endpoints to preload:', config.background);

      // Preload background data with longer delays
      for (const endpoint of config.background) {
        log.debug(`Processing background endpoint: ${endpoint}`);
        await this.preloadEndpoint(endpoint, { priority: 'background' });
        await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay
      }

      log.info('Background data preload completed');

    } catch (error) {
      log.error('Background data preload failed:', error);
    }
  }

  // Circuit breaker to prevent infinite retries
  private failedEndpoints = new Set<string>();
  private authErrorCount = 0;
  private maxAuthErrors = 3;
  private lastAuthError = 0;
  private authErrorCooldown = 60000; // 1 minute

  /**
   * Preload a single endpoint
   */
  private async preloadEndpoint(
    endpoint: string, 
    options: { priority: 'essential' | 'important' | 'background' }
  ): Promise<void> {
    // Skip unimplemented endpoints
    const unimplementedEndpoints = [
      '/users/me/activity', 
      '/analytics/dashboard',
      '/users/me/notifications',
      '/reports/nearby'
    ];
    const cleanEndpoint = endpoint.split('?')[0]; // Remove query params for comparison
    if (unimplementedEndpoints.includes(cleanEndpoint)) {
      log.debug(`Skipping unimplemented endpoint: ${endpoint}`);
      return;
    }

    // Circuit breaker: Skip if endpoint has failed recently
    if (this.failedEndpoints.has(endpoint)) {
      log.debug(`Skipping failed endpoint: ${endpoint}`);
      return;
    }

    // Circuit breaker: Stop preloading if too many auth errors
    if (this.authErrorCount >= this.maxAuthErrors) {
      const timeSinceLastError = Date.now() - this.lastAuthError;
      if (timeSinceLastError < this.authErrorCooldown) {
        log.debug(`Auth circuit breaker active - skipping ${endpoint}`);
        return;
      } else {
        // Reset after cooldown
        this.authErrorCount = 0;
        this.failedEndpoints.clear();
        log.info('Auth circuit breaker reset after cooldown');
      }
    }

    try {
      const ttl = this.getTTLForPriority(options.priority);
      
      await offlineFirstApi.get(endpoint, {
        ttl,
        staleWhileRevalidate: true,
      });

      log.debug(`Preloaded ${options.priority}: ${endpoint}`);

    } catch (error: any) {
      // Handle authentication errors specially
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        this.authErrorCount++;
        this.lastAuthError = Date.now();
        this.failedEndpoints.add(endpoint);
        
        log.warn(`Auth error preloading ${endpoint} (${this.authErrorCount}/${this.maxAuthErrors}) - stopping preload`);
        
        // Stop all preloading on auth errors to prevent spam
        this.isPreloading = false;
        throw error;
      }
      
      // Handle server errors (5xx)
      if (error?.response?.status >= 500) {
        this.failedEndpoints.add(endpoint);
        log.warn(`Server error preloading ${endpoint} - marking as failed`);
        return;
      }
      
      // Use error handler to determine if this should be logged
      if (!apiErrorHandler.shouldIgnoreError(error, endpoint)) {
        log.warn(`Failed to preload ${endpoint}:`, error);
      }
    }
  }

  /**
   * Get cache TTL based on data priority
   */
  private getTTLForPriority(priority: 'essential' | 'important' | 'background'): number {
    switch (priority) {
      case 'essential':
        return 10 * 60 * 1000; // 10 minutes
      case 'important':
        return 15 * 60 * 1000; // 15 minutes
      case 'background':
        return 30 * 60 * 1000; // 30 minutes
      default:
        return 5 * 60 * 1000;  // 5 minutes
    }
  }

  /**
   * Preload user-specific data after login
   */
  async preloadUserData(userId: number): Promise<void> {
    log.info(`Preloading data for user ${userId}`);

    const userEndpoints = [
      `/users/${userId}/profile`,
      `/users/${userId}/reports`,
      `/users/${userId}/tasks`,
      `/users/${userId}/notifications`,
    ];

    const promises = userEndpoints.map(endpoint =>
      this.preloadEndpoint(endpoint, { priority: 'important' })
    );

    await Promise.allSettled(promises);
    log.info('User data preload completed');
  }

  /**
   * Preload location-based data
   */
  async preloadLocationData(latitude: number, longitude: number): Promise<void> {
    log.info('Preloading location-based data');

    const locationEndpoints = [
      `/reports/nearby?lat=${latitude}&lng=${longitude}&radius=5000`,
      `/departments/nearby?lat=${latitude}&lng=${longitude}`,
      `/analytics/area?lat=${latitude}&lng=${longitude}`,
    ];

    const promises = locationEndpoints.map(endpoint =>
      this.preloadEndpoint(endpoint, { priority: 'important' })
    );

    await Promise.allSettled(promises);
    log.info('Location data preload completed');
  }

  /**
   * Refresh all cached data (pull-to-refresh)
   */
  async refreshAllData(): Promise<void> {
    log.info('Refreshing all cached data');

    // Clear cache and reload essential data
    await cacheService.clearAll();
    await this.preloadEssentialData();
  }

  /**
   * Preload data based on user behavior patterns
   */
  async smartPreload(userActivity: {
    frequentScreens: string[];
    recentSearches: string[];
    favoriteCategories: string[];
  }): Promise<void> {
    log.info('Starting smart preload based on user behavior');

    const smartEndpoints: string[] = [];

    // Preload data for frequent screens
    if (userActivity.frequentScreens.includes('reports')) {
      smartEndpoints.push('/reports/my-reports?limit=100');
    }
    
    if (userActivity.frequentScreens.includes('dashboard')) {
      smartEndpoints.push('/analytics/detailed');
    }

    // Preload favorite categories
    userActivity.favoriteCategories.forEach(category => {
      smartEndpoints.push(`/reports?category=${category}&limit=20`);
    });

    // Preload recent searches
    userActivity.recentSearches.forEach(search => {
      smartEndpoints.push(`/reports/search?q=${encodeURIComponent(search)}&limit=10`);
    });

    // Execute smart preload
    const promises = smartEndpoints.map(endpoint =>
      this.preloadEndpoint(endpoint, { priority: 'background' })
    );

    await Promise.allSettled(promises);
    log.info('Smart preload completed');
  }

  /**
   * Preload media files for offline viewing
   */
  async preloadMedia(reportIds: number[]): Promise<void> {
    log.info(`Preloading media for ${reportIds.length} reports`);

    try {
      // Get media URLs from reports
      const mediaUrls: string[] = [];
      
      for (const reportId of reportIds) {
        try {
          const report = await offlineFirstApi.get(`/reports/${reportId}`) as any;
          if (report?.photos && Array.isArray(report.photos)) {
            mediaUrls.push(...report.photos);
          }
        } catch (error) {
          log.warn(`Failed to get media for report ${reportId}:`, error);
        }
      }

      // Download and cache media files
      const mediaPromises = mediaUrls.map(url => this.cacheMediaFile(url));
      await Promise.allSettled(mediaPromises);

      log.info(`Media preload completed: ${mediaUrls.length} files`);

    } catch (error) {
      log.error('Media preload failed:', error);
    }
  }

  /**
   * Cache a media file for offline access
   */
  private async cacheMediaFile(url: string): Promise<void> {
    try {
      // Use React Native's Image.prefetch for images
      const { Image } = await import('react-native');
      await Image.prefetch(url);
      
      log.debug(`Cached media: ${url}`);
    } catch (error) {
      log.warn(`Failed to cache media ${url}:`, error);
    }
  }

  /**
   * Get preload statistics
   */
  async getPreloadStats(): Promise<{
    cacheSize: number;
    cachedEndpoints: number;
    lastPreload: number | null;
  }> {
    const stats = await cacheService.getStats();
    
    return {
      cacheSize: stats.totalSize,
      cachedEndpoints: stats.totalEntries,
      lastPreload: stats.newestEntry,
    };
  }

  /**
   * Initialize the data preloader
   * This should be called during app startup
   */
  async initialize(): Promise<void> {
    log.info('Initializing data preloader');
    
    try {
      // Add small delay to let useOfficerDashboard initialize first (prevents race condition)
      setTimeout(() => {
        this.preloadEssentialData().catch(error => {
          log.warn('Essential data preload failed (will retry later):', error);
        });
      }, 500); // Wait 500ms to avoid conflicts with dashboard hooks
      
      // Preload important data in background
      setTimeout(() => {
        this.preloadImportantData().catch(error => {
          log.warn('Important data preload failed:', error);
        });
      }, 1000); // Wait 1 second
      
      // Preload background data with delay
      setTimeout(() => {
        this.preloadBackgroundData().catch(error => {
          log.warn('Background data preload failed:', error);
        });
      }, 5000); // Wait 5 seconds before background preload
      
      log.info('Data preloader initialized successfully (non-blocking)');
    } catch (error) {
      log.warn('Data preloader initialization failed (continuing anyway):', error);
      // Don't throw error - let app continue without preloading
    }
  }

  /**
   * Initialize preloader with network listeners
   */
  async initializeWithNetworkListeners(): Promise<void> {
    log.info('Initializing Data Preloader');

    // Listen for network changes
    networkService.addListener((status) => {
      if (status.isConnected && status.isInternetReachable) {
        // Network restored - start background preload
        setTimeout(() => {
          this.preloadImportantData();
        }, 2000); // Wait 2 seconds to let urgent requests complete
      }
    });

    // Start essential preload
    await this.preloadEssentialData();

    log.info('Data Preloader initialized');
  }
}

export const dataPreloader = new DataPreloader();
