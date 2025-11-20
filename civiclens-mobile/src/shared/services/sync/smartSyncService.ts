/**
 * Smart Background Sync Service
 * Intelligently syncs data based on user behavior and network conditions
 */

import { AppState, AppStateStatus } from 'react-native';
import { networkService } from '@shared/services/network/networkService';
import { cacheService } from '@shared/services/cache/CacheService';
import { offlineFirstApi } from '@shared/services/api/offlineFirstApi';
import { submissionQueue } from '@shared/services/queue/submissionQueue';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('SmartSyncService');

interface SyncStrategy {
  priority: 'high' | 'medium' | 'low';
  frequency: number; // milliseconds
  conditions: {
    requiresWifi?: boolean;
    requiresCharging?: boolean;
    maxRetries?: number;
  };
}

interface UserBehavior {
  activeScreens: string[];
  lastActivity: number;
  syncPreferences: {
    backgroundSync: boolean;
    wifiOnly: boolean;
    lowPowerMode: boolean;
  };
}

class SmartSyncService {
  private syncStrategies: Map<string, SyncStrategy> = new Map();
  private userBehavior: UserBehavior = {
    activeScreens: [],
    lastActivity: Date.now(),
    syncPreferences: {
      backgroundSync: true,
      wifiOnly: false,
      lowPowerMode: false,
    },
  };
  
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isAppActive = true;
  private lastSyncTime = 0;
  private syncInProgress = false;

  /**
   * Initialize smart sync service
   */
  async initialize(): Promise<void> {
    log.info('Initializing Smart Sync Service');

    // Setup sync strategies
    this.setupSyncStrategies();

    // Listen to app state changes
    AppState.addEventListener('change', this.handleAppStateChange);

    // Listen to network changes
    networkService.addListener(this.handleNetworkChange);

    // Start intelligent sync scheduling
    this.scheduleSmartSync();

    log.info('Smart Sync Service initialized');
  }

  /**
   * Setup different sync strategies for different data types
   */
  private setupSyncStrategies(): void {
    // Critical data - sync frequently
    this.syncStrategies.set('user_profile', {
      priority: 'high',
      frequency: 2 * 60 * 1000, // 2 minutes
      conditions: { maxRetries: 3 },
    });

    this.syncStrategies.set('dashboard_stats', {
      priority: 'high',
      frequency: 5 * 60 * 1000, // 5 minutes
      conditions: { maxRetries: 3 },
    });

    // Important data - sync moderately
    this.syncStrategies.set('my_reports', {
      priority: 'medium',
      frequency: 10 * 60 * 1000, // 10 minutes
      conditions: { maxRetries: 2 },
    });

    this.syncStrategies.set('notifications', {
      priority: 'medium',
      frequency: 15 * 60 * 1000, // 15 minutes
      conditions: { maxRetries: 2 },
    });

    // Background data - sync less frequently
    this.syncStrategies.set('nearby_reports', {
      priority: 'low',
      frequency: 30 * 60 * 1000, // 30 minutes
      conditions: { 
        requiresWifi: true,
        maxRetries: 1,
      },
    });

    this.syncStrategies.set('analytics', {
      priority: 'low',
      frequency: 60 * 60 * 1000, // 1 hour
      conditions: { 
        requiresWifi: true,
        requiresCharging: true,
        maxRetries: 1,
      },
    });
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const wasActive = this.isAppActive;
    this.isAppActive = nextAppState === 'active';

    if (!wasActive && this.isAppActive) {
      // App became active - trigger immediate sync for critical data
      log.info('App became active - triggering foreground sync');
      this.syncCriticalData();
    } else if (wasActive && !this.isAppActive) {
      // App went to background - schedule background sync
      log.info('App went to background - scheduling background sync');
      this.scheduleBackgroundSync();
    }
  };

  /**
   * Handle network changes
   */
  private handleNetworkChange = (status: any): void => {
    if (status.isConnected && status.isInternetReachable) {
      log.info('Network restored - triggering smart sync');
      
      // Prioritize submission queue first
      submissionQueue.processQueue().catch(error => {
        log.error('Failed to process submission queue:', error);
      });

      // Then sync other data based on strategy
      setTimeout(() => {
        this.syncBasedOnStrategy();
      }, 1000);
    }
  };

