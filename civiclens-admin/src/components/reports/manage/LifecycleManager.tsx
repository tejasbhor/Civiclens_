import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { reportsApi, ClassifyReportRequest, AssignDepartmentRequest, AssignOfficerRequest, StatusUpdateRequest } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { AssignOfficerModal } from '../AssignOfficerModal';
import { AssignDepartmentModal } from '../AssignDepartmentModal';
import { AppealsModal } from '../AppealsModal';
import { EscalationModal } from '../EscalationModal';
import { WorkProgressModal } from '../WorkProgressModal';
import { ApproveResolutionModal } from '../ApproveResolutionModal';
import { RejectResolutionModal } from '../RejectResolutionModal';
import { VerifyWorkModal } from '../VerifyWorkModal';
import { ReviewRejectionModal } from '../ReviewRejectionModal';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  X,
  Flag,
  Building2,
  User,
  FileCheck,
  Send,
  ArrowRight,
  Loader2,
  Info,
  TrendingUp
} from 'lucide-react';

interface LifecycleManagerProps {
  report: Report;
  onUpdate: () => void;
}

export function LifecycleManager({ report, onUpdate }: LifecycleManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [showAssignDepartmentModal, setShowAssignDepartmentModal] = useState(false);
  const [showAppealsModal, setShowAppealsModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [showWorkProgressModal, setShowWorkProgressModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showVerifyWorkModal, setShowVerifyWorkModal] = useState(false);
  const [showReviewRejectionModal, setShowReviewRejectionModal] = useState(false);

  // Form states
  const [category, setCategory] = useState(report.category || '');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>(report.severity as any || 'medium');
  const [notes, setNotes] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [officerId, setOfficerId] = useState<number | ''>('');
  const [priority, setPriority] = useState<number>(5);

  // Get current workflow stage and available actions
  const getWorkflowStage = () => {
    const status = report.status;
    
    const stages = [
      {
        id: 'submission',
        label: 'Submission',
        status: [ReportStatus.RECEIVED],
        description: 'Report submitted by citizen',
        completed: ![ReportStatus.RECEIVED].includes(status),
        current: status === ReportStatus.RECEIVED,
        icon: Send,
        color: 'blue'
      },
      {
        id: 'classification',
        label: 'Classification',
        status: [ReportStatus.PENDING_CLASSIFICATION, ReportStatus.CLASSIFIED],
        description: 'Categorize and assess severity',
        completed: ![ReportStatus.RECEIVED, ReportStatus.PENDING_CLASSIFICATION, ReportStatus.CLASSIFIED].includes(status),
        current: [ReportStatus.PENDING_CLASSIFICATION, ReportStatus.CLASSIFIED].includes(status),
        icon: Flag,
        color: 'purple'
      },
      {
        id: 'assignment',
        label: 'Assignment',
        status: [ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER],
        description: 'Assign to department and officer',
        completed: ![ReportStatus.RECEIVED, ReportStatus.PENDING_CLASSIFICATION, ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER].includes(status),
        current: [ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER].includes(status),
        icon: User,
        color: 'indigo'
      },
      {
        id: 'work',
        label: 'Work Progress',
        status: [ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS],
        description: 'Officer working on resolution',
        completed: ![ReportStatus.RECEIVED, ReportStatus.PENDING_CLASSIFICATION, ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS].includes(status),
        current: [ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS].includes(status),
        icon: Play,
        color: 'green'
      },
      {
        id: 'verification',
        label: 'Verification',
        status: [ReportStatus.PENDING_VERIFICATION],
        description: 'Admin reviewing completion',
        completed: ![ReportStatus.RECEIVED, ReportStatus.PENDING_CLASSIFICATION, ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS, ReportStatus.PENDING_VERIFICATION].includes(status),
        current: status === ReportStatus.PENDING_VERIFICATION,
        icon: FileCheck,
        color: 'yellow'
      },
      {
        id: 'resolution',
        label: 'Resolution',
        status: [ReportStatus.RESOLVED, ReportStatus.CLOSED],
        description: 'Report resolved and closed',
        completed: [ReportStatus.RESOLVED, ReportStatus.CLOSED].includes(status),
        current: [ReportStatus.RESOLVED, ReportStatus.CLOSED].includes(status),
        icon: CheckCircle,
        color: 'green'
      }
    ];

    return stages;
  };

  // Get available actions based on current status
  const getAvailableActions = () => {
    const actions = [];
    
    switch (report.status) {
      case ReportStatus.RECEIVED:
        actions.push(
          { id: 'classify', label: 'Classify Report', description: 'Set category and severity', icon: Flag, color: 'bg-blue-600 hover:bg-blue-700' },
          { id: 'assign-dept', label: 'Assign Department', description: 'Route to appropriate department', icon: Building2, color: 'bg-purple-600 hover:bg-purple-700' }
        );
        break;
        
      case ReportStatus.PENDING_CLASSIFICATION:
        actions.push(
          { id: 'classify', label: 'Complete Classification', description: 'Finalize category and severity', icon: Flag, color: 'bg-green-600 hover:bg-green-700' }
        );
        break;
        
      case ReportStatus.CLASSIFIED:
        if (!report.department_id) {
          actions.push(
            { id: 'assign-dept', label: 'Assign Department', description: 'Route to appropriate department', icon: Building2, color: 'bg-purple-600 hover:bg-purple-700' }
          );
        } else {
          actions.push(
            { id: 'assign-officer', label: 'Assign Officer', description: 'Assign to field officer', icon: User, color: 'bg-indigo-600 hover:bg-indigo-700' }
          );
        }
        break;
        
      case ReportStatus.ASSIGNED_TO_DEPARTMENT:
        actions.push(
          { id: 'assign-officer', label: 'Assign Officer', description: 'Assign to field officer', icon: User, color: 'bg-indigo-600 hover:bg-indigo-700' }
        );
        break;
        
      case ReportStatus.ASSIGNED_TO_OFFICER:
        // Admin can view status, officer handles acknowledgment
        actions.push(
          { id: 'view-assignment', label: 'View Assignment', description: 'Officer will acknowledge the task', icon: Info, color: 'bg-blue-600 hover:bg-blue-700', secondary: true }
        );
        break;
        
      case ReportStatus.ASSIGNMENT_REJECTED:
        actions.push(
          { id: 'review-rejection', label: 'Review Rejection', description: 'Review officer\'s rejection and take action', icon: AlertTriangle, color: 'bg-orange-600 hover:bg-orange-700' }
        );
        break;
        
      case ReportStatus.ACKNOWLEDGED:
        // Admin can view status, officer handles starting work
        actions.push(
          { id: 'view-progress', label: 'View Progress', description: 'Officer will start work', icon: Info, color: 'bg-blue-600 hover:bg-blue-700', secondary: true }
        );
        break;
        
      case ReportStatus.IN_PROGRESS:
        // Admin can view progress, officer handles submission
        actions.push(
          { id: 'view-progress', label: 'View Progress', description: 'Officer is working on resolution', icon: Info, color: 'bg-blue-600 hover:bg-blue-700', secondary: true }
        );
        break;
        
      case ReportStatus.PENDING_VERIFICATION:
        // Admin reviews the work first, then approves/rejects
        actions.push(
          { id: 'verify-work', label: 'Review Work', description: 'Review officer\'s work and approve or request rework', icon: FileCheck, color: 'bg-blue-600 hover:bg-blue-700' }
        );
        break;
        
      case ReportStatus.RESOLVED:
        actions.push(
          { id: 'close', label: 'Close Report', description: 'Final closure after citizen feedback', icon: CheckCircle, color: 'bg-gray-600 hover:bg-gray-700' }
        );
        break;
        
      case ReportStatus.REOPENED:
        actions.push(
          { id: 'start-work', label: 'Resume Rework', description: 'Continue working after appeal', icon: Play, color: 'bg-orange-600 hover:bg-orange-700' }
        );
        break;
        
      case ReportStatus.ON_HOLD:
        actions.push(
          { id: 'resume', label: 'Resume Work', description: 'Continue working on report', icon: Play, color: 'bg-blue-600 hover:bg-blue-700' }
        );
        break;
    }
    
    // Administrative override actions - always available for admins
    // These allow admins to reassign or change assignments at any stage
    const canReassignDepartment = ![ReportStatus.RESOLVED, ReportStatus.CLOSED, ReportStatus.REJECTED, ReportStatus.DUPLICATE].includes(report.status);
    const canReassignOfficer = report.department_id && ![ReportStatus.RESOLVED, ReportStatus.CLOSED, ReportStatus.REJECTED, ReportStatus.DUPLICATE, ReportStatus.RECEIVED, ReportStatus.PENDING_CLASSIFICATION].includes(report.status);
    
    if (canReassignDepartment) {
      actions.push(
        { id: 'assign-dept', label: report.department_id ? 'Reassign Department' : 'Assign Department', description: 'Change department assignment', icon: Building2, color: 'bg-purple-600 hover:bg-purple-700', secondary: true }
      );
    }
    
    if (canReassignOfficer) {
      actions.push(
        { id: 'assign-officer', label: 'Assign/Reassign Officer', description: 'Change officer assignment', icon: User, color: 'bg-indigo-600 hover:bg-indigo-700', secondary: true }
      );
    }
    
    // Always available actions
    actions.push(
      { id: 'work-progress', label: 'Update Progress', description: 'Update work progress and status', icon: Play, color: 'bg-blue-600 hover:bg-blue-700', secondary: true },
      { id: 'appeals', label: 'Manage Appeals', description: 'View and manage appeals', icon: Flag, color: 'bg-orange-600 hover:bg-orange-700', secondary: true },
      { id: 'escalation', label: 'Create Escalation', description: 'Escalate to higher authority', icon: TrendingUp, color: 'bg-red-600 hover:bg-red-700', secondary: true },
      { id: 'reject', label: 'Reject Report', description: 'Mark as invalid/spam', icon: X, color: 'bg-red-600 hover:bg-red-700', secondary: true }
    );
    
    return actions;
  };

  const handleAction = async (actionId: string) => {
    setCurrentAction(actionId);
    
    // Special handling for modals
    if (actionId === 'assign-officer') {
      setShowAssignOfficerModal(true);
      return;
    }
    
    if (actionId === 'assign-dept') {
      setShowAssignDepartmentModal(true);
      return;
    }
    
    if (actionId === 'work-progress') {
      setShowWorkProgressModal(true);
      return;
    }
    
    if (actionId === 'appeals') {
      setShowAppealsModal(true);
      return;
    }
    
    if (actionId === 'escalation') {
      setShowEscalationModal(true);
      return;
    }
    
    if (actionId === 'approve') {
      setShowApproveModal(true);
      return;
    }
    
    if (actionId === 'reject-work') {
      setShowRejectModal(true);
      return;
    }
    
    if (actionId === 'verify-work') {
      setShowVerifyWorkModal(true);
      return;
    }
    
    if (actionId === 'review-rejection') {
      setShowReviewRejectionModal(true);
      return;
    }
    
    if (actionId === 'view-assignment' || actionId === 'view-progress') {
      // These are informational actions, no modal needed
      return;
    }
    
    // Actions that need forms
    if (['classify', 'hold', 'reject'].includes(actionId)) {
      setShowActionForm(true);
      return;
    }
    
    // Direct actions
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
        case 'submit-completion':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.PENDING_VERIFICATION,
            notes: 'Work completed, awaiting verification'
          });
          break;
        case 'close':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.CLOSED,
            notes: 'Report closed'
          });
          break;
        case 'resume':
          await reportsApi.updateStatus(report.id, { 
            new_status: ReportStatus.IN_PROGRESS,
            notes: 'Work resumed'
          });
          break;
      }
      
      onUpdate();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      switch (currentAction) {
        case 'classify':
          await reportsApi.classifyReport(report.id, {
            category,
            severity,
            notes
          });
          break;
          
        case 'assign-officer':
          if (officerId) {
            await reportsApi.assignOfficer(report.id, {
              officer_user_id: Number(officerId),
              priority,
              notes
            });
          }
          break;
          
        case 'hold':
          await reportsApi.updateStatus(report.id, {
            new_status: ReportStatus.ON_HOLD,
            notes
          });
          break;
          
        case 'reject':
          await reportsApi.updateStatus(report.id, {
            new_status: ReportStatus.REJECTED,
            notes
          });
          break;
      }
      
      setShowActionForm(false);
      setCurrentAction(null);
      setNotes('');
      onUpdate();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const stages = getWorkflowStage();
  const actions = getAvailableActions();
  const primaryActions = actions.filter(a => !a.secondary);
  const secondaryActions = actions.filter(a => a.secondary);

  return (
    <div className="space-y-4">
      {/* Workflow Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-6">Report Lifecycle</h3>
        
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
              style={{ 
                width: `${(stages.filter(s => s.completed).length / stages.length) * 100}%` 
              }}
            />
          </div>
          
          {/* Stages */}
          <div className="relative grid grid-cols-6 gap-1">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  <div 
                    className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-all shadow-sm ${
                      stage.completed 
                        ? 'bg-green-500 text-white' 
                        : stage.current 
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100' 
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-center px-1">
                    <div className={`text-xs font-medium leading-tight ${
                      stage.current ? 'text-blue-600' : stage.completed ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {stage.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Current Stage Description */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Current Stage</h4>
              <p className="text-sm text-blue-700 mb-2">
                {stages.find(s => s.current)?.description || 'Processing...'}
              </p>
              <Badge size="sm">{report.status.replace(/_/g, ' ').toUpperCase()}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Available Actions */}
      {!showActionForm && (primaryActions.length > 0 || secondaryActions.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Available Actions</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}
          
          {primaryActions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {primaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    disabled={loading}
                    className={`flex items-start gap-3 p-4 text-white rounded-lg transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold">{action.label}</div>
                      <div className="text-xs opacity-90 mt-0.5">{action.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
          
          {secondaryActions.length > 0 && (
            <div className={primaryActions.length > 0 ? "mt-4 pt-4 border-t border-gray-200" : ""}>
              {primaryActions.length > 0 && (
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Other Actions</h4>
              )}
              <div className="flex flex-wrap gap-2">
                {secondaryActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Form */}
      {showActionForm && currentAction && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {actions.find(a => a.id === currentAction)?.label}
          </h3>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {currentAction === 'classify' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="roads">Roads</option>
                    <option value="water">Water</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="electricity">Electricity</option>
                    <option value="streetlight">Street Light</option>
                    <option value="drainage">Drainage</option>
                    <option value="public_property">Public Property</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </>
            )}
            
            {currentAction === 'assign-officer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Officer *
                  </label>
                  <input
                    type="number"
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter officer user ID"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {['hold', 'reject', 'reject-work'].includes(currentAction) && '*'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add notes or comments..."
                required={['hold', 'reject', 'reject-work'].includes(currentAction)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowActionForm(false);
                  setCurrentAction(null);
                  setNotes('');
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Officer Modal */}
      <AssignOfficerModal
        isOpen={showAssignOfficerModal}
        onClose={() => setShowAssignOfficerModal(false)}
        report={report}
        onSuccess={(updatedReport) => {
          setShowAssignOfficerModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Assign Department Modal */}
      <AssignDepartmentModal
        isOpen={showAssignDepartmentModal}
        onClose={() => setShowAssignDepartmentModal(false)}
        report={report}
        onSuccess={(updatedReport) => {
          setShowAssignDepartmentModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Work Progress Modal */}
      <WorkProgressModal
        isOpen={showWorkProgressModal}
        onClose={() => setShowWorkProgressModal(false)}
        report={report}
        onSuccess={() => {
          setShowWorkProgressModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Appeals Modal */}
      <AppealsModal
        isOpen={showAppealsModal}
        onClose={() => setShowAppealsModal(false)}
        report={report}
        onSuccess={() => {
          setShowAppealsModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Escalation Modal */}
      <EscalationModal
        isOpen={showEscalationModal}
        onClose={() => setShowEscalationModal(false)}
        report={report}
        onSuccess={() => {
          setShowEscalationModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Approve Resolution Modal */}
      <ApproveResolutionModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        report={report}
        onSuccess={(updatedReport) => {
          setShowApproveModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Reject Resolution Modal */}
      <RejectResolutionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        report={report}
        onSuccess={(updatedReport) => {
          setShowRejectModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Verify Work Modal */}
      <VerifyWorkModal
        isOpen={showVerifyWorkModal}
        onClose={() => setShowVerifyWorkModal(false)}
        report={report}
        onSuccess={(updatedReport) => {
          setShowVerifyWorkModal(false);
          onUpdate(); // Refresh the report data
        }}
      />

      {/* Review Rejection Modal */}
      <ReviewRejectionModal
        isOpen={showReviewRejectionModal}
        onClose={() => setShowReviewRejectionModal(false)}
        report={report}
        onSuccess={() => {
          setShowReviewRejectionModal(false);
          onUpdate(); // Refresh the report data
        }}
      />
    </div>
  );
}
