import React from 'react';
import { Report } from '@/types';
import { StatusHistoryResponse } from '@/lib/api/reports';
import { 
  Clock, 
  Activity, 
  Camera, 
  MessageSquare,
  TrendingUp,
  Calendar,
  Timer,
  BarChart3
} from 'lucide-react';

interface QuickStatsProps {
  report: Report;
  history?: StatusHistoryResponse | null;
}

export function QuickStats({ report, history }: QuickStatsProps) {
  // Calculate report age in days
  const reportAge = Math.floor(
    (new Date().getTime() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate time since last update
  const timeSinceUpdate = report.updated_at
    ? Math.floor(
        (new Date().getTime() - new Date(report.updated_at).getTime()) / (1000 * 60 * 60)
      )
    : 0;

  // Format time display
  const formatTime = (hours: number) => {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
      case 'acknowledged':
        return 'text-blue-600 bg-blue-50';
      case 'rejected':
      case 'on_hold':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const stats = [
    {
      label: 'Report Age',
      value: `${reportAge} ${reportAge === 1 ? 'day' : 'days'}`,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Last Update',
      value: formatTime(timeSinceUpdate),
      icon: Timer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Status Changes',
      value: history?.history?.length || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Media Files',
      value: report.media?.length || 0,
      icon: Camera,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Quick Stats
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
              </div>
              <span className="text-base font-bold text-gray-900">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Additional Insights */}
      <div className="pt-3 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-900">Activity Summary</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-700">Current Status:</span>
              <span className="font-semibold text-blue-900 capitalize">
                {report.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Priority Level:</span>
              <span className="font-semibold text-blue-900 capitalize">
                {report.severity}
              </span>
            </div>
            {report.department && (
              <div className="flex justify-between">
                <span className="text-blue-700">Assigned To:</span>
                <span className="font-semibold text-blue-900">
                  {report.department.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
