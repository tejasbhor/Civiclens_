import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types/report';
import { User } from '@/types/user';
import { Task } from '@/types/task';
import { formatDistanceToNow } from 'date-fns';
import { getMediaUrl } from '@/lib/utils/media';
import { StatusHistoryResponse } from '@/lib/api/reports';
import { Badge } from '@/components/ui/Badge';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { 
  FileText, 
  Tag, 
  Users, 
  CheckCircle, 
  Activity,
  MessageSquare,
  Camera,
  Clock,
  User as UserIcon,
  Building2,
  AlertTriangle,
  Flag,
  Eye,
  Shield,
  Star,
  Volume2,
  ExternalLink
} from 'lucide-react';

interface TabsSectionProps {
  report: Report;
  history?: StatusHistoryResponse | null;
  onUpdate: () => void;
}

type TabKey = 'details' | 'classification' | 'assignment' | 'task' | 'resolution' | 'audit' | 'appeals' | 'escalations' | 'media';

export function TabsSection({ report, history, onUpdate }: TabsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const tabs = [
    { key: 'details' as TabKey, label: 'Additional Details', icon: FileText, count: null },
    { key: 'classification' as TabKey, label: 'Classification', icon: Tag, count: null },
    { key: 'assignment' as TabKey, label: 'Assignment', icon: Users, count: report.department ? 1 : 0 },
    { key: 'task' as TabKey, label: 'Task Progress', icon: CheckCircle, count: report.task ? 1 : 0 },
    { key: 'resolution' as TabKey, label: 'Resolution', icon: CheckCircle, count: null },
    { key: 'audit' as TabKey, label: 'Activity Log', icon: Activity, count: history?.history?.length || 0 },
    { key: 'appeals' as TabKey, label: 'Appeals', icon: MessageSquare, count: (report as any).appeals?.length || 0 },
    { key: 'escalations' as TabKey, label: 'Escalations', icon: Flag, count: (report as any).escalations?.length || 0 },
    { key: 'media' as TabKey, label: 'Attachments', icon: Camera, count: report.media?.length || 0 },
  ];

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Report Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">{report.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Number</label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg font-mono">
                    {report.report_number || `CL-${report.id}`}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg leading-relaxed">
                  {report.description}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Status & Priority</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <Badge status={report.status} size="md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <Badge status={report.severity} size="md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <div className="flex items-center gap-2">
                    {report.is_public ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">Public</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Private</span>
                      </div>
                    )}
                    {report.is_featured && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="w-4 h-4" />
                        <span className="text-sm">Featured</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'classification':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Classification Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">
                    {toLabel(report.category)}
                  </p>
                </div>
                {report.sub_category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                    <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">
                      {toLabel(report.sub_category)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Classification */}
            {report.ai_category && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">AI Classification</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">AI Category</label>
                      <p className="text-sm text-blue-900">{toLabel(report.ai_category)}</p>
                    </div>
                    {report.ai_confidence && (
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Confidence</label>
                        <p className="text-sm text-blue-900">
                          {Math.round(report.ai_confidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                  {report.ai_model_version && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <span className="text-xs text-blue-700">
                        Model: {report.ai_model_version} • 
                        Processed: {report.ai_processed_at ? formatDate(report.ai_processed_at) : 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual Classification */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Manual Review</h4>
              {report.classification_notes ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Flag className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-900 mb-1">Processing Notes</h5>
                      <p className="text-sm text-yellow-800">{report.classification_notes}</p>
                      {report.classified_by && (
                        <div className="mt-2 pt-2 border-t border-yellow-200">
                          <span className="text-xs text-yellow-700">
                            Reviewed by: {report.classified_by.full_name || report.classified_by.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Flag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No manual classification notes</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Department Assignment</h4>
              {report.department ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-blue-900 mb-1">{report.department.name}</h5>
                      <p className="text-sm text-blue-800 mb-2">{report.department.description}</p>
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">Department ID:</span> {report.department.id}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No department assigned</p>
                  <p className="text-sm text-gray-400 mt-1">Report is pending department assignment</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Officer Assignment</h4>
              {report.task?.officer ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <UserIcon className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-green-900 mb-2">{report.task.officer.full_name}</h5>
                      <div className="space-y-2 text-sm text-green-800">
                        {report.task.officer.employee_id && (
                          <div>
                            <span className="font-medium">Employee ID:</span> {report.task.officer.employee_id}
                          </div>
                        )}
                        {report.task.officer.email && (
                          <div>
                            <span className="font-medium">Email:</span> {report.task.officer.email}
                          </div>
                        )}
                        {report.task.officer.phone && (
                          <div>
                            <span className="font-medium">Phone:</span> {report.task.officer.phone}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Role:</span> {toLabel(report.task.officer.role)}
                        </div>
                        <div className="pt-2 border-t border-green-200">
                          <span className="font-medium">Task ID:</span> {report.task.id}
                        </div>
                        {report.task.priority && (
                          <div>
                            <span className="font-medium">Priority:</span> {report.task.priority}
                          </div>
                        )}
                        {report.task.assigned_at && (
                          <div>
                            <span className="font-medium">Assigned:</span> {formatDate(report.task.assigned_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : report.task ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <UserIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-yellow-900 mb-1">Task Created</h5>
                      <p className="text-sm text-yellow-800 mb-2">Task exists but officer information not loaded</p>
                      <div className="text-sm text-yellow-700">
                        <span className="font-medium">Task ID:</span> {report.task.id}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <UserIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No officer assigned</p>
                  <p className="text-sm text-gray-400 mt-1">Waiting for officer assignment</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'resolution':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Resolution Status</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className={`w-5 h-5 ${report.status === 'resolved' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900">
                    {report.status === 'resolved' ? 'Resolved' : 'In Progress'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Current status: <span className="font-medium">{toLabel(report.status)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Work Progress</h4>
              {report.task ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Task Details</h5>
                  <div className="text-sm text-blue-800">
                    <p>Task ID: {report.task.id}</p>
                    <p className="mt-1">Task assigned for this report</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No work progress available</p>
                  <p className="text-sm text-gray-400 mt-1">Task not yet assigned</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'audit':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-900">Activity Log</h4>
            {history?.history && history.history.length > 0 ? (
              <div className="space-y-3">
                {history.history.map((entry, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">
                            Status changed to {toLabel(entry.new_status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(entry.changed_at)}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-700 mb-2">{entry.notes}</p>
                        )}
                        <p className="text-xs text-gray-500">System update</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No activity history available</p>
              </div>
            )}
          </div>
        );

      case 'task':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-900">Task Progress</h4>
            {report.task ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Task ID</div>
                      <div className="font-medium text-blue-900">#{report.task.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Status</div>
                      <Badge status={report.task.status} size="sm" />
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Priority</div>
                      <div className="font-medium text-blue-900">{report.task.priority || 5}/10</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Assigned</div>
                      <div className="font-medium text-blue-900">
                        {report.task.assigned_at ? formatDate(report.task.assigned_at) : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {report.task.notes && (
                    <div className="pt-3 border-t border-blue-200">
                      <div className="text-xs text-blue-700 mb-1">Notes</div>
                      <div className="text-sm text-blue-900">{report.task.notes}</div>
                    </div>
                  )}
                </div>
                
                {/* Task Timeline */}
                <div className="space-y-3">
                  {report.task.assigned_at && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <UserIcon className="w-5 h-5 text-gray-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Task Assigned</div>
                        <div className="text-sm text-gray-600">{formatDate(report.task.assigned_at)}</div>
                      </div>
                    </div>
                  )}
                  {report.task.acknowledged_at && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Task Acknowledged</div>
                        <div className="text-sm text-gray-600">{formatDate(report.task.acknowledged_at)}</div>
                      </div>
                    </div>
                  )}
                  {report.task.started_at && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Work Started</div>
                        <div className="text-sm text-gray-600">{formatDate(report.task.started_at)}</div>
                      </div>
                    </div>
                  )}
                  {report.task.resolved_at && (report.status === 'resolved' || report.status === 'closed') && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-900">Work Completed & Approved</div>
                        <div className="text-sm text-gray-600">{formatDate(report.task.resolved_at)}</div>
                      </div>
                    </div>
                  )}
                  {report.task.resolved_at && report.status === 'in_progress' && (
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-900">Rework Requested</div>
                        <div className="text-sm text-orange-700">Work was submitted but sent back for improvements</div>
                      </div>
                    </div>
                  )}
                  {report.task.resolved_at && report.status === 'pending_verification' && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-900">Awaiting Verification</div>
                        <div className="text-sm text-blue-700">Work submitted on {formatDate(report.task.resolved_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No task assigned yet</p>
                <p className="text-sm text-gray-400 mt-1">Task will be created when officer is assigned</p>
              </div>
            )}
          </div>
        );

      case 'appeals':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-900">Citizen Appeals</h4>
            {(report as any).appeals && (report as any).appeals.length > 0 ? (
              <div className="space-y-3">
                {(report as any).appeals.map((appeal: any, index: number) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-yellow-900">Appeal #{appeal.id}</span>
                          <Badge status={appeal.status} size="sm" />
                        </div>
                        <div className="text-sm text-yellow-800 mb-2">
                          <span className="font-medium">Type:</span> {toLabel(appeal.appeal_type)}
                        </div>
                        <div className="text-sm text-yellow-800 mb-2">{appeal.reason}</div>
                        {appeal.review_notes && (
                          <div className="mt-3 pt-3 border-t border-yellow-200">
                            <div className="text-xs text-yellow-700 mb-1">Admin Response</div>
                            <div className="text-sm text-yellow-900">{appeal.review_notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No appeals submitted</p>
                <p className="text-sm text-gray-400 mt-1">Citizen has not submitted any appeals</p>
              </div>
            )}
          </div>
        );

      case 'escalations':
        return (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-900">Escalations</h4>
            {(report as any).escalations && (report as any).escalations.length > 0 ? (
              <div className="space-y-3">
                {(report as any).escalations.map((escalation: any, index: number) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Flag className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-red-900">Level {escalation.level} Escalation</span>
                          <Badge status={escalation.status} size="sm" />
                        </div>
                        <div className="text-sm text-red-800 mb-2">
                          <span className="font-medium">Reason:</span> {toLabel(escalation.reason)}
                        </div>
                        <div className="text-sm text-red-800 mb-2">{escalation.description}</div>
                        {escalation.response_notes && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <div className="text-xs text-red-700 mb-1">Response</div>
                            <div className="text-sm text-red-900">{escalation.response_notes}</div>
                          </div>
                        )}
                        {escalation.sla_deadline && (
                          <div className="mt-2 text-xs text-red-700">
                            SLA Deadline: {formatDate(escalation.sla_deadline)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Flag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No escalations</p>
                <p className="text-sm text-gray-400 mt-1">Report has not been escalated</p>
              </div>
            )}
          </div>
        );

      case 'media':
        // Prepare images for ImageViewer
        const imageMedia = report.media?.filter(m => m.file_type?.toString().toLowerCase() === 'image') || [];
        const viewerImages = imageMedia.map(m => ({
          url: getMediaUrl(m.file_url),
          caption: m.caption || undefined,
          alt: `Report image`
        }));

        return (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-900">Attachments & Media</h4>
            {report.media && report.media.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {report.media.map((media, index) => {
                    const isImage = media.file_type?.toString().toLowerCase() === 'image';
                    const isAudio = media.file_type?.toString().toLowerCase() === 'audio';
                    const fileUrl = getMediaUrl(media.file_url);
                    
                    return (
                      <div key={media.id || index} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Media Preview */}
                        {isImage ? (
                          <div className="relative aspect-video bg-gray-100">
                            <img
                              src={fileUrl}
                              alt={media.caption || `Image ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                const imageIndex = imageMedia.findIndex(m => m.id === media.id);
                                setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0);
                                setImageViewerOpen(true);
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Click to zoom
                            </div>
                          </div>
                        ) : isAudio ? (
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                          <div className="flex items-center justify-center py-6">
                            <Volume2 className="w-12 h-12 text-blue-600" />
                          </div>
                          <audio
                            controls
                            className="w-full mt-2"
                            preload="metadata"
                          >
                            <source src={fileUrl} type={media.mime_type || 'audio/mpeg'} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 flex items-center justify-center h-32">
                          <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Media Info */}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isImage ? (
                              <Camera className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            ) : isAudio ? (
                              <Volume2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {isImage ? 'Image' : isAudio ? 'Audio Note' : 'File'} {index + 1}
                            </span>
                          </div>
                          {media.is_primary && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex-shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        
                        {media.caption && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {media.caption}
                          </p>
                        )}
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          {media.file_size && (
                            <p>Size: {(media.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                          )}
                          {media.created_at && (
                            <p>Uploaded: {formatDate(media.created_at)}</p>
                          )}
                        </div>
                        
                        {!isAudio && (
                          <button
                            onClick={() => window.open(fileUrl, '_blank')}
                            className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Full Size
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                {/* ImageViewer Modal */}
                {imageViewerOpen && viewerImages.length > 0 && (
                  <ImageViewer
                    images={viewerImages}
                    initialIndex={selectedImageIndex}
                    onClose={() => setImageViewerOpen(false)}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No media attachments</p>
                <p className="text-sm text-gray-400 mt-1">No photos or audio files attached to this report</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Tab Headers */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}