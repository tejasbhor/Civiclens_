"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Users,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react';
import { Report, Department } from '@/types';
import { reportsApi, AssignDepartmentRequest } from '@/lib/api/reports';
import { departmentsApi, DepartmentStats } from '@/lib/api/departments';

interface AssignDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: (updatedReport: Report) => void;
}

export function AssignDepartmentModal({ 
  isOpen, 
  onClose, 
  report, 
  onSuccess 
}: AssignDepartmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentStats, setDepartmentStats] = useState<Record<number, DepartmentStats>>({});
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Load departments and their stats
  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      setError(null);

      // Load departments and stats in parallel
      const [deptList, statsData] = await Promise.all([
        departmentsApi.list(),
        departmentsApi.getStats()
      ]);

      setDepartments(deptList);

      // Convert stats array to object for easy lookup
      const statsMap: Record<number, DepartmentStats> = {};
      statsData.forEach(stat => {
        statsMap[stat.department_id] = stat;
      });
      setDepartmentStats(statsMap);

      // Pre-select current department if assigned
      if (report.department_id) {
        setSelectedDepartmentId(report.department_id);
      }

    } catch (err: any) {
      console.error('Failed to load departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDepartmentId) {
      setError('Please select a department');
      return;
    }

    // Check if already assigned to this department
    if (report.department_id === selectedDepartmentId) {
      setError('Report is already assigned to this department');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: AssignDepartmentRequest = {
        department_id: selectedDepartmentId,
        notes: notes.trim() || undefined
      };

      const updatedReport = await reportsApi.assignDepartment(report.id, payload);
      
      onSuccess(updatedReport);
      onClose();
      resetForm();

    } catch (err: any) {
      console.error('Failed to assign department:', err);
      
      let errorMessage = 'Failed to assign department. Please try again.';
      if (err?.response?.data?.detail) {
        errorMessage = Array.isArray(err.response.data.detail) 
          ? err.response.data.detail.map((e: any) => e.msg || e).join(', ')
          : err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDepartmentId(report.department_id || null);
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const getSelectedDepartment = () => {
    return departments.find(d => d.id === selectedDepartmentId);
  };

  const getSelectedDepartmentStats = () => {
    return selectedDepartmentId ? departmentStats[selectedDepartmentId] : null;
  };

  const getDepartmentCapacityColor = (stats: DepartmentStats) => {
    const utilizationRate = stats.total_officers > 0 
      ? (stats.pending_reports + stats.in_progress_reports) / stats.total_officers 
      : 0;

    if (utilizationRate <= 2) return 'text-green-600 bg-green-50 border-green-200';
    if (utilizationRate <= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDepartmentCapacityLabel = (stats: DepartmentStats) => {
    const utilizationRate = stats.total_officers > 0 
      ? (stats.pending_reports + stats.in_progress_reports) / stats.total_officers 
      : 0;

    if (utilizationRate <= 2) return 'Low Load';
    if (utilizationRate <= 5) return 'Moderate Load';
    return 'High Load';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Assign Department</h3>
              <p className="text-sm text-gray-500">
                Report #{report.report_number || `CL-${report.id}`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Current Assignment Status */}
          {report.department && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Current Assignment</span>
              </div>
              <p className="text-sm text-blue-800">
                Currently assigned to: <strong>{report.department.name}</strong>
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Department Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Department <span className="text-red-500">*</span>
            </label>

            {loadingDepartments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading departments...</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {departments.map((department) => {
                  const stats = departmentStats[department.id];
                  const isSelected = selectedDepartmentId === department.id;
                  const isCurrent = report.department_id === department.id;

                  return (
                    <div
                      key={department.id}
                      className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : isCurrent
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedDepartmentId(department.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="radio"
                              name="department"
                              value={department.id}
                              checked={isSelected}
                              onChange={() => setSelectedDepartmentId(department.id)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <h4 className="font-medium text-gray-900">{department.name}</h4>
                            {isCurrent && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          
                          {department.description && (
                            <p className="text-sm text-gray-600 mb-3">{department.description}</p>
                          )}

                          {/* Department Stats */}
                          {stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-600">
                                  {stats.active_officers}/{stats.total_officers} Officers
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-600">
                                  {stats.pending_reports + stats.in_progress_reports} Active
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-600">
                                  {stats.resolution_rate}% Resolved
                                </span>
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getDepartmentCapacityColor(stats)}`}>
                                {getDepartmentCapacityLabel(stats)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Department Details */}
          {selectedDepartmentId && getSelectedDepartmentStats() && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Department Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Officers:</span>
                  <div className="font-medium">{getSelectedDepartmentStats()!.total_officers}</div>
                </div>
                <div>
                  <span className="text-gray-500">Active Reports:</span>
                  <div className="font-medium">
                    {getSelectedDepartmentStats()!.pending_reports + getSelectedDepartmentStats()!.in_progress_reports}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Resolution Rate:</span>
                  <div className="font-medium">{getSelectedDepartmentStats()!.resolution_rate}%</div>
                </div>
                <div>
                  <span className="text-gray-500">Avg Resolution:</span>
                  <div className="font-medium">
                    {getSelectedDepartmentStats()!.avg_resolution_time_days 
                      ? `${getSelectedDepartmentStats()!.avg_resolution_time_days.toFixed(1)} days`
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about this department assignment..."
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {notes.length}/500 characters
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              This will update the report status and notify the department
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedDepartmentId || loadingDepartments}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Assigning...' : 'Assign Department'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}