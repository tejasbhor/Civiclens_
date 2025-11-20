/**
 * Activity Timeline Component
 * Production-grade chronological activity display
 */

'use client';

import React from 'react';
import { StatusHistoryResponse } from '@/lib/api/reports';
import { Clock, User, FileText } from 'lucide-react';

interface ActivityTimelineProps {
  history: StatusHistoryResponse['history'] | undefined;
  loading?: boolean;
}

export function ActivityTimeline({ history, loading }: ActivityTimelineProps) {
  const toLabel = (s?: string | null) => 
    s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Activity Timeline
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Activity Timeline
        </h3>
        <p className="text-sm text-gray-500">No activity history available</p>
      </div>
    );
  }

  // Reverse to show most recent first
  const sortedHistory = [...history].reverse();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Activity Timeline
      </h3>

      <div className="space-y-4">
        {sortedHistory.map((item, index) => (
          <div key={`${item.changed_at}-${index}`} className="flex gap-4">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                {item.changed_by_user ? (
                  <User className="w-5 h-5 text-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-600" />
                )}
              </div>
              {/* Connector line */}
              {index < sortedHistory.length - 1 && (
                <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Status changed to{' '}
                    <span className="text-blue-600">{toLabel(item.new_status)}</span>
                    {item.old_status && (
                      <span className="text-gray-500">
                        {' '}from {toLabel(item.old_status)}
                      </span>
                    )}
                  </p>
                  {item.changed_by_user && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      by {item.changed_by_user.full_name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span 
                    className="text-xs text-gray-500"
                    title={formatFullDate(item.changed_at)}
                  >
                    {formatRelativeTime(item.changed_at)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700 italic">"{item.notes}"</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load more button (if needed in future) */}
      {history.length > 10 && (
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-3 py-1">
            Load Earlier Activity
          </button>
        </div>
      )}
    </div>
  );
}
