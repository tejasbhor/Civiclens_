/**
 * Dashboard Store
 * Zustand store for managing citizen dashboard state
 */

import { create } from 'zustand';
import { DashboardStats, UserLocation } from '@shared/types/dashboard';
import { useAuthStore } from './authStore';
import { offlineFirstApi } from '@shared/services/api/offlineFirstApi';
import { networkService } from '@shared/services/network/networkService';
import { cacheService as persistentCacheService } from '@shared/services/storage/cacheService';

interface DashboardState {
  // State
  stats: DashboardStats | null;
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: number | null;
  isHydrating: boolean;
  retryCount: number;
  lastRetryTime: number | null;

  // Actions
  setStats: (stats: DashboardStats) => void;
  setUserLocation: (location: UserLocation) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchDashboardData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  clearError: () => void;
  hydrateFromCache: () => Promise<void>;
  reset: () => void;
  resetCircuitBreaker: () => void;
}

const initialState = {
  stats: null,
  userLocation: null,
  isLoading: false,
  error: null,
  lastRefresh: null,
  isHydrating: false,
  retryCount: 0,
  lastRetryTime: null,
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...initialState,

  setStats: (stats) => set({ stats }),

  setUserLocation: (location) => set({ userLocation: location }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  /**
   * Hydrate dashboard stats from persistent cache so UI has data offline
   */
  hydrateFromCache: async () => {
    const { isHydrating } = get();
    if (isHydrating) {
      return;
    }

    set({ isHydrating: true });
    try {
      const cachedStats = await persistentCacheService.getCachedDashboardStats();
      if (cachedStats) {
        let cachedTimestamp: number | null = null;
        try {
          const age = await persistentCacheService.getAge('dashboard:stats');
          cachedTimestamp = age !== null ? Date.now() - age : Date.now();
        } catch (timestampError) {
          console.error('[Dashboard] Failed to read cache age:', timestampError);
        }

        set({
          stats: cachedStats,
          lastRefresh: cachedTimestamp,
          error: null,
        });
      }
    } catch (cacheError) {
      console.error('[Dashboard] Failed to hydrate dashboard cache:', cacheError);
    } finally {
      set({ isHydrating: false });
    }
  },

  /**
   * Fetch dashboard data with offline-first strategy
   * Only fetches user stats - no alerts or nearby reports
   * CITIZEN ONLY - Officers should use useOfficerDashboard hook instead
   */
  fetchDashboardData: async () => {
    const state = get();
    
    // Don't fetch if already loading
    if (state.isLoading) return;

    // Get current user
    const user = useAuthStore.getState().user;
    if (!user) {
      console.warn('[Dashboard] User not authenticated - skipping fetch');
      return;
    }

    // CRITICAL: Skip for officers - they use useOfficerDashboard instead
    const officerRoles = ['NODAL_OFFICER', 'ADMIN', 'AUDITOR', 'nodal_officer', 'admin', 'auditor'];
    if (officerRoles.includes(user.role)) {
      console.log('[Dashboard] Officer detected - skipping citizen dashboard fetch');
      return;
    }

    // Circuit breaker: Limit retries to prevent infinite loops
    const maxRetries = 3;
    const retryWindow = 60000; // 1 minute
    const now = Date.now();
    
    if (state.retryCount >= maxRetries && state.lastRetryTime && (now - state.lastRetryTime) < retryWindow) {
      console.warn('[Dashboard] Circuit breaker active - too many retries');
      return;
    }

    // Reset retry count if window has passed
    if (state.lastRetryTime && (now - state.lastRetryTime) >= retryWindow) {
      set({ retryCount: 0, lastRetryTime: null });
    }

    set({ isLoading: true, error: null, retryCount: state.retryCount + 1, lastRetryTime: now });

    try {

      // Fetch stats with cache-first strategy (5 min TTL)
      const statsRaw = await offlineFirstApi.get<any>(
        `/users/me/stats`,
        { ttl: 5 * 60 * 1000, staleWhileRevalidate: true }
      );
      
      // Map backend response to DashboardStats interface
      const stats: DashboardStats = {
        issuesRaised: statsRaw.total_reports || 0,
        inProgress: statsRaw.in_progress_reports || statsRaw.active_reports || 0,
        resolved: statsRaw.resolved_reports || 0,
        total: statsRaw.total_reports || 0,
      };
      
      if (__DEV__) {
        console.log('[Dashboard] Stats mapped successfully:', stats);
      }

      try {
        await persistentCacheService.cacheDashboardStats(stats);
      } catch (cacheError) {
        console.error('[Dashboard] Failed to cache stats:', cacheError);
      }

      // Reset retry count on success
      set({
        stats,
        isLoading: false,
        error: networkService.isOnline() ? null : 'Offline - showing cached data',
        lastRefresh: Date.now(),
        retryCount: 0,
        lastRetryTime: null,
      });

      if (__DEV__) {
        console.log('[Dashboard] Data loaded successfully (cache-first)');
      }
    } catch (error: any) {
      console.error('[Dashboard] Failed to fetch data:', error);
      
      // Handle auth errors specially - don't retry
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        set({
          error: 'Authentication required. Please login again.',
          isLoading: false,
          retryCount: maxRetries, // Stop retrying
        });
        return;
      }
      
      // Show error but keep existing data if available
      set({
        error: error instanceof Error ? error.message : 'Failed to load dashboard',
        isLoading: false,
      });
    }
  },

  /**
   * Refresh dashboard data (pull-to-refresh)
   */
  refreshDashboard: async () => {
    await get().fetchDashboardData();
  },

  /**
   * Reset dashboard state
   */
  reset: () => set(initialState),

  /**
   * Reset circuit breaker (for manual retry)
   */
  resetCircuitBreaker: () => set({ retryCount: 0, lastRetryTime: null, error: null }),
}));
