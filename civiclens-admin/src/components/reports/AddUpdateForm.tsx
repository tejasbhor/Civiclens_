"use client";

import React, { useState } from 'react';
import { reportsApi } from '@/lib/api/reports';
import { Send, Loader2 } from 'lucide-react';

interface AddUpdateFormProps {
  reportId: number;
  reportStatus: string;
  onSuccess: () => void;
}

export function AddUpdateForm({ reportId, reportStatus, onSuccess }: AddUpdateFormProps) {
  const [update, setUpdate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!update.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Auto-start work if status is ACKNOWLEDGED
      if (reportStatus === 'acknowledged') {
        try {
          await reportsApi.startWork(reportId);
          // Auto-started work on report
        } catch (err) {
          // Could not auto-start work - continuing anyway
          // Continue anyway - maybe already in progress
        }
      }

      // TODO: Add actual comment/update API call here
      // await commentsApi.addComment(reportId, update);
      
      // Update added successfully
      setUpdate('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Update
        </label>
        <textarea
          value={update}
          onChange={(e) => setUpdate(e.target.value)}
          rows={4}
          placeholder="Add a status update, comment, or note..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={loading}
        />
        {reportStatus === 'acknowledged' && (
          <p className="text-xs text-blue-600 mt-1">
            Note: Adding an update will automatically mark this report as "In Progress"
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !update.trim()}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Add Update
          </>
        )}
      </button>
    </form>
  );
}
