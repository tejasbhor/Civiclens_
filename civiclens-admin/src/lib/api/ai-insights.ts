/**
 * AI Insights & Predictions API Client
 * Handles duplicate clusters, AI metrics, and pipeline monitoring
 */

import { apiClient } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicateCluster {
  primary_report_id: number;
  primary_report_number: string | null;
  primary_title: string;
  primary_status: string;
  primary_created_at: string;
  duplicate_count: number;
  duplicates: Array<{
    id: number;
    report_number: string | null;
    title: string;
    status: string;
    created_at: string;
    user_id: number;
    ai_confidence: number | null;
  }>;
  location: {
    latitude: number;
    longitude: number;
  };
  category: string | null;
  severity: string;
  total_reports: number;
}

export interface AIMetrics {
  total_processed: number;
  processed_today: number;
  processed_this_week: number;
  avg_confidence: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  low_confidence_count: number;
  needs_review_count: number;
  duplicate_detection_count: number;
  classification_accuracy: number | null;
  avg_processing_time: number | null;
}

export interface PipelineStatus {
  worker_status: 'running' | 'stopped' | 'unknown';
  queue_length: number;
  failed_queue_length: number;
  last_heartbeat: string | null;
  reports_in_queue: Array<{
    id: number;
    report_number: string | null;
    title: string;
    status: string;
    created_at: string;
  }>;
}

export interface CategoryInsights {
  category: string;
  total_reports: number;
  ai_classified: number;
  manual_classified: number;
  avg_confidence: number;
  accuracy_rate: number | null;
}

export interface MergeDuplicatesRequest {
  primary_report_id: number;
  duplicate_report_ids: number[];
  notes?: string;
}

export interface UnmarkDuplicateRequest {
  report_id: number;
  notes?: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

export const aiInsightsApi = {
  /**
   * Get duplicate clusters
   */
  async getDuplicateClusters(params?: {
    status?: string;
    category?: string;
    min_duplicates?: number;
    limit?: number;
  }): Promise<DuplicateCluster[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.min_duplicates) queryParams.append('min_duplicates', params.min_duplicates.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/ai-insights/duplicate-clusters${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<DuplicateCluster[]>(url);
    return response.data;
  },

  /**
   * Get AI pipeline metrics
   */
  async getMetrics(days: number = 30): Promise<AIMetrics> {
    const response = await apiClient.get<AIMetrics>(`/ai-insights/metrics?days=${days}`);
    return response.data;
  },

  /**
   * Get real-time pipeline status
   */
  async getPipelineStatus(): Promise<PipelineStatus> {
    const response = await apiClient.get<PipelineStatus>('/ai-insights/pipeline-status');
    return response.data;
  },

  /**
   * Get category-wise insights
   */
  async getCategoryInsights(days: number = 30): Promise<CategoryInsights[]> {
    const response = await apiClient.get<CategoryInsights[]>(`/ai-insights/category-insights?days=${days}`);
    return response.data;
  },

  /**
   * Merge duplicate reports
   */
  async mergeDuplicates(request: MergeDuplicatesRequest): Promise<{
    success: boolean;
    merged_count: number;
    primary_report_id: number;
    message: string;
  }> {
    const response = await apiClient.post('/ai-insights/merge-duplicates', request);
    return response.data;
  },

  /**
   * Unmark a report as duplicate (false positive)
   */
  async unmarkDuplicate(request: UnmarkDuplicateRequest): Promise<{
    success: boolean;
    report_id: number;
    message: string;
  }> {
    const response = await apiClient.post('/ai-insights/unmark-duplicate', request);
    return response.data;
  },

  /**
   * Get pending reports for AI processing
   */
  async getPendingReports(limit: number = 100): Promise<Array<{
    id: number;
    report_number: string | null;
    title: string;
    status: string;
    severity: string;
    category: string | null;
    created_at: string;
    needs_review: boolean;
    classified_by_user_id: number | null;
    department_id: number | null;
  }>> {
    const response = await apiClient.get(`/ai-insights/pending-reports?limit=${limit}`);
    return response.data;
  },

  /**
   * Process multiple reports through AI pipeline
   */
  async processReports(reportIds: number[], force: boolean = false): Promise<{
    success: boolean;
    queued_count: number;
    skipped_count: number;
    total_requested: number;
    skip_reasons?: Record<number, string>;
    errors: Array<any>;
    message: string;
  }> {
    const response = await apiClient.post('/ai-insights/process-reports', {
      report_ids: reportIds,
      force
    });
    return response.data;
  },

  /**
   * Reprocess a single report
   */
  async reprocessReport(reportId: number, force: boolean = false): Promise<{
    success: boolean;
    report_id: number;
    result?: any;
    error?: string;
    message: string;
  }> {
    const response = await apiClient.post(`/ai-insights/reprocess-report/${reportId}?force=${force}`);
    return response.data;
  },
};
