// Report API service
import { apiClient } from './apiClient';
import {
  Report,
  ReportCreate,
  ReportListParams,
  NearbyReportsParams,
} from '@shared/types/report';

export interface ReportResponse {
  id: number;
  report_number: string;
  user_id: number;
  department_id?: number;
  title: string;
  description: string;
  category: string;
  sub_category?: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_number?: string;
  photos?: string[];
  videos?: string[];
  ai_category?: string;
  ai_confidence?: number;
  ai_processed_at?: string;
  is_public: boolean;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportDetailResponse extends ReportResponse {
  user: {
    id: number;
    full_name: string;
    phone: string;
  };
  department?: {
    id: number;
    name: string;
  };
  task?: {
    id: number;
    status: string;
    assigned_to: number;
    officer: {
      id: number;
      full_name: string;
      phone: string;
    };
  };
  media: Array<{
    id: number;
    file_url: string;
    file_type: string;
    is_primary: boolean;
  }>;
}

export interface MapDataResponse {
  reports: Array<{
    id: number;
    lat: number;
    lng: number;
    severity: string;
    status: string;
    category: string;
    report_number: string;
  }>;
  count: number;
  cached: boolean;
}

class ReportApi {
  /**
   * Submit a new report
   */
  async submitReport(data: ReportCreate): Promise<ReportResponse> {
    return await apiClient.post<ReportResponse>('/reports/', data);
  }

  /**
   * Get user's reports
   * Uses the correct /reports/my-reports endpoint for user-specific reports
   */
  async getMyReports(params?: ReportListParams): Promise<ReportResponse[]> {
    const response = await apiClient.get<ReportResponse[]>('/reports/my-reports', {
      params: {
        skip: params?.skip || 0,
        limit: params?.limit || 20,
        status: params?.filters?.status?.[0],
        severity: params?.filters?.severity?.[0],
        category: params?.filters?.category?.[0],
      },
    });
    
    // Backend returns array directly for my-reports endpoint
    return response || [];
  }

  /**
   * Get report detail by ID
   */
  async getReportDetail(id: number): Promise<ReportDetailResponse> {
    return await apiClient.get<ReportDetailResponse>(`/reports/${id}`);
  }

  /**
   * Get nearby reports for map view
   */
  async getNearbyReports(params: NearbyReportsParams): Promise<MapDataResponse> {
    return await apiClient.get<MapDataResponse>('/reports/map-data', {
      params: {
        lat: params.latitude,
        lng: params.longitude,
        radius: params.radius,
        status: params.status?.join(','),
        category: params.category?.join(','),
        severity: params.severity?.join(','),
        limit: params.limit || 100,
      },
    });
  }

  /**
   * Upvote a report
   */
  async upvoteReport(id: number): Promise<void> {
    await apiClient.post(`/reports/${id}/upvote`, {});
  }

  /**
   * Comment on a report
   */
  async commentOnReport(id: number, comment: string): Promise<void> {
    await apiClient.post(`/reports/${id}/comments`, { comment });
  }

  /**
   * Update report
   */
  async updateReport(id: number, data: Partial<ReportCreate>): Promise<ReportResponse> {
    return await apiClient.put<ReportResponse>(`/reports/${id}`, data);
  }

  /**
   * Delete report
   */
  async deleteReport(id: number): Promise<void> {
    await apiClient.delete(`/reports/${id}`, {});
  }
}

export const reportApi = new ReportApi();
