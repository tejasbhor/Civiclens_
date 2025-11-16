/**
 * Officer Dashboard Hook - Production Ready
 * 100% Server-driven with offline-first functionality
 * NO MOCK DATA - Pure backend integration with caching
 * Matches citizen dashboard pattern exactly
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { networkService } from '../services/network/networkService';
import { offlineFirstApi } from '../services/api/offlineFirstApi';
import { cacheService } from '../services/storage/cacheService';

export interface OfficerStats {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
  onHold: number;
  overdue: number;
  completionRate: number;
  avgResolutionTime: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface UseOfficerDashboardReturn {
  stats: OfficerStats | null;
  userLocation: UserLocation | null;
  isLoading: boolean;
  isHydrating: boolean;
  error: string | null;
  hasData: boolean;
  lastRefresh: number | null;
  refreshDashboard: () => Promise<void>;
  hydrateFromCache: () => Promise<void>;
  clearError: () => void;
}

export const useOfficerDashboard = (): UseOfficerDashboardReturn => {
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { user, isAuthenticated } = useAuthStore();

  const fetchOfficerStats = useCallback(async (): Promise<OfficerStats | null> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    // Validate user has officer role
    const officerRoles = ['NODAL_OFFICER', 'ADMIN', 'AUDITOR'];
    if (!officerRoles.includes(user.role.toUpperCase())) {
      throw new Error(`Access denied. Officer role required. Current role: ${user.role}`);
    }

    // Fetch officer stats from server with offline-first caching
    const statsRaw = await offlineFirstApi.get<any>(
      `/users/me/officer-stats`,
      { 
        ttl: 5 * 60 * 1000, // 5 minutes cache
        staleWhileRevalidate: true 
      }
    );

    // Map backend response to OfficerStats interface
    const stats: OfficerStats = {
      total: statsRaw.total_tasks || 0,
      assigned: statsRaw.assigned_tasks || 0,
      inProgress: statsRaw.in_progress_tasks || 0,
      completed: statsRaw.completed_tasks || 0,
      onHold: statsRaw.on_hold_tasks || 0,
      overdue: statsRaw.overdue_tasks || 0,
      completionRate: statsRaw.completion_rate || 0,
      avgResolutionTime: statsRaw.avg_resolution_time || 0,
    };

    return stats;
  }, [isAuthenticated, user]);

  const fetchUserLocation = useCallback(async (): Promise<UserLocation | null> => {
    // Validate user has officer role
    if (!isAuthenticated || !user) {
      return null;
    }

    const officerRoles = ['NODAL_OFFICER', 'ADMIN', 'AUDITOR'];
    if (!officerRoles.includes(user.role.toUpperCase())) {
      console.warn(`User role ${user.role} cannot access officer location`);
      return null;
    }

    // Get officer's assigned zone location from server
    try {
      const locationData = await offlineFirstApi.get<any>(
        `/users/me/officer-location`,
        { 
          ttl: 10 * 60 * 1000, // 10 minutes cache
          staleWhileRevalidate: true 
        }
      );

      return {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address || locationData.zone_name,
      };
    } catch (error) {
      console.warn('Failed to fetch officer location:', error);
      return null;
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please log in to view dashboard');
      return;
    }

    // Don't fetch if already loading
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch fresh data using offline-first API
      const [statsData, locationData] = await Promise.all([
        fetchOfficerStats(),
        fetchUserLocation(),
      ]);

      if (statsData) {
        setStats(statsData);
        // Cache officer stats using the same pattern as citizen dashboard
        try {
          await cacheService.set('officer:stats', statsData, 10 * 60 * 1000); // 10 minutes
        } catch (cacheError) {
          console.error('[Officer Dashboard] Failed to cache stats:', cacheError);
        }
      }

      if (locationData) {
        setUserLocation(locationData);
      }

      setError(networkService.isOnline() ? null : 'Offline - showing cached data');
      setLastRefresh(Date.now());

      if (__DEV__) {
        console.log('[Officer Dashboard] Data loaded successfully (cache-first)');
      }
    } catch (error) {
      console.error('[Officer Dashboard] Failed to fetch data:', error);
      
      // Show error but keep existing data if available
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchOfficerStats, fetchUserLocation, isLoading]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Hydrate from cache on app start - matching citizen dashboard pattern
  const hydrateFromCache = useCallback(async () => {
    if (isHydrating || !isAuthenticated || !user || isLoading) {
      return;
    }

    setIsHydrating(true);
    try {
      // Try to get cached officer stats
      const cachedStats = await cacheService.get<OfficerStats>('officer:stats');
      if (cachedStats) {
        let cachedTimestamp: number | null = null;
        try {
          const age = await cacheService.getAge('officer:stats');
          cachedTimestamp = age !== null ? Date.now() - age : Date.now();
        } catch (timestampError) {
          console.error('[Officer Dashboard] Failed to read cache age:', timestampError);
        }

        setStats(cachedStats);
        setLastRefresh(cachedTimestamp);
        setError(null);
        console.log('✅ Officer dashboard hydrated from cache');
      }
    } catch (cacheError) {
      console.error('[Officer Dashboard] Failed to hydrate cache:', cacheError);
    } finally {
      setIsHydrating(false);
    }
  }, [isAuthenticated, user, isHydrating]);

  // Initialize dashboard on mount - hydrate first, then fetch
  useEffect(() => {
    if (isAuthenticated && user && !isInitialized) {
      setIsInitialized(true);
      // First hydrate from cache for instant UI
      hydrateFromCache().then(() => {
        // Then fetch fresh data from server
        refreshDashboard();
      });
    }
  }, [isAuthenticated, user, isInitialized]); // ✅ FIXED: Added initialization guard

  // Circuit breaker for network retry
  const [networkRetryCount, setNetworkRetryCount] = useState(0);
  const maxNetworkRetries = 3;

  // Listen for network changes with circuit breaker
  useEffect(() => {
    const unsubscribe = networkService.addListener((status) => {
      if (status.isConnected && status.isInternetReachable && !stats && networkRetryCount < maxNetworkRetries) {
        // Network restored and no data - refresh (with limit)
        setNetworkRetryCount(prev => prev + 1);
        refreshDashboard().catch(() => {
          // Don't retry on error to prevent infinite loop
        });
      }
    });

    return unsubscribe;
  }, [stats, networkRetryCount]); // ✅ FIXED: Removed refreshDashboard dependency

  const hasData = stats !== null;

  return {
    stats,
    userLocation,
    isLoading,
    isHydrating,
    error,
    hasData,
    lastRefresh,
    refreshDashboard,
    hydrateFromCache,
    clearError,
  };
};
