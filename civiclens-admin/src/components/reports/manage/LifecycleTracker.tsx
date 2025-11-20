"use client";

import React from 'react';
import { Report } from '@/types';
import { Clock, CheckCircle } from 'lucide-react';

interface StatusHistoryItem {
  id: number;
  old_status: string | null;
  new_status: string;
  changed_by_user_id: number;
  changed_by_user?: {
    full_name: string;
    email: string;
  };
  notes?: string | null;
  created_at: string;
}

interface LifecycleTrackerProps {
  report: Report;
  history?: StatusHistoryItem[];
}

export function LifecycleTracker({ report, history }: LifecycleTrackerProps) {
  const toLabel = (s?: string | null) => (s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-');

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Status History</h3>
      </div>

      {history && history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item, index) => (
            <div key={item.id || `${item.new_status}-${item.created_at}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <CheckCircle className={`w-4 h-4 ${
                    index === 0 ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                {index < history.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">
                    {toLabel(item.new_status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                {item.changed_by_user && (
                  <p className="text-sm text-gray-600">
                    by {item.changed_by_user.full_name}
                  </p>
                )}
                {item.notes && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    "{item.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No status history available</p>
      )}
    </div>
  );
}
