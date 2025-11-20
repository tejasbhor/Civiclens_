import React, { useState } from 'react';
import { Report } from '@/types';
import { StatusHistoryItem } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar,
  ArrowRight,
  Pause,
  Play,
  Flag,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Target,
  Timer
} from 'lucide-react';

interface WorkflowTimelineProps {
  report: Report;
  history?: StatusHistoryItem[];
}

export function WorkflowTimeline({ report, history = [] }: WorkflowTimelineProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <Flag className="w-4 h-4 text-blue-600" />;
      case 'pending_classification':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'classified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'assigned_to_department':
        return <ArrowRight className="w-4 h-4 text-purple-600" />;
      case 'assigned_to_officer':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'acknowledged':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-600" />;
      case 'pending_verification':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'on_hold':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'duplicate':
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      case 'on_hold':
        return 'border-yellow-200 bg-yellow-50';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const calculateDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h`;
    return `${Math.floor(diffMs / (1000 * 60))}m`;
  };

  const toLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Create timeline with current status if not in history
  const timelineItems = [...history];
  const currentStatusInHistory = history.some(item => item.new_status === report.status);
  
  if (!currentStatusInHistory) {
    timelineItems.push({
      old_status: history.length > 0 ? history[history.length - 1].new_status : null,
      new_status: report.status,
      changed_at: report.status_updated_at || report.updated_at || report.created_at,
      changed_by_user: null,
      notes: null
    });
  }

  const visibleItems = showAllSteps ? timelineItems : timelineItems.slice(-5);
  const hiddenCount = timelineItems.length - visibleItems.length;

  const getOverallProgress = () => {
    const statusOrder = [
      'received', 'pending_classification', 'classified', 'assigned_to_department',
      'assigned_to_officer', 'acknowledged', 'in_progress', 'pending_verification', 'resolved'
    ];
    const currentIndex = statusOrder.indexOf(report.status);
    const totalSteps = statusOrder.length;
    return Math.max(0, Math.round((currentIndex + 1) / totalSteps * 100));
  };

  const progress = getOverallProgress();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Workflow Timeline</h3>
            <span className="text-sm text-gray-500">({timelineItems.length} steps)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">{progress}% Complete</div>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
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
        <div className="p-4">
          {/* Current Status Summary */}
          <div className={`rounded-lg border-2 p-4 mb-6 ${getStatusColor(report.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(report.status)}
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Current Status: <Badge status={report.status} size="sm" />
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {report.status_updated_at 
                      ? `Updated ${formatDate(report.status_updated_at)}`
                      : `Created ${formatDate(report.created_at)}`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  Age: {calculateDuration(report.created_at)}
                </div>
                {report.status_updated_at && (
                  <div className="text-xs text-gray-500">
                    In status: {calculateDuration(report.status_updated_at)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {/* Show hidden items toggle */}
            {hiddenCount > 0 && !showAllSteps && (
              <button
                onClick={() => setShowAllSteps(true)}
                className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Show {hiddenCount} earlier step{hiddenCount > 1 ? 's' : ''}
              </button>
            )}

            {visibleItems.map((item, index) => {
              const isLast = index === visibleItems.length - 1;
              const isFirst = index === 0 && showAllSteps;
              const nextItem = visibleItems[index + 1];
              const duration = nextItem ? calculateDuration(item.changed_at, nextItem.changed_at) : null;

              return (
                <div key={`${item.changed_at}-${index}`} className="relative">
                  {/* Timeline Line */}
                  {!isLast && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                  )}

                  {/* Timeline Item */}
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {getStatusIcon(item.new_status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {toLabel(item.new_status)}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {formatDate(item.changed_at)}
                            </span>
                            {duration && (
                              <span className="text-xs text-gray-500">
                                • Duration: {duration}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge status={item.new_status} size="sm" />
                      </div>

                      {/* User Attribution */}
                      {item.changed_by_user && (
                        <div className="flex items-center gap-2 mt-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            by {item.changed_by_user.full_name || item.changed_by_user.email}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{item.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Collapse toggle */}
            {showAllSteps && hiddenCount > 0 && (
              <button
                onClick={() => setShowAllSteps(false)}
                className="w-full text-center py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Show less
              </button>
            )}
          </div>

          {/* Timeline Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {timelineItems.length}
                </div>
                <div className="text-sm text-gray-500">Total Steps</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {calculateDuration(report.created_at)}
                </div>
                <div className="text-sm text-gray-500">Total Time</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {progress}%
                </div>
                <div className="text-sm text-gray-500">Progress</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}