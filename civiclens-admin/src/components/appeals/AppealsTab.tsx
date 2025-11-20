"use client";

import React, { useEffect, useState } from 'react';
import { appealsApi, Appeal, AppealType, AppealStatus } from '@/lib/api/appeals';
import { AlertCircle, CheckCircle, Clock, XCircle, Eye, FileText, User, Calendar } from 'lucide-react';

export default function AppealsTab() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [filterStatus, setFilterStatus] = useState<AppealStatus | ''>('');
  const [filterType, setFilterType] = useState<AppealType | ''>('');

  useEffect(() => {
    loadData();
  }, [filterStatus, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [appealsData, statsData] = await Promise.all([
        appealsApi.list({
          status: filterStatus || undefined,
          appeal_type: filterType || undefined,
        }),
        appealsApi.getStats(),
      ]);
      
      setAppeals(appealsData);
      setStats(statsData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: AppealStatus) => {
    const badges = {
      [AppealStatus.SUBMITTED]: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Submitted' },
      [AppealStatus.UNDER_REVIEW]: { color: 'bg-yellow-100 text-yellow-700', icon: Eye, label: 'Under Review' },
      [AppealStatus.APPROVED]: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Approved' },
      [AppealStatus.REJECTED]: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
      [AppealStatus.WITHDRAWN]: { color: 'bg-gray-100 text-gray-700', icon: XCircle, label: 'Withdrawn' },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: AppealType) => {
    const types = {
      [AppealType.CLASSIFICATION]: { color: 'bg-purple-100 text-purple-700', label: 'Classification' },
      [AppealType.RESOLUTION]: { color: 'bg-orange-100 text-orange-700', label: 'Resolution Quality' },
      [AppealType.REJECTION]: { color: 'bg-red-100 text-red-700', label: 'Rejection' },
      [AppealType.INCORRECT_ASSIGNMENT]: { color: 'bg-indigo-100 text-indigo-700', label: 'Wrong Assignment' },
      [AppealType.WORKLOAD]: { color: 'bg-yellow-100 text-yellow-700', label: 'Workload' },
      [AppealType.RESOURCE_LACK]: { color: 'bg-pink-100 text-pink-700', label: 'Resource Lack' },
      [AppealType.QUALITY_CONCERN]: { color: 'bg-red-100 text-red-700', label: 'Quality Concern' },
    };
    const typeInfo = types[type];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading Appeals</h3>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Appeals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(stats.by_status?.submitted || 0) + (stats.by_status?.under_review || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.by_status?.approved || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.by_status?.rejected || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AppealStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value={AppealStatus.SUBMITTED}>Submitted</option>
              <option value={AppealStatus.UNDER_REVIEW}>Under Review</option>
              <option value={AppealStatus.APPROVED}>Approved</option>
              <option value={AppealStatus.REJECTED}>Rejected</option>
              <option value={AppealStatus.WITHDRAWN}>Withdrawn</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AppealType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value={AppealType.CLASSIFICATION}>Classification</option>
              <option value={AppealType.RESOLUTION}>Resolution Quality</option>
              <option value={AppealType.REJECTION}>Rejection</option>
              <option value={AppealType.INCORRECT_ASSIGNMENT}>Wrong Assignment</option>
              <option value={AppealType.WORKLOAD}>Workload</option>
              <option value={AppealType.RESOURCE_LACK}>Resource Lack</option>
              <option value={AppealType.QUALITY_CONCERN}>Quality Concern</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appeals List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Appeals ({appeals.length})
          </h3>
        </div>

        {appeals.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No appeals found</p>
            <p className="text-sm text-gray-500 mt-1">Appeals will appear here when submitted</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedAppeal(appeal)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(appeal.appeal_type)}
                      {getStatusBadge(appeal.status)}
                      <span className="text-sm text-gray-500">
                        Report #{appeal.report_id}
                      </span>
                    </div>

                    <p className="text-sm text-gray-900 font-medium mb-2 line-clamp-2">
                      {appeal.reason}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        User #{appeal.submitted_by_user_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(appeal.created_at).toLocaleDateString()}
                      </span>
                      {appeal.requires_rework && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                          Rework Required
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAppeal(appeal);
                    }}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appeal Detail Modal */}
      {selectedAppeal && (
        <AppealDetailModal
          appeal={selectedAppeal}
          onClose={() => setSelectedAppeal(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

// Appeal Detail Modal Component
function AppealDetailModal({
  appeal,
  onClose,
  onUpdate,
}: {
  appeal: Appeal;
  onClose: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Appeal Details</h2>
            <p className="text-sm text-gray-600 mt-1">Appeal #{appeal.id} • Report #{appeal.report_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Type */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              appeal.status === AppealStatus.APPROVED ? 'bg-green-100 text-green-700' :
              appeal.status === AppealStatus.REJECTED ? 'bg-red-100 text-red-700' :
              appeal.status === AppealStatus.UNDER_REVIEW ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {appeal.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-sm font-medium text-gray-700 ml-4">Type:</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
              {appeal.appeal_type.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Reason</h3>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{appeal.reason}</p>
          </div>

          {/* Evidence */}
          {appeal.evidence && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Evidence</h3>
              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{appeal.evidence}</p>
            </div>
          )}

          {/* Requested Action */}
          {appeal.requested_action && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Requested Action</h3>
              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{appeal.requested_action}</p>
            </div>
          )}

          {/* Review Info */}
          {appeal.review_notes && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Information</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Review Notes</h4>
                  <p className="text-sm text-gray-900 bg-blue-50 rounded-lg p-3">{appeal.review_notes}</p>
                </div>

                {appeal.action_taken && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Action Taken</h4>
                    <p className="text-sm text-gray-900 bg-green-50 rounded-lg p-3">{appeal.action_taken}</p>
                  </div>
                )}

                {appeal.requires_rework && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-900 mb-2">Rework Required</h4>
                    {appeal.rework_notes && (
                      <p className="text-sm text-orange-800">{appeal.rework_notes}</p>
                    )}
                    <p className="text-sm text-orange-700 mt-2">
                      Status: {appeal.rework_completed ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(appeal.created_at).toLocaleString()}</p>
            {appeal.updated_at && (
              <p>Updated: {new Date(appeal.updated_at).toLocaleString()}</p>
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
