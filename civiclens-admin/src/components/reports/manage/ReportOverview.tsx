import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { reportsApi, StatusUpdateRequest } from '@/lib/api/reports';
import { 
  FileText, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  EyeOff,
  Flag,
  Star,
  User,
  Building2,
  MapPin,
  Hash,
  Sparkles,
  Info,
  Copy,
  Check,
  Zap
} from 'lucide-react';

interface ReportOverviewProps {
  report: Report;
  onUpdate?: () => void;
}

// Status transitions map
const statusTransitions: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.RECEIVED]: [ReportStatus.PENDING_CLASSIFICATION, ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.PENDING_CLASSIFICATION]: [ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.CLASSIFIED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.ASSIGNED_TO_DEPARTMENT]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD],
  [ReportStatus.ASSIGNED_TO_OFFICER]: [ReportStatus.ACKNOWLEDGED, ReportStatus.ASSIGNMENT_REJECTED, ReportStatus.ON_HOLD],
  [ReportStatus.ASSIGNMENT_REJECTED]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.CLASSIFIED, ReportStatus.REJECTED],
  [ReportStatus.ACKNOWLEDGED]: [ReportStatus.IN_PROGRESS, ReportStatus.ON_HOLD],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.PENDING_VERIFICATION, ReportStatus.ON_HOLD],
  [ReportStatus.PENDING_VERIFICATION]: [ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.ON_HOLD, ReportStatus.IN_PROGRESS],
  [ReportStatus.RESOLVED]: [ReportStatus.CLOSED, ReportStatus.REOPENED],
  [ReportStatus.CLOSED]: [],
  [ReportStatus.REJECTED]: [],
  [ReportStatus.DUPLICATE]: [],
  [ReportStatus.ON_HOLD]: [ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS],
  [ReportStatus.REOPENED]: [ReportStatus.IN_PROGRESS],
};

export function ReportOverview({ report, onUpdate }: ReportOverviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Get allowed next statuses
  const allowedNext = statusTransitions[report.status as ReportStatus] || [];

  const copyReportNumber = () => {
    if (report.report_number) {
      navigator.clipboard.writeText(report.report_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toLabel = (str?: string | null) => {
    if (!str) return 'Not specified';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'on_hold':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleStatusChange = async (newStatus: ReportStatus) => {
    if (!confirm(`Change status to '${toLabel(newStatus)}'?`)) return;
    setUpdating(true);
    try {
      const payload: StatusUpdateRequest = { new_status: newStatus };
      await reportsApi.updateStatus(report.id, payload);
      onUpdate?.();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Report Number */}
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Report Overview</h3>
              {report.report_number && (
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-mono text-gray-600">{report.report_number}</span>
                  <button
                    onClick={copyReportNumber}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy report number"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.is_featured && (
              <div className="px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-full" title="Featured Report">
                <Star className="w-4 h-4 text-yellow-600" />
              </div>
            )}
            {report.is_sensitive && (
              <div className="px-2 py-1 bg-red-50 border border-red-200 rounded-full" title="Sensitive Content">
                <EyeOff className="w-4 h-4 text-red-600" />
              </div>
            )}
            {report.needs_review && (
              <div className="px-2 py-1 bg-orange-50 border border-orange-200 rounded-full" title="Needs Review">
                <Flag className="w-4 h-4 text-orange-600" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pt-4 space-y-5">
        {/* Title */}
        <div>
          <h4 className="text-xl font-bold text-gray-900 leading-tight">
            {report.title}
          </h4>
        </div>

        {/* Status & Priority Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge status={report.status} size="md" />
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${getSeverityColor(report.severity)}`}>
            {toLabel(report.severity)}
          </div>
          {report.category && (
            <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
              {toLabel(report.category)}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {expanded || report.description.length <= 200 
              ? report.description 
              : `${report.description.substring(0, 200)}...`
            }
          </p>
          {report.description.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Key Metadata */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Created</span>
            </div>
            <span className="text-gray-900 font-semibold">{formatDate(report.created_at)}</span>
          </div>
          
          {report.updated_at && report.updated_at !== report.created_at && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Last Updated</span>
              </div>
              <span className="text-gray-900 font-semibold">{formatDate(report.updated_at)}</span>
            </div>
          )}
          
          {report.user && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span className="font-medium">Reported By</span>
              </div>
              <span className="text-gray-900 font-semibold">{report.user.full_name || report.user.email || 'Anonymous'}</span>
            </div>
          )}
          
          {report.department && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Department</span>
              </div>
              <span className="text-blue-600 font-semibold">{report.department.name}</span>
            </div>
          )}
          
          {report.address && (
            <div className="flex items-start justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Location</span>
              </div>
              <span className="text-gray-900 font-medium text-right max-w-[60%]">{report.address}</span>
            </div>
          )}
        </div>

        {/* AI Classification (if available) */}
        {report.ai_category && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-blue-900">AI Classification</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-blue-900">{toLabel(report.ai_category)}</span>
              {report.ai_confidence && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-blue-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${Math.round(report.ai_confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {Math.round(report.ai_confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
            {report.ai_model_version && (
              <p className="text-xs text-blue-600 mt-2">Model: {report.ai_model_version}</p>
            )}
          </div>
        )}

        {/* Classification Notes */}
        {report.classification_notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Info className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-bold text-amber-900">Classification Notes</span>
            </div>
            <p className="text-sm text-amber-800 leading-relaxed">{report.classification_notes}</p>
          </div>
        )}

        {/* Rejection/Hold Reason */}
        {(report.rejection_reason || report.hold_reason) && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-sm font-bold text-red-900">
                {report.rejection_reason ? 'Rejection Reason' : 'Hold Reason'}
              </span>
            </div>
            <p className="text-sm text-red-800 leading-relaxed font-medium">
              {report.rejection_reason || report.hold_reason}
            </p>
          </div>
        )}

        {/* Duplicate Information */}
        {report.is_duplicate && report.duplicate_of && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-sm font-bold text-orange-900">Duplicate Report</span>
            </div>
            <p className="text-sm text-orange-800 leading-relaxed">
              This report is a duplicate of{' '}
              <a 
                href={`/dashboard/reports/manage/${report.duplicate_of.id}`}
                className="text-blue-600 hover:text-blue-700 font-bold underline inline-flex items-center gap-1"
              >
                {report.duplicate_of.report_number || `CL-${report.duplicate_of.id}`}
              </a>
            </p>
          </div>
        )}

        {/* Available Status Changes */}
        {allowedNext.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-blue-900">Available Status Changes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allowedNext.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {toLabel(status)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}