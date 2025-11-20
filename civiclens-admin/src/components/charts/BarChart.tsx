'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  showValues?: boolean;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 300,
  showValues = true,
  className,
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const getColor = (index: number, customColor?: string) => {
    if (customColor) return customColor;
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      )}
      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const barColor = getColor(index, item.color);

          return (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-32 text-sm font-medium text-gray-700 truncate" title={item.label}>
                {item.label}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {showValues && (
                  <div className="w-12 text-right text-sm font-semibold text-gray-900">
                    {item.value}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
