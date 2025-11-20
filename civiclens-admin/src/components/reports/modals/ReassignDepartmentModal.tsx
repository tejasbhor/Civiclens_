"use client";

import React, { useState, useEffect } from 'react';
import { Report, Department } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { departmentsApi } from '@/lib/api/departments';
import { X, AlertCircle, Building2 } from 'lucide-react';

interface ReassignDepartmentModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignDepartmentModal({ report, onClose, onSuccess }: ReassignDepartmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(report.department_id || null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const deps = await departmentsApi.list();
      setDepartments(deps);
    } catch (e) {
      console.error('Failed to load departments', e);
      setError('Failed to load departments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDepartmentId) {
      setError('Please select a department');
      return;
    }

    if (selectedDepartmentId === report.department_id) {
      setError('Please select a different department');
      return;
    }

    try {
      setLoading(true);
      await reportsApi.assignDepartment(report.id, {
        department_id: selectedDepartmentId,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reassign department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reassign Department</h2>
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

          {report.department && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Department
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Building2 className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">{report.department.name}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Department <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedDepartmentId || ''}
              onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this reassignment..."
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
              disabled={loading || !selectedDepartmentId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Reassigning...' : 'Reassign Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
