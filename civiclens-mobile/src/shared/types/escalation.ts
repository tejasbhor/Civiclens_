/**
 * Escalation types matching backend enums
 * Ensures consistency with backend app/models/escalation.py
 */

export enum EscalationLevel {
  LEVEL_1 = 'level_1', // Department Head
  LEVEL_2 = 'level_2', // City Manager
  LEVEL_3 = 'level_3', // Mayor/Council
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

export interface EscalationCreateRequest {
  report_id: number;
  level: EscalationLevel;
  reason: EscalationReason;
  notes: string;
  escalated_to_user_id?: number;
}

export interface EscalationResponse extends Escalation {
  report?: {
    id: number;
    report_number?: string;
    title: string;
    status: string;
  };
  escalated_by?: {
    id: number;
    full_name?: string;
    role: string;
  };
  escalated_to?: {
    id: number;
    full_name?: string;
    role: string;
  };
}
