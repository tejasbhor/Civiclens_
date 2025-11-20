"use client";

import React, { useState } from 'react';
import { Report, ReportSeverity } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { X, AlertCircle } from 'lucide-react';

interface EditReportModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditReportModal({ report, onClose, onSuccess }: EditReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: report.title,
    description: report.description,
    category: report.category || '',
    sub_category: report.sub_category || '',
  });

  // Validation constants
  const TITLE_MIN_LENGTH = 5;
  const TITLE_MAX_LENGTH = 255;
  const DESCRIPTION_MIN_LENGTH = 10;
  const DESCRIPTION_MAX_LENGTH = 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || formData.title.trim().length < TITLE_MIN_LENGTH) {
      setError(`Title must be at least ${TITLE_MIN_LENGTH} characters`);
      return;
    }
    if (formData.title.length > TITLE_MAX_LENGTH) {
      setError(`Title must not exceed ${TITLE_MAX_LENGTH} characters`);
      return;
    }
    if (!formData.description || formData.description.trim().length < DESCRIPTION_MIN_LENGTH) {
      setError(`Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`);
      return;
    }
    if (formData.description.length > DESCRIPTION_MAX_LENGTH) {
      setError(`Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`);
      return;
    }

    try {
      setLoading(true);
      await reportsApi.updateReport(report.id, {
        title: formData.title,
        description: formData.description,
        category: formData.category || null,
        sub_category: formData.sub_category || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Report Details</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={`Brief title (${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters)`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              minLength={TITLE_MIN_LENGTH}
              maxLength={TITLE_MAX_LENGTH}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {formData.title.length < TITLE_MIN_LENGTH ? (
                  <span className="text-orange-600">Minimum {TITLE_MIN_LENGTH} characters required</span>
                ) : (
                  <span className="text-green-600">✓ Valid length</span>
                )}
              </p>
              <p className={`text-xs ${
                formData.title.length > TITLE_MAX_LENGTH * 0.9 ? 'text-orange-600 font-medium' : 'text-gray-500'
              }`}>
                {formData.title.length}/{TITLE_MAX_LENGTH}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={`Detailed description (${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH} characters)`}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              required
              minLength={DESCRIPTION_MIN_LENGTH}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {formData.description.length < DESCRIPTION_MIN_LENGTH ? (
                  <span className="text-orange-600">Minimum {DESCRIPTION_MIN_LENGTH} characters required</span>
                ) : (
                  <span className="text-green-600">✓ Valid length</span>
                )}
              </p>
              <p className={`text-xs ${
                formData.description.length > DESCRIPTION_MAX_LENGTH * 0.9 ? 'text-orange-600 font-medium' : 'text-gray-500'
              }`}>
                {formData.description.length}/{DESCRIPTION_MAX_LENGTH}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="roads">Roads</option>
                <option value="water_supply">Water Supply</option>
                <option value="electricity">Electricity</option>
                <option value="sanitation">Sanitation</option>
                <option value="street_lights">Street Lights</option>
                <option value="drainage">Drainage</option>
                <option value="garbage">Garbage</option>
                <option value="parks">Parks</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Category</label>
              <input
                type="text"
                value={formData.sub_category}
                onChange={(e) => setFormData(prev => ({ ...prev, sub_category: e.target.value }))}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
