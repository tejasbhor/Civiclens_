'use client';

import React, { useState } from 'react';
import { SystemHealthBar } from '@/components/dashboard/SystemHealthBar';
import { CriticalActionsAlert } from '@/components/dashboard/CriticalActionsAlert';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import dynamic from 'next/dynamic';
import { DashboardStats } from '@/types';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// Dynamic import for map to avoid SSR issues
const CityMap = dynamic(() => import('@/components/map/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

interface DashboardClientProps {
  initialStats: DashboardStats;
  initialDepartmentStats: any[];
  initialOfficerStats: any[];
}

export function DashboardClient({
  initialStats,
  initialDepartmentStats,
  initialOfficerStats,
}: DashboardClientProps) {
  // State for potential real-time updates
  const [stats] = useState<DashboardStats>(initialStats);
  const [departmentStats] = useState<any[]>(initialDepartmentStats);
  const [officerStats] = useState<any[]>(initialOfficerStats);

  // Calculate system health score
  const calculateHealthScore = () => {
    if (!stats) return 0;
    
    const resolvedCount = stats.reports_by_status?.resolved || 0;
    const slaCompliance = 85;
    const resolutionRate = (resolvedCount / (stats.total_reports || 1)) * 100;
    const responseTimeScore = stats.avg_resolution_time <= 48 ? 100 : 70;
    
    return Math.round(
      (slaCompliance * 0.4) + 
      (resolutionRate * 0.3) + 
      (responseTimeScore * 0.3)
    );
  };
  
  const calculateSLACompliance = () => {
    return 85; // TODO: Get actual SLA data from backend
  };

  // REMOVED: Critical Actions Alert - No longer needed
  // const getCriticalActions = () => {
  //   const actions = [];
  //   
  //   const highPriorityCount = stats?.high_priority_count || 0;
  //   if (highPriorityCount > 0) {
  //     actions.push({
  //       id: '1',
  //       type: 'unassigned' as const,
  //       title: 'High Priority Reports Unassigned',
  //       description: 'Requires immediate attention',
  //       count: highPriorityCount,
  //       actionLabel: 'Assign Now',
  //       actionLink: '/dashboard/reports?severity=high',
  //     });
  //   }
  //   
  //   const overloadedOfficers = officerStats.filter(
  //     o => o.capacity_level === 'overloaded' || (o.active_reports || 0) > 15
  //   );
  //   if (overloadedOfficers.length > 0) {
  //     actions.push({
  //       id: '2',
  //       type: 'overloaded' as const,
  //       title: 'Officers Overloaded',
  //       description: 'More than 15 active tasks',
  //       count: overloadedOfficers.length,
  //       actionLabel: 'Rebalance',
  //       actionLink: '/dashboard/officers',
  //     });
  //   }
  //   
  //   return actions;
  // };

  const getDepartmentPerformance = () => {
    return departmentStats.map(dept => ({
      name: dept.department_name,
      rate: Math.round(dept.resolution_rate),
      total: dept.total_reports,
      resolved: dept.resolved_reports
    })).slice(0, 5);
  };
  
  const getTodayNewReports = () => {
    return Math.floor((stats?.pending_tasks || 0) * 0.3);
  };

  const healthScore = calculateHealthScore();
  const slaCompliance = calculateSLACompliance();
  // const criticalActions = getCriticalActions(); // REMOVED

  return (
    <div className="space-y-6">
      {/* System Health Bar */}
      <SystemHealthBar
        healthScore={healthScore}
        criticalIssues={stats?.critical_priority_count || 0}
        pendingTasks={stats?.pending_tasks || 0}
        slaCompliance={slaCompliance}
        loading={false}
      />

      {/* REMOVED: Critical Actions Alert */}
      {/* {criticalActions.length > 0 && (
        <CriticalActionsAlert actions={criticalActions} />
      )} */}

      {/* Today's Snapshot */}
      <TodaySnapshot
        newReports={getTodayNewReports()}
        resolved={stats?.resolved_today || 0}
        critical={stats?.critical_priority_count || 0}
        loading={false}
      />

      {/* Map & Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map - 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Geographic Distribution</h2>
            </div>
            <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200 relative z-0">
              <CityMap />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-xs text-gray-600">Critical</p>
                  <p className="text-sm font-semibold text-gray-900">{stats?.critical_priority_count || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-xs text-gray-600">Active</p>
                  <p className="text-sm font-semibold text-gray-900">{stats?.reports_by_status?.in_progress || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-xs text-gray-600">Resolved</p>
                  <p className="text-sm font-semibold text-gray-900">{stats?.reports_by_status?.resolved || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Department Quick View - 1 column */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
          </div>
          <div className="space-y-3">
            {getDepartmentPerformance().map((dept) => (
              <div key={dept.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
                  <p className="text-xs text-gray-600">{dept.resolved}/{dept.total} resolved</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-lg font-bold',
                    dept.rate >= 90 ? 'text-green-600' : dept.rate >= 75 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {dept.rate}%
                  </p>
                  <div className="flex gap-0.5 mt-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          i < Math.floor(dept.rate / 25) ? 'bg-green-500' : 'bg-gray-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance & Workload Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="flex">
          <PerformanceCard
            avgResolutionTime={stats?.avg_resolution_time || 0}
            targetTime={48}
            slaCompliance={slaCompliance}
            loading={false}
          />
        </div>
        <div className="flex">
          <WorkloadCard
            totalDepartments={departmentStats.length}
            totalOfficers={officerStats.length}
            overloadedOfficers={officerStats.filter(o => o.capacity_level === 'overloaded' || (o.active_reports || 0) > 15).length}
            loading={false}
          />
        </div>
        <div className="flex">
          <RecentActivity loading={false} />
        </div>
      </div>
    </div>
  );
}
