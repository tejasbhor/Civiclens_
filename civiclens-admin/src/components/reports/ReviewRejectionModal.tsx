"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  AlertTriangle, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  User as UserIcon,
  RefreshCw,
  XCircle,
  ArrowRight,
  FileText,
  Building2,
  Tag,
  Info,
  Activity,
  TrendingUp
} from 'lucide-react';
import { Report, User, ReportCategory, ReportSeverity } from '@/types';
import { reportsApi, OfficerWorkload } from '@/lib/api/reports';
import { usersApi } from '@/lib/api/users';
import { departmentsApi } from '@/lib/api/departments';

interface ReviewRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess?: () => void;
}

interface OfficerWithWorkload extends User {
  workload?: OfficerWorkload;
  capacityStatus?: 'available' | 'moderate' | 'high' | 'overloaded';
}

const CATEGORY_OPTIONS = [
  { value: ReportCategory.ROADS, label: 'Roads & Infrastructure', icon: '🛣️' },
  { value: ReportCategory.WATER, label: 'Water Supply', icon: '💧' },
  { value: ReportCategory.ELECTRICITY, label: 'Electricity', icon: '⚡' },
  { value: ReportCategory.SANITATION, label: 'Sanitation & Waste', icon: '🗑️' },
  { value: ReportCategory.STREET_LIGHTS, label: 'Street Lights', icon: '💡' },
  { value: ReportCategory.DRAINAGE, label: 'Drainage', icon: '🌊' },
  { value: ReportCategory.PARKS, label: 'Parks & Recreation', icon: '🌳' },
  { value: ReportCategory.OTHER, label: 'Other', icon: '📋' }
] as const;

