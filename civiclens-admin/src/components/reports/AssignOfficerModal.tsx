"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  X, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  User,
  Clock,
  TrendingUp,
  Info,
  Star,
  Activity,
  Phone,
  Mail,
  Badge as BadgeIcon,
  Zap,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Shield,
  Target
} from 'lucide-react';
import { Report, User as UserType } from '@/types';
import { reportsApi, AssignOfficerRequest, OfficerWorkload } from '@/lib/api/reports';
import { usersApi } from '@/lib/api/users';

interface AssignOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess: (updatedReport: Report) => void;
}

// Enhanced types for better type safety
interface OfficerWithWorkload extends UserType {
  workload?: OfficerWorkload;
  isCurrentlyAssigned?: boolean;
  capacityStatus?: 'available' | 'moderate' | 'high' | 'overloaded';
}

interface AssignmentFormData {
  selectedOfficerId: number | null;
  priority: number;
  notes: string;
  strategy: 'least_busy' | 'balanced' | 'round_robin';
  isAutoAssign: boolean;
}

// Constants for better maintainability
const PRIORITY_LEVELS = {
  LOW: { min: 1, max: 2, label: 'Low Priority', color: 'text-green-600' },
  NORMAL: { min: 3, max: 4, label: 'Normal Priority', color: 'text-blue-600' },
  HIGH: { min: 5, max: 7, label: 'High Priority', color: 'text-orange-600' },
  CRITICAL: { min: 8, max: 10, label: 'Critical Priority', color: 'text-red-600' }
} as const;

const ASSIGNMENT_STRATEGIES = [
  {
    id: 'balanced' as const,
    name: 'Balanced (Recommended)',
    description: 'Considers both workload and efficiency for optimal assignment',
    icon: Target
  },
  {
    id: 'least_busy' as const,
    name: 'Least Busy',
    description: 'Assigns to officer with the fewest active reports',
    icon: Activity
  },
  {
    id: 'round_robin' as const,
    name: 'Round Robin',
    description: 'Distributes assignments fairly across all officers',
    icon: RefreshCw
  }
] as const;

