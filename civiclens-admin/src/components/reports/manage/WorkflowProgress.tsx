/**
 * Workflow Progress Component
 * Production-grade visual status progression with timeline
 */

'use client';

import React from 'react';
import { Report, ReportStatus } from '@/types';
import { Check, Clock, Circle } from 'lucide-react';
import { StatusHistoryResponse } from '@/lib/api/reports';

interface WorkflowProgressProps {
  report: Report;
  history?: StatusHistoryResponse['history'];
}

// Define workflow steps in order
const WORKFLOW_STEPS: { status: ReportStatus; label: string }[] = [
  { status: ReportStatus.RECEIVED, label: 'Received' },
  { status: ReportStatus.PENDING_CLASSIFICATION, label: 'Pending Classification' },
  { status: ReportStatus.CLASSIFIED, label: 'Classified' },
  { status: ReportStatus.ASSIGNED_TO_DEPARTMENT, label: 'Assigned to Department' },
  { status: ReportStatus.ASSIGNED_TO_OFFICER, label: 'Assigned to Officer' },
  { status: ReportStatus.ACKNOWLEDGED, label: 'Acknowledged' },
  { status: ReportStatus.IN_PROGRESS, label: 'In Progress' },
  { status: ReportStatus.PENDING_VERIFICATION, label: 'Pending Verification' },
  { status: ReportStatus.RESOLVED, label: 'Resolved' },
];

export function WorkflowProgress({ report, history }: WorkflowProgressProps) {
  const currentStatus = report.status;

  // Find current step index
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => step.status === currentStatus);

  // Get timestamp for each step from history
  const getStepTimestamp = (status: ReportStatus): string | null => {
    if (!history) return null;
    const historyItem = history.find(h => h.new_status === status);
    return historyItem?.changed_at || null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStepState = (index: number): 'completed' | 'current' | 'pending' => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Workflow Progress
      </h3>

      <div className="space-y-4">
        {WORKFLOW_STEPS.map((step, index) => {
          const state = getStepState(index);
          const timestamp = getStepTimestamp(step.status);

          return (
            <div key={step.status} className="flex gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    state === 'completed'
                      ? 'bg-green-100 text-green-600'
                      : state === 'current'
                      ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {state === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : state === 'current' ? (
                    <Clock className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                {/* Connector line */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-12 mt-1 transition-colors ${
                      state === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={`font-medium transition-colors ${
                      state === 'completed'
                        ? 'text-gray-900'
                        : state === 'current'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {timestamp && (
                    <span className="text-xs text-gray-500">
                      {formatDate(timestamp)}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {state === 'completed' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      ✓ Completed
                    </span>
                  )}
                  {state === 'current' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      ⏳ Current
                    </span>
                  )}
                  {state === 'pending' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      ○ Pending
                    </span>
                  )}
                </div>

                {/* Additional info from history */}
                {timestamp && history && (
                  (() => {
                    const historyItem = history.find(h => h.new_status === step.status);
                    if (historyItem?.changed_by_user) {
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          by {historyItem.changed_by_user.full_name}
                        </p>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Special statuses (ON_HOLD, REJECTED, etc.) */}
      {[ReportStatus.ON_HOLD, ReportStatus.REJECTED, ReportStatus.CLOSED, ReportStatus.DUPLICATE].includes(currentStatus) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Special Status: {currentStatus.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              This report is not following the standard workflow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
