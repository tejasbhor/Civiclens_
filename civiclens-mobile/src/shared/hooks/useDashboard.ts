/**
 * useDashboard Hook
 * React hook for accessing dashboard state and actions
 */

import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';

export const useDashboard = (autoFetch: boolean = true) => {
  const {
    stats,
    userLocation,
    isLoading,
    error,
    lastRefresh,
    fetchDashboardData,
    refreshDashboard,
    setUserLocation,
    clearError,
    hydrateFromCache,
  } = useDashboardStore();

  useEffect(() => {
    hydrateFromCache();
  }, [hydrateFromCache]);

  useEffect(() => {
    if (autoFetch && !stats && !isLoading) {
      fetchDashboardData();
    }
  }, [autoFetch, stats, isLoading, fetchDashboardData]);

  return {
    // State
    stats,
    userLocation,
    isLoading,
    error,
    lastRefresh,

    // Actions
    fetchDashboardData,
    refreshDashboard,
    setUserLocation,
    clearError,
    hydrateFromCache,

    // Computed
    hasData: !!stats,
  };
};
