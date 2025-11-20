"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Play, 
  Pause,
  CheckCircle,
  Clock,
  FileText,
  Camera,
  Upload,
  MapPin,
  Calendar,
  User,
  RefreshCw,
  Save,
  Send,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Report, ReportStatus } from '@/types';
import { reportsApi, StatusUpdateRequest } from '@/lib/api/reports';

interface WorkProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: () => void;
}

interface WorkUpdate {
  status: ReportStatus;
  progress_percentage?: number;
  work_description?: string;
  challenges_faced?: string;
  estimated_completion?: string;
  resources_needed?: string;
  citizen_communication?: string;
  next_steps?: string;
  photos?: File[];
  location_verified?: boolean;
}

export function WorkProgressModal({ 
  isOpen, 
  onClose, 
  report, 
  onSuccess 
}: WorkProgressModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [workUpdate, setWorkUpdate] = useState<WorkUpdate>({
    status: report.status,
    progress_percentage: 0,
    work_description: '',
    challenges_faced: '',
    estimated_completion: '',
    resources_needed: '',
    citizen_communication: '',
    next_steps: '',
    photos: [],
    location_verified: false
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setWorkUpdate({
        status: report.status,
        progress_percentage: 0,
        work_description: '',
        challenges_faced: '',
        estimated_completion: '',
        resources_needed: '',
        citizen_communication: '',
        next_steps: '',
        photos: [],
        location_verified: false
      });
      setSelectedFiles([]);
      setError(null);
    }
  }, [isOpen, report.status]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workUpdate.work_description.trim()) {
      setError('Please provide a work description');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare the status update
      const statusUpdate: StatusUpdateRequest = {
        new_status: workUpdate.status,
        notes: `Work Progress Update:
        
Description: ${workUpdate.work_description}
Progress: ${workUpdate.progress_percentage}%
${workUpdate.challenges_faced ? `Challenges: ${workUpdate.challenges_faced}` : ''}
${workUpdate.estimated_completion ? `Estimated Completion: ${workUpdate.estimated_completion}` : ''}
${workUpdate.resources_needed ? `Resources Needed: ${workUpdate.resources_needed}` : ''}
${workUpdate.citizen_communication ? `Citizen Communication: ${workUpdate.citizen_communication}` : ''}
${workUpdate.next_steps ? `Next Steps: ${workUpdate.next_steps}` : ''}
Location Verified: ${workUpdate.location_verified ? 'Yes' : 'No'}`,
        progress_percentage: workUpdate.progress_percentage,
        estimated_completion: workUpdate.estimated_completion || undefined
      };

      await reportsApi.updateStatus(report.id, statusUpdate);
      
      // TODO: Upload photos if any
      if (selectedFiles.length > 0) {
        console.log('Photos to upload:', selectedFiles);
        // Implement photo upload logic here
      }
      
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error('Failed to update work progress:', err);
      setError(err?.response?.data?.detail || 'Failed to update work progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusOptions = () => {
    const currentStatus = report.status;
    const options = [];

    switch (currentStatus) {
      case ReportStatus.ASSIGNED_TO_OFFICER:
        options.push(
          { value: ReportStatus.ACKNOWLEDGED, label: 'Acknowledge Task', color: 'blue' },
          { value: ReportStatus.IN_PROGRESS, label: 'Start Work', color: 'green' }
        );
        break;
      case ReportStatus.ACKNOWLEDGED:
        options.push(
          { value: ReportStatus.IN_PROGRESS, label: 'Start Work', color: 'green' },
          { value: ReportStatus.ON_HOLD, label: 'Put on Hold', color: 'yellow' }
        );
        break;
      case ReportStatus.IN_PROGRESS:
        options.push(
          { value: ReportStatus.IN_PROGRESS, label: 'Continue Work (Update)', color: 'blue' },
          { value: ReportStatus.PENDING_VERIFICATION, label: 'Submit for Verification', color: 'green' },
          { value: ReportStatus.ON_HOLD, label: 'Put on Hold', color: 'yellow' }
        );
        break;
      case ReportStatus.ON_HOLD:
        options.push(
          { value: ReportStatus.IN_PROGRESS, label: 'Resume Work', color: 'green' }
        );
        break;
      default:
        options.push(
          { value: currentStatus, label: 'Update Progress', color: 'blue' }
        );
    }

    return options;
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.ACKNOWLEDGED: return 'text-blue-600 bg-blue-50 border-blue-200';
      case ReportStatus.IN_PROGRESS: return 'text-green-600 bg-green-50 border-green-200';
      case ReportStatus.PENDING_VERIFICATION: return 'text-purple-600 bg-purple-50 border-purple-200';
      case ReportStatus.ON_HOLD: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Work Progress Update</h3>
              <p className="text-sm text-gray-500">
                Report #{report.report_number || `CL-${report.id}`} • {report.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(report.status)}`}>
              <Clock className="w-4 h-4" />
              {report.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Update Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getStatusOptions().map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      workUpdate.status === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={workUpdate.status === option.value}
                      onChange={(e) => setWorkUpdate(prev => ({ ...prev, status: e.target.value as ReportStatus }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Progress Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress Percentage
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={workUpdate.progress_percentage}
                  onChange={(e) => setWorkUpdate(prev => ({ ...prev, progress_percentage: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{workUpdate.progress_percentage}%</span>
                </div>
              </div>
            </div>

            {/* Work Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={workUpdate.work_description}
                onChange={(e) => setWorkUpdate(prev => ({ ...prev, work_description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the work completed or in progress..."
                required
              />
            </div>

            {/* Challenges Faced */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Challenges Faced (Optional)
              </label>
              <textarea
                value={workUpdate.challenges_faced}
                onChange={(e) => setWorkUpdate(prev => ({ ...prev, challenges_faced: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any challenges or obstacles encountered..."
              />
            </div>

            {/* Estimated Completion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Completion Date (Optional)
              </label>
              <input
                type="date"
                value={workUpdate.estimated_completion}
                onChange={(e) => setWorkUpdate(prev => ({ ...prev, estimated_completion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Resources Needed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resources Needed (Optional)
              </label>
              <textarea
                value={workUpdate.resources_needed}
                onChange={(e) => setWorkUpdate(prev => ({ ...prev, resources_needed: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional resources, materials, or support needed..."
              />
            </div>

            {/* Citizen Communication */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Citizen Communication (Optional)
              </label>
              <textarea
                value={workUpdate.citizen_communication}
                onChange={(e) => setWorkUpdate(prev => ({ ...prev, citizen_communication: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any communication or updates for the citizen..."
              />
            </div>

            {/* Next Steps */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Steps (Optional)
              </label>
              <textarea
                value={workUpdate.next_steps}
                onChange={(e) => setWorkUpdate(prev => ({ ...prev, next_steps: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What are the next steps or actions planned..."
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress Photos (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload photos</span>
                  <span className="text-xs text-gray-500">PNG, JPG up to 10MB each</span>
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Verification */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workUpdate.location_verified}
                  onChange={(e) => setWorkUpdate(prev => ({ ...prev, location_verified: e.target.checked }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  I have verified the location and work site
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {loading ? 'Updating...' : 'Update Progress'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}