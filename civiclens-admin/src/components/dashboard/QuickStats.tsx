'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface QuickStatsProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: 'blue' | 'yellow' | 'red' | 'green' | 'purple' | 'indigo' | 'orange';
  onClick?: () => void;
  loading?: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  onClick,
  loading = false,
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      gradient: 'from-blue-500 to-blue-600',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      gradient: 'from-yellow-500 to-yellow-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      gradient: 'from-red-500 to-red-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      iconBg: 'bg-green-100',
      gradient: 'from-green-500 to-green-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100',
      gradient: 'from-purple-500 to-purple-600',
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      gradient: 'from-indigo-500 to-indigo-600',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      iconBg: 'bg-orange-100',
      gradient: 'from-orange-500 to-orange-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden bg-white rounded-xl shadow-sm border transition-all duration-300',
        colors.border,
        onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
        loading && 'animate-pulse'
      )}
    >
      {/* Gradient accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', colors.gradient)} />
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            {loading ? (
              <div className="h-10 bg-gray-200 rounded w-24 mb-2" />
            ) : (
              <p className="text-4xl font-bold text-gray-900 mb-1">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            {trend && !loading && (
              <div className="flex items-center gap-1.5 mt-3">
                {trend.value === 0 ? (
                  <Minus className="w-4 h-4 text-gray-400" />
                ) : trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={cn(
                    'text-sm font-semibold',
                    trend.value === 0 ? 'text-gray-500' :
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.value > 0 && '+'}{trend.value}%
                </span>
                <span className="text-xs text-gray-500">{trend.label}</span>
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
};
