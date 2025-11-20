"use client";

import React, { useState } from 'react';
import { Report } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { X, AlertCircle, Copy } from 'lucide-react';

interface MarkAsDuplicateModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkAsDuplicateModal({ report, onClose, onSuccess }: MarkAsDuplicateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalReportId, setOriginalReportId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!originalReportId.trim()) {
      setError('Please provide the original report ID');
      return;
    }

    const reportId = parseInt(originalReportId.trim());
    if (isNaN(reportId) || reportId <= 0) {
      setError('Please provide a valid report ID');
      return;
    }

    if (reportId === report.id) {
      setError('Cannot mark a report as duplicate of itself');
      return;
    }

    try {
      setLoading(true);
      // Update report to mark as duplicate
      await reportsApi.updateReport(report.id, {
        is_duplicate: true,
        duplicate_of_report_id: reportId,
        rejection_reason: notes.trim() || `Duplicate of report #${reportId}`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark as duplicate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Copy className="w-6 h-6 text-orange-600" />
              Mark as Duplicate
            </h2>
            <p className="text-sm text-gray-600 mt-1">{report.report_number || `CL-${report.id}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Note:</strong> This will mark the report as a duplicate and link it to the original report.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Report ID <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={originalReportId}
              onChange={(e) => setOriginalReportId(e.target.value)}
              placeholder="Enter the ID of the original report"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the report ID (number only) that this report duplicates.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any additional notes about why this is a duplicate..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
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
              disabled={loading || !originalReportId.trim()}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Marking as Duplicate...' : 'Mark as Duplicate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
