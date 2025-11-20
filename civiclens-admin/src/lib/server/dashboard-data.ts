import { unstable_cache } from 'next/cache';
import { DashboardStats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock data fallback
const mockStats: DashboardStats = {
  total_reports: 1247,
  pending_tasks: 23,
  resolved_today: 8,
  high_priority_count: 5,
  avg_resolution_time: 48,
  reports_by_category: {
    'Potholes': 342,
    'Streetlights': 189,
    'Garbage': 156,
    'Water': 98,
    'Electricity': 87,
    'Other': 375
  },
  reports_by_status: {
    received: 156,
    classified: 89,
    assigned: 67,
    in_progress: 45,
    resolved: 890,
    rejected: 0
  },
  reports_by_department: {
    'Public Works': 423,
    'Electricity': 298,
    'Water': 189,
    'Sanitation': 156,
    'Transportation': 98,
    'Other': 83
  },
  reports_by_severity: {
    low: 234,
    medium: 456,
    high: 342,
    critical: 215
  }
};

/**
 * Fetch dashboard stats with caching
 * Cached for 60 seconds, revalidated on demand
 */
export const getDashboardStats = unstable_cache(
  async (): Promise<DashboardStats> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/dashboard`, {
        next: { revalidate: 60, tags: ['dashboard-stats'] },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return mock data as fallback
      return mockStats;
    }
  },
  ['dashboard-stats'],
  {
    revalidate: 60,
    tags: ['dashboard-stats']
  }
);

/**
 * Fetch department stats with caching
 */
export const getDepartmentStats = unstable_cache(
  async (): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/departments/stats`, {
        next: { revalidate: 60, tags: ['department-stats'] },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching department stats:', error);
      return [];
    }
  },
  ['department-stats'],
  {
    revalidate: 60,
    tags: ['department-stats']
  }
);

/**
 * Fetch officer stats with caching
 */
export const getOfficerStats = unstable_cache(
  async (): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/officers/stats`, {
        next: { revalidate: 60, tags: ['officer-stats'] },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching officer stats:', error);
      return [];
    }
  },
  ['officer-stats'],
  {
    revalidate: 60,
    tags: ['officer-stats']
  }
);

/**
 * Fetch all dashboard data in parallel
 */
export async function getAllDashboardData() {
  const [stats, departmentStats, officerStats] = await Promise.all([
    getDashboardStats(),
    getDepartmentStats(),
    getOfficerStats(),
  ]);

  return {
    stats,
    departmentStats,
    officerStats,
  };
}
