"use client";

import React, { useState } from 'react';
import { reportsApi, ClassifyReportRequest } from '@/lib/api/reports';
import { ReportSeverity } from '@/types';

interface ClassifyReportModalProps {
  reportId: number;
  reportNumber: string;
  title: string;
  onClose: () => void;
  onSuccess: () => void;
}

const toLabel = (str: string): string => {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function ClassifyReportModal({ 
  reportId, 
  reportNumber, 
  title, 
  onClose, 
  onSuccess 
}: ClassifyReportModalProps) {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<'' | 'low' | 'medium' | 'high' | 'critical'>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'roads', label: 'Roads' },
    { value: 'water_supply', label: 'Water Supply' },
    { value: 'sanitation', label: 'Sanitation' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'street_lights', label: 'Street Lights' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'garbage', label: 'Garbage Collection' },
    { value: 'parks', label: 'Parks & Recreation' },
    { value: 'public_transport', label: 'Public Transport' },
    { value: 'pollution', label: 'Pollution' },
    { value: 'other', label: 'Other' },
  ];

  const severities: Array<{ value: 'low' | 'medium' | 'high' | 'critical'; label: string; color: string }> = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical', color: 'text-red-600' },
  ];

  const handleSubmit = async () => {
    if (!category || !severity) {
      alert('Please select both category and severity');
      return;
    }

    try {
      setLoading(true);
      await reportsApi.classifyReport(reportId, {
        category,
        severity,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to classify report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Process & Categorize Report
            </h3>
            <p className="text-xs text-gray-500 mt-1">Review and assign category & priority level</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Report Info */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Report</p>
            <p className="text-sm font-semibold text-gray-900">{reportNumber}</p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{title}</p>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Choose the most relevant category</p>
          </div>

          {/* Severity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {severities.map(sev => (
                <button
                  key={sev.value}
                  onClick={() => setSeverity(sev.value)}
                  disabled={loading}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    severity === sev.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      sev.value === 'low' ? 'bg-green-500' :
                      sev.value === 'medium' ? 'bg-yellow-500' :
                      sev.value === 'high' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`} />
                    {sev.label}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Assess the urgency and impact</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              rows={3}
              placeholder="Add notes about categorization, observations, or special instructions..."
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t bg-gray-50">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm flex items-center justify-center gap-2"
            disabled={loading || !category || !severity}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save & Process
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
