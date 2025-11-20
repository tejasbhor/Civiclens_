'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsApi } from '@/lib/api/analytics';
import { departmentsApi, DepartmentStats } from '@/lib/api/departments';
import { usersApi, OfficerStats } from '@/lib/api/users';
import { DashboardStats } from '@/types';

interface CachedData {
  stats: DashboardStats | null;
  departmentStats: DepartmentStats[];
  officerStats: OfficerStats[];
  timestamp: number;
}

const CACHE_KEY = 'dashboard_data_cache';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [officerStats, setOfficerStats] = useState<OfficerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Load from cache
  const loadFromCache = useCallback((): CachedData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedData = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        if (age < CACHE_DURATION) {
          return data;
        }
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }
    return null;
  }, []);

  // Save to cache
  const saveToCache = useCallback((data: Omit<CachedData, 'timestamp'>) => {
    try {
      const cacheData: CachedData = {
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Cache write error:', e);
    }
  }, []);

  // Load dashboard data
  const loadData = useCallback(async (force = false) => {
    // Prevent duplicate calls
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      // Try cache first if not forcing refresh
      if (!force) {
        const cached = loadFromCache();
        if (cached) {
          setStats(cached.stats);
          setDepartmentStats(cached.departmentStats);
          setOfficerStats(cached.officerStats);
          setLoading(false);
          loadingRef.current = false;
          return;
        }
      }

      setLoading(true);
      setError(null);

      // Load all data in parallel for best performance
      const [dashboardData, deptData, officerData] = await Promise.all([
        analyticsApi.getDashboardStats().catch(() => null),
        departmentsApi.getStats().catch(() => []),
        usersApi.getOfficerStats().catch(() => []),
      ]);

      if (dashboardData) {
        setStats(dashboardData);
        setDepartmentStats(deptData);
        setOfficerStats(officerData);

        // Cache the results
        saveToCache({
          stats: dashboardData,
          departmentStats: deptData,
          officerStats: officerData,
        });
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [loadFromCache, saveToCache]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Refresh function for manual reload
  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  return {
    stats,
    departmentStats,
    officerStats,
    loading,
    error,
    refresh,
  };
}
