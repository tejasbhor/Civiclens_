import React, { useState } from 'react';
import { X, Pause, Calendar } from 'lucide-react';
import { officerService } from '../../services/officerService';
import { useToast } from '../../hooks/use-toast';

interface PutOnHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportNumber?: string;
  onSuccess?: () => void;
}

const HOLD_REASONS = [
  { value: 'awaiting_materials', label: 'Awaiting materials/equipment' },
  { value: 'awaiting_approval', label: 'Awaiting approval from higher authority' },
  { value: 'weather_conditions', label: 'Unfavorable weather conditions' },
  { value: 'third_party_dependency', label: 'Waiting for third-party action' },
  { value: 'budget_approval', label: 'Awaiting budget approval' },
  { value: 'technical_issue', label: 'Technical issue needs resolution' },
  { value: 'citizen_unavailable', label: 'Citizen/property owner unavailable' },
  { value: 'other', label: 'Other reason' },
];

export const PutOnHoldModal: React.FC<PutOnHoldModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportNumber,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      toast({
        title: 'Error',
        description: 'Please select a reason for putting on hold',
        variant: 'destructive',
      });
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a custom reason',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reason = selectedReason === 'other' 
        ? customReason.trim() 
        : HOLD_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      await officerService.putOnHold(reportId, reason, estimatedDate || undefined);
      
      toast({
        title: 'Success',
        description: 'Task put on hold successfully',
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
      // Reset form
      setSelectedReason('');
      setCustomReason('');
      setEstimatedDate('');
    } catch (error: any) {
      console.error('Error putting task on hold:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to put task on hold',
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
      setEstimatedDate('');
      onClose();
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pause className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Put Task On Hold
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                Reason for Hold *
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {HOLD_REASONS.map((reason) => (
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please specify the reason *
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Enter your reason for putting this task on hold..."
                />
              </div>
            )}

            {/* Estimated Resume Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Resume Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  disabled={isSubmitting}
                  min={today}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                When do you expect to resume work on this task?
              </p>
            </div>

            {/* Info Message */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The task will be marked as ON_HOLD. You can resume work when ready.
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
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Processing...' : 'Put On Hold'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
