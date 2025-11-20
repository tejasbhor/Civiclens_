import React, { useState, useEffect } from 'react';
import { Report, Media } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { mediaApi } from '@/lib/api/media';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getMediaUrl } from '@/lib/utils/media';
import { CheckCircle, X, AlertTriangle, FileCheck, Camera, Loader2, User, Clock, FileText, Eye, MapPin } from 'lucide-react';

interface VerifyWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess?: (updatedReport: Report) => void;
}

export function VerifyWorkModal({
  isOpen,
  onClose,
  report,
  onSuccess,
}: VerifyWorkModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workMedia, setWorkMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load ALL media (citizen photos + officer photos)
  useEffect(() => {
    if (isOpen && report.id) {
      loadWorkMedia();
    }
  }, [isOpen, report.id]);
  
  const loadWorkMedia = async () => {
    try {
      setLoadingMedia(true);
      const media = await mediaApi.getReportMedia(report.id);
      // Load ALL photos - citizen submission + officer before/after
      setWorkMedia(media as any);
    } catch (err) {
      console.error('Failed to load work media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Helper to get source label and color
  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'citizen_submission':
        return { label: 'Citizen Report', color: 'bg-blue-500' };
      case 'officer_before_photo':
        return { label: 'Before Work', color: 'bg-orange-500' };
      case 'officer_after_photo':
        return { label: 'After Work', color: 'bg-green-500' };
      default:
        return { label: 'Photo', color: 'bg-gray-500' };
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!action) {
      setError('Please select an action (Approve or Request Rework)');
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for requesting rework');
      return;
    }

    if (action === 'reject' && rejectionReason.trim().length < 10) {
      setError('Reason must be at least 10 characters long');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    setError('');

    try {
      let updatedReport;
      
      if (action === 'approve') {
        updatedReport = await reportsApi.approveResolution(report.id, notes || undefined);
      } else {
        updatedReport = await reportsApi.rejectResolution(report.id, rejectionReason);
      }

      if (onSuccess) {
        onSuccess(updatedReport);
      }

      onClose();
      
      // Reset form
      setAction(null);
      setNotes('');
      setRejectionReason('');
      setError('');
    } catch (error: any) {
      console.error('Error verifying work:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to verify work. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAction(null);
      setNotes('');
      setRejectionReason('');
      setError('');
      onClose();
    }
  };

  const taskInfo = (report as any).task;

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Review Work Completion</h2>
                <p className="text-sm text-blue-100">Report #{report.report_number}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">

          {/* Report Title */}
          <div>
            <h4 className="text-xl font-bold text-gray-900 leading-tight mb-2">
              {report.title}
            </h4>
            {report.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
            )}
          </div>

          {/* Key Metadata */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <FileText className="w-4 h-4" />
                <span className="font-medium">Category</span>
              </div>
              <span className="text-gray-900 font-semibold capitalize">{report.category || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Severity</span>
              </div>
              <span className="text-gray-900 font-semibold capitalize">{report.severity || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Status</span>
              </div>
              <span className="text-gray-900 font-semibold uppercase">{report.status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Location Information */}
          {report.address && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Location</span>
                </div>
                <span className="text-gray-900 font-medium text-right max-w-[70%]">{report.address}</span>
              </div>
              {(report.latitude && report.longitude) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-600 font-medium block mb-0.5">Latitude</span>
                    <span className="text-gray-900 font-mono font-semibold">{report.latitude.toFixed(6)}°</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600 font-medium block mb-0.5">Longitude</span>
                    <span className="text-gray-900 font-mono font-semibold">{report.longitude.toFixed(6)}°</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assignment Information */}
          {taskInfo && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Assigned Officer</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-900 font-semibold block">{taskInfo.officer?.full_name || 'Not assigned'}</span>
                  {taskInfo.officer?.email && (
                    <span className="text-xs text-gray-500">{taskInfo.officer.email}</span>
                  )}
                </div>
              </div>
              {taskInfo.resolved_at && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Work Completed</span>
                  </div>
                  <span className="text-gray-900 font-semibold">
                    {new Date(taskInfo.resolved_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Work Completion Details */}
          {taskInfo && (taskInfo.completion_notes || taskInfo.resolution_notes) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-blue-900">Work Completion Details</span>
              </div>
              <div className="space-y-3">
                {/* Completion Notes */}
                {taskInfo.completion_notes && (
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-1">Completion Summary</p>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                      {taskInfo.completion_notes}
                    </p>
                  </div>
                )}
                
                {/* Resolution Notes */}
                {taskInfo.resolution_notes && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Resolution Details</p>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                      {taskInfo.resolution_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* AI Classification / Assignment Notes */}
          {((report as any).ai_assigned_reason || report.classification_notes) && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-bold text-purple-900">Assignment Information</span>
              </div>
              <div className="space-y-2">
                {(report as any).ai_assigned_reason && (
                  <p className="text-sm text-purple-900 leading-relaxed">
                    {(report as any).ai_assigned_reason}
                  </p>
                )}
                {report.classification_notes && (
                  <p className="text-sm text-purple-800 leading-relaxed">
                    {report.classification_notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Task Status History / Notes - Timeline View */}
          {taskInfo && taskInfo.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-bold text-amber-900">Task History</span>
              </div>
              
              {/* Timeline */}
              <div className="space-y-3">
                {taskInfo.notes.split('\n').filter((line: string) => line.trim()).map((event: string, index: number, array: string[]) => {
                  // Parse event format: [STATUS] message or plain message
                  const statusMatch = event.match(/^\[(.*?)\]\s*(.*)$/);
                  const hasStatus = !!statusMatch;
                  const status = hasStatus ? statusMatch[1] : null;
                  const message = hasStatus ? statusMatch[2] : event;
                  
                  // Determine status color
                  const getStatusColor = (status: string | null) => {
                    if (!status) return 'bg-gray-400';
                    const s = status.toUpperCase();
                    if (s.includes('HOLD')) return 'bg-yellow-500';
                    if (s.includes('RESUMED') || s.includes('PROGRESS')) return 'bg-green-500';
                    if (s.includes('ASSIGNED')) return 'bg-blue-500';
                    if (s.includes('COMPLETED') || s.includes('RESOLVED')) return 'bg-green-600';
                    return 'bg-amber-500';
                  };
                  
                  const isLast = index === array.length - 1;
                  
                  return (
                    <div key={index} className="flex gap-3 relative">
                      {/* Timeline line and dot */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)} ring-4 ring-amber-100 z-10`} />
                        {!isLast && (
                          <div className="w-0.5 h-full bg-amber-300 mt-1" />
                        )}
                      </div>
                      
                      {/* Event content */}
                      <div className="flex-1 pb-4">
                        {hasStatus && (
                          <div className="inline-block px-2 py-0.5 bg-amber-200 text-amber-900 text-xs font-semibold rounded mb-1">
                            {status}
                          </div>
                        )}
                        <p className="text-sm text-amber-900 leading-relaxed">
                          {message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        }
          
          {/* All Photos Gallery - Citizen + Officer */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Camera className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Attachments & Media</h3>
            </div>
            
            {loadingMedia ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Loading photos...</p>
                </div>
              </div>
            ) : workMedia.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workMedia.map((media, index) => {
                  const fileUrl = getMediaUrl(media.file_url);
                  const sourceInfo = getSourceLabel(media.upload_source);
                  const isCitizenPhoto = media.upload_source === 'citizen_submission';
                  const isBeforePhoto = media.upload_source === 'officer_before_photo';
                  const isAfterPhoto = media.upload_source === 'officer_after_photo';
                  
                  return (
                    <div key={media.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Image Preview */}
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={fileUrl}
                          alt={sourceInfo.label}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedImageIndex(index);
                            setShowImageViewer(true);
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        
                        {/* Click to zoom badge */}
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Click to zoom
                        </div>
                        
                        {/* Source badge - Top Left */}
                        <div className={`absolute top-2 left-2 px-2 py-1 ${sourceInfo.color} text-white text-xs rounded font-semibold shadow-lg`}>
                          {sourceInfo.label}
                        </div>
                        
                        {/* Proof of work badge - Bottom Right */}
                        {media.is_proof_of_work && (
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full font-semibold shadow-lg flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </div>
                        )}
                      </div>
                      
                      {/* Image Info */}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Camera className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {sourceInfo.label}
                            </span>
                          </div>
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
                            <p>Uploaded: {new Date(media.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-600">No work photos uploaded</p>
                <p className="text-sm text-gray-400 mt-1">Officer did not submit before/after photos</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-200"></div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Action Selection - Styled like Available Actions */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-blue-900">Review Decision</span>
              </div>
              <p className="text-xs text-blue-800 mb-4">Select your action to complete the review</p>
              
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all text-sm shadow-sm hover:shadow ${
                    action === 'approve'
                      ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Approve Resolution</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all text-sm shadow-sm hover:shadow ${
                    action === 'reject'
                      ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-500 hover:bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <X className="w-5 h-5" />
                    <span>Request Rework</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Approval Notes (Optional) */}
            {action === 'approve' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Add any notes about the approval..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {notes.length}/1000 characters
                </p>
              </div>
            )}

            {/* Rejection Reason (Required) */}
            {action === 'reject' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rework * (min 10 characters)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Explain what needs to be improved or corrected..."
                  required
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {rejectionReason.length < 10 && rejectionReason.length > 0 && (
                      <span className="text-orange-600">
                        {10 - rejectionReason.length} more characters needed
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {rejectionReason.length}/1000
                  </p>
                </div>
              </div>
            )}

            {/* Info Message */}
            {action && (
              <div className={`p-4 border rounded-xl ${
                action === 'approve' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    action === 'approve' ? 'text-green-600' : 'text-orange-600'
                  }`} />
                  <div className="text-sm">
                    <p className={`font-semibold mb-1 ${
                      action === 'approve' ? 'text-green-900' : 'text-orange-900'
                    }`}>
                      {action === 'approve' ? 'Approve Resolution' : 'Request Rework'}
                    </p>
                    <p className={action === 'approve' ? 'text-green-800' : 'text-orange-800'}>
                      {action === 'approve' ? (
                        'The report will be marked as RESOLVED. The citizen will be notified and can provide feedback.'
                      ) : (
                        'The report will return to IN_PROGRESS status. The officer will be notified to make improvements.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || !action}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${
                  action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-400'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : action === 'approve' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Approve Resolution
                  </>
                ) : action === 'reject' ? (
                  <>
                    <X className="w-5 h-5" />
                    Request Rework
                  </>
                ) : (
                  'Select Action'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>

    {/* Image Viewer */}
    {showImageViewer && workMedia.length > 0 && (
      <ImageViewer
        images={workMedia.map(m => {
          const isBeforePhoto = m.upload_source === 'officer_before_photo';
          const isAfterPhoto = m.upload_source === 'officer_after_photo';
          const isProofPhoto = m.is_proof_of_work && !isBeforePhoto && !isAfterPhoto;
          
          let caption = 'Work Photo';
          if (isBeforePhoto) {
            caption = 'Before Photo';
          } else if (isAfterPhoto) {
            caption = 'After Photo';
          } else if (isProofPhoto) {
            caption = 'Proof of Work';
          } else if (m.caption) {
            caption = m.caption;
          } else if (m.upload_source) {
            caption = m.upload_source.replace('officer_', '').replace(/_/g, ' ');
          }
          
          return {
            url: getMediaUrl(m.file_url),
            caption: caption,
            alt: m.caption || caption
          };
        })}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
      />
    )}

    {/* Confirmation Dialog */}
    <ConfirmDialog
      isOpen={showConfirmDialog}
      title={action === 'approve' ? 'Approve Resolution?' : 'Request Rework?'}
      message={
        action === 'approve'
          ? 'Are you sure you want to approve this resolution? The report will be marked as RESOLVED and the citizen will be notified.'
          : 'Are you sure you want to request rework? The report will be sent back to IN_PROGRESS status and the officer will be notified to make improvements.'
      }
      confirmText={action === 'approve' ? 'Approve Resolution' : 'Request Rework'}
      cancelText="Cancel"
      variant={action === 'approve' ? 'info' : 'warning'}
      onConfirm={handleConfirm}
      onCancel={() => setShowConfirmDialog(false)}
    />
    </>
  );
}
