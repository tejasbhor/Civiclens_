"use client";

import React, { useState } from 'react';
import { Report } from '@/types';
import apiClient from '@/lib/api/client';
import { X, Loader2, AlertTriangle, Flag, MessageSquare } from 'lucide-react';

// Request Rework Form
export function RequestReworkForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [issues, setIssues] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post(`/reports/${report.id}/status`, {
        new_status: 'in_progress',
        notes: `REWORK REQUESTED: ${feedback}\n\nIssues: ${issues}`
      });
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to request rework');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          Request Rework
        </h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback *</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={2}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Issues *</label>
        <textarea
          value={issues}
          onChange={(e) => setIssues(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={2}
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !feedback.trim() || !issues.trim()}
          className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Request Rework
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

// Flag Incorrect Assignment Form
export function FlagIncorrectAssignmentForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/appeals', {
        report_id: report.id,
        appeal_type: 'incorrect_assignment',
        reason: reason
      });
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to flag assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Flag className="w-4 h-4 text-yellow-600" />
          Flag Incorrect Assignment
        </h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={3}
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !reason.trim()}
          className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Flag
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

// Citizen Feedback Form
export function CitizenFeedbackForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post(`/reports/${report.id}/status`, {
        new_status: report.status,
        notes: `CITIZEN FEEDBACK (${rating}/5 stars): ${comments}`
      });
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-green-600" />
          Citizen Feedback
        </h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comments *</label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={3}
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || rating === 0 || !comments.trim()}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Feedback
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
