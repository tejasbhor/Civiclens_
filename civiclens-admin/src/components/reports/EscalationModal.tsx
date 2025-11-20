"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MessageSquare,
  Zap,
  RefreshCw,
  Send,
  Eye,
  ArrowUp,
  ArrowDown,
  Shield
} from 'lucide-react';
import { Report } from '@/types';
import { 
  escalationsApi, 
  Escalation, 
  EscalationLevel, 
  EscalationReason, 
  EscalationStatus, 
  EscalationCreate 
} from '@/lib/api/escalations';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: () => void;
}

export function EscalationModal({ 
  isOpen, 
  onClose, 
  report, 
  onSuccess 
}: EscalationModalProps) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [level, setLevel] = useState<EscalationLevel>(EscalationLevel.LEVEL_1);
  const [reason, setReason] = useState<EscalationReason>(EscalationReason.SLA_BREACH);
  const [description, setDescription] = useState('');
  const [previousActions, setPreviousActions] = useState('');
  const [urgencyNotes, setUrgencyNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEscalations();
    }
  }, [isOpen, report.id]);

  const loadEscalations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get escalations for this report
      const allEscalations = await escalationsApi.list();
      const reportEscalations = allEscalations.filter(esc => esc.report_id === report.id);
      setEscalations(reportEscalations);
      
    } catch (err: any) {
      console.error('Failed to load escalations:', err);
      setError('Failed to load escalations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please provide a description for the escalation');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const escalationData: EscalationCreate = {
        report_id: report.id,
        level,
        reason,
        description: description.trim(),
        previous_actions: previousActions.trim() || undefined,
        urgency_notes: urgencyNotes.trim() || undefined
      };

      await escalationsApi.create(escalationData);
      
      // Reset form
      setDescription('');
      setPreviousActions('');
      setUrgencyNotes('');
      setShowCreateForm(false);
      
      // Reload escalations
      await loadEscalations();
      onSuccess();

    } catch (err: any) {
      console.error('Failed to create escalation:', err);
      setError(err?.response?.data?.detail || 'Failed to create escalation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelLabel = (level: EscalationLevel) => {
    switch (level) {
      case EscalationLevel.LEVEL_1: return 'Level 1 - Supervisor';
      case EscalationLevel.LEVEL_2: return 'Level 2 - Department Head';
      case EscalationLevel.LEVEL_3: return 'Level 3 - Senior Management';
      default: return level;
    }
  };

  const getLevelColor = (level: EscalationLevel) => {
    switch (level) {
      case EscalationLevel.LEVEL_1: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case EscalationLevel.LEVEL_2: return 'text-orange-600 bg-orange-50 border-orange-200';
      case EscalationLevel.LEVEL_3: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getReasonLabel = (reason: EscalationReason) => {
    switch (reason) {
      case EscalationReason.SLA_BREACH: return 'SLA Breach';
      case EscalationReason.UNRESOLVED: return 'Unresolved Issue';
      case EscalationReason.QUALITY_ISSUE: return 'Quality Issue';
      case EscalationReason.CITIZEN_COMPLAINT: return 'Citizen Complaint';
      case EscalationReason.VIP_ATTENTION: return 'VIP Attention';
      case EscalationReason.CRITICAL_PRIORITY: return 'Critical Priority';
      default: return reason;
    }
  };

  const getStatusColor = (status: EscalationStatus) => {
    switch (status) {
      case EscalationStatus.ESCALATED: return 'text-red-600 bg-red-50 border-red-200';
      case EscalationStatus.ACKNOWLEDGED: return 'text-blue-600 bg-blue-50 border-blue-200';
      case EscalationStatus.UNDER_REVIEW: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case EscalationStatus.ACTION_TAKEN: return 'text-purple-600 bg-purple-50 border-purple-200';
      case EscalationStatus.RESOLVED: return 'text-green-600 bg-green-50 border-green-200';
      case EscalationStatus.DE_ESCALATED: return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: EscalationStatus) => {
    switch (status) {
      case EscalationStatus.ESCALATED: return ArrowUp;
      case EscalationStatus.ACKNOWLEDGED: return Eye;
      case EscalationStatus.UNDER_REVIEW: return Clock;
      case EscalationStatus.ACTION_TAKEN: return Zap;
      case EscalationStatus.RESOLVED: return CheckCircle;
      case EscalationStatus.DE_ESCALATED: return ArrowDown;
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
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Escalation Management</h3>
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

          {/* Create Escalation Button */}
          {!showCreateForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Create Escalation
              </button>
            </div>
          )}

          {/* Create Escalation Form */}
          {showCreateForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Create New Escalation</h4>
              
              <form onSubmit={handleCreateEscalation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Escalation Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as EscalationLevel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      {Object.values(EscalationLevel).map(lvl => (
                        <option key={lvl} value={lvl}>
                          {getLevelLabel(lvl)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as EscalationReason)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      {Object.values(EscalationReason).map(rsn => (
                        <option key={rsn} value={rsn}>
                          {getReasonLabel(rsn)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Describe the issue requiring escalation..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous Actions Taken (Optional)
                  </label>
                  <textarea
                    value={previousActions}
                    onChange={(e) => setPreviousActions(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="What actions have already been attempted?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency Notes (Optional)
                  </label>
                  <textarea
                    value={urgencyNotes}
                    onChange={(e) => setUrgencyNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Any additional urgency or context notes..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submitting ? 'Creating...' : 'Create Escalation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setDescription('');
                      setPreviousActions('');
                      setUrgencyNotes('');
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

          {/* Escalations List */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Escalation History ({escalations.length})
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading escalations...</span>
              </div>
            ) : escalations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No escalations found for this report</p>
              </div>
            ) : (
              <div className="space-y-4">
                {escalations.map((escalation) => {
                  const StatusIcon = getStatusIcon(escalation.status);
                  
                  return (
                    <div key={escalation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-gray-900">
                                {getLevelLabel(escalation.level)}
                              </h5>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(escalation.level)}`}>
                                {escalation.level.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {getReasonLabel(escalation.reason)} • Created {new Date(escalation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(escalation.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {escalation.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Description:</span>
                          <p className="text-sm text-gray-600 mt-1">{escalation.description}</p>
                        </div>
                        
                        {escalation.previous_actions && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Previous Actions:</span>
                            <p className="text-sm text-gray-600 mt-1">{escalation.previous_actions}</p>
                          </div>
                        )}
                        
                        {escalation.urgency_notes && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Urgency Notes:</span>
                            <p className="text-sm text-gray-600 mt-1">{escalation.urgency_notes}</p>
                          </div>
                        )}

                        {escalation.response_notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Response:</span>
                            <p className="text-sm text-gray-600 mt-1">{escalation.response_notes}</p>
                          </div>
                        )}

                        {escalation.is_overdue && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-red-800">Overdue</span>
                            </div>
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