

// Enums
export enum UserRole {
  CITIZEN = 'citizen',
  CONTRIBUTOR = 'contributor',
  MODERATOR = 'moderator',
  NODAL_OFFICER = 'nodal_officer',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum ReportStatus {
  RECEIVED = 'received',
  PENDING_CLASSIFICATION = 'pending_classification',
  CLASSIFIED = 'classified',
  ASSIGNED_TO_DEPARTMENT = 'assigned_to_department',
  ASSIGNED_TO_OFFICER = 'assigned_to_officer',
  ASSIGNMENT_REJECTED = 'assignment_rejected',  // NEW: Officer rejected assignment
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  PENDING_VERIFICATION = 'pending_verification',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  ON_HOLD = 'on_hold',
  REOPENED = 'reopened',
}

export enum TaskStatus {
  ASSIGNED = 'assigned',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  PENDING_VERIFICATION = 'pending_verification',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ON_HOLD = 'on_hold',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ReportCategory {
  ROADS = 'roads',
  WATER = 'water',
  SANITATION = 'sanitation',
  ELECTRICITY = 'electricity',
  STREETLIGHT = 'streetlight',
  DRAINAGE = 'drainage',
  PUBLIC_PROPERTY = 'public_property',
  OTHER = 'other',
}

// Interfaces
export interface User {
  id: number;
  phone: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  is_active: number;
  reputation_score?: number;
  department_id?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  keywords?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface Report {
  id: number;
  report_number?: string;
  user_id: number;
  title: string;
  description: string;
  category: ReportCategory | string | null;
  sub_category?: string | null;
  severity: ReportSeverity;
  status: ReportStatus;
  status_updated_at?: string;
  
  // Location
  latitude: number;
  longitude: number;
  address?: string | null;
  landmark?: string | null;
  area_type?: string | null;
  ward_number?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  
  // Assignment
  department_id?: number | null;
  
  // Officer Assignment Rejection (NEW)
  assignment_rejection_reason?: string | null;
  assignment_rejected_at?: string | null;
  assignment_rejected_by_user_id?: number | null;
  
  // ON_HOLD Enhancements (NEW)
  estimated_resume_date?: string | null;
  hold_approved_by_user_id?: number | null;
  hold_approval_required?: boolean;
  
  // AI Classification
  ai_category?: string | null;
  ai_confidence?: number | null;
  ai_processed_at?: string | null;
  ai_model_version?: string | null;
  
  // Manual Classification
  manual_category?: string | null;
  manual_severity?: ReportSeverity | null;
  classified_by_user_id?: number | null;
  classification_notes?: string | null;
  
  // Visibility & Flags
  is_public?: boolean;
  is_sensitive?: boolean;
  is_featured?: boolean;
  needs_review?: boolean;
  is_duplicate?: boolean;
  duplicate_of_report_id?: number | null;
  rejection_reason?: string | null;
  hold_reason?: string | null;
  
  // Timestamps
  created_at: string;
  updated_at?: string | null;
  
  // Relationships
  user?: User;
  department?: Department;
  media?: Media[];
  task?: Task;
  classified_by?: User;
  duplicate_of?: Report;
  appeals?: Appeal[];
  escalations?: Escalation[];
  communications?: Communication[];
  
  // Enhanced lifecycle fields
  workflow_state?: WorkflowState;
  sla_status?: SLAStatusInfo;
  escalation_level?: number;
  metrics?: ReportMetrics;
}

export interface Task {
  id: number;
  report_id: number;
  assigned_to: number;
  assigned_by?: number;
  status: TaskStatus;
  priority: number;
  notes?: string;
  resolution_notes?: string;
  assigned_at: string;
  acknowledged_at?: string;
  started_at?: string;
  resolved_at?: string;
  
  // SLA Tracking (NEW)
  sla_deadline?: string | null;
  sla_violated?: number;  // 0=compliant, 1=warning, 2=violated
  sla_violation_count?: number;
  
  // Rejection Tracking (NEW)
  rejection_reason?: string | null;
  rejected_at?: string | null;
  
