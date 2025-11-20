/**
 * Appeal types matching backend enums
 * Ensures consistency with backend app/models/appeal.py
 */

export enum AppealType {
  // Citizen Appeals
  CLASSIFICATION = 'classification',
  RESOLUTION = 'resolution',
  REJECTION = 'rejection',
  
  // Officer Appeals
  INCORRECT_ASSIGNMENT = 'incorrect_assignment',
  WORKLOAD = 'workload',
  RESOURCE_LACK = 'resource_lack',
  
  // Admin Appeals
  QUALITY_CONCERN = 'quality_concern',
}

export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface Appeal {
  id: number;
  report_id: number;
  user_id: number;
  appeal_type: AppealType;
  status: AppealStatus;
  reason: string;
  evidence?: string;
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AppealCreateRequest {
  report_id: number;
  appeal_type: AppealType;
  reason: string;
  evidence?: string;
}

export interface AppealResponse extends Appeal {
  report?: {
    id: number;
    report_number?: string;
    title: string;
    status: string;
  };
  user?: {
    id: number;
    full_name?: string;
    phone: string;
  };
  reviewer?: {
    id: number;
    full_name?: string;
  };
}