export function AssignOfficerModal({ 
  isOpen, 
  onClose, 
  report, 
  onSuccess 
}: AssignOfficerModalProps) {
  // Core state
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<OfficerWithWorkload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Form state with better structure
  const [formData, setFormData] = useState<AssignmentFormData>({
    selectedOfficerId: null,
    priority: 5,
    notes: '',
    strategy: 'balanced',
    isAutoAssign: false
  });
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'workload' | 'availability'>('availability');
  const [showWorkloadDetails, setShowWorkloadDetails] = useState(true);
  
  // Refs for accessibility and performance
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Enhanced officer loading with retry logic and better error handling
  const loadOfficers = useCallback(async (isRetry = false) => {
    console.log('[AssignOfficer] loadOfficers called:', { isRetry, department_id: report.department_id });
    
    if (!isRetry) {
      setRetryCount(0);
    }
    
    try {
      setLoadingOfficers(true);
      setError(null);

      if (!report.department_id) {
        console.log('[AssignOfficer] WARNING: No department_id found in report');
        setError('Report must be assigned to a department first');
        return;
      }

      // Debug logging
      console.log('[AssignOfficer] Loading officers for department:', report.department_id);
      console.log('[AssignOfficer] Report details:', { id: report.id, department_id: report.department_id, department: report.department });
      console.log('[AssignOfficer] Calling usersApi.getOfficers...');

      // Load officers (skip workload data for now to avoid 500 errors)
      const [officersData] = await Promise.allSettled([
        usersApi.getOfficers(report.department_id)
      ]);

      console.log('[AssignOfficer] Officers API result:', officersData);

      if (officersData.status === 'rejected') {
        console.error('[AssignOfficer] ERROR: Officers API failed:', officersData.reason);
        throw new Error(`Failed to load officers: ${officersData.reason?.message || 'Unknown error'}`);
      }

      let officers = officersData.value;
      console.log('[AssignOfficer] Officers loaded:', officers.length, officers);

      // If no officers found with department filter, try loading all officers and filter manually
      if (officers.length === 0 && report.department_id) {
        console.log('[AssignOfficer] No officers found with department filter, trying manual filter...');
        try {
          const allOfficersResult = await usersApi.getOfficers();
          const filteredOfficers = allOfficersResult.filter(officer => 
            officer.department_id === report.department_id
          );
          console.log('[AssignOfficer] Manual filter result:', filteredOfficers.length, filteredOfficers);
          officers = filteredOfficers;
        } catch (fallbackError) {
          console.error('[AssignOfficer] ERROR: Fallback also failed:', fallbackError);
        }
      }

      // Skip workload data for now (causing 500 errors)
      const workloadMap = {};

      // Enhance officers with workload data and status
      const enhancedOfficers: OfficerWithWorkload[] = officers.map(officer => ({
        ...officer,
        workload: workloadMap[officer.id],
        isCurrentlyAssigned: report.task?.assigned_to === officer.id,
        capacityStatus: getCapacityStatus(workloadMap[officer.id])
      }));

      console.log('[AssignOfficer] Enhanced officers:', enhancedOfficers.length, enhancedOfficers);
      setOfficers(enhancedOfficers);

      // Pre-select current officer if assigned
      if (report.task?.assigned_to) {
        setFormData(prev => ({ ...prev, selectedOfficerId: report.task.assigned_to }));
      }

    } catch (err: any) {
      console.error('Failed to load officers:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadOfficers(true);
        }, Math.pow(2, retryCount) * 1000);
      }
    } finally {
      setLoadingOfficers(false);
    }
  }, [report.department_id, report.task?.assigned_to, retryCount]);

  // Load officers when modal opens
  useEffect(() => {
    console.log('[AssignOfficer] useEffect triggered:', { isOpen, department_id: report.department_id });
    if (isOpen) {
      console.log('[AssignOfficer] Modal is open, calling loadOfficers...');
      loadOfficers();
      // Focus management for accessibility
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    } else {
      console.log('[AssignOfficer] Modal is closed, resetting form...');
      // Reset form when modal closes
      resetForm();
    }
  }, [isOpen, loadOfficers]);

  // Utility functions
  const getCapacityStatus = (workload?: OfficerWorkload): 'available' | 'moderate' | 'high' | 'overloaded' => {
    if (!workload) return 'available';
    
    const activeReports = workload.active_reports || 0;
    if (activeReports === 0) return 'available';
    if (activeReports <= 3) return 'moderate';
    if (activeReports <= 6) return 'high';
    return 'overloaded';
  };

  const getErrorMessage = (error: any): string => {
    if (error?.response?.data?.detail) {
      return Array.isArray(error.response.data.detail) 
        ? error.response.data.detail.map((e: any) => e.msg || e).join(', ')
        : error.response.data.detail;
    }
    return error?.message || 'An unexpected error occurred. Please try again.';
  };

  const getPriorityInfo = (priority: number) => {
    for (const [key, level] of Object.entries(PRIORITY_LEVELS)) {
      if (priority >= level.min && priority <= level.max) {
        return level;
      }
    }
    return PRIORITY_LEVELS.NORMAL;
  };

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'overloaded': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCapacityLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'moderate': return 'Moderate Load';
      case 'high': return 'High Load';
      case 'overloaded': return 'Overloaded';
      default: return 'Unknown';
    }
  };

  // Memoized filtered and sorted officers for performance
  const filteredAndSortedOfficers = useMemo(() => {
    let filtered = officers.filter(officer => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        officer.full_name?.toLowerCase().includes(searchLower) ||
        officer.email?.toLowerCase().includes(searchLower) ||
        officer.phone?.includes(searchTerm) ||
        officer.employee_id?.toLowerCase().includes(searchLower)
      );
    });

    // Sort officers based on selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
        case 'workload':
          const aWorkload = a.workload?.active_reports || 0;
          const bWorkload = b.workload?.active_reports || 0;
          return aWorkload - bWorkload;
        case 'availability':
          // Sort by capacity status, then by workload
          const statusOrder = { available: 0, moderate: 1, high: 2, overloaded: 3 };
          const aStatus = statusOrder[a.capacityStatus || 'available'];
          const bStatus = statusOrder[b.capacityStatus || 'available'];
          if (aStatus !== bStatus) return aStatus - bStatus;
          return (a.workload?.active_reports || 0) - (b.workload?.active_reports || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [officers, searchTerm, sortBy]);

  // Form handlers with validation
  const updateFormData = useCallback((updates: Partial<AssignmentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setError(null); // Clear errors when user makes changes
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      selectedOfficerId: report.task?.assigned_to || null,
      priority: 5,
      notes: '',
      strategy: 'balanced',
      isAutoAssign: false
    });
    setSearchTerm('');
    setError(null);
    setRetryCount(0);
  }, [report.task?.assigned_to]);

  const validateForm = (): string | null => {
    if (!formData.isAutoAssign && !formData.selectedOfficerId) {
      return 'Please select an officer';
    }
    
    if (formData.selectedOfficerId === report.task?.assigned_to) {
      return 'Report is already assigned to this officer';
    }
    
    if (formData.notes.length > 500) {
      return 'Notes cannot exceed 500 characters';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: AssignOfficerRequest = {
        officer_user_id: formData.selectedOfficerId!,
        priority: formData.priority,
        notes: formData.notes.trim() || undefined
      };

      const updatedReport = await reportsApi.assignOfficer(report.id, payload);
      
      // Show success feedback
      onSuccess(updatedReport);
      onClose();

    } catch (err: any) {
      console.error('Failed to assign officer:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await reportsApi.autoAssignOfficer(report.id, {
        strategy: formData.strategy,
        priority: formData.priority,
        notes: formData.notes.trim() || undefined
      });

      // Show success feedback and close
      onSuccess(result || report);
      onClose();

    } catch (err: any) {
      console.error('Failed to auto-assign officer:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, loading, handleClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-officer-title"
      aria-describedby="assign-officer-description"
    >
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-5xl rounded-lg shadow-xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 id="assign-officer-title" className="text-lg font-semibold text-gray-900">
                Assign Officer
              </h3>
              <p id="assign-officer-description" className="text-sm text-gray-500">
                Report #{report.report_number || `CL-${report.id}`} • {report.department?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {retryCount > 0 && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Retry {retryCount}/3
              </span>
            )}
            <button 
              ref={firstFocusableRef}
              onClick={handleClose}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Department Check */}
            {!report.department_id && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Department Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This report must be assigned to a department before assigning an officer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Assignment Status */}
            {report.task?.officer && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900">Current Assignment</h4>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-sm text-blue-800">
                        <strong>{report.task.officer.full_name}</strong>
                      </span>
                      {report.task.priority && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          Priority: {report.task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display with Retry Option */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    {error.includes('Failed to load officers') && (
                      <button
                        onClick={() => loadOfficers()}
                        disabled={loadingOfficers}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
                      >
                        {loadingOfficers ? 'Retrying...' : 'Try Again'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Mode Toggle */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Assignment Method</h4>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assign-mode"
                    checked={!formData.isAutoAssign}
                    onChange={() => updateFormData({ isAutoAssign: false })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Manual Selection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assign-mode"
                    checked={formData.isAutoAssign}
                    onChange={() => updateFormData({ isAutoAssign: true })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Smart Auto-Assignment</span>
                  </div>
                </label>
              </div>
            </div>

            {formData.isAutoAssign ? (
              /* Auto-Assignment Section */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Assignment Strategy
                  </label>
                  <div className="space-y-3">
                    {ASSIGNMENT_STRATEGIES.map((strategy) => {
                      const IconComponent = strategy.icon;
                      return (
                        <label
                          key={strategy.id}
                          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                            formData.strategy === strategy.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="strategy"
                            value={strategy.id}
                            checked={formData.strategy === strategy.id}
                            onChange={(e) => updateFormData({ strategy: e.target.value as any })}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <IconComponent className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {strategy.name}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {strategy.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Manual Selection Section */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Select Officer <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWorkloadDetails(!showWorkloadDetails)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {showWorkloadDetails ? 'Hide' : 'Show'} Workload
                    </button>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {filteredAndSortedOfficers.length} of {officers.length} officers
                    </span>
                  </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex gap-3">
                  {officers.length > 0 && (
                    <>
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search officers by name, email, or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="availability">Sort by Availability</option>
                        <option value="name">Sort by Name</option>
                        <option value="workload">Sort by Workload</option>
                      </select>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => loadOfficers()}
                    disabled={loadingOfficers}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm flex items-center gap-2"
                    title="Refresh officers list"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOfficers ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {loadingOfficers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">Loading officers...</p>
                    </div>
                  </div>
                ) : officers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-sm font-medium text-gray-900 mb-2">No Officers Available</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      No officers found in {report.department?.name || `department ${report.department_id}`}.
                    </p>
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg mb-4">
                      <p><strong>Debug Info:</strong></p>
                      <p>Report ID: {report.id}</p>
                      <p>Department ID: {report.department_id}</p>
                      <p>Department Name: {report.department?.name || 'Unknown'}</p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => loadOfficers()}
                        disabled={loadingOfficers}
                        className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                      >
                        {loadingOfficers ? 'Retrying...' : 'Try Again'}
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={() => {
                          console.log('🔍 Manual debug - Report:', report);
                          console.log('🔍 Manual debug - Officers:', officers);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        Debug Info
                      </button>
                    </div>
                  </div>
                ) : filteredAndSortedOfficers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600">No officers match your search criteria</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredAndSortedOfficers.map((officer, index) => {
                      const isSelected = formData.selectedOfficerId === officer.id;
                      const isCurrent = officer.isCurrentlyAssigned;

                      return (
                        <div
                          key={officer.id}
                          className={`relative border-b border-gray-100 last:border-b-0 p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-l-4 border-l-blue-500'
                              : isCurrent
                              ? 'bg-green-50 border-l-4 border-l-green-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => updateFormData({ selectedOfficerId: officer.id })}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="officer"
                              value={officer.id}
                              checked={isSelected}
                              onChange={() => updateFormData({ selectedOfficerId: officer.id })}
                              className="mt-1 text-blue-600 focus:ring-blue-500"
                              aria-describedby={`officer-${officer.id}-details`}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {officer.full_name || officer.email}
                                </h4>
                                {isCurrent && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex-shrink-0">
                                    Current
                                  </span>
                                )}
                                {officer.capacityStatus && (
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getCapacityColor(officer.capacityStatus)}`}>
                                    {getCapacityLabel(officer.capacityStatus)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Officer Details */}
                              <div id={`officer-${officer.id}-details`} className="space-y-2">
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {officer.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      <span className="truncate">{officer.email}</span>
                                    </div>
                                  )}
                                  {officer.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{officer.phone}</span>
                                    </div>
                                  )}
                                  {officer.employee_id && (
                                    <div className="flex items-center gap-1">
                                      <BadgeIcon className="w-3 h-3" />
                                      <span>ID: {officer.employee_id}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Workload Details */}
                                {showWorkloadDetails && officer.workload && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-gray-100">
                                    <div className="flex items-center gap-1">
                                      <Activity className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-600">
                                        {officer.workload.active_reports} Active
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-600">
                                        {officer.workload.resolved_reports} Resolved
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-600">
                                        {officer.workload.avg_resolution_time_days?.toFixed(1) || 0}d avg
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-600">
                                        Score: {officer.workload.workload_score?.toFixed(1) || 0}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Priority Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Priority Level
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => updateFormData({ priority: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Priority level"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{formData.priority}</span>
                    <span className={`text-sm font-medium ${getPriorityInfo(formData.priority).color}`}>
                      {getPriorityInfo(formData.priority).label}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low (1-2)</span>
                  <span>Normal (3-4)</span>
                  <span>High (5-7)</span>
                  <span>Critical (8-10)</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label htmlFor="assignment-notes" className="block text-sm font-medium text-gray-700">
                Assignment Notes (Optional)
              </label>
              <div className="relative">
                <textarea
                  id="assignment-notes"
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add any specific instructions or context for this assignment..."
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-500">
                    {formData.notes.length}/500 characters
                  </div>
                  {formData.notes.length > 450 && (
                    <div className="text-xs text-orange-600">
                      {500 - formData.notes.length} characters remaining
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-4 h-4" />
              <span>This will create a task and notify the assigned officer</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              
              {formData.isAutoAssign ? (
                <button
                  type="button"
                  onClick={handleAutoAssign}
                  disabled={loading || loadingOfficers || !report.department_id || officers.length === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Auto-Assigning...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Auto-Assign Officer
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    loading || 
                    !formData.selectedOfficerId || 
                    loadingOfficers || 
                    !report.department_id ||
                    officers.length === 0
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Assign Officer
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}