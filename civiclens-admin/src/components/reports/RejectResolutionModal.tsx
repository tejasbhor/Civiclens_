import React, { useState, useEffect } from 'react';
import { Report, Media } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { mediaApi } from '@/lib/api/media';
import { X as XIcon, Loader2, AlertTriangle, ArrowLeft, Camera, FileText, Clock, User } from 'lucide-react';

interface RejectResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: (updatedReport: Report) => void;
}

export function RejectResolutionModal({
  isOpen,
  onClose,
  report,
  onSuccess
}: RejectResolutionModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workMedia, setWorkMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  
  // Load work completion media (before/after photos)
  useEffect(() => {
    if (isOpen && report.id) {
      loadWorkMedia();
    }
  }, [isOpen, report.id]);
  
  const loadWorkMedia = async () => {
    try {
      setLoadingMedia(true);
      const media = await mediaApi.getReportMedia(report.id);
      // Filter for officer's work photos (before/after)
      const workPhotos = media.filter((m: Media) => 
        m.upload_source === 'officer_before_photo' || 
        m.upload_source === 'officer_after_photo' ||
        m.is_proof_of_work
      );
      setWorkMedia(workPhotos);
    } catch (err) {
      console.error('Failed to load work media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const commonReasons = [
    'After photos do not show complete resolution',
    'Work quality does not meet standards',
    'Additional work required',
    'Incorrect approach to problem',
    'Safety concerns not addressed',
    'Missing documentation or evidence'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedReport = await reportsApi.rejectResolution(report.id, rejectionReason);
      onSuccess(updatedReport);
      setRejectionReason('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reject resolution');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Request Rework</h2>
              <p className="text-sm text-red-100">Report #{report.report_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Report Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Title:</span>
                <p className="font-medium text-gray-900">{report.title}</p>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <p className="font-medium text-gray-900 capitalize">{report.category || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Severity:</span>
                <p className="font-medium text-gray-900 capitalize">{report.severity || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Current Status:</span>
                <p className="font-medium text-gray-900 uppercase">{report.status.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
          
          {/* Work Submitted by Officer - NEW */}
          <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Work Submitted by Officer</h3>
            </div>
            
            {/* Task Details */}
            {report.task && (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-gray-600">Officer:</span>
                      <p className="font-medium text-gray-900">{report.task.officer?.full_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <span className="text-gray-600">Submitted:</span>
                      <p className="font-medium text-gray-900">
                        {report.task.resolved_at ? new Date(report.task.resolved_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Resolution Notes */}
                {report.task.resolution_notes && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Officer's Resolution Notes:</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.task.resolution_notes}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Work Photos (Before/After) */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Submitted Work Photos ({workMedia.length})
              </p>
              
              {loadingMedia ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              ) : workMedia.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {workMedia.map((media) => (
                    <div key={media.id} className="relative group">
                      <img
                        src={media.file_url}
                        alt={media.upload_source || 'Work photo'}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-amber-400 transition-colors"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                        <p className="text-xs text-white font-medium capitalize">
                          {media.upload_source?.replace('officer_', '').replace('_', ' ') || 'Work Photo'}
                        </p>
                      </div>
                      {/* Full size preview on click */}
                      <button
                        type="button"
                        onClick={() => window.open(media.file_url, '_blank')}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No work photos uploaded</p>
                </div>
              )}
            </div>
            
          </div>
          
          {/* Divider - Rejection Section */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">
                    Request Rework?
                  </h3>
                  <p className="text-sm text-amber-700">
                    Review the work above. If not satisfactory, send back to officer with specific feedback. Status will change to <strong>IN_PROGRESS</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Reasons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Common Reasons (Click to select)
              </label>
            <div className="grid grid-cols-1 gap-2">
              {commonReasons.map((reason, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className={`text-left px-4 py-2.5 rounded-lg border transition-all ${
                    rejectionReason === reason
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-sm">{reason}</span>
                </button>
              ))}
              </div>
            </div>

            {/* Rejection Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                rows={4}
                placeholder="Be specific about what needs improvement. Reference photos if needed. Example: 'After photo shows pothole still visible on left side. Please ensure complete filling.'"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                💡 <strong>Tip:</strong> Reference specific photos or issues you saw above to help the officer understand what to fix.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || !rejectionReason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <ArrowLeft className="w-5 h-5" />
                  Request Rework
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
