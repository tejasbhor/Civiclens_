'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { FileText, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface SnapshotMetric {
  label: string;
  value: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'red';
}

interface TodaySnapshotProps {
  newReports: number;
  resolved: number;
  critical: number;
  loading?: boolean;
}

export const TodaySnapshot: React.FC<TodaySnapshotProps> = ({
  newReports,
  resolved,
  critical,
  loading = false,
}) => {
  const metrics: SnapshotMetric[] = [
    {
      label: 'New Reports',
      value: newReports,
      trend: { value: 12, isPositive: true },
      color: 'blue',
    },
    {
      label: 'Resolved',
      value: resolved,
      trend: { value: 8, isPositive: true },
      color: 'green',
    },
    {
      label: 'Critical',
      value: critical,
      trend: { value: 15, isPositive: false },
      color: 'red',
    },
  ];

  const getIcon = (color: string) => {
    switch (color) {
      case 'blue':
        return FileText;
      case 'green':
        return CheckCircle;
      case 'red':
        return AlertTriangle;
      default:
        return FileText;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50',
          iconBg: 'bg-blue-100',
          icon: 'text-blue-600',
          text: 'text-blue-900',
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          iconBg: 'bg-green-100',
          icon: 'text-green-600',
          text: 'text-green-900',
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          iconBg: 'bg-red-100',
          icon: 'text-red-600',
          text: 'text-red-900',
        };
      default:
        return {
          bg: 'bg-gray-50',
          iconBg: 'bg-gray-100',
          icon: 'text-gray-600',
          text: 'text-gray-900',
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4">
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Today's Snapshot</h2>
        </div>
        <Link
          href="/dashboard/reports"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
        >
          View All Reports
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const Icon = getIcon(metric.color);
          const colors = getColorClasses(metric.color);

          return (
            <div key={metric.label} className={cn('bg-white rounded-lg border-2 border-gray-200 p-4', `border-l-${metric.color}-500`)}>
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
                    <p className={cn('text-4xl font-bold mb-2', colors.text)}>{metric.value}</p>
                    {metric.trend && (
                      <div className="flex items-center gap-1.5">
                        {metric.trend.isPositive ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            metric.trend.isPositive ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {metric.trend.isPositive && '+'}{metric.trend.value}%
                        </span>
                        <span className="text-xs text-gray-500">vs yesterday</span>
                      </div>
                    )}
                  </div>
                  <div className={cn('p-3 rounded-xl', colors.iconBg)}>
                    <Icon className={cn('w-7 h-7', colors.icon)} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
