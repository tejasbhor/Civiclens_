'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SystemHealthBarProps {
  healthScore: number; // 0-100
  criticalIssues: number;
  pendingTasks: number;
  slaCompliance: number; // 0-100
  loading?: boolean;
}

export const SystemHealthBar: React.FC<SystemHealthBarProps> = ({
  healthScore,
  criticalIssues,
  pendingTasks,
  slaCompliance,
  loading = false,
}) => {
  const getHealthStatus = () => {
    if (healthScore >= 80) return { status: 'healthy', color: 'green', icon: CheckCircle, text: 'System Healthy' };
    if (healthScore >= 60) return { status: 'warning', color: 'yellow', icon: AlertTriangle, text: 'Needs Attention' };
    return { status: 'critical', color: 'red', icon: AlertCircle, text: 'Critical Issues' };
  };

  const health = getHealthStatus();
  const Icon = health.icon;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 transition-all duration-300',
        health.color === 'green' && 'border-l-green-500',
        health.color === 'yellow' && 'border-l-yellow-500',
        health.color === 'red' && 'border-l-red-500'
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          {/* Left: Health Status */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-2 rounded-lg',
                health.color === 'green' && 'bg-green-100',
                health.color === 'yellow' && 'bg-yellow-100',
                health.color === 'red' && 'bg-red-100'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6',
                  health.color === 'green' && 'text-green-600',
                  health.color === 'yellow' && 'text-yellow-600',
                  health.color === 'red' && 'text-red-600'
                )}
              />
            </div>
            <div>
              <h2
                className={cn(
                  'text-xl font-bold',
                  health.color === 'green' && 'text-green-900',
                  health.color === 'yellow' && 'text-yellow-900',
                  health.color === 'red' && 'text-red-900'
                )}
              >
                {health.text}
              </h2>
              <p className="text-sm text-gray-600">
                System Health Score: <span className="font-semibold">{healthScore}/100</span>
              </p>
            </div>
          </div>

          {/* Right: Key Metrics */}
          <div className="flex items-center gap-8">
            {/* Critical Issues */}
            {criticalIssues > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{criticalIssues}</p>
                  <p className="text-xs text-gray-600">Critical</p>
                </div>
              </div>
            )}

            {/* Pending Tasks */}
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="flex items-center gap-2">
              <div className="relative w-16 h-16">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={slaCompliance >= 90 ? '#10B981' : slaCompliance >= 70 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(slaCompliance / 100) * 176} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">{slaCompliance}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600">SLA</p>
                <p className="text-xs text-gray-600">Compliance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
