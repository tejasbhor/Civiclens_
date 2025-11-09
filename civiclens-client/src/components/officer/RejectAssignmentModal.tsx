import React, { useState } from 'react';
import { X, AlertTriangle, XCircle } from 'lucide-react';
import { officerService } from '../../services/officerService';
import { useToast } from '../../hooks/use-toast';

interface RejectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportNumber?: string;
  onSuccess?: () => void;
}

const REJECTION_REASONS = [
  { value: 'not_my_expertise', label: 'Not in my area of expertise' },
  { value: 'wrong_location', label: 'Wrong location/area' },
  { value: 'wrong_department', label: 'Should be handled by different department' },
  { value: 'insufficient_info', label: 'Insufficient information to proceed' },
  { value: 'duplicate', label: 'This is a duplicate report' },
  { value: 'invalid', label: 'Invalid or spam report' },
  { value: 'other', label: 'Other reason' },
];

export const RejectAssignmentModal: React.FC<RejectAssignmentModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportNumber,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  
  const MIN_REASON_LENGTH = 10;
  const MAX_REASON_LENGTH = 1000;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedReason) {
      setError('Please select a rejection reason');
      return;
    }

    const finalReason = selectedReason === 'other' ? customReason.trim() : selectedReason;
    
    if (!finalReason) {
      setError('Please provide a rejection reason');
      return;
    }
    
    if (finalReason.length < MIN_REASON_LENGTH) {
      setError(`Reason must be at least ${MIN_REASON_LENGTH} characters long`);
      return;
    }
    
    if (finalReason.length > MAX_REASON_LENGTH) {
      setError(`Reason cannot exceed ${MAX_REASON_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);

    try {
      const reason = selectedReason === 'other' 
        ? customReason.trim() 
        : REJECTION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      await officerService.rejectAssignment(reportId, reason);
      
      toast({
        title: 'Success',
        description: 'Assignment rejected successfully. Admin will review your request.',
      });
      
      // Reset form
      setSelectedReason('');
      setCustomReason('');
      setError('');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
      // Reset form
      setSelectedReason('');
      setCustomReason('');
    } catch (error: any) {
      console.error('Error rejecting assignment:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to reject assignment. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setCustomReason('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reject Assignment</h2>
                <p className="text-sm text-gray-600">Report: {reportNumber}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Report Info */}
          {reportNumber && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Report: <span className="font-medium text-gray-900">{reportNumber}</span>
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Reason Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection *
              </label>
              <div className="space-y-2">
                {REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {reason.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            {selectedReason === 'other' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Reason * (min {MIN_REASON_LENGTH} characters)
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={4}
                  maxLength={MAX_REASON_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Please provide a detailed reason for rejecting this assignment..."
                  required
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {customReason.length < MIN_REASON_LENGTH && customReason.length > 0 && (
                      <span className="text-orange-600">
                        {MIN_REASON_LENGTH - customReason.length} more characters needed
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {customReason.length}/{MAX_REASON_LENGTH}
                  </p>
                </div>
              </div>
            )}

            {/* Warning Message */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This assignment will be sent to admin for review. 
                They may reassign it to another officer or reclassify the report.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !customReason.trim())}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject Assignment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
