"use client";

import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface ChangeStatusModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: ReportStatus.RECEIVED, label: 'Received', color: 'bg-gray-100 text-gray-700' },
  { value: ReportStatus.PENDING_CLASSIFICATION, label: 'Pending Classification', color: 'bg-yellow-100 text-yellow-700' },
  { value: ReportStatus.CLASSIFIED, label: 'Classified', color: 'bg-blue-100 text-blue-700' },
  { value: ReportStatus.ASSIGNED_TO_DEPARTMENT, label: 'Assigned to Department', color: 'bg-purple-100 text-purple-700' },
  { value: ReportStatus.ASSIGNED_TO_OFFICER, label: 'Assigned to Officer', color: 'bg-indigo-100 text-indigo-700' },
  { value: ReportStatus.ACKNOWLEDGED, label: 'Acknowledged', color: 'bg-cyan-100 text-cyan-700' },
  { value: ReportStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: ReportStatus.PENDING_VERIFICATION, label: 'Pending Verification', color: 'bg-orange-100 text-orange-700' },
  { value: ReportStatus.RESOLVED, label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: ReportStatus.REJECTED, label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: ReportStatus.ON_HOLD, label: 'On Hold', color: 'bg-yellow-100 text-yellow-700' },
];

export function ChangeStatusModal({ report, onClose, onSuccess }: ChangeStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ReportStatus>(report.status);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newStatus === report.status) {
      setError('Please select a different status');
      return;
    }

    try {
      setLoading(true);
      await reportsApi.updateStatus(report.id, {
        new_status: newStatus,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Change Status</h2>
            <p className="text-sm text-gray-600 mt-1">{report.report_number || `CL-${report.id}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Current Status
            </label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_OPTIONS.find(s => s.value === report.status)?.color}`}>
                {STATUS_OPTIONS.find(s => s.value === report.status)?.label}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              New Status <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setNewStatus(status.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    newStatus === status.value
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {newStatus === status.value && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    <span className={`text-sm font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this status change..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || newStatus === report.status}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
