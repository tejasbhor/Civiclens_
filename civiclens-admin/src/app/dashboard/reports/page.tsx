"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'sonner';
import { Report, ReportStatus, Department, ReportSeverity, User } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import ReportDetail from '@/components/reports/ReportDetail';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
import { authApi } from '@/lib/api/auth';
import { analyticsApi } from '@/lib/api/analytics';
import { Badge } from '@/components/ui/Badge';
import { getStatusBadgeClasses, getSeverityBadgeClasses, toLabel as formatLabel } from '@/lib/utils/status-colors';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { MapPreview } from '@/components/ui/MapPreview';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { FilterChips } from '@/components/ui/FilterChips';
import { SavedFilters } from '@/components/ui/SavedFilters';
import { BulkProgressModal } from '@/components/ui/BulkProgressModal';
import { PasswordConfirmDialog } from '@/components/ui/PasswordConfirmDialog';
import { ManageReportModal } from '@/components/reports/ManageReportModal';

import { AssignmentModal } from '@/components/reports/AssignmentModal';
import { AssignOfficerModal } from '@/components/reports/AssignOfficerModal';
import { apiClient } from '@/lib/api/client';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [status, setStatus] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [needsReview, setNeedsReview] = useState<boolean | null>(null); // AI review filter
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const toLabel = (s?: string | null) => (s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-');

  // Utility: Format relative date
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Format as "Oct 20"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };


  // Sorting (client-side on current page)
  const [sortKey, setSortKey] = useState<'report_number' | 'title' | 'category' | 'status' | 'severity' | 'department' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    // Check if there's an 'id' query parameter on mount
    const idParam = searchParams?.get('id');
    return idParam ? parseInt(idParam, 10) : null;
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Authentication and role-based access control
  const { user } = useAuth();
  const role = user?.role || '';
  const isAdmin = ['super_admin', 'admin'].includes(role);
  const canManageReports = ['super_admin', 'admin', 'moderator'].includes(role);

  // Map preview state
  const [mapPreview, setMapPreview] = useState<{ lat: number; lng: number; address?: string | null } | null>(null);

  // Assignment dialog states
  const [assignDialog, setAssignDialog] = useState<{
    isOpen: boolean;
    type: 'department' | 'officer' | null;
    report: Report | null;
  }>({ isOpen: false, type: null, report: null });

  // Assign Officer Modal state
  const [assignOfficerModal, setAssignOfficerModal] = useState<{
    isOpen: boolean;
    report: Report | null;
  }>({ isOpen: false, report: null });

  // Classify dialog state
  const [classifyDialog, setClassifyDialog] = useState<{
    isOpen: boolean;
    reportId: number | null;
    reportNumber: string | null;
    title: string | null;
  }>({ isOpen: false, reportId: null, reportNumber: null, title: null });

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Password confirmation for bulk actions
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (password: string) => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });



  // Header stats
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending_classification: 0,
    needs_review: 0,  // Count of reports needing manual review
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
  });

  const load = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);
      const filters = {
        status: status || undefined,
        search: debouncedSearch || undefined,
        category: category || undefined,
        severity: severity || undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
        needs_review: needsReview !== null ? needsReview : undefined,
        page,
        per_page: perPage,
      };
      const res = await reportsApi.getReports(filters);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      console.error('Failed to load reports:', e);
      setError(e?.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  // Selection helpers moved below after sortedData is defined

  // Allowed transitions for inline status change
  const statusTransitions: Record<ReportStatus, ReportStatus[]> = {
    [ReportStatus.RECEIVED]: [ReportStatus.PENDING_CLASSIFICATION, ReportStatus.ASSIGNED_TO_DEPARTMENT],
    [ReportStatus.PENDING_CLASSIFICATION]: [ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT],
    [ReportStatus.CLASSIFIED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
    [ReportStatus.ASSIGNED_TO_DEPARTMENT]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD],
    [ReportStatus.ASSIGNED_TO_OFFICER]: [ReportStatus.ACKNOWLEDGED, ReportStatus.ASSIGNMENT_REJECTED, ReportStatus.ON_HOLD],
    [ReportStatus.ASSIGNMENT_REJECTED]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ASSIGNED_TO_DEPARTMENT],
    [ReportStatus.ACKNOWLEDGED]: [ReportStatus.IN_PROGRESS, ReportStatus.ON_HOLD],
    [ReportStatus.IN_PROGRESS]: [ReportStatus.PENDING_VERIFICATION, ReportStatus.ON_HOLD],
    [ReportStatus.PENDING_VERIFICATION]: [ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.ON_HOLD],
    [ReportStatus.RESOLVED]: [ReportStatus.REOPENED, ReportStatus.CLOSED],
    [ReportStatus.REOPENED]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS],
    [ReportStatus.CLOSED]: [],
    [ReportStatus.REJECTED]: [],
    [ReportStatus.DUPLICATE]: [],
    [ReportStatus.ON_HOLD]: [ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS],
  };

  // Inline status update with comprehensive validation
  const updateStatusInline = (id: number, newStatus: ReportStatus, reportNumber: string) => {
    const report = sortedData.find(r => r.id === id);
    if (!report) {
      setError('Report not found. Please refresh the page.');
      return;
    }
    
    // Validate transition
    const allowedNext = statusTransitions[report.status] || [];
    if (!allowedNext.includes(newStatus) && report.status !== newStatus) {
      setError(`Invalid status transition: Cannot change from "${toLabel(report.status)}" to "${toLabel(newStatus)}"`);
      return;
    }
    
    // Check prerequisites
    if (newStatus === ReportStatus.ASSIGNED_TO_DEPARTMENT && !report.department_id) {
      setError('Cannot change to "Assigned to Department": No department assigned. Please assign a department first.');
      return;
    }
    
    if ([ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS].includes(newStatus) && !report.task?.officer) {
      setError(`Cannot change to "${toLabel(newStatus)}": No officer assigned. Please assign an officer first.`);
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: 'Change Status',
      message: `Are you sure you want to change the status of ${reportNumber} to "${toLabel(newStatus)}"?`,
      variant: 'info',
      onConfirm: async () => {
        try {
          await reportsApi.updateStatus(id, { 
            new_status: newStatus,
            notes: `Status changed to ${toLabel(newStatus)} by admin`
          });
          
          // Show success notification
          toast.success(`Status updated to ${toLabel(newStatus)}`);
          
          await load();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (e: any) {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          
          // Professional error handling
          let errorMessage = 'Failed to update status';
          if (e?.response?.data?.detail) {
            if (typeof e.response.data.detail === 'string') {
              errorMessage = e.response.data.detail;
            } else if (Array.isArray(e.response.data.detail)) {
              errorMessage = e.response.data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
            } else {
              errorMessage = JSON.stringify(e.response.data.detail);
            }
          } else if (e?.message) {
            errorMessage = e.message;
          }
          
          setError(errorMessage);
        }
      },
    });
  };

  // Bulk actions state
  const [bulkDept, setBulkDept] = useState<string>('');
  const [bulkOfficer, setBulkOfficer] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkSeverity, setBulkSeverity] = useState<string>('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    isOpen: boolean;
    title: string;
    total: number;
    completed: number;
    failed: number;
    currentItem?: string;
    errors: string[];
  }>({ isOpen: false, title: '', total: 0, completed: 0, failed: 0, errors: [] });

  // Auto-clear error after 10 seconds with proper cleanup
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const runBulkAssignDept = () => {
    console.log('runBulkAssignDept called with bulkDept:', bulkDept, typeof bulkDept);
    
    if (!bulkDept || bulkDept === '') {
      setError('Please select a department to assign');
      return;
    }
    
    const departmentId = parseInt(bulkDept, 10);
    if (isNaN(departmentId) || departmentId <= 0) {
      setError('Invalid department selected. Please try again.');
      return;
    }
    
    const ids = Array.from(selectedIds).filter((id) => allVisibleIds.has(id));
    if (ids.length === 0) {
      setError('No reports selected for department assignment');
      return;
    }
    
    // Production safety check
    if (ids.length > 100) {
      setError('Cannot process more than 100 reports at once. Please select fewer reports.');
      return;
    }
    
    const department = departments.find(d => String(d.id) === bulkDept);
    if (!department) {
      setError('Selected department not found. Please refresh and try again.');
      return;
    }
    
    // Check if reports are already assigned to this department
    const alreadyAssigned = sortedData.filter(r => 
      ids.includes(r.id) && r.department_id === Number(bulkDept)
    );
    
    if (alreadyAssigned.length === ids.length) {
      setError(`All selected reports are already assigned to ${department.name}`);
      return;
    }
    
    const newAssignments = ids.length - alreadyAssigned.length;
    
    setPasswordDialog({
      isOpen: true,
      title: 'Assign Department - Authentication Required',
      message: `You are about to assign ${newAssignments} report(s) to ${department.name}${alreadyAssigned.length > 0 ? ` (${alreadyAssigned.length} already assigned)` : ''}. Please enter your administrator password to confirm this bulk action.`,
      variant: 'warning',
      onConfirm: async (password: string) => {
        try {
          // Verify password first
          await authApi.verifyPassword(password);
          
          setBulkRunning(true);
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkProgress({
            isOpen: true,
            title: 'Assigning Department',
            total: ids.length,
            completed: 0,
            failed: 0,
            errors: alreadyAssigned.length > 0 ? [`${alreadyAssigned.length} report(s) already assigned to this department`] : [],
          });
          
          // Use bulk endpoint with proper error handling
          const payload = {
            report_ids: ids,
            department_id: departmentId,
            notes: `Bulk assignment to ${department.name} by admin`
          };
          
          console.log('Bulk assign department payload:', payload);
          console.log('Department ID type:', typeof payload.department_id);
          console.log('Report IDs types:', payload.report_ids.map(id => typeof id));
          
          const result = await reportsApi.bulkAssignDepartment(payload);
          
          setBulkProgress(prev => ({
            ...prev,
            completed: result.successful,
            failed: result.failed,
            errors: [
              ...prev.errors,
              ...result.errors.map(e => `Report #${e.report_id}: ${e.error}`)
            ],
          }));
          
          // Show success notification
          if (result.successful > 0) {
            toast.success(`Successfully assigned ${result.successful} report(s) to ${department.name}`);
          }
          
          await load();
          setSelectedIds(new Set());
          setBulkDept('');
          setBulkRunning(false);
          
        } catch (e: any) {
          console.error('Bulk assignment error:', e);
          
          // Reset all states to allow retry
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkRunning(false);
          setBulkProgress({ isOpen: false, title: '', total: 0, completed: 0, failed: 0, errors: [] });
          setBulkDept('');
          setSelectedIds(new Set());
          
          // Professional error handling
          let errorMessage = 'Bulk department assignment failed';
          if (e?.response?.data?.detail) {
            if (typeof e.response.data.detail === 'string') {
              errorMessage = e.response.data.detail;
            } else if (Array.isArray(e.response.data.detail)) {
              errorMessage = e.response.data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
            } else {
              errorMessage = JSON.stringify(e.response.data.detail);
            }
          } else if (e?.message) {
            errorMessage = e.message;
          }
          
          setError(errorMessage);
          
          // Close progress modal on error
          setBulkProgress(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const runBulkChangeStatus = () => {
    if (!bulkStatus) {
      setError('Please select a status to change to');
      return;
    }
    
    const ids = Array.from(selectedIds).filter((id) => allVisibleIds.has(id));
    if (ids.length === 0) {
      setError('No reports selected for status change');
      return;
    }
    
    // Production safety check
    if (ids.length > 100) {
      setError('Cannot process more than 100 reports at once. Please select fewer reports.');
      return;
    }
    
    // Validate transitions before prompting for password
    const invalidTransitions: string[] = [];
    const validIds: number[] = [];
    const validReports: any[] = [];
    
    for (const id of ids) {
      const report = sortedData.find(r => r.id === id);
      if (report) {
        const allowedNext = statusTransitions[report.status] || [];
        if (!allowedNext.includes(bulkStatus as ReportStatus) && report.status !== bulkStatus) {
          invalidTransitions.push(`${report.report_number || `CL-${id}`}: ${toLabel(report.status)} → ${toLabel(bulkStatus)}`);
        } else {
          validIds.push(id);
          validReports.push(report);
        }
      }
    }
    
    // Check if all transitions are invalid
    if (invalidTransitions.length > 0 && validIds.length === 0) {
      setError(`All selected reports have invalid status transitions. No reports can be updated to "${toLabel(bulkStatus)}".`);
      return;
    }
    
    // Check for prerequisite violations
    const prerequisiteErrors: string[] = [];
    for (const report of validReports) {
      if (bulkStatus === 'assigned_to_department' && !report.department_id) {
        prerequisiteErrors.push(`${report.report_number || `CL-${report.id}`}: No department assigned`);
      }
      if (['assigned_to_officer', 'acknowledged', 'in_progress'].includes(bulkStatus) && !report.task?.officer) {
        prerequisiteErrors.push(`${report.report_number || `CL-${report.id}`}: No officer assigned`);
      }
    }
    
    if (prerequisiteErrors.length > 0) {
      setError(`Cannot update status due to missing prerequisites:\n${prerequisiteErrors.slice(0, 5).join('\n')}${prerequisiteErrors.length > 5 ? `\n...and ${prerequisiteErrors.length - 5} more` : ''}`);
      return;
    }
    
    const message = invalidTransitions.length > 0 
      ? `${invalidTransitions.length} report(s) will be skipped due to invalid transitions. Proceed with ${validIds.length} valid report(s)?\n\nYou are about to change the status to "${toLabel(bulkStatus)}". Please enter your administrator password to confirm.`
      : `You are about to change the status of ${validIds.length} report(s) to "${toLabel(bulkStatus)}". Please enter your administrator password to confirm this bulk action.`;
    
    setPasswordDialog({
      isOpen: true,
      title: 'Change Status - Authentication Required',
      message,
      variant: 'warning',
      onConfirm: async (password: string) => {
        try {
          // Verify password first
          await authApi.verifyPassword(password);
          
          setBulkRunning(true);
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkProgress({
            isOpen: true,
            title: 'Changing Status',
            total: validIds.length,
            completed: 0,
            failed: 0,
            errors: invalidTransitions.length > 0 ? [`Skipped ${invalidTransitions.length} report(s) with invalid transitions`] : [],
          });
          
          // Use bulk endpoint with proper error handling
          const result = await reportsApi.bulkUpdateStatus({
            report_ids: validIds,
            new_status: bulkStatus as ReportStatus,
            notes: `Bulk status update to ${toLabel(bulkStatus)} by admin`
          });
          
          const errors = invalidTransitions.length > 0 
            ? [`Skipped ${invalidTransitions.length} report(s) with invalid transitions`, ...result.errors.map(e => `Report #${e.report_id}: ${e.error}`)]
            : result.errors.map(e => `Report #${e.report_id}: ${e.error}`);
          
          setBulkProgress(prev => ({
            ...prev,
            completed: result.successful,
            failed: result.failed + invalidTransitions.length,
            errors,
          }));
          
          // Show success notification
          if (result.successful > 0) {
            toast.success(`Successfully updated ${result.successful} report(s)`);
          }
          
          await load();
          setSelectedIds(new Set());
          setBulkStatus('');
          setBulkRunning(false);
          
        } catch (e: any) {
          console.error('Bulk status update error:', e);
          
          // Reset all states to allow retry
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkRunning(false);
          setBulkProgress({ isOpen: false, title: '', total: 0, completed: 0, failed: 0, errors: [] });
          setBulkStatus('');
          setSelectedIds(new Set());
          
          // Professional error handling
          let errorMessage = 'Bulk status update failed';
          if (e?.response?.data?.detail) {
            if (typeof e.response.data.detail === 'string') {
              errorMessage = e.response.data.detail;
            } else if (Array.isArray(e.response.data.detail)) {
              errorMessage = e.response.data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
            } else {
              errorMessage = JSON.stringify(e.response.data.detail);
            }
          } else if (e?.message) {
            errorMessage = e.message;
          }
          
          setError(errorMessage);
        }
      },
    });
  };

  const runBulkAssignOfficer = () => {
    console.log('runBulkAssignOfficer called with bulkOfficer:', bulkOfficer, typeof bulkOfficer);
    
    if (!bulkOfficer || bulkOfficer === '') {
      setError('Please select an officer to assign');
      return;
    }
    
    const officerId = parseInt(bulkOfficer, 10);
    if (isNaN(officerId) || officerId <= 0) {
      setError('Invalid officer selected. Please try again.');
      return;
    }

    const ids = Array.from(selectedIds).filter((id) => allVisibleIds.has(id));
    if (ids.length === 0) {
      setError('No reports selected for officer assignment');
      return;
    }

    // Check if all selected reports have departments assigned
    const reportsWithoutDept = sortedData.filter(r => 
      ids.includes(r.id) && !r.department_id
    );
    
    if (reportsWithoutDept.length > 0) {
      setError(`${reportsWithoutDept.length} report(s) must have a department assigned before assigning an officer. Please assign departments first.`);
      return;
    }

    // Find officer details
    const officer = officers.find(o => o.id === officerId);
    if (!officer) {
      setError('Selected officer not found. Please refresh and try again.');
      return;
    }

    // Check department compatibility
    const incompatibleReports = sortedData.filter(r => 
      ids.includes(r.id) && r.department_id && r.department_id !== officer.department_id
    );
    
    if (incompatibleReports.length > 0) {
      setError(`${incompatibleReports.length} report(s) are assigned to different departments than the selected officer. Officer can only be assigned to reports from their department.`);
      return;
    }

    const message = `You are about to assign ${ids.length} report(s) to ${officer.full_name || officer.email}. Please enter your administrator password to confirm this bulk action.`;
    
    setPasswordDialog({
      isOpen: true,
      title: 'Bulk Assign Officer - Authentication Required',
      message,
      variant: 'warning',
      onConfirm: async (password: string) => {
        try {
          setBulkRunning(true);
          setBulkProgress({
            isOpen: true,
            title: 'Assigning Officer',
            total: ids.length,
            completed: 0,
            failed: 0,
            errors: [],
          });
          
          const payload = {
            report_ids: ids,
            officer_user_id: officerId,
            priority: 5, // Default priority
            notes: `Bulk assignment to ${officer.full_name || officer.email} by admin`
          };
          
          console.log('Bulk assign officer payload:', payload);
          
          const result = await reportsApi.bulkAssignOfficer(payload);
          
          setBulkProgress(prev => ({
            ...prev,
            completed: result.successful,
            failed: result.failed,
            errors: result.errors.map(e => `Report #${e.report_id}: ${e.error}`),
          }));
          
          if (result.successful > 0) {
            toast.success(`Successfully assigned ${result.successful} report(s) to ${officer.full_name || officer.email}`);
          }
          
          await load();
          setSelectedIds(new Set());
          setBulkOfficer('');
          setBulkRunning(false);
          
        } catch (e: any) {
          console.error('Bulk officer assignment error:', e);
          
          // Reset all states to allow retry
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkRunning(false);
          setBulkProgress({ isOpen: false, title: '', total: 0, completed: 0, failed: 0, errors: [] });
          setBulkOfficer('');
          setSelectedIds(new Set());
          
          // Professional error handling
          let errorMessage = 'Bulk officer assignment failed';
          if (e?.response?.data?.detail) {
            if (typeof e.response.data.detail === 'string') {
              errorMessage = e.response.data.detail;
            } else if (Array.isArray(e.response.data.detail)) {
              errorMessage = e.response.data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
            } else {
              errorMessage = JSON.stringify(e.response.data.detail);
            }
          } else if (e?.message) {
            errorMessage = e.message;
          }
          
          setError(errorMessage);
        }
      },
    });
  };

  const runBulkChangeSeverity = () => {
    if (!bulkSeverity) {
      setError('Please select a severity level to change to');
      return;
    }
    
    const ids = Array.from(selectedIds).filter((id) => allVisibleIds.has(id));
    if (ids.length === 0) {
      setError('No reports selected for severity change');
      return;
    }
    
    // Production safety check
    if (ids.length > 100) {
      setError('Cannot process more than 100 reports at once. Please select fewer reports.');
      return;
    }
    
    // Check if reports already have this severity
    const alreadySet = sortedData.filter(r => 
      ids.includes(r.id) && r.severity === bulkSeverity
    );
    
    if (alreadySet.length === ids.length) {
      setError(`All selected reports already have "${toLabel(bulkSeverity)}" severity`);
      return;
    }
    
    const changesNeeded = ids.length - alreadySet.length;
    
    // Validate severity escalation for critical reports
    const criticalEscalations = sortedData.filter(r => 
      ids.includes(r.id) && 
      r.severity !== 'critical' && 
      bulkSeverity === 'critical'
    );
    
    const escalationWarning = criticalEscalations.length > 0 
      ? `\n\nNote: ${criticalEscalations.length} report(s) will be escalated to CRITICAL severity, which may trigger immediate notifications to senior officials.`
      : '';
    
    setPasswordDialog({
      isOpen: true,
      title: 'Change Severity - Authentication Required',
      message: `You are about to change the severity of ${changesNeeded} report(s) to "${toLabel(bulkSeverity)}"${alreadySet.length > 0 ? ` (${alreadySet.length} already set)` : ''}. Please enter your administrator password to confirm this bulk action.${escalationWarning}`,
      variant: bulkSeverity === 'critical' ? 'danger' : 'warning',
      onConfirm: async (password: string) => {
        try {
          // Verify password first
          await authApi.verifyPassword(password);
          
          setBulkRunning(true);
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkProgress({
            isOpen: true,
            title: 'Changing Severity',
            total: ids.length,
            completed: 0,
            failed: 0,
            errors: alreadySet.length > 0 ? [`${alreadySet.length} report(s) already have this severity`] : [],
          });
          
          // Use bulk endpoint with proper error handling
          const result = await reportsApi.bulkUpdateSeverity({
            report_ids: ids,
            severity: bulkSeverity as 'low' | 'medium' | 'high' | 'critical',
          });
          
          setBulkProgress(prev => ({
            ...prev,
            completed: result.successful,
            failed: result.failed,
            errors: [
              ...prev.errors,
              ...result.errors.map(e => `Report #${e.report_id}: ${e.error}`)
            ],
          }));
          
          // Show success notification with severity-specific messaging
          if (result.successful > 0) {
            toast.success(`Successfully updated ${result.successful} report(s) to ${toLabel(bulkSeverity)} severity`);
          }
          
          await load();
          setSelectedIds(new Set());
          setBulkSeverity('');
          setBulkRunning(false);
          
        } catch (e: any) {
          console.error('Bulk severity update error:', e);
          
          // Reset all states to allow retry
          setPasswordDialog({ ...passwordDialog, isOpen: false });
          setBulkRunning(false);
          setBulkProgress({ isOpen: false, title: '', total: 0, completed: 0, failed: 0, errors: [] });
          setBulkSeverity('');
          setSelectedIds(new Set());
          
          // Professional error handling
          let errorMessage = 'Bulk severity update failed';
          if (e?.response?.data?.detail) {
            if (typeof e.response.data.detail === 'string') {
              errorMessage = e.response.data.detail;
            } else if (Array.isArray(e.response.data.detail)) {
              errorMessage = e.response.data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
            } else {
              errorMessage = JSON.stringify(e.response.data.detail);
            }
          } else if (e?.message) {
            errorMessage = e.message;
          }
          
          setError(errorMessage);
        }
      },
    });
  };

  // runBulkDelete removed - reports cannot be deleted, only archived after resolution

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, severity, category, departmentId, needsReview, debouncedSearch, page]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load header stats using analytics endpoint for accurate data
  useEffect(() => {
    const run = async () => {
      try {
        setStatsLoading(true);
        
        // Try to use analytics endpoint first (more efficient)
        try {
          const analyticsData = await analyticsApi.getDashboardStats();
          
          // Extract counts from analytics data
          const byStatus = analyticsData.reports_by_status || {};
          const bySeverity = analyticsData.reports_by_severity || {};
          
          // Get needs_review count
          const needsReviewData = await reportsApi.getReports({ page: 1, per_page: 1, needs_review: true });
          
          setStats({
            total: analyticsData.total_reports || 0,
            pending_classification: byStatus['pending_classification'] || 0,
            needs_review: needsReviewData.total || 0,  // Count of reports needing review
            assigned: byStatus['assigned_to_officer'] || 0,
            in_progress: byStatus['in_progress'] || 0,
            resolved: byStatus['resolved'] || 0,
            critical: bySeverity['critical'] || 0,
            high: bySeverity['high'] || 0,
          });
        } catch (analyticsError) {
          // Fallback to individual queries if analytics endpoint fails
          console.warn('Analytics endpoint failed, using fallback:', analyticsError);
          
          // Use individual count queries instead of fetching all records
          // This is MUCH safer than fetching 10k records
          const [total, pend, needsRev, assigned, prog, resv, crit, high] = await Promise.all([
            reportsApi.getReports({ page: 1, per_page: 1 }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, status: ReportStatus.PENDING_CLASSIFICATION }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, needs_review: true }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, status: ReportStatus.ASSIGNED_TO_OFFICER }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, status: ReportStatus.IN_PROGRESS }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, status: ReportStatus.RESOLVED }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, severity: 'critical' }).then(r => r.total),
            reportsApi.getReports({ page: 1, per_page: 1, severity: 'high' }).then(r => r.total),
          ]);
          
          setStats({
            total: total || 0,
            pending_classification: pend || 0,
            needs_review: needsRev || 0,
            assigned: assigned || 0,
            in_progress: prog || 0,
            resolved: resv || 0,
            critical: crit || 0,
            high: high || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
        // Keep stats at 0 if all methods fail
      } finally {
        setStatsLoading(false);
      }
    };
    run();
  }, []);

  // Load departments for filter (best-effort)
  useEffect(() => {
    (async () => {
      const [deptList, officersResponse] = await Promise.all([
        departmentsApi.list(),
        usersApi.listUsers({ per_page: 100, role: 'nodal_officer' })
      ]);
      setDepartments(deptList || []);
      setOfficers(officersResponse?.data || []);
    })();
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total]);

  const onUpdated = () => {
    load();
  };

  const sortedData = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      let av: any;
      let bv: any;
      if (sortKey === 'report_number') {
        av = a.report_number || a.id;
        bv = b.report_number || b.id;
      } else if (sortKey === 'title') {
        av = a.title || '';
        bv = b.title || '';
      } else if (sortKey === 'category') {
        av = a.category || '';
        bv = b.category || '';
      } else if (sortKey === 'status') {
        av = a.status || '';
        bv = b.status || '';
      } else if (sortKey === 'severity') {
        av = a.severity || '';
        bv = b.severity || '';
      } else if (sortKey === 'department') {
        av = a.department?.name || '';
        bv = b.department?.name || '';
      } else {
        av = a.created_at;
        bv = b.created_at;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [data, sortKey, sortDirection]);

  // Selection helpers (require sortedData)
  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleIds = useMemo(() => new Set(sortedData.map((r) => r.id)), [sortedData]);
  const allSelectedOnPage = useMemo(() => sortedData.length > 0 && sortedData.every((r) => selectedIds.has(r.id)), [sortedData, selectedIds]);
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        // unselect all visible
        sortedData.forEach((r) => next.delete(r.id));
      } else {
        // select all visible
        sortedData.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      // Same column, toggle direction
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      // Different column, set new key and default to asc
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Browse, filter, and perform bulk actions on civic issue reports</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 border border-gray-200"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
            onClick={() => {
              // Export current page to CSV
              const headers = ['report_number','title','category','sub_category','status','severity','created_at'];
              const rows = sortedData.map(r => [
                r.report_number || r.id,
                r.title?.replaceAll('\n',' ').replaceAll(',', ' '),
                r.category || '',
                r.sub_category || '',
                r.status,
                r.severity,
                new Date(r.created_at).toISOString(),
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `reports_page_${page}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Total Reports */}
        <button
          onClick={() => { 
            // Clear all filters to show all reports
            setStatus('');
            setCategory('');
            setSeverity('');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-gray-700">Total Reports</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.total.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Awaiting Review */}
        <button
          onClick={() => { 
            // Clear all filters, then set needs_review filter to show ALL reports needing review
            setNeedsReview(true);  // Show all reports flagged for review by AI
            setStatus('');  // Clear status filter
            setCategory('');
            setSeverity('');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-yellow-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-yellow-700">Awaiting Review</div>
              <div className="text-2xl font-bold text-yellow-600 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.needs_review.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Assigned */}
        <button
          onClick={() => { 
            // Clear all filters, then set only status
            setStatus(ReportStatus.ASSIGNED_TO_OFFICER);
            setCategory('');
            setSeverity('');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setNeedsReview(null);  // Clear AI review filter
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-purple-700">Assigned</div>
              <div className="text-2xl font-bold text-purple-600 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.assigned.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </button>

        {/* In Progress */}
        <button
          onClick={() => { 
            // Clear all filters, then set only status
            setStatus(ReportStatus.IN_PROGRESS);
            setCategory('');
            setSeverity('');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setNeedsReview(null);  // Clear AI review filter
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-blue-700">In Progress</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.in_progress.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Resolved */}
        <button
          onClick={() => { 
            // Clear all filters, then set only status
            setStatus(ReportStatus.RESOLVED);
            setCategory('');
            setSeverity('');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setNeedsReview(null);  // Clear AI review filter
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-green-700">Resolved</div>
              <div className="text-2xl font-bold text-green-600 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.resolved.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Critical Severity */}
        <button
          onClick={() => { 
            // Clear all filters, then set only severity
            setStatus('');
            setCategory('');
            setSeverity('critical');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-red-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-red-700">Critical</div>
              <div className="text-2xl font-bold text-red-600 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.critical.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </button>

        {/* High Severity */}
        <button
          onClick={() => { 
            // Clear all filters, then set only severity
            setStatus('');
            setCategory('');
            setSeverity('high');
            setDepartmentId('');
            setSearchInput('');
            setDebouncedSearch('');
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
          className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-orange-300 transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-orange-700">High Priority</div>
              <div className="text-2xl font-bold text-orange-600 mt-2">{statsLoading ? <span className="animate-pulse">…</span> : stats.high.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-white border border-primary-200 rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedIds.size} {selectedIds.size === 1 ? 'Report' : 'Reports'} Selected</p>
                <p className="text-xs text-gray-500">Choose an action to apply</p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {departments.length > 0 && (
                <div className="flex items-center gap-2">
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                    value={bulkDept} 
                    onChange={(e) => setBulkDept(e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => {
                      console.log('Department option:', d.id, typeof d.id, d.name);
                      return (
                        <option key={d.id} value={String(d.id)}>{toLabel(d.name)}</option>
                      );
                    })}
                  </select>
                  <button 
                    disabled={!bulkDept || bulkRunning} 
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm" 
                    onClick={runBulkAssignDept}
                  >
                    {bulkRunning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              )}
              
              {officers.length > 0 && (
                <div className="flex items-center gap-2">
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                    value={bulkOfficer} 
                    onChange={(e) => setBulkOfficer(e.target.value)}
                  >
                    <option value="">Select Officer</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={String(officer.id)}>
                        {officer.full_name || officer.email} ({departments.find(d => d.id === officer.department_id)?.name || 'No Dept'})
                      </option>
                    ))}
                  </select>
                  <button 
                    disabled={!bulkOfficer || bulkRunning} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm" 
                    onClick={runBulkAssignOfficer}
                  >
                    {bulkRunning ? 'Assigning...' : 'Assign Officer'}
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  value={bulkStatus} 
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <option value="">Select Status</option>
                  {/* Show all statuses - backend will validate prerequisites */}
                  {Object.values(ReportStatus).map((s) => (
                    <option key={s} value={s}>{toLabel(s)}</option>
                  ))}
                </select>
                <button 
                  disabled={!bulkStatus || bulkRunning} 
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm" 
                  onClick={runBulkChangeStatus}
                >
                  {bulkRunning ? 'Updating...' : 'Update'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  value={bulkSeverity} 
                  onChange={(e) => setBulkSeverity(e.target.value)}
                >
                  <option value="">Change Severity</option>
                  {Object.values(ReportSeverity).map((s) => (
                    <option key={s} value={s}>{toLabel(s)}</option>
                  ))}
                </select>
                <button 
                  disabled={!bulkSeverity || bulkRunning} 
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm" 
                  onClick={runBulkChangeSeverity}
                >
                  {bulkRunning ? 'Updating...' : 'Update'}
                </button>
              </div>
              
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2"
                onClick={() => {
              const headers = ['report_number','title','category','sub_category','status','severity','created_at'];
              const rows = sortedData.filter(r => selectedIds.has(r.id)).map(r => [
                r.report_number || r.id,
                r.title?.replaceAll('\n',' ').replaceAll(',', ' '),
                r.category || '',
                r.sub_category || '',
                r.status,
                r.severity,
                new Date(r.created_at).toISOString(),
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `reports_selected_${Date.now()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Selected
          </button>

              {/* Delete button removed - reports cannot be deleted, only archived after resolution */}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Filters & Search</h3>
            <p className="text-xs text-gray-500 mt-0.5">Refine your report list</p>
          </div>
          <div className="flex items-center gap-3">
            <SavedFilters
              currentFilters={{ status, category, severity, departmentId, startDate, endDate, search: debouncedSearch }}
              onApplyPreset={(filters) => {
                setStatus(filters.status || '');
                setCategory(filters.category || '');
                setSeverity(filters.severity || '');
                setDepartmentId(filters.departmentId || '');
                setStartDate(filters.startDate || '');
                setEndDate(filters.endDate || '');
                setSearchInput(filters.search || '');
                setDebouncedSearch(filters.search || '');
                setPage(1);
              }}
            />
            <button 
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center gap-1" 
              onClick={() => { 
                setStatus(''); setCategory(''); setSeverity(''); setDepartmentId(''); setStartDate(''); setEndDate(''); setSearchInput(''); setDebouncedSearch(''); setPage(1);
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Search by ID, title, location, or citizen name..."
                value={searchInput}
                onChange={(e) => { setPage(1); setSearchInput(e.target.value); }}
              />
            </div>
          </div>

          <div className="w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            >
              <option value="">All Statuses</option>
              {Object.values(ReportStatus).map((s) => (
                <option key={s} value={s}>{toLabel(s)}</option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              value={category}
              onChange={(e) => { setPage(1); setCategory(e.target.value); }}
            >
              <option value="">All Categories</option>
              {['roads','water','sanitation','electricity','streetlight','drainage','public_property','other'].map((c) => (
                <option key={c} value={c}>{toLabel(c)}</option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Severity</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              value={severity}
              onChange={(e) => { setPage(1); setSeverity(e.target.value); }}
            >
              <option value="">All Severity</option>
              {Object.values(ReportSeverity).map((sv) => (
                <option key={sv} value={sv}>{toLabel(sv)}</option>
              ))}
            </select>
          </div>

          {departments.length > 0 && (
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Department</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                value={departmentId}
                onChange={(e) => { setPage(1); setDepartmentId(e.target.value); }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>{toLabel(d.name)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">AI Review</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              value={needsReview === null ? '' : needsReview ? 'true' : 'false'}
              onChange={(e) => { 
                setPage(1); 
                setNeedsReview(e.target.value === '' ? null : e.target.value === 'true'); 
              }}
            >
              <option value="">All Reports</option>
              <option value="true">⚠️ Needs Review</option>
              <option value="false">✅ Reviewed</option>
            </select>
          </div>

          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {showAdvancedFilters ? 'Hide' : 'More'} Filters
          </button>

          <button 
            className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all text-sm font-medium shadow-sm" 
            onClick={() => { setPage(1); setDebouncedSearch(searchInput.trim()); }}
          >
            Apply
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-3 items-end">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        <div className="mt-4">
          <FilterChips
            filters={[
              ...(status ? [{ key: 'status', label: 'Status', value: toLabel(status), onRemove: () => setStatus('') }] : []),
              ...(category ? [{ key: 'category', label: 'Category', value: toLabel(category), onRemove: () => setCategory('') }] : []),
              ...(severity ? [{ key: 'severity', label: 'Severity', value: toLabel(severity), onRemove: () => setSeverity('') }] : []),
              ...(departmentId ? [{ key: 'dept', label: 'Department', value: toLabel(departments.find(d => String(d.id) === departmentId)?.name || ''), onRemove: () => setDepartmentId('') }] : []),
              ...(startDate ? [{ key: 'start', label: 'From', value: startDate, onRemove: () => setStartDate('') }] : []),
              ...(endDate ? [{ key: 'end', label: 'To', value: endDate, onRemove: () => setEndDate('') }] : []),
              ...(debouncedSearch ? [{ key: 'search', label: 'Search', value: debouncedSearch, onRemove: () => { setSearchInput(''); setDebouncedSearch(''); } }] : []),
            ]}
            onClearAll={() => {
              setStatus(''); setCategory(''); setSeverity(''); setDepartmentId(''); setStartDate(''); setEndDate(''); setSearchInput(''); setDebouncedSearch(''); setPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-medium mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                load();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  #
                </th>
                {isAdmin && (
                  <th className="w-12 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('report_number')}>
                  <div className="flex items-center gap-1">
                    Report #
                    {sortKey === 'report_number' && (
                      <span className="text-primary-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    Title
                    {sortKey === 'title' && (
                      <span className="text-primary-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('category')}>
                  <div className="flex items-center gap-1">
                    Category
                    {sortKey === 'category' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortKey === 'status' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('severity')}>
                  <div className="flex items-center gap-1">
                    Severity
                    {sortKey === 'severity' && (
                      <span className="text-primary-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('department')}>
                  <div className="flex items-center gap-1">
                    Department
                    {sortKey === 'department' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center gap-1">
                    Created
                    {sortKey === 'created_at' && (
                      <span className="text-primary-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-500 font-medium">{(page - 1) * perPage + index + 1}</td>
                  {isAdmin && (
                    <td className="px-2 py-3"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelected(r.id)} className="rounded" /></td>
                  )}
                  <td className="px-3 py-3 font-mono text-blue-600 font-medium cursor-pointer hover:underline" onClick={() => setSelectedId(r.id)}>{r.report_number || `CL-${r.id}`}</td>
                  <td className="px-3 py-3 max-w-[280px]"><span title={r.title} className="line-clamp-2 font-medium text-gray-900">{r.title}</span></td>
                  <td className="px-3 py-3 text-gray-600">{toLabel(r.category)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(r.status)}`}>
                      {toLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadgeClasses(r.severity)}`}>
                      {toLabel(r.severity)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-[180px]">
                    <span title={r.address || `${r.latitude}, ${r.longitude}`} className="line-clamp-1">
                      {r.address || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{r.department?.name ? toLabel(r.department.name) : '-'}</td>
                  <td className="px-3 py-3 text-gray-600" title={new Date(r.created_at).toLocaleString()}>{formatRelativeDate(r.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center">
                      <DropdownMenu
                        items={[
                          {
                            label: 'View on Map',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                            onClick: () => setMapPreview({ lat: r.latitude, lng: r.longitude, address: r.address }),
                          },
                          ...(isAdmin ? [{
                            label: 'Manage Report',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                            onClick: () => window.location.href = `/dashboard/reports/manage/${r.id}`,
                          }, {
                            label: 'Quick Edit',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                            onClick: () => setClassifyDialog({ isOpen: true, reportId: r.id, reportNumber: r.report_number || `CL-${r.id}`, title: r.title }),
                          }] : []),
                          ...(isAdmin && !r.department_id ? [{
                            label: 'Assign Department',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
                            onClick: () => setAssignDialog({ isOpen: true, type: 'department', report: r }),
                          }] : []),
                          ...(isAdmin && r.department_id && !r.task?.officer ? [{
                            label: 'Assign Officer',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                            onClick: () => setAssignOfficerModal({ isOpen: true, report: r }),
                          }] : []),
                          {
                            label: 'Export PDF',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
                            onClick: () => {
                              import('@/lib/utils/pdf-export-service').then(({ exportReportPDF, PDFExportLevel, PDFExportFormat }) => {
                                exportReportPDF({ level: PDFExportLevel.SUMMARY, report: r, format: PDFExportFormat.COMPREHENSIVE });
                              }).catch(error => {
                                console.error('PDF export failed:', error);
                                setError('Failed to export PDF. Please try again.');
                              });
                            }
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={11}>
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium mb-2">No reports found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
                    <button className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium" onClick={() => { 
                      setStatus(''); setCategory(''); setSeverity(''); setDepartmentId(''); setSearchInput(''); setDebouncedSearch(''); setNeedsReview(null); setPage(1); setBulkDept(''); setBulkOfficer(''); setBulkStatus(''); setBulkSeverity('');
                    }}>Clear All Filters</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
        <div className="flex-1 flex justify-between sm:hidden">
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((page - 1) * perPage) + 1}</span> to <span className="font-medium">{Math.min(page * perPage, total)}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {selectedId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl max-h-[90vh] flex flex-col animate-scale-in" style={{ zIndex: 10000 }}>
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Report Details</h3>
                  <p className="text-xs text-gray-500">View and manage report information</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedId(null)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <ReportDetail reportId={selectedId} admin={isAdmin} onUpdated={onUpdated} />
            </div>

            {/* Sticky Footer with Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 sticky bottom-0 rounded-b-lg">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Scroll to view all details</span>
              </div>
              <button 
                onClick={() => setSelectedId(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {mapPreview && (
        <MapPreview
          latitude={mapPreview.lat}
          longitude={mapPreview.lng}
          address={mapPreview.address}
          onClose={() => setMapPreview(null)}
        />
      )}

      {classifyDialog.isOpen && classifyDialog.reportId && (
        <ManageReportModal
          reportId={classifyDialog.reportId}
          reportNumber={classifyDialog.reportNumber || ''}
          title={classifyDialog.title || ''}
          currentCategory={data.find(r => r.id === classifyDialog.reportId)?.category}
          currentSeverity={data.find(r => r.id === classifyDialog.reportId)?.severity}
          currentDepartmentId={data.find(r => r.id === classifyDialog.reportId)?.department_id}
          onClose={() => setClassifyDialog({ isOpen: false, reportId: null, reportNumber: null, title: null })}
          onSuccess={() => load()}
        />
      )}



      <AssignmentModal
        isOpen={assignDialog.isOpen}
        type={assignDialog.type || 'department'}
        report={assignDialog.report}
        onClose={() => setAssignDialog({ isOpen: false, type: null, report: null })}
        onSuccess={() => {
          load();
          setAssignDialog({ isOpen: false, type: null, report: null });
        }}
      />

      {/* Enhanced Assign Officer Modal */}
      {assignOfficerModal.report && (
        <AssignOfficerModal
          isOpen={assignOfficerModal.isOpen}
          report={assignOfficerModal.report}
          onClose={() => setAssignOfficerModal({ isOpen: false, report: null })}
          onSuccess={(updatedReport) => {
            load(); // Refresh the reports list
            setAssignOfficerModal({ isOpen: false, report: null });
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      <BulkProgressModal
        isOpen={bulkProgress.isOpen}
        title={bulkProgress.title}
        total={bulkProgress.total}
        completed={bulkProgress.completed}
        failed={bulkProgress.failed}
        currentItem={bulkProgress.currentItem}
        errors={bulkProgress.errors}
        onClose={() => setBulkProgress({ ...bulkProgress, isOpen: false })}
      />

      <PasswordConfirmDialog
        isOpen={passwordDialog.isOpen}
        title={passwordDialog.title}
        message={passwordDialog.message}
        variant={passwordDialog.variant}
        onConfirm={passwordDialog.onConfirm}
        onCancel={() => setPasswordDialog({ ...passwordDialog, isOpen: false })}
      />
    </div>
  );
}

