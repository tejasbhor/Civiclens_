"use client";

import React, { useEffect, useState } from 'react';
import { escalationsApi, Escalation, EscalationLevel, EscalationStatus, EscalationReason } from '@/lib/api/escalations';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Eye, FileText, User, Calendar, AlertCircle } from 'lucide-react';

export default function EscalationsTab() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [filterLevel, setFilterLevel] = useState<EscalationLevel | ''>('');
  const [filterStatus, setFilterStatus] = useState<EscalationStatus | ''>('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterLevel, filterStatus, showOverdueOnly]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [escalationsData, statsData] = await Promise.all([
        escalationsApi.list({
          level: filterLevel || undefined,
          status: filterStatus || undefined,
          is_overdue: showOverdueOnly || undefined,
        }),
        escalationsApi.getStats(),
      ]);
      
      setEscalations(escalationsData);
      setStats(statsData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: EscalationLevel) => {
    const levels = {
      [EscalationLevel.LEVEL_1]: { color: 'bg-yellow-100 text-yellow-700', label: 'Level 1 - Dept Head', icon: '!' },
      [EscalationLevel.LEVEL_2]: { color: 'bg-orange-100 text-orange-700', label: 'Level 2 - City Manager', icon: '!!' },
      [EscalationLevel.LEVEL_3]: { color: 'bg-red-100 text-red-700', label: 'Level 3 - Mayor', icon: '!!!' },
    };
    const levelInfo = levels[level];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${levelInfo.color}`}>
        <span>{levelInfo.icon}</span>
        {levelInfo.label}
      </span>
    );
  };

  const getStatusBadge = (status: EscalationStatus) => {
    const statuses = {
      [EscalationStatus.ESCALATED]: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Escalated' },
      [EscalationStatus.ACKNOWLEDGED]: { color: 'bg-blue-100 text-blue-700', icon: Eye, label: 'Acknowledged' },
      [EscalationStatus.UNDER_REVIEW]: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Under Review' },
      [EscalationStatus.ACTION_TAKEN]: { color: 'bg-purple-100 text-purple-700', icon: TrendingUp, label: 'Action Taken' },
      [EscalationStatus.RESOLVED]: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Resolved' },
      [EscalationStatus.DE_ESCALATED]: { color: 'bg-gray-100 text-gray-700', icon: TrendingUp, label: 'De-escalated' },
    };
    const statusInfo = statuses[status];
    const Icon = statusInfo.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </span>
    );
  };

  const getReasonLabel = (reason: EscalationReason) => {
    const reasons = {
      [EscalationReason.SLA_BREACH]: 'SLA Breach',
      [EscalationReason.UNRESOLVED]: 'Unresolved',
      [EscalationReason.QUALITY_ISSUE]: 'Quality Issue',
      [EscalationReason.CITIZEN_COMPLAINT]: 'Citizen Complaint',
      [EscalationReason.VIP_ATTENTION]: 'VIP Attention',
      [EscalationReason.CRITICAL_PRIORITY]: 'Critical Priority',
    };
    return reasons[reason];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading Escalations</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Level 1</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.by_level?.level_1 || 0}</p>
              </div>
              <span className="text-2xl">⚠️</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Level 2</p>
                <p className="text-2xl font-bold text-orange-600">{stats.by_level?.level_2 || 0}</p>
              </div>
              <span className="text-2xl font-bold text-orange-600">!!</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Level 3</p>
                <p className="text-2xl font-bold text-red-600">{stats.by_level?.level_3 || 0}</p>
              </div>
              <span className="text-2xl">🚨</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-4 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Level</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as EscalationLevel | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Levels</option>
              <option value={EscalationLevel.LEVEL_1}>Level 1 - Department Head</option>
              <option value={EscalationLevel.LEVEL_2}>Level 2 - City Manager</option>
              <option value={EscalationLevel.LEVEL_3}>Level 3 - Mayor/Council</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as EscalationStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Statuses</option>
              <option value={EscalationStatus.ESCALATED}>Escalated</option>
              <option value={EscalationStatus.ACKNOWLEDGED}>Acknowledged</option>
              <option value={EscalationStatus.UNDER_REVIEW}>Under Review</option>
              <option value={EscalationStatus.ACTION_TAKEN}>Action Taken</option>
              <option value={EscalationStatus.RESOLVED}>Resolved</option>
              <option value={EscalationStatus.DE_ESCALATED}>De-escalated</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Show Overdue Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Escalations List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Escalations ({escalations.length})
          </h3>
        </div>

        {escalations.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No escalations found</p>
            <p className="text-sm text-gray-500 mt-1">Escalations will appear here when created</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  escalation.is_overdue ? 'bg-red-50 border-l-4 border-red-500' : ''
                }`}
                onClick={() => setSelectedEscalation(escalation)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getLevelBadge(escalation.level)}
                      {getStatusBadge(escalation.status)}
                      <span className="text-sm text-gray-500">
                        Report #{escalation.report_id}
                      </span>
                      {escalation.is_overdue && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          ⚠️ OVERDUE
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-900 font-medium mb-2">
                      {getReasonLabel(escalation.reason)}
                    </p>

                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {escalation.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Escalated by #{escalation.escalated_by_user_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(escalation.created_at).toLocaleDateString()}
                      </span>
                      {escalation.sla_deadline && (
                        <span className={`flex items-center gap-1 ${
                          escalation.is_overdue ? 'text-red-600 font-medium' : ''
                        }`}>
                          <Clock className="w-3 h-3" />
                          Due: {new Date(escalation.sla_deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEscalation(escalation);
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escalation Detail Modal */}
      {selectedEscalation && (
        <EscalationDetailModal
          escalation={selectedEscalation}
          onClose={() => setSelectedEscalation(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

// Escalation Detail Modal Component
function EscalationDetailModal({
  escalation,
  onClose,
  onUpdate,
}: {
  escalation: Escalation;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const getReasonLabel = (reason: EscalationReason) => {
    const reasons = {
      [EscalationReason.SLA_BREACH]: 'SLA Breach',
      [EscalationReason.UNRESOLVED]: 'Unresolved',
      [EscalationReason.QUALITY_ISSUE]: 'Quality Issue',
      [EscalationReason.CITIZEN_COMPLAINT]: 'Citizen Complaint',
      [EscalationReason.VIP_ATTENTION]: 'VIP Attention',
      [EscalationReason.CRITICAL_PRIORITY]: 'Critical Priority',
    };
    return reasons[reason];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Escalation Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Escalation #{escalation.id} • Report #{escalation.report_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <AlertCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Level & Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              escalation.level === EscalationLevel.LEVEL_3 ? 'bg-red-100 text-red-700' :
              escalation.level === EscalationLevel.LEVEL_2 ? 'bg-orange-100 text-orange-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {escalation.level.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              escalation.status === EscalationStatus.RESOLVED ? 'bg-green-100 text-green-700' :
              escalation.status === EscalationStatus.ESCALATED ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {escalation.status.replace('_', ' ').toUpperCase()}
            </span>
            {escalation.is_overdue && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                ⚠️ OVERDUE
              </span>
            )}
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Reason</h3>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
              {getReasonLabel(escalation.reason)}
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{escalation.description}</p>
          </div>

          {/* Previous Actions */}
          {escalation.previous_actions && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Previous Actions</h3>
              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{escalation.previous_actions}</p>
            </div>
          )}

          {/* Urgency Notes */}
          {escalation.urgency_notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Urgency Notes</h3>
              <p className="text-sm text-gray-900 bg-red-50 rounded-lg p-3 border border-red-200">
                {escalation.urgency_notes}
              </p>
            </div>
          )}

          {/* SLA Deadline */}
          {escalation.sla_deadline && (
            <div className={`rounded-lg p-4 ${
              escalation.is_overdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h3 className="text-sm font-medium text-gray-900 mb-2">SLA Deadline</h3>
              <p className={`text-sm font-medium ${
                escalation.is_overdue ? 'text-red-700' : 'text-blue-700'
              }`}>
                {new Date(escalation.sla_deadline).toLocaleString()}
                {escalation.is_overdue && ' (OVERDUE)'}
              </p>
            </div>
          )}

          {/* Response Info */}
          {escalation.response_notes && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Information</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Response Notes</h4>
                  <p className="text-sm text-gray-900 bg-blue-50 rounded-lg p-3">{escalation.response_notes}</p>
                </div>

                {escalation.action_taken && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Action Taken</h4>
                    <p className="text-sm text-gray-900 bg-green-50 rounded-lg p-3">{escalation.action_taken}</p>
                  </div>
                )}

                {escalation.acknowledged_at && (
                  <p className="text-xs text-gray-500">
                    Acknowledged: {new Date(escalation.acknowledged_at).toLocaleString()}
                  </p>
                )}

                {escalation.resolved_at && (
                  <p className="text-xs text-green-600 font-medium">
                    ✅ Resolved: {new Date(escalation.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(escalation.created_at).toLocaleString()}</p>
            {escalation.updated_at && (
              <p>Updated: {new Date(escalation.updated_at).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
