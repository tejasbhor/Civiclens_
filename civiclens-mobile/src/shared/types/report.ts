// Report types and interfaces
import { ReportCategory, ReportSeverity, ReportStatus } from '@shared/database/schema';

export interface Report {
  id?: number;
  report_number?: string;
  user_id: number;
  department_id?: number;
  title: string;
  description: string;
  category: ReportCategory;
  sub_category?: string;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_number?: string;
  status: ReportStatus;
  status_updated_at?: Date;
  photos: string[];
  videos?: string[];
  ai_category?: string;
  ai_confidence?: number;
  ai_processed_at?: Date;
  is_public: boolean;
  is_sensitive: boolean;
  created_at: Date;
  updated_at: Date;

  // Local-only fields for offline support
  is_synced?: boolean;
  local_id?: string;
  sync_error?: string;
}

export interface ReportCreate {
  title: string;
  description: string;
  category: ReportCategory;
  sub_category?: string;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_number?: string;
  photos: string[];
  videos?: string[];
  is_public?: boolean;
  is_sensitive?: boolean;
}

export interface ReportUpdate {
  title?: string;
  description?: string;
  category?: ReportCategory;
  sub_category?: string;
  severity?: ReportSeverity;
  latitude?: number;
  longitude?: number;
  address?: string;
  landmark?: string;
  ward_number?: string;
  is_public?: boolean;
  is_sensitive?: boolean;
}

export interface ReportFilters {
  status?: ReportStatus[];
  category?: ReportCategory[];
  severity?: ReportSeverity[];
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

export interface ReportListParams {
  skip?: number;
  limit?: number;
  filters?: ReportFilters;
}

export interface NearbyReportsParams {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
  status?: ReportStatus[];
  category?: ReportCategory[];
  severity?: ReportSeverity[];
  limit?: number;
}

export interface ReportStats {
  total: number;
  received: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export { ReportCategory, ReportSeverity, ReportStatus };