  /**
   * Sync critical data immediately (foreground)
   */
  private async syncCriticalData(): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    log.info('Syncing critical data');

    try {
      const criticalEndpoints = [
        '/users/me',
        '/users/me/stats',
        '/users/me/notifications?limit=10',
      ];

      const promises = criticalEndpoints.map(endpoint =>
        offlineFirstApi.get(endpoint, {
          ttl: 5 * 60 * 1000,
          forceRefresh: true,
          staleWhileRevalidate: false,
        }).catch(error => {
          log.warn(`Failed to sync ${endpoint}:`, error);
        })
      );

      await Promise.allSettled(promises);
      this.lastSyncTime = Date.now();

    } catch (error) {
      log.error('Critical data sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync data based on current strategy and conditions
   */
  private async syncBasedOnStrategy(): Promise<void> {
    if (!networkService.isOnline() || this.syncInProgress) return;

    this.syncInProgress = true;
    log.info('Starting strategy-based sync');

    try {
      // Get network type for strategy decisions
      const networkStatus = networkService.getStatus();
      const isWifi = networkStatus.type === 'wifi';

      // Sync based on priority and conditions
      for (const [dataType, strategy] of this.syncStrategies) {
        if (this.shouldSync(strategy, isWifi)) {
          await this.syncDataType(dataType, strategy);
          
          // Add delay between syncs to not overwhelm the network
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error) {
      log.error('Strategy-based sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check if data type should sync based on strategy
   */
  private shouldSync(strategy: SyncStrategy, isWifi: boolean): boolean {
    // Check wifi requirement
    if (strategy.conditions.requiresWifi && !isWifi) {
      return false;
    }

    // Check if enough time has passed
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync < strategy.frequency) {
      return false;
    }

    // Check user preferences
    if (this.userBehavior.syncPreferences.wifiOnly && !isWifi) {
      return false;
    }

    if (this.userBehavior.syncPreferences.lowPowerMode && strategy.priority === 'low') {
      return false;
    }

    return true;
  }

  /**
   * Sync specific data type
   */
  private async syncDataType(dataType: string, strategy: SyncStrategy): Promise<void> {
    try {
      const endpoint = this.getEndpointForDataType(dataType);
      if (!endpoint) return;

      log.debug(`Syncing ${dataType} with ${strategy.priority} priority`);

      await offlineFirstApi.get(endpoint, {
        ttl: this.getTTLForStrategy(strategy),
        forceRefresh: strategy.priority === 'high',
        staleWhileRevalidate: true,
      });

    } catch (error) {
      log.warn(`Failed to sync ${dataType}:`, error);
    }
  }

  /**
   * Get API endpoint for data type (role-aware)
   */
  private getEndpointForDataType(dataType: string): string | null {
    // Import auth store dynamically to avoid circular dependencies
    const { useAuthStore } = require('@/store/authStore');
    const user = useAuthStore.getState().user;
    const isOfficer = user && ['NODAL_OFFICER', 'ADMIN', 'AUDITOR', 'nodal_officer', 'admin', 'auditor'].includes(user.role);

    // Officer-specific endpoints
    if (isOfficer) {
      const officerEndpoints: Record<string, string> = {
        user_profile: '/users/me',
        dashboard_stats: '/users/me/officer-stats', // Officer stats endpoint
        my_reports: '/reports/?page=1&per_page=20', // Officer reports (all assigned)
        notifications: '/users/me/notifications?limit=20',
        nearby_reports: '/reports/nearby?limit=50',
        analytics: '/analytics/dashboard',
      };
      return officerEndpoints[dataType] || null;
    }

    // Citizen endpoints
    const endpoints: Record<string, string> = {
      user_profile: '/users/me',
      dashboard_stats: '/users/me/stats',
      my_reports: '/reports/my-reports?limit=20',
      notifications: '/users/me/notifications?limit=20',
      nearby_reports: '/reports/nearby?limit=50',
      analytics: '/analytics/dashboard',
    };

    return endpoints[dataType] || null;
  }

  /**
   * Get TTL based on strategy priority
   */
  private getTTLForStrategy(strategy: SyncStrategy): number {
    switch (strategy.priority) {
      case 'high':
        return 5 * 60 * 1000;  // 5 minutes
      case 'medium':
        return 15 * 60 * 1000; // 15 minutes
      case 'low':
        return 60 * 60 * 1000; // 1 hour
      default:
        return 10 * 60 * 1000; // 10 minutes
    }
  }

  /**
   * Schedule background sync for when app is not active
   */
  private scheduleBackgroundSync(): void {
    // Clear existing intervals
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();

    // Schedule background sync every 5 minutes for critical data
    const criticalInterval = setInterval(() => {
      if (!this.isAppActive && networkService.isOnline()) {
        this.syncCriticalData();
      }
    }, 5 * 60 * 1000);

    this.syncIntervals.set('critical', criticalInterval);

    // Schedule less frequent sync for other data
    const backgroundInterval = setInterval(() => {
      if (!this.isAppActive && networkService.isOnline()) {
        this.syncBasedOnStrategy();
      }
    }, 15 * 60 * 1000);

    this.syncIntervals.set('background', backgroundInterval);
  }

  /**
   * Schedule smart sync based on user behavior
   */
  private scheduleSmartSync(): void {
    // Adaptive sync based on user activity
    const smartInterval = setInterval(() => {
      if (this.isAppActive && networkService.isOnline()) {
        const timeSinceActivity = Date.now() - this.userBehavior.lastActivity;
        
        // If user is actively using the app, sync more frequently
        if (timeSinceActivity < 30000) { // 30 seconds
          this.syncCriticalData();
        } else if (timeSinceActivity < 300000) { // 5 minutes
          this.syncBasedOnStrategy();
        }
      }
    }, 60000); // Check every minute

    this.syncIntervals.set('smart', smartInterval);
  }

  /**
   * Update user behavior for smarter sync decisions
   */
  updateUserBehavior(behavior: Partial<UserBehavior>): void {
    this.userBehavior = {
      ...this.userBehavior,
      ...behavior,
      lastActivity: Date.now(),
    };

    log.debug('Updated user behavior:', this.userBehavior);
  }

  /**
   * Force sync all data (pull-to-refresh) - Role-aware
   */
  async forceSyncAll(): Promise<void> {
    log.info('Force syncing all data');

    try {
      // Clear cache first
      await cacheService.clearAll();

      // Get role-aware endpoints
      const { useAuthStore } = require('@/store/authStore');
      const user = useAuthStore.getState().user;
      const isOfficer = user && ['NODAL_OFFICER', 'ADMIN', 'AUDITOR', 'nodal_officer', 'admin', 'auditor'].includes(user.role);

      // Sync all data types regardless of strategy (role-aware)
      const allEndpoints = isOfficer ? [
        '/users/me',
        '/users/me/officer-stats',
        '/reports/?page=1&per_page=20',
        '/users/me/notifications',
        '/reports/nearby',
        '/analytics/dashboard',
      ] : [
        '/users/me',
        '/users/me/stats',
        '/reports/my-reports',
        '/users/me/notifications',
        '/reports/nearby',
        '/analytics/dashboard',
      ];

      const promises = allEndpoints.map(endpoint =>
        offlineFirstApi.get(endpoint, {
          forceRefresh: true,
          staleWhileRevalidate: false,
        }).catch(error => {
          log.warn(`Failed to force sync ${endpoint}:`, error);
        })
      );

      await Promise.allSettled(promises);
      this.lastSyncTime = Date.now();

      log.info('Force sync completed');

    } catch (error) {
      log.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    lastSyncTime: number;
    syncInProgress: boolean;
    strategiesCount: number;
    activeIntervals: number;
  } {
    return {
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      strategiesCount: this.syncStrategies.size,
      activeIntervals: this.syncIntervals.size,
    };
  }

  /**
   * Cleanup sync service
   */
  cleanup(): void {
    log.info('Cleaning up Smart Sync Service');

    // Clear all intervals
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();

    // Remove listeners
    AppState.removeEventListener('change', this.handleAppStateChange);
  }
}

export const smartSyncService = new SmartSyncService();
