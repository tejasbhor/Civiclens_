"use client";

import React, { useState, useEffect } from 'react';
import { Report, User, UserRole } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { usersApi } from '@/lib/api/users';
import { X, AlertCircle, UserCircle } from 'lucide-react';

interface ReassignOfficerModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignOfficerModal({ report, onClose, onSuccess }: ReassignOfficerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null);
  const [priority, setPriority] = useState<number>(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      const response = await usersApi.listUsers({ per_page: 100 });
      const officerUsers = response.data.filter((u: User) => 
        u.role === UserRole.NODAL_OFFICER || u.role === UserRole.ADMIN
      );
      setOfficers(officerUsers);
    } catch (e) {
      console.error('Failed to load officers', e);
      setError('Failed to load officers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedOfficerId) {
      setError('Please select an officer');
      return;
    }

    try {
      setLoading(true);
      await reportsApi.assignOfficer(report.id, {
        officer_user_id: selectedOfficerId,
        priority,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reassign officer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reassign Officer</h2>
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
              Select Officer <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedOfficerId || ''}
              onChange={(e) => setSelectedOfficerId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select an officer</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.full_name} ({officer.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority (1-10) <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-2xl font-bold text-blue-600 w-12 text-center">{priority}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low Priority</span>
              <span>High Priority</span>
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
              placeholder="Add notes about this assignment..."
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
              disabled={loading || !selectedOfficerId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