  report?: Report;
  officer?: User;
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

export enum UploadSource {
  CITIZEN_SUBMISSION = 'citizen_submission',
  OFFICER_BEFORE_PHOTO = 'officer_before_photo',
  OFFICER_AFTER_PHOTO = 'officer_after_photo',
}

export interface Media {
  id: number;
  report_id: number;
  file_url: string;
  file_type: MediaType;
  file_size?: number;
  mime_type?: string;
  is_primary?: boolean;
  is_proof_of_work?: boolean;
  sequence_order?: number;
  caption?: string;
  meta?: Record<string, any>;
  upload_source?: UploadSource;
  uploaded_at: string;
  created_at: string;
  updated_at?: string;
}

export interface DashboardStats {
  total_reports: number;
  pending_tasks: number;
  resolved_today: number;
  high_priority_count: number;
  critical_priority_count: number;
  avg_resolution_time: number;
  reports_by_category: Record<string, number>;
  reports_by_status: Record<string, number>;
  reports_by_severity: Record<string, number>;
  reports_by_department?: Record<string, number>;
}

export interface Officer {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  department_id?: number;
  active_tasks_count: number;
  latitude?: number;
  longitude?: number;
}

export interface AnalyticsData {
  date: string;
  reports: number;
  resolved: number;
  pending: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Appeal types
export enum AppealType {
  CLASSIFICATION = 'classification',
  RESOLUTION = 'resolution',
  REJECTION = 'rejection',
  INCORRECT_ASSIGNMENT = 'incorrect_assignment',
  WORKLOAD = 'workload',
  RESOURCE_LACK = 'resource_lack',
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
  submitted_by_user_id: number;
  appeal_type: AppealType;
  status: AppealStatus;
  reason: string;
  evidence?: string;
  requested_action?: string;
  reviewed_by_user_id?: number;
  review_notes?: string;
  action_taken?: string;
  reassigned_to_user_id?: number;
  reassigned_to_department_id?: number;
  reassignment_reason?: string;
  requires_rework: boolean;
  rework_assigned_to_user_id?: number;
  rework_notes?: string;
  rework_completed: boolean;
  created_at: string;
  updated_at?: string;
}

// Escalation types
export enum EscalationLevel {
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3',
}

export enum EscalationReason {
  SLA_BREACH = 'sla_breach',
  UNRESOLVED = 'unresolved',
  QUALITY_ISSUE = 'quality_issue',
  CITIZEN_COMPLAINT = 'citizen_complaint',
  VIP_ATTENTION = 'vip_attention',
  CRITICAL_PRIORITY = 'critical_priority',
}

export enum EscalationStatus {
  ESCALATED = 'escalated',
  ACKNOWLEDGED = 'acknowledged',
  UNDER_REVIEW = 'under_review',
  ACTION_TAKEN = 'action_taken',
  RESOLVED = 'resolved',
  DE_ESCALATED = 'de_escalated',
}

export interface Escalation {
  id: number;
  report_id: number;
  escalated_by_user_id: number;
  escalated_to_user_id?: number;
  level: EscalationLevel;
  reason: EscalationReason;
  status: EscalationStatus;
  notes: string;
  resolution_notes?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

// Communication types
export interface Communication {
  id: number;
  report_id: number;
  from_user_id: number;
  to_user_id?: number;
  message: string;
  is_internal: boolean;
  created_at: string;
}

// Workflow state
export interface WorkflowState {
  current_stage: string;
  progress_percentage: number;
  estimated_completion?: string;
  bottlenecks?: string[];
}

// SLA status
export interface SLAStatusInfo {
  is_breached: boolean;
  time_remaining?: number;
  breach_time?: string;
  warning_level?: 'green' | 'yellow' | 'red';
}

// Report metrics
export interface ReportMetrics {
  total_time_spent?: number;
  citizen_satisfaction?: number;
  resolution_quality_score?: number;
  officer_performance_score?: number;
}

// Feedback types
export enum SatisfactionLevel {
  VERY_SATISFIED = 'very_satisfied',
  SATISFIED = 'satisfied',
  NEUTRAL = 'neutral',
  DISSATISFIED = 'dissatisfied',
  VERY_DISSATISFIED = 'very_dissatisfied',
}

export interface Feedback {
  id: number;
  report_id: number;
  user_id: number;
  rating: number;
  satisfaction_level: SatisfactionLevel;
  comment?: string;
  resolution_time_acceptable: boolean;
  work_quality_acceptable: boolean;
  officer_behavior_acceptable: boolean;
  would_recommend: boolean;
  requires_followup: boolean;
  followup_reason?: string;
  created_at: string;
  updated_at?: string;
}