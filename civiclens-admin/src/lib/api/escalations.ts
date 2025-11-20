import apiClient from './client';

// Types
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
  description: string;
  previous_actions?: string;
  urgency_notes?: string;
  acknowledged_at?: string;
  response_notes?: string;
  action_taken?: string;
  resolved_at?: string;
  sla_deadline?: string;
  is_overdue: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EscalationCreate {
  report_id: number;
  level: EscalationLevel;
  reason: EscalationReason;
  description: string;
  previous_actions?: string;
  urgency_notes?: string;
  escalated_to_user_id?: number;
  sla_hours?: number;
}

export interface EscalationUpdate {
  status: EscalationStatus;
  response_notes?: string;
  action_taken?: string;
}

export interface EscalationStats {
  total: number;
  by_level: Record<string, number>;
  by_status: Record<string, number>;
  overdue: number;
}

// API
export const escalationsApi = {
  // Create escalation
  create: async (data: EscalationCreate): Promise<Escalation> => {
    const response = await apiClient.post('/escalations', data);
    return response.data;
  },

  // List escalations
  list: async (params?: {
    status?: EscalationStatus;
    level?: EscalationLevel;
    is_overdue?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Escalation[]> => {
    const response = await apiClient.get('/escalations', { params });
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<EscalationStats> => {
    const response = await apiClient.get('/escalations/stats');
    return response.data;
  },

  // Get by ID
  getById: async (id: number): Promise<Escalation> => {
    const response = await apiClient.get(`/escalations/${id}`);
    return response.data;
  },

  // Acknowledge escalation
  acknowledge: async (id: number): Promise<Escalation> => {
    const response = await apiClient.post(`/escalations/${id}/acknowledge`);
    return response.data;
  },

  // Update escalation
  update: async (id: number, data: EscalationUpdate): Promise<Escalation> => {
    const response = await apiClient.post(`/escalations/${id}/update`, data);
    return response.data;
  },

  // Check overdue
  checkOverdue: async (): Promise<{ marked_overdue: number }> => {
    const response = await apiClient.post('/escalations/check-overdue');
    return response.data;
  },
};
