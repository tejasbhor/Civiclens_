'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { FileText, UserCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { reportsApi } from '@/lib/api/reports';
import Link from 'next/link';
import type { Report } from '@/types';

interface ActivityItem {
  id: number;
  type: 'submitted' | 'assigned' | 'resolved' | 'high_priority';
  title: string;
  description: string;
  time: string;
  reportNumber: string;
  reportId: number;
}

interface RecentActivityProps {
  loading?: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ loading: initialLoading = false }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(initialLoading);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      // Fetch recent reports (last 5, sorted by created_at desc)
      const response = await reportsApi.getReports({
        page: 1,
        per_page: 5,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      // Transform reports to activity items
      const activityItems: ActivityItem[] = response.data.map((report: Report) => {
        const activityType = getActivityType(report);
        return {
          id: report.id,
          type: activityType,
          title: getActivityTitle(activityType, report),
          description: report.title || report.location || 'No description',
          time: formatRelativeTime(report.created_at),
          reportNumber: report.report_number || `#${report.id}`,
          reportId: report.id
        };
      });

      setActivities(activityItems);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      // Keep empty array on error
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (report: Report): ActivityItem['type'] => {
    if (report.severity === 'high' || report.severity === 'critical') {
      return 'high_priority';
    }
    if (report.status === 'resolved' || report.status === 'closed') {
      return 'resolved';
    }
    if (report.status === 'assigned_to_officer' || report.status === 'assigned_to_department') {
      return 'assigned';
    }
    return 'submitted';
  };

  const getActivityTitle = (type: ActivityItem['type'], report: Report): string => {
    switch (type) {
      case 'high_priority':
        return 'High Priority Report';
      case 'resolved':
        return 'Report Resolved';
      case 'assigned':
        return 'Report Assigned';
      default:
        return 'New Report Submitted';
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'submitted':
        return FileText;
      case 'assigned':
        return UserCheck;
      case 'resolved':
        return CheckCircle2;
      case 'high_priority':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'submitted':
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          border: 'border-blue-200',
        };
      case 'assigned':
        return {
          bg: 'bg-purple-50',
          icon: 'text-purple-600',
          border: 'border-purple-200',
        };
      case 'resolved':
        return {
          bg: 'bg-green-50',
          icon: 'text-green-600',
          border: 'border-green-200',
        };
      case 'high_priority':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-600',
          border: 'border-red-200',
        };
      default:
        return {
          bg: 'bg-gray-50',
          icon: 'text-gray-600',
          border: 'border-gray-200',
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full w-full animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col w-full overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Clock className="w-5 h-5 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
        <div className="space-y-2 overflow-y-auto flex-1 overflow-x-hidden" style={{ maxHeight: '400px' }}>
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colors = getActivityColor(activity.type);

            return (
              <Link
                key={activity.id}
                href={`/dashboard/reports?id=${activity.reportId}`}
                className={cn(
                  'flex items-start gap-2 p-2.5 rounded-lg border transition-all hover:shadow-md cursor-pointer block w-full',
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-start gap-2 w-full min-w-0">
                  <div className={cn('p-1.5 rounded-lg bg-white flex-shrink-0')}>
                    <Icon className={cn('w-3.5 h-3.5', colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 truncate flex-1">
                        {activity.title}
                      </p>
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap flex-shrink-0">
                        {activity.reportNumber}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
    </div>
  );
};
