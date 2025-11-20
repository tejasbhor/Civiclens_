/**
 * Production-Ready Report State Management
 * 
 * Features:
 * - Single source of truth
 * - Proper state machine (loading/loaded/empty/error)
 * - Empty state as first-class citizen
 * - Circuit breaker pattern
 * - Smart caching with TTL
 * - Optimistic updates
 * - Comprehensive error handling
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Report, ReportCreate, ReportFilters, ReportStats } from '@shared/types/report';
import { reportApi, ReportResponse } from '@shared/services/api/reportApi';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('ProductionReportStore');

// Type converter to transform API response to internal Report type
const convertReportResponseToReport = (response: ReportResponse): Report => ({
  id: response.id,
  report_number: response.report_number,
  user_id: response.user_id,
  department_id: response.department_id,
  title: response.title,
  description: response.description,
  category: response.category as any, // API returns string, we need enum
  sub_category: response.sub_category,
  severity: response.severity as any, // API returns string, we need enum
  latitude: response.latitude,
  longitude: response.longitude,
  address: response.address,
  landmark: response.landmark,
  ward_number: response.ward_number,
  status: response.status as any, // API returns string, we need enum
  photos: response.photos || [],
  videos: response.videos,
  ai_category: response.ai_category,
  ai_confidence: response.ai_confidence,
  ai_processed_at: response.ai_processed_at ? new Date(response.ai_processed_at) : undefined,
  is_public: response.is_public,
  is_sensitive: response.is_sensitive,
  created_at: new Date(response.created_at),
  updated_at: new Date(response.updated_at),
  is_synced: true // API data is always synced
});

// State Machine Types
export enum ReportLoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  EMPTY = 'empty',
  ERROR = 'error',
  REFRESHING = 'refreshing'
}

export enum ErrorType {
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

interface ReportError {
  type: ErrorType;
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

interface ReportStoreState {
  // Core Data
  reports: Report[];
  stats: ReportStats | null;
  
  // State Machine
  loadingState: ReportLoadingState;
  error: ReportError | null;
  
  // Pagination
  currentPage: number;
  hasMore: boolean;
  totalCount: number;
  
  // Filters
  activeFilters: ReportFilters;
  
  // Circuit Breaker
  circuitBreaker: CircuitBreakerState;
  
  // Cache
  cache: Map<string, CacheEntry<any>>;
  
  // Performance Tracking
  lastLoadTime: number;
  loadDuration: number;
}

interface ReportStoreActions {
  // Core Actions
  fetchMyReports: (options?: { refresh?: boolean; filters?: ReportFilters }) => Promise<void>;
  loadMore: () => Promise<void>;
  submitReport: (report: ReportCreate) => Promise<Report>;
  
  // Filter Management
  setFilters: (filters: ReportFilters) => void;
  clearFilters: () => void;
  
  // Error Handling
  clearError: () => void;
  retry: () => Promise<void>;
  
  // Cache Management
  invalidateCache: (key?: string) => void;
  
  // Circuit Breaker
  resetCircuitBreaker: () => void;
  
  // Utilities
  getReportById: (id: string) => Report | null;
  isStale: (key: string) => boolean;
}

type ReportStore = ReportStoreState & ReportStoreActions;

// Constants
const DEFAULT_PAGE_SIZE = 20;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30 * 1000; // 30 seconds
const DEBOUNCE_TIME = 1000; // 1 second

// Helper Functions
const createCacheKey = (filters: ReportFilters, page: number): string => {
  return `reports_${JSON.stringify(filters)}_${page}`;
};

const parseError = (error: any): ReportError => {
  if (error.response?.status === 429) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'Too many requests. Please wait before trying again.',
      retryable: true,
      retryAfter: 60
    };
  }
  
  if (error.response?.status >= 400 && error.response?.status < 500) {
    return {
      type: ErrorType.VALIDATION,
      message: error.response?.data?.message || 'Invalid request',
      retryable: false
    };
  }
  
  if (error.response?.status >= 500) {
    return {
      type: ErrorType.SERVER,
      message: 'Server error. Please try again later.',
      retryable: true
    };
  }
  
  if (!navigator.onLine) {
    return {
      type: ErrorType.NETWORK,
      message: 'No internet connection. Please check your network.',
      retryable: true
    };
  }
  
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'An unexpected error occurred',
    retryable: true
  };
};

const initialCircuitBreakerState: CircuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  nextRetryTime: 0
};

export const useProductionReportStore = create<ReportStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    reports: [],
    stats: null,
    loadingState: ReportLoadingState.IDLE,
    error: null,
    currentPage: 1,
    hasMore: true,
    totalCount: 0,
    activeFilters: {},
    circuitBreaker: initialCircuitBreakerState,
    cache: new Map(),
    lastLoadTime: 0,
    loadDuration: 0,

    // Core Actions
    fetchMyReports: async (options = {}) => {
      const { refresh = false, filters = {} } = options;
      const state = get();
      
      // Prevent rapid successive calls
      const now = Date.now();
      if (!refresh && (now - state.lastLoadTime) < DEBOUNCE_TIME) {
        log.debug('Debounced: Too soon since last call');
        return;
      }
      
      // Check circuit breaker
      if (state.circuitBreaker.isOpen && now < state.circuitBreaker.nextRetryTime) {
        log.warn('Circuit breaker is open, skipping request');
        return;
      }
      
      // Set loading state
      set({
        loadingState: refresh ? ReportLoadingState.REFRESHING : ReportLoadingState.LOADING,
        error: null,
        lastLoadTime: now,
        activeFilters: filters
      });
      
      const startTime = Date.now();
      
      try {
        // Check cache first (unless refreshing)
        const cacheKey = createCacheKey(filters, 1);
        if (!refresh && state.cache.has(cacheKey)) {
          const cached = state.cache.get(cacheKey)!;
          if (now - cached.timestamp < cached.ttl) {
            log.info('Using cached data');
            set({
              reports: cached.data,
              loadingState: cached.data.length === 0 ? ReportLoadingState.EMPTY : ReportLoadingState.LOADED,
              loadDuration: Date.now() - startTime
            });
            return;
          }
        }
        
        // Fetch from API
        log.info('Fetching reports from API', { filters, refresh });
        const apiReports = await reportApi.getMyReports({
          skip: 0,
          limit: DEFAULT_PAGE_SIZE,
          filters
        });
        
        // Convert API responses to internal Report type
        const reports = apiReports.map(convertReportResponseToReport);
        
        // Cache the result
        state.cache.set(cacheKey, {
          data: reports,
          timestamp: now,
          ttl: CACHE_TTL
        });
        
        // Update state
        set({
          reports,
          loadingState: reports.length === 0 ? ReportLoadingState.EMPTY : ReportLoadingState.LOADED,
          currentPage: 1,
          hasMore: reports.length === DEFAULT_PAGE_SIZE,
          totalCount: reports.length,
          circuitBreaker: initialCircuitBreakerState, // Reset on success
          loadDuration: Date.now() - startTime
        });
        
        log.info(`Successfully loaded ${reports.length} reports`);
        
      } catch (error: any) {
        log.error('Failed to fetch reports', error);
        
        const parsedError = parseError(error);
        const newFailureCount = state.circuitBreaker.failureCount + 1;
        
        // Update circuit breaker
        const circuitBreaker: CircuitBreakerState = {
          isOpen: newFailureCount >= CIRCUIT_BREAKER_THRESHOLD,
          failureCount: newFailureCount,
          lastFailureTime: now,
          nextRetryTime: newFailureCount >= CIRCUIT_BREAKER_THRESHOLD 
            ? now + CIRCUIT_BREAKER_TIMEOUT 
            : 0
        };
        
        set({
          loadingState: ReportLoadingState.ERROR,
          error: parsedError,
          circuitBreaker,
          loadDuration: Date.now() - startTime
        });
        
        if (circuitBreaker.isOpen) {
          log.warn('Circuit breaker opened due to repeated failures');
        }
      }
    },

    loadMore: async () => {
      const state = get();
      
      if (!state.hasMore || state.loadingState === ReportLoadingState.LOADING) {
        return;
      }
      
      const nextPage = state.currentPage + 1;
      const cacheKey = createCacheKey(state.activeFilters, nextPage);
      
      try {
        log.info(`Loading more reports - page ${nextPage}`);
        
        const apiReports = await reportApi.getMyReports({
          skip: (nextPage - 1) * DEFAULT_PAGE_SIZE,
          limit: DEFAULT_PAGE_SIZE,
          filters: state.activeFilters
        });
        
        // Convert API responses to internal Report type
        const newReports = apiReports.map(convertReportResponseToReport);
        
        // Cache the result
        state.cache.set(cacheKey, {
          data: newReports,
          timestamp: Date.now(),
          ttl: CACHE_TTL
        });
        
        // Merge with existing reports (deduplication)
        const existingIds = new Set(state.reports.map(r => r.id).filter(Boolean));
        const uniqueNewReports = newReports.filter(r => r.id && !existingIds.has(r.id));
        
        set({
          reports: [...state.reports, ...uniqueNewReports],
          currentPage: nextPage,
          hasMore: newReports.length === DEFAULT_PAGE_SIZE,
          totalCount: state.totalCount + uniqueNewReports.length
        });
        
        log.info(`Loaded ${uniqueNewReports.length} more reports`);
        
      } catch (error: any) {
        log.error('Failed to load more reports', error);
        set({ error: parseError(error) });
      }
    },

    submitReport: async (reportData: ReportCreate): Promise<Report> => {
      // Optimistic update
      const optimisticReport: Report = {
        ...reportData,
        id: Date.now(), // Temporary numeric ID
        user_id: 0, // Will be set by backend
        status: 'received' as any,
        created_at: new Date(),
        updated_at: new Date(),
        is_synced: false,
        is_public: reportData.is_public ?? true,
        is_sensitive: reportData.is_sensitive ?? false
      };
      
      try {
        log.info('Submitting new report');
        
        set(state => ({
          reports: [optimisticReport, ...state.reports],
          totalCount: state.totalCount + 1
        }));
        
        // Submit to backend
        const apiResponse = await reportApi.submitReport(reportData);
        const submittedReport = convertReportResponseToReport(apiResponse);
        
        // Replace optimistic update with real data
        set(state => ({
          reports: state.reports.map(r => 
            r.id === optimisticReport.id ? submittedReport : r
          )
        }));
        
        // Invalidate cache
        get().invalidateCache();
        
        log.info('Report submitted successfully');
        return submittedReport;
        
      } catch (error: any) {
        // Rollback optimistic update
        set(state => ({
          reports: state.reports.filter(r => r.id !== optimisticReport.id),
          totalCount: Math.max(0, state.totalCount - 1)
        }));
        
        log.error('Failed to submit report', error);
        throw error;
      }
    },

    // Filter Management
    setFilters: (filters: ReportFilters) => {
      set({ activeFilters: filters });
      get().fetchMyReports({ filters, refresh: true });
    },

    clearFilters: () => {
      get().setFilters({});
    },

    // Error Handling
    clearError: () => {
      set({ error: null });
    },

    retry: async () => {
      const state = get();
      await get().fetchMyReports({ 
        filters: state.activeFilters, 
        refresh: true 
      });
    },

    // Cache Management
    invalidateCache: (key?: string) => {
      const state = get();
      if (key) {
        state.cache.delete(key);
      } else {
        state.cache.clear();
      }
      log.info('Cache invalidated', { key: key || 'all' });
    },

    // Circuit Breaker
    resetCircuitBreaker: () => {
      set({ circuitBreaker: initialCircuitBreakerState });
      log.info('Circuit breaker reset');
    },

    // Utilities
    getReportById: (id: string): Report | null => {
      return get().reports.find(r => r.id?.toString() === id) || null;
    },

    isStale: (key: string): boolean => {
      const state = get();
      const cached = state.cache.get(key);
      if (!cached) return true;
      return Date.now() - cached.timestamp > cached.ttl;
    }
  }))
);

// Selectors for optimized re-renders
export const selectReports = (state: ReportStore) => state.reports;
export const selectLoadingState = (state: ReportStore) => state.loadingState;
export const selectError = (state: ReportStore) => state.error;
export const selectStats = (state: ReportStore) => state.stats;
export const selectHasMore = (state: ReportStore) => state.hasMore;
export const selectIsEmpty = (state: ReportStore) => 
  state.loadingState === ReportLoadingState.EMPTY;
export const selectIsLoading = (state: ReportStore) => 
  state.loadingState === ReportLoadingState.LOADING;
export const selectIsRefreshing = (state: ReportStore) => 
  state.loadingState === ReportLoadingState.REFRESHING;
