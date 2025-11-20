import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { 
  Play, 
  CheckCircle, 
  X, 
  User, 
  Building2,
  AlertTriangle,
  Flag,
  Clock,
  Settings,
  Save,
  Phone, 
  Mail, 
  MapPin,
  Share2,
  Star,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowRight,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

interface ActionCenterProps {
  report: Report;
  onUpdate: () => void;
}

export function ActionCenter({ report, onUpdate }: ActionCenterProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [bookmarked, setBookmarked] = useState(false);

  // Primary Actions based on status
  const getPrimaryActions = () => {
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
          { id: 'complete-classification', label: 'Complete Classification', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' }
        );
        break;
        
      case ReportStatus.CLASSIFIED:
        actions.push(
          { id: 'assign-officer', label: 'Assign Officer', icon: User, color: 'bg-indigo-600 hover:bg-indigo-700' },
          { id: 'start-work', label: 'Start Work', icon: Play, color: 'bg-green-600 hover:bg-green-700' }
        );
        break;
        
      case ReportStatus.IN_PROGRESS:
        actions.push(
          { id: 'complete', label: 'Mark Complete', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
          { id: 'hold', label: 'Put on Hold', icon: Clock, color: 'bg-yellow-600 hover:bg-yellow-700' }
        );
        break;
        
      case ReportStatus.ON_HOLD:
        actions.push(
          { id: 'resume', label: 'Resume Work', icon: Play, color: 'bg-blue-600 hover:bg-blue-700' },
          { id: 'reject', label: 'Reject Report', icon: X, color: 'bg-red-600 hover:bg-red-700' }
        );
        break;
    }
    
    return actions;
  };

  // Quick Actions
  const getQuickActions = () => [
    {
      id: 'contact',
      label: 'Contact Citizen',
      icon: report.user?.phone ? Phone : Mail,
      action: () => {
        if (report.user?.phone) {
          window.open(`tel:${report.user.phone}`, '_self');
        } else if (report.user?.email) {
          window.open(`mailto:${report.user.email}`, '_self');
        }
      },
      disabled: !report.user?.phone && !report.user?.email
    },
    {
      id: 'map',
      label: 'View on Map',
      icon: MapPin,
      action: () => {
        const url = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
        window.open(url, '_blank');
      }
    },
    {
      id: 'share',
      label: 'Share Report',
      icon: Share2,
      action: async () => {
        try {
          const url = `${window.location.origin}/dashboard/reports/manage/${report.id}`;
          await navigator.clipboard.writeText(url);
          
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = 'Report link copied to clipboard';
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 2000);
        } catch (error) {
          console.error('Failed to copy link:', error);
        }
      }
    },
    {
      id: 'bookmark',
      label: bookmarked ? 'Remove Bookmark' : 'Bookmark Report',
      icon: Star,
      action: () => setBookmarked(!bookmarked),
      active: bookmarked
    }
  ];

  const handlePrimaryAction = async (actionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      switch (actionId) {
        case 'classify':
          // Navigate to classification
          break;
        case 'assign-dept':
          // Open department assignment
          break;
        case 'start-work':
          await reportsApi.updateReport(report.id, { status: ReportStatus.IN_PROGRESS });
          break;
        case 'complete':
          await reportsApi.updateReport(report.id, { status: ReportStatus.RESOLVED });
          break;
        case 'hold':
          setShowStatusForm(true);
          setSelectedStatus(ReportStatus.ON_HOLD);
          return;
        case 'resume':
          await reportsApi.updateReport(report.id, { status: ReportStatus.IN_PROGRESS });
          break;
        case 'reject':
          setShowStatusForm(true);
          setSelectedStatus(ReportStatus.REJECTED);
          return;
      }
      
      onUpdate();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async () => {
    if (!selectedStatus) return;
    
    setLoading(true);
    try {
      await reportsApi.updateReport(report.id, { status: selectedStatus });
      setShowStatusForm(false);
      setSelectedStatus('');
      setStatusNotes('');
      onUpdate();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Status update failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'on_hold': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const primaryActions = getPrimaryActions();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      {/* Primary Actions */}
      {primaryActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
            </div>
          </div>
          
          <div className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {primaryActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handlePrimaryAction(action.id)}
                  disabled={loading}
                  className={`flex items-center gap-3 p-4 text-white rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Change Form */}
      {showStatusForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <Badge status={selectedStatus} size="md" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Required)
              </label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Explain the reason for this status change..."
                required
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleStatusSubmit}
                disabled={loading || !statusNotes.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Update Status
              </button>
              <button
                onClick={() => {
                  setShowStatusForm(false);
                  setSelectedStatus('');
                  setStatusNotes('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions & Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled}
                className={`flex items-center gap-2 p-3 text-left border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.active 
                    ? 'border-blue-200 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <action.icon className={`w-4 h-4 ${action.active ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
          
          {/* Report Stats */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.floor((new Date().getTime() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-gray-500">Days Old</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {report.media?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Attachments</div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Priority:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
                  {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                </span>
              </div>
              
              {report.department && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="text-gray-900 font-medium">
                    {report.department.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">System Information</span>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>Report ID: {report.id}</div>
          <div>Created: {new Date(report.created_at).toLocaleString()}</div>
          {report.updated_at && (
            <div>Updated: {new Date(report.updated_at).toLocaleString()}</div>
          )}
          <div>Public: {report.is_public ? 'Yes' : 'No'}</div>
          {report.is_sensitive && <div>⚠️ Sensitive Content</div>}
          {report.is_featured && <div>⭐ Featured Report</div>}
        </div>
      </div>
    </div>
  );
}