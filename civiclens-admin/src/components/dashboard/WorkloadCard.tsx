'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface WorkloadCardProps {
  totalDepartments: number;
  totalOfficers: number;
  overloadedOfficers: number;
  loading?: boolean;
}

export const WorkloadCard: React.FC<WorkloadCardProps> = ({
  totalDepartments,
  totalOfficers,
  overloadedOfficers,
  loading = false,
}) => {
  const hasOverload = overloadedOfficers > 0;

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
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Workload</h3>
          </div>
          <Link
            href="/dashboard/officers"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
          >
            Manage
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Departments */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
              </div>
            </div>
            <Link
              href="/dashboard/departments"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              View All
            </Link>
          </div>

          {/* Officers */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Officers</p>
                <p className="text-2xl font-bold text-gray-900">{totalOfficers}</p>
              </div>
            </div>
            <Link
              href="/dashboard/officers"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              View All
            </Link>
          </div>

          {/* Overloaded Warning */}
          {hasOverload && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900">
                  {overloadedOfficers} officer{overloadedOfficers > 1 ? 's' : ''} overloaded
                </p>
                <p className="text-xs text-orange-700">More than 15 active tasks</p>
              </div>
              <Link
                href="/dashboard/officers?filter=overloaded"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap"
              >
                Rebalance
              </Link>
            </div>
          )}

          {!hasOverload && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-green-900">All officers within capacity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
