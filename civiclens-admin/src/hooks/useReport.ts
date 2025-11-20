/**
 * Custom hook for managing report data with proper error handling and loading states
 * Production-grade implementation with TypeScript strict typing
 */

import { useState, useEffect, useCallback } from 'react';
import { Report } from '@/types';
import { reportsApi, StatusHistoryResponse } from '@/lib/api/reports';
import { AxiosError } from 'axios';

export interface UseReportOptions {
  autoAcknowledge?: boolean;
  onError?: (error: ApiError) => void;
  onSuccess?: (report: Report) => void;
}

export interface ApiError {
  type: 'validation' | 'permission' | 'notfound' | 'server' | 'network' | 'unknown';
  message: string;
  status?: number;
  details?: any;
}

export interface UseReportReturn {
  report: Report | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  updateReport: (data: Partial<Report>) => void;
}

/**
 * Parse API errors into structured format
 */
function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as any;
    
    switch (status) {
      case 400:
        return { type: 'validation', message: data?.detail || 'Invalid request', status, details: data };
      case 403:
        return { type: 'permission', message: 'You do not have permission to perform this action', status };
      case 404:
        return { type: 'notfound', message: 'Report not found', status };
      case 422:
        return { type: 'validation', message: data?.detail || 'Validation error', status, details: data };
      case 500:
        return { type: 'server', message: 'Server error. Please try again later.', status };
      default:
        return { type: 'unknown', message: data?.detail || 'An error occurred', status };
    }
  } else if (error instanceof Error) {
    if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
      return { type: 'network', message: 'Network error. Check your connection.' };
    }
    return { type: 'unknown', message: error.message };
  }
  
  return { type: 'unknown', message: 'An unexpected error occurred' };
}

/**
 * Hook for fetching and managing a single report
 */
export function useReport(reportId: number | null, options: UseReportOptions = {}): UseReportReturn {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchReport = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await reportsApi.getReportById(reportId);
      setReport(data);
      
      // Auto-acknowledge if officer viewing their assigned report
      if (options.autoAcknowledge && data.status === 'assigned_to_officer') {
        try {
          const acknowledged = await reportsApi.acknowledgeReport(reportId);
          setReport(acknowledged);
        } catch (e) {
          // Silently fail - might not be the assigned officer
          console.debug('Auto-acknowledge skipped:', e);
        }
      }
      
      options.onSuccess?.(data);
    } catch (e) {
      const apiError = parseApiError(e);
      setError(apiError);
      options.onError?.(apiError);
    } finally {
      setLoading(false);
    }
  }, [reportId, options.autoAcknowledge]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const updateReport = useCallback((data: Partial<Report>) => {
    setReport(prev => prev ? { ...prev, ...data } : null);
  }, []);

  return {
    report,
    loading,
    error,
    refetch: fetchReport,
    updateReport,
  };
}

/**
 * Hook for fetching report status history
 */
export function useReportHistory(reportId: number | null) {
  const [history, setHistory] = useState<StatusHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getStatusHistory(reportId);
      setHistory(data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  };
}

/**
 * Hook for report mutations (status updates, assignments, etc.)
 */
export function useReportMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(async <T>(
    mutationFn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: ApiError) => void;
      onSettled?: () => void;
    }
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await mutationFn();
      options?.onSuccess?.(result);
      return result;
    } catch (e) {
      const apiError = parseApiError(e);
      setError(apiError);
      options?.onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
      options?.onSettled?.();
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    loading,
    error,
    reset,
  };
}