const SEVERITY_OPTIONS = [
  { value: ReportSeverity.LOW, label: 'Low', color: 'text-green-600 bg-green-50' },
  { value: ReportSeverity.MEDIUM, label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
  { value: ReportSeverity.HIGH, label: 'High', color: 'text-orange-600 bg-orange-50' },
  { value: ReportSeverity.CRITICAL, label: 'Critical', color: 'text-red-600 bg-red-50' }
] as const;

export function ReviewRejectionModal({
  isOpen,
  onClose,
  report,
  onSuccess,
}: ReviewRejectionModalProps) {
  // State management
  const [action, setAction] = useState<'reassign' | 'reclassify' | 'reject_report'>('reassign');
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState<ReportCategory | ''>('');
  const [newSeverity, setNewSeverity] = useState<ReportSeverity | ''>(report.severity || '');
  const [newDepartmentId, setNewDepartmentId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [officers, setOfficers] = useState<OfficerWithWorkload[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOfficerDetails, setShowOfficerDetails] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (action === 'reassign' && report.department_id) {
        loadOfficers();
      }
      if (action === 'reclassify') {
        loadDepartments();
      }
      // Pre-fill current values for reclassify
      if (action === 'reclassify') {
        setNewCategory(report.category || '');
        setNewSeverity(report.severity || '');
        setNewDepartmentId(report.department_id || null);
      }
    } else {
      resetForm();
    }
  }, [isOpen, action, report.department_id]);

  const loadOfficers = useCallback(async () => {
    if (!report.department_id) {
      setError('Report must be assigned to a department first');
      return;
    }
    
    try {
      setLoadingOfficers(true);
      setError(null);

      // Load officers and workload data
      const [officersData, workloadData] = await Promise.allSettled([
        usersApi.getOfficers(report.department_id),
        reportsApi.getAllOfficersWorkload(report.department_id)
      ]);

      let officers: User[] = [];
      if (officersData.status === 'fulfilled') {
        officers = Array.isArray(officersData.value) ? officersData.value : [];
      }

      // Map workload data
      const workloadMap: Record<number, OfficerWorkload> = {};
      if (workloadData.status === 'fulfilled' && workloadData.value.officers) {
        workloadData.value.officers.forEach(w => {
          workloadMap[w.officer_id] = w;
        });
      }

      // Enhance officers with workload
      const enhancedOfficers: OfficerWithWorkload[] = officers
        .filter(o => o.id !== report.task?.assigned_to) // Exclude current officer
        .map(officer => ({
          ...officer,
          workload: workloadMap[officer.id],
          capacityStatus: getCapacityStatus(workloadMap[officer.id])
        }));

      setOfficers(enhancedOfficers);
    } catch (error) {
      console.error('Failed to load officers:', error);
      setError('Failed to load officers. Please try again.');
      setOfficers([]);
    } finally {
      setLoadingOfficers(false);
    }
  }, [report.department_id, report.task?.assigned_to]);

  const loadDepartments = async () => {
    try {
      const depts = await departmentsApi.list();
      setDepartments(depts);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setError('Failed to load departments');
    }
  };

  const getCapacityStatus = (workload?: OfficerWorkload): 'available' | 'moderate' | 'high' | 'overloaded' => {
    if (!workload) return 'available';
    const active = workload.active_reports || 0;
    if (active === 0) return 'available';
    if (active <= 3) return 'moderate';
    if (active <= 6) return 'high';
    return 'overloaded';
  };

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'overloaded': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const resetForm = useCallback(() => {
    setAction('reassign');
    setSelectedOfficerId(null);
    setNewCategory('');
    setNewSeverity(report.severity || '');
    setNewDepartmentId(null);
    setNotes('');
    setError(null);
    setShowOfficerDetails(false);
  }, [report.severity]);

  const validateForm = (): string | null => {
    if (action === 'reassign' && !selectedOfficerId) {
      return 'Please select an officer';
    }
    if (action === 'reclassify') {
      if (!newCategory) return 'Please select a category';
      if (!newSeverity) return 'Please select severity level';
    }
    if (notes && notes.length > 500) {
      return 'Notes cannot exceed 500 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options: any = {
        notes: notes || undefined
      };

      if (action === 'reassign') {
        options.newOfficerId = selectedOfficerId!;
      } else if (action === 'reclassify') {
        options.newCategory = newCategory;
        options.newSeverity = newSeverity;
        if (newDepartmentId) {
          options.newDepartmentId = newDepartmentId;
        }
      }

      await reportsApi.reviewAssignmentRejection(
        report.id,
        action,
        options
      );

      if (onSuccess) {
        onSuccess();
      }

      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Failed to review rejection:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to review rejection. Please try again.';
      setError(Array.isArray(errorMessage) 
        ? errorMessage.map((e: any) => e.msg || e).join(', ')
        : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const rejectionReason = report.assignment_rejection_reason || (report as any).task?.rejection_reason || 'No reason provided';
  const rejectedBy = (report as any).assignment_rejected_by || (report as any).task?.officer;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Review Assignment Rejection</h2>
              <p className="text-sm text-gray-600 mt-1">
                Report #{report.report_number || `CL-${report.id}`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Rejection Details Card */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Officer's Rejection</h3>
                {rejectedBy && (
                  <p className="text-sm text-gray-700 mb-3">
                    <span className="font-medium">Officer:</span> {rejectedBy.full_name || 'Unknown'}
                  </p>
                )}
                <div className="bg-white/80 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-900">{rejectionReason}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-4">
                Select Action <span className="text-red-600">*</span>
              </label>
              <div className="space-y-3">
                {/* Reassign Option */}
                <label className={`
                  flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${action === 'reassign' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                `}>
                  <input
                    type="radio"
                    name="action"
                    value="reassign"
                    checked={action === 'reassign'}
                    onChange={(e) => setAction(e.target.value as any)}
                    disabled={loading}
                    className="mt-1 w-5 h-5 text-blue-600"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Reassign to Different Officer</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Assign this task to another officer in the same department
                    </p>
                  </div>
                </label>

                {/* Reclassify Option */}
                <label className={`
                  flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${action === 'reclassify' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}
                `}>
                  <input
                    type="radio"
                    name="action"
                    value="reclassify"
                    checked={action === 'reclassify'}
                    onChange={(e) => setAction(e.target.value as any)}
                    disabled={loading}
                    className="mt-1 w-5 h-5 text-purple-600"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">Reclassify Report</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Change the report category, severity, or department assignment
                    </p>
                  </div>
                </label>

                {/* Reject Report Option */}
                <label className={`
                  flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${action === 'reject_report' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'}
                `}>
                  <input
                    type="radio"
                    name="action"
                    value="reject_report"
                    checked={action === 'reject_report'}
                    onChange={(e) => setAction(e.target.value as any)}
                    disabled={loading}
                    className="mt-1 w-5 h-5 text-red-600"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-gray-900">Reject Report</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Mark the report as invalid/spam and permanently close it
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Officer Selection for Reassign */}
            {action === 'reassign' && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-900">
                    Select Officer <span className="text-red-600">*</span>
                  </label>
                </div>
                
                {loadingOfficers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-3 text-sm text-gray-600">Loading officers...</span>
                  </div>
                ) : officers.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">No other officers available in this department</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {officers.map((officer) => (
                      <label
                        key={officer.id}
                        className={`
                          flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${selectedOfficerId === officer.id ? 'border-blue-500 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-blue-300'}
                        `}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="radio"
                            name="officer"
                            value={officer.id}
                            checked={selectedOfficerId === officer.id}
                            onChange={() => setSelectedOfficerId(officer.id)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{officer.full_name}</span>
                            </div>
                            {(officer as any).employee_id && (
                              <p className="text-xs text-gray-500 mt-1">ID: {(officer as any).employee_id}</p>
                            )}
                          </div>
                        </div>
                        {officer.workload && (
                          <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getCapacityColor(officer.capacityStatus || 'available')}`}>
                            {officer.workload.active_reports || 0} active
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reclassification Options */}
            {action === 'reclassify' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Reclassification Details</h3>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <label
                        key={cat.value}
                        className={`
                          flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all
                          ${newCategory === cat.value ? 'border-purple-500 bg-white' : 'border-gray-200 bg-white hover:border-purple-300'}
                        `}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat.value}
                          checked={newCategory === cat.value}
                          onChange={(e) => setNewCategory(e.target.value as ReportCategory)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Severity Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Severity <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {SEVERITY_OPTIONS.map((sev) => (
                      <label
                        key={sev.value}
                        className={`
                          flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all
                          ${newSeverity === sev.value ? `border-current ${sev.color}` : 'border-gray-200 bg-white hover:border-gray-300'}
                        `}
                      >
                        <input
                          type="radio"
                          name="severity"
                          value={sev.value}
                          checked={newSeverity === sev.value}
                          onChange={(e) => setNewSeverity(e.target.value as ReportSeverity)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-semibold">{sev.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={500}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Add any notes about your decision (max 500 characters)..."
              />
              <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (action === 'reassign' && !selectedOfficerId) || (action === 'reclassify' && (!newCategory || !newSeverity))}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Action
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
