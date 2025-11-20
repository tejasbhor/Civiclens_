"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  FileText, 
  Clock, 
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MessageSquare,
  Flag,
  RefreshCw,
  Send,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Report } from '@/types';
import { appealsApi, Appeal, AppealType, AppealStatus, AppealCreate } from '@/lib/api/appeals';

interface AppealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: () => void;
}

export function AppealsModal({ 
  isOpen, 
  onClose, 
  report, 
  onSuccess 
}: AppealsModalProps) {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [appealType, setAppealType] = useState<AppealType>(AppealType.RESOLUTION);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [requestedAction, setRequestedAction] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAppeals();
    }
  }, [isOpen, report.id]);

  const loadAppeals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get appeals for this report
      const allAppeals = await appealsApi.list();
      const reportAppeals = allAppeals.filter(appeal => appeal.report_id === report.id);
      setAppeals(reportAppeals);
      
    } catch (err: any) {
      console.error('Failed to load appeals:', err);
      setError('Failed to load appeals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for the appeal');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const appealData: AppealCreate = {
        report_id: report.id,
        appeal_type: appealType,
        reason: reason.trim(),
        evidence: evidence.trim() || undefined,
        requested_action: requestedAction.trim() || undefined
      };

      await appealsApi.create(appealData);
      
      // Reset form
      setReason('');
      setEvidence('');
      setRequestedAction('');
      setShowCreateForm(false);
      
      // Reload appeals
      await loadAppeals();
      onSuccess();

    } catch (err: any) {
      console.error('Failed to create appeal:', err);
      setError(err?.response?.data?.detail || 'Failed to create appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getAppealTypeLabel = (type: AppealType) => {
    switch (type) {
      case AppealType.CLASSIFICATION: return 'Classification';
      case AppealType.RESOLUTION: return 'Resolution';
      case AppealType.REJECTION: return 'Rejection';
      case AppealType.INCORRECT_ASSIGNMENT: return 'Incorrect Assignment';
      case AppealType.WORKLOAD: return 'Workload';
      case AppealType.RESOURCE_LACK: return 'Resource Lack';
      case AppealType.QUALITY_CONCERN: return 'Quality Concern';
      default: return type;
    }
  };

  const getStatusColor = (status: AppealStatus) => {
    switch (status) {
      case AppealStatus.SUBMITTED: return 'text-blue-600 bg-blue-50 border-blue-200';
      case AppealStatus.UNDER_REVIEW: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case AppealStatus.APPROVED: return 'text-green-600 bg-green-50 border-green-200';
      case AppealStatus.REJECTED: return 'text-red-600 bg-red-50 border-red-200';
      case AppealStatus.WITHDRAWN: return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: AppealStatus) => {
    switch (status) {
      case AppealStatus.SUBMITTED: return Clock;
      case AppealStatus.UNDER_REVIEW: return Eye;
      case AppealStatus.APPROVED: return CheckCircle;
      case AppealStatus.REJECTED: return XCircle;
      case AppealStatus.WITHDRAWN: return Trash2;
      default: return Clock;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Flag className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Appeals Management</h3>
              <p className="text-sm text-gray-500">
                Report #{report.report_number || `CL-${report.id}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Create Appeal Button */}
          {!showCreateForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Create New Appeal
              </button>
            </div>
          )}

          {/* Create Appeal Form */}
          {showCreateForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Create New Appeal</h4>
              
              <form onSubmit={handleCreateAppeal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appeal Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={appealType}
                    onChange={(e) => setAppealType(e.target.value as AppealType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    {Object.values(AppealType).map(type => (
                      <option key={type} value={type}>
                        {getAppealTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Explain the reason for this appeal..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence (Optional)
                  </label>
                  <textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Provide any supporting evidence..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requested Action (Optional)
                  </label>
                  <textarea
                    value={requestedAction}
                    onChange={(e) => setRequestedAction(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="What action would you like to be taken?"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submitting ? 'Creating...' : 'Create Appeal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setReason('');
                      setEvidence('');
                      setRequestedAction('');
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Appeals List */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Existing Appeals ({appeals.length})
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading appeals...</span>
              </div>
            ) : appeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No appeals found for this report</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appeals.map((appeal) => {
                  const StatusIcon = getStatusIcon(appeal.status);
                  
                  return (
                    <div key={appeal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Flag className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {getAppealTypeLabel(appeal.appeal_type)}
                            </h5>
                            <p className="text-sm text-gray-500">
                              Created {new Date(appeal.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appeal.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {appeal.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Reason:</span>
                          <p className="text-sm text-gray-600 mt-1">{appeal.reason}</p>
                        </div>
                        
                        {appeal.evidence && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Evidence:</span>
                            <p className="text-sm text-gray-600 mt-1">{appeal.evidence}</p>
                          </div>
                        )}
                        
                        {appeal.requested_action && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Requested Action:</span>
                            <p className="text-sm text-gray-600 mt-1">{appeal.requested_action}</p>
                          </div>
                        )}

                        {appeal.review_notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Review Notes:</span>
                            <p className="text-sm text-gray-600 mt-1">{appeal.review_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}