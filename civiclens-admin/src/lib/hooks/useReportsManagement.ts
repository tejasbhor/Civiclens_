'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Report, ReportStatus, Department, User, ReportSeverity } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
import { authApi } from '@/lib/api/auth';
import { analyticsApi } from '@/lib/api/analytics';
import { toast } from 'sonner';

/**
 * Filters state for reports management
 */
interface ReportsFilters {
  status: string;
  search: string;
  category: string;
  severity: string;
  departmentId: string;
  startDate: string;
  endDate: string;
  needsReview: boolean | null;
}

/**
 * Statistics for dashboard header
 */
interface ReportsStats {
  total: number;
  pending_classification: number;
  needs_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  critical: number;
  high: number;
}

/**
 * Bulk operation progress tracking
 */
interface BulkProgress {
  isOpen: boolean;
  title: string;
  total: number;
  completed: number;
  failed: number;
  currentItem?: string;
  errors: string[];
}

/**
 * Dialog states for confirmations
 */
interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

interface PasswordDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (password: string) => void;
  variant?: 'danger' | 'warning' | 'info';
}

/**
 * Return type for the hook
 */
export interface UseReportsManagementReturn {
  // Data state
  data: Report[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  
  // Filters
  filters: ReportsFilters;
  updateFilter: (key: keyof ReportsFilters, value: any) => void;
  resetFilters: () => void;
  showAdvancedFilters: boolean;
  toggleAdvancedFilters: () => void;
  
  // Pagination
  page: number;
  perPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  
  // Sorting
  sortKey: 'report_number' | 'title' | 'category' | 'status' | 'severity' | 'department' | 'created_at';
  sortDirection: 'asc' | 'desc';
  sortedData: Report[];
  toggleSort: (key: 'report_number' | 'title' | 'category' | 'status' | 'severity' | 'department' | 'created_at') => void;
  
  // Selection
  selectedId: number | null;
  selectedIds: Set<number>;
  allVisibleIds: Set<number>;
  allSelectedOnPage: boolean;
  setSelectedId: (id: number | null) => void;
  toggleSelected: (id: number) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  
  // Stats
  stats: ReportsStats;
  statsLoading: boolean;
  
  // Reference data
  departments: Department[];
  officers: User[];
  
  // Actions
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  updateStatusInline: (id: number, newStatus: ReportStatus, reportNumber: string) => void;
  
  // Bulk operations
  bulkState: {
    dept: string;
    officer: string;
    status: string;
    severity: string;
    running: boolean;
  };
  updateBulkState: (key: string, value: any) => void;
  bulkProgress: BulkProgress;
  setBulkProgress: (progress: BulkProgress | ((prev: BulkProgress) => BulkProgress)) => void;
  runBulkAssignDept: () => void;
  runBulkChangeStatus: () => void;
  runBulkAssignOfficer: () => void;
  runBulkChangeSeverity: () => void;
  
  // Dialogs
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: (state: ConfirmDialogState) => void;
  passwordDialog: PasswordDialogState;
  setPasswordDialog: (state: PasswordDialogState) => void;
  
  // Map preview
  mapPreview: { lat: number; lng: number; address?: string | null } | null;
  setMapPreview: (preview: { lat: number; lng: number; address?: string | null } | null) => void;
  
  // Utility
  toLabel: (s?: string | null) => string;
  formatRelativeDate: (dateString: string) => string;
  
  // Status transitions
  statusTransitions: Record<ReportStatus, ReportStatus[]>;
}

const INITIAL_FILTERS: ReportsFilters = {
  status: '',
  search: '',
  category: '',
  severity: '',
  departmentId: '',
  startDate: '',
  endDate: '',
  needsReview: null,
};

const INITIAL_STATS: ReportsStats = {
  total: 0,
  pending_classification: 0,
  needs_review: 0,
  assigned: 0,
  in_progress: 0,
  resolved: 0,
  critical: 0,
  high: 0,
};

/**
 * Custom hook for reports management
 * 
 * Encapsulates all state management, data fetching, filtering, sorting,
 * selection, bulk operations, and business logic for the reports page.
 * 
 * Benefits:
 * - Separation of concerns (logic vs UI)
 * - Reusable across components
 * - Easier to test
 * - Performance optimized with useCallback and useMemo
 * - Centralized error handling
 */
export function useReportsManagement(initialSelectedId?: number | null) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Data state
  const [data, setData] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<ReportsFilters>(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  
  // Sorting
  const [sortKey, setSortKey] = useState<'report_number' | 'title' | 'category' | 'status' | 'severity' | 'department' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId || null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Stats
  const [stats, setStats] = useState<ReportsStats>(INITIAL_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Reference data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  
  // Bulk operations
  const [bulkState, setBulkState] = useState({
    dept: '',
    officer: '',
    status: '',
    severity: '',
    running: false,
  });
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
    isOpen: false,
    title: '',
    total: 0,
    completed: 0,
    failed: 0,
    errors: [],
  });
  
  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [passwordDialog, setPasswordDialog] = useState<PasswordDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning',
  });
  
  // Map preview
  const [mapPreview, setMapPreview] = useState<{ lat: number; lng: number; address?: string | null } | null>(null);
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const toLabel = useCallback((s?: string | null) => {
    return s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';
  }, []);
  
  const formatRelativeDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);
  
  // ============================================================================
  // STATUS TRANSITIONS
  // ============================================================================
  
  const statusTransitions: Record<ReportStatus, ReportStatus[]> = useMemo(() => ({
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
  }), []);
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const load = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);
      
      const apiFilters = {
        status: filters.status || undefined,
        search: debouncedSearch || undefined,
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        department_id: filters.departmentId ? Number(filters.departmentId) : undefined,
        needs_review: filters.needsReview !== null ? filters.needsReview : undefined,
        page,
        per_page: perPage,
      };
      
      const res = await reportsApi.getReports(apiFilters);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      console.error('Failed to load reports:', e);
      setError(e?.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, debouncedSearch, page, perPage, refreshing]);
  
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);
  
  // ============================================================================
  // STATS LOADING
  // ============================================================================
  
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      
      try {
        const analyticsData = await analyticsApi.getDashboardStats();
        const byStatus = analyticsData.reports_by_status || {};
        const bySeverity = analyticsData.reports_by_severity || {};
        const needsReviewData = await reportsApi.getReports({ page: 1, per_page: 1, needs_review: true });
        
        setStats({
          total: analyticsData.total_reports || 0,
          pending_classification: byStatus['pending_classification'] || 0,
          needs_review: needsReviewData.total || 0,
          assigned: byStatus['assigned_to_officer'] || 0,
          in_progress: byStatus['in_progress'] || 0,
          resolved: byStatus['resolved'] || 0,
          critical: bySeverity['critical'] || 0,
          high: bySeverity['high'] || 0,
        });
      } catch (analyticsError) {
        console.warn('Analytics endpoint failed, using fallback:', analyticsError);
        
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
    } finally {
      setStatsLoading(false);
    }
  }, []);
  
  // ============================================================================
  // REFERENCE DATA LOADING
  // ============================================================================
  
  const loadReferenceData = useCallback(async () => {
    try {
      const [deptList, officersResponse] = await Promise.all([
        departmentsApi.list(),
        usersApi.listUsers({ per_page: 100, role: 'nodal_officer' })
      ]);
      setDepartments(deptList || []);
      setOfficers(officersResponse?.data || []);
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  }, []);
  
  // ============================================================================
  // SORTING
  // ============================================================================
  
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
  
  const toggleSort = useCallback((key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);
  
  // ============================================================================
  // SELECTION
  // ============================================================================
  
  const allVisibleIds = useMemo(() => new Set(sortedData.map((r) => r.id)), [sortedData]);
  const allSelectedOnPage = useMemo(
    () => sortedData.length > 0 && sortedData.every((r) => selectedIds.has(r.id)),
    [sortedData, selectedIds]
  );
  
  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        sortedData.forEach((r) => next.delete(r.id));
      } else {
        sortedData.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [allSelectedOnPage, sortedData]);
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  // ============================================================================
  // FILTERS
  // ============================================================================
  
  const updateFilter = useCallback((key: keyof ReportsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Reset to page 1 when filter changes
    setPage(1);
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);
  
  const toggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters((prev) => !prev);
  }, []);
  
  // ============================================================================
  // INLINE STATUS UPDATE
  // ============================================================================
  
  const updateStatusInline = useCallback((id: number, newStatus: ReportStatus, reportNumber: string) => {
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
          
          toast.success(`Status updated to ${toLabel(newStatus)}`);
          await load();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (e: any) {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          
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
  }, [sortedData, statusTransitions, toLabel, load, confirmDialog]);
  
  // ============================================================================
  // BULK OPERATIONS (Continued in next part due to length)
  // ============================================================================
  
  const updateBulkState = useCallback((key: string, value: any) => {
    setBulkState((prev) => ({ ...prev, [key]: value }));
  }, []);
  
  // Bulk operations will be implemented in the component for now
  // to keep hook file size manageable. Can be moved here later if needed.
  const runBulkAssignDept = useCallback(() => {
    // Implementation will be in component
    console.log('runBulkAssignDept called from hook');
  }, []);
  
  const runBulkChangeStatus = useCallback(() => {
    console.log('runBulkChangeStatus called from hook');
  }, []);
  
  const runBulkAssignOfficer = useCallback(() => {
    console.log('runBulkAssignOfficer called from hook');
  }, []);
  
  const runBulkChangeSeverity = useCallback(() => {
    console.log('runBulkChangeSeverity called from hook');
  }, []);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Auto-clear error after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.search]);
  
  // Load data when filters or page change
  useEffect(() => {
    load();
  }, [load]);
  
  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  
  // Load reference data on mount
  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);
  
  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // Data state
    data,
    total,
    loading,
    refreshing,
    error,
    
    // Filters
    filters,
    updateFilter,
    resetFilters,
    showAdvancedFilters,
    toggleAdvancedFilters,
    
    // Pagination
    page,
    perPage,
    totalPages,
    setPage,
    
    // Sorting
    sortKey,
    sortDirection,
    sortedData,
    toggleSort,
    
    // Selection
    selectedId,
    selectedIds,
    allVisibleIds,
    allSelectedOnPage,
    setSelectedId,
    toggleSelected,
    toggleSelectAll,
    clearSelection,
    
    // Stats
    stats,
    statsLoading,
    
    // Reference data
    departments,
    officers,
    
    // Actions
    load,
    refresh,
    updateStatusInline,
    
    // Bulk operations
    bulkState,
    updateBulkState,
    bulkProgress,
    setBulkProgress,
    runBulkAssignDept,
    runBulkChangeStatus,
    runBulkAssignOfficer,
    runBulkChangeSeverity,
    
    // Dialogs
    confirmDialog,
    setConfirmDialog,
    passwordDialog,
    setPasswordDialog,
    
    // Map preview
    mapPreview,
    setMapPreview,
    
    // Utility
    toLabel,
    formatRelativeDate,
    
    // Status transitions
    statusTransitions,
  };
}
