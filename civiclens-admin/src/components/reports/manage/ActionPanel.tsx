import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { AssignmentModals } from './AssignmentModals';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  X, 
  ArrowRight, 
  User, 
  Building2,
  AlertTriangle,
  MessageSquare,
  Flag,
  Clock,
  Zap,
  Settings,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ActionPanelProps {
  report: Report;
  onUpdate: () => void;
}

export function ActionPanel({ report, onUpdate }: ActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState<'department' | 'officer' | null>(null);

  const getAvailableActions = () => {
    const actions = [];
    
    switch (report.status) {
      case ReportStatus.RECEIVED:
        actions.push(
          { id: 'classify', label: 'Classify Report', icon: Flag, color: 'bg-blue-600 hover:bg-blue-700' },
          { id: 'assign-dept', label: 'Assign Department', icon: Building2, color: 'bg-purple-600 hover:bg-purple-700' }
        );
        break;
        
      case ReportStatus.PENDING_CLASSIFICATION:
        actions.push(
          { id: 'classify', label: 'Complete Classification', icon: Flag, color: 'bg-blue-600 hover:bg-blue-700' }
        );
        break;
        
      case ReportStatus.CLASSIFIED:
        actions.push(
          { id: 'assign-dept', label: 'Assign Department', icon: Building2, color: 'bg-purple-600 hover:bg-purple-700' }
        );
        break;
        
      case ReportStatus.ASSIGNED_TO_DEPARTMENT:
        actions.push(
          { id: 'assign-officer', label: 'Assign Officer', icon: User, color: 'bg-indigo-600 hover:bg-indigo-700' },
          { id: 'hold', label: 'Put On Hold', icon: Pause, color: 'bg-yellow-600 hover:bg-yellow-700' }
        );
        break;
        
      case ReportStatus.ASSIGNED_TO_OFFICER:
        actions.push(
          { id: 'acknowledge', label: 'Acknowledge', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
          { id: 'reassign', label: 'Reassign Officer', icon: User, color: 'bg-indigo-600 hover:bg-indigo-700' },
          { id: 'hold', label: 'Put On Hold', icon: Pause, color: 'bg-yellow-600 hover:bg-yellow-700' }
        );
        break;
        
      case ReportStatus.ACKNOWLEDGED:
        actions.push(
          { id: 'start-work', label: 'Start Work', icon: Play, color: 'bg-blue-600 hover:bg-blue-700' },
          { id: 'hold', label: 'Put On Hold', icon: Pause, color: 'bg-yellow-600 hover:bg-yellow-700' }
        );
        break;
        
      case ReportStatus.IN_PROGRESS:
        actions.push(
          { id: 'complete', label: 'Mark Complete', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
          { id: 'hold', label: 'Put On Hold', icon: Pause, color: 'bg-yellow-600 hover:bg-yellow-700' }
        );
        break;
        
      case ReportStatus.PENDING_VERIFICATION:
        actions.push(
          { id: 'approve', label: 'Approve Resolution', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
          { id: 'reject', label: 'Request Rework', icon: X, color: 'bg-red-600 hover:bg-red-700' }
        );
        break;
        
      case ReportStatus.ON_HOLD:
        actions.push(
          { id: 'resume', label: 'Resume Work', icon: Play, color: 'bg-blue-600 hover:bg-blue-700' },
          { id: 'reassign', label: 'Reassign', icon: ArrowRight, color: 'bg-indigo-600 hover:bg-indigo-700' }
        );
        break;
        
      case ReportStatus.RESOLVED:
        actions.push(
          { id: 'reopen', label: 'Reopen Report', icon: RefreshCw, color: 'bg-orange-600 hover:bg-orange-700' }
        );
        break;
    }
    
    // Always available actions
    actions.push(
      { id: 'escalate', label: 'Escalate Issue', icon: AlertTriangle, color: 'bg-red-600 hover:bg-red-700' },
      { id: 'add-note', label: 'Add Note', icon: MessageSquare, color: 'bg-gray-600 hover:bg-gray-700' }
    );
    
    return actions;
  };

  const handleQuickAction = async (actionId: string) => {
    if (!report.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      switch (actionId) {
        case 'acknowledge':
          await reportsApi.acknowledgeReport(report.id);
          break;
        case 'start-work':
          await reportsApi.startWork(report.id);
          break;
        case 'complete':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.PENDING_VERIFICATION,
            notes: 'Work completed, pending verification'
          });
          break;
        case 'approve':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.RESOLVED,
            notes: 'Resolution approved'
          });
          break;
        case 'hold':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.ON_HOLD,
            notes: 'Report put on hold'
          });
          break;
        case 'resume':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.IN_PROGRESS,
            notes: 'Work resumed'
          });
          break;
        case 'assign-dept':
          setShowAssignmentModal('department');
          setLoading(false);
          return;
        case 'assign-officer':
        case 'reassign':
          setShowAssignmentModal('officer');
          setLoading(false);
          return;
        default:
          // For complex actions, show the status form
          setShowStatusForm(true);
          setLoading(false);
          return;
      }
      
      onUpdate();
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || !report.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await reportsApi.updateStatus(report.id, {
        new_status: selectedStatus,
        notes: statusNotes || undefined
      });
      
      setShowStatusForm(false);
      setSelectedStatus('');
      setStatusNotes('');
      onUpdate();
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Status update failed');
    } finally {
      setLoading(false);
    }
  };

  const availableActions = getAvailableActions();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={report.status} size="sm" />
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Status Change Form */}
          {showStatusForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Change Report Status</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    New Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select new status...</option>
                    {Object.values(ReportStatus).map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add notes about this status change..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleStatusChange}
                    disabled={!selectedStatus || loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loading ? 'Updating...' : 'Update Status'}
                  </button>
                  <button
                    onClick={() => {
                      setShowStatusForm(false);
                      setSelectedStatus('');
                      setStatusNotes('');
                    }}
                    className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-2">
            {availableActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={loading}
                  className={`w-full px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 ${action.color}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                  {loading && <RefreshCw className="w-4 h-4 animate-spin ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Manual Status Change */}
          {!showStatusForm && (
            <button
              onClick={() => setShowStatusForm(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Manual Status Change</span>
            </button>
          )}

          {/* Context Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Current Context</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Status: <Badge status={report.status} size="sm" /></div>
              {report.department && (
                <div>Department: {report.department.name}</div>
              )}
              {report.task?.officer && (
                <div>Officer: {report.task.officer.full_name}</div>
              )}
              <div>Priority: <Badge status={report.severity} size="sm" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modals */}
      {showAssignmentModal && (
        <AssignmentModals
          report={report}
          type={showAssignmentModal}
          onUpdate={onUpdate}
          onClose={() => setShowAssignmentModal(null)}
        />
      )}
    </div>
  );
}