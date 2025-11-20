'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, Target, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface PerformanceCardProps {
  avgResolutionTime: number; // in hours
  targetTime: number; // in hours
  slaCompliance: number; // percentage
  loading?: boolean;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  avgResolutionTime,
  targetTime,
  slaCompliance,
  loading = false,
}) => {
  const isOnTarget = avgResolutionTime <= targetTime;
  const isSLAGood = slaCompliance >= 90;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full h-full animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full h-full flex flex-col">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
          </div>
          <Link
            href="/dashboard/analytics"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
          >
            Analytics
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Average Resolution Time */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isOnTarget ? 'bg-green-100' : 'bg-orange-100'
              )}>
                <Clock className={cn(
                  'w-5 h-5',
                  isOnTarget ? 'text-green-600' : 'text-orange-600'
                )} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Resolution Time</p>
                <p className="text-2xl font-bold text-gray-900">{avgResolutionTime}h</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Target: {targetTime}h</p>
              <div className="flex items-center gap-1 mt-1">
                {isOnTarget ? (
                  <>
                    <span className="text-sm font-semibold text-green-600">✓ On Target</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-orange-600">
                      {avgResolutionTime - targetTime}h over
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SLA Compliance */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isSLAGood ? 'bg-green-100' : 'bg-yellow-100'
              )}>
                <Target className={cn(
                  'w-5 h-5',
                  isSLAGood ? 'text-green-600' : 'text-yellow-600'
                )} />
              </div>
              <div>
                <p className="text-sm text-gray-600">SLA Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{slaCompliance}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Target: 90%</p>
              <div className="flex items-center gap-1 mt-1">
                {isSLAGood ? (
                  <span className="text-sm font-semibold text-green-600">✓ Meeting SLA</span>
                ) : (
                  <span className="text-sm font-semibold text-yellow-600">
                    {90 - slaCompliance}% below target
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-900">
              <span className="font-semibold">+5%</span> improvement this week
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
