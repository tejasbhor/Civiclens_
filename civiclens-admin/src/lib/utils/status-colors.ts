/**
 * Centralized Status Color Utilities
 * Ensures consistent status colors across the entire application
 * Following the unified design system
 */

export type ReportStatus =
  | 'received'
  | 'pending_classification'
  | 'classified'
  | 'assigned'
  | 'assigned_to_department'
  | 'assigned_to_officer'
  | 'acknowledged'
  | 'in_progress'
  | 'pending_verification'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'duplicate'
  | 'on_hold'
  | 'reopened';

export type TaskStatus =
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'pending_verification'
  | 'resolved'
  | 'rejected'
  | 'on_hold';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Get Tailwind CSS classes for status badges
 * Returns consistent background and text colors
 */
export function getStatusBadgeClasses(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  
  const statusMap: Record<string, string> = {
    received: 'bg-blue-500 text-white',
    pending_classification: 'bg-yellow-500 text-white',
    classified: 'bg-purple-500 text-white',
    assigned: 'bg-blue-600 text-white',
    assigned_to_department: 'bg-blue-600 text-white',
    assigned_to_officer: 'bg-blue-600 text-white',
    acknowledged: 'bg-indigo-500 text-white',
    in_progress: 'bg-amber-500 text-white',
    pending_verification: 'bg-purple-600 text-white',
    resolved: 'bg-green-500 text-white',
    reopened: 'bg-orange-600 text-white',
    closed: 'bg-gray-500 text-white',
    rejected: 'bg-red-500 text-white',
    duplicate: 'bg-orange-500 text-white',
    on_hold: 'bg-gray-600 text-white',
  };
  
  return statusMap[normalizedStatus] || 'bg-gray-400 text-white';
}

/**
 * Get single background color class for status
 * Useful for indicators, dots, etc.
 */
export function getStatusColorClass(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  
  const colorMap: Record<string, string> = {
    received: 'bg-blue-500',
    pending_classification: 'bg-yellow-500',
    classified: 'bg-purple-500',
    assigned: 'bg-blue-600',
    assigned_to_department: 'bg-blue-600',
    assigned_to_officer: 'bg-blue-600',
    acknowledged: 'bg-indigo-500',
    in_progress: 'bg-amber-500',
    pending_verification: 'bg-purple-600',
    resolved: 'bg-green-500',
    reopened: 'bg-orange-600',
    closed: 'bg-gray-500',
    rejected: 'bg-red-500',
    duplicate: 'bg-orange-500',
    on_hold: 'bg-gray-600',
  };
  
  return colorMap[normalizedStatus] || 'bg-gray-400';
}

/**
 * Get severity/priority color classes
 * Returns text color for severity indicators
 */
export function getSeverityColorClass(severity: string): string {
  const normalizedSeverity = severity.toLowerCase();
  
  const severityMap: Record<string, string> = {
    critical: 'text-red-600 font-semibold',
    high: 'text-red-500 font-medium',
    medium: 'text-amber-500 font-medium',
    low: 'text-blue-400',
  };
  
  return severityMap[normalizedSeverity] || 'text-gray-500';
}

/**
 * Get severity badge classes (with background)
 */
export function getSeverityBadgeClasses(severity: string): string {
  const normalizedSeverity = severity.toLowerCase();
  
  const severityMap: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  
  return severityMap[normalizedSeverity] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Get Lucide icon name for status
 * Returns the icon component name to be imported from lucide-react
 * 
 * @example
 * import { CheckCircle2, Clock } from 'lucide-react';
 * const iconName = getStatusIconName(status);
 */
export function getStatusIconName(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  
  const iconMap: Record<string, string> = {
    received: 'Inbox',
    pending_classification: 'HelpCircle',
    classified: 'Tags',
    assigned: 'ClipboardList',
    assigned_to_department: 'Building2',
    assigned_to_officer: 'UserCheck',
    acknowledged: 'Eye',
    in_progress: 'Loader2',
    pending_verification: 'Clock',
    resolved: 'CheckCircle2',
    reopened: 'RefreshCw',
    closed: 'Lock',
    rejected: 'XCircle',
    duplicate: 'Copy',
    on_hold: 'Pause',
  };
  
  return iconMap[normalizedStatus] || 'FileText';
}

/**
 * Get human-readable label from status/severity string
 * Converts snake_case to Title Case
 */
export function toLabel(str: string): string {
  if (!str) return '';
  
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get status progress percentage
 * For progress bars and completion tracking
 */
export function getStatusProgress(status: string): number {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  
  const progressMap: Record<string, number> = {
    received: 10,
    pending_classification: 15,
    classified: 20,
    assigned: 30,
    assigned_to_department: 35,
    assigned_to_officer: 40,
    acknowledged: 50,
    in_progress: 70,
    pending_verification: 85,
    resolved: 100,
    reopened: 60,
    closed: 100,
    rejected: 0,
    duplicate: 0,
    on_hold: 50,
  };
  
  return progressMap[normalizedStatus] || 0;
}

/**
 * Check if status is terminal (final state)
 */
export function isTerminalStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  return ['resolved', 'closed', 'rejected', 'duplicate'].includes(normalizedStatus);
}

/**
 * Check if status is active (requires action)
 */
export function isActiveStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  return ['assigned', 'assigned_to_officer', 'acknowledged', 'in_progress', 'pending_verification'].includes(normalizedStatus);
}

/**
 * Get next possible statuses for workflow
 */
export function getNextStatuses(currentStatus: string): string[] {
  const normalizedStatus = currentStatus.toLowerCase().replace(/ /g, '_');
  
  const workflowMap: Record<string, string[]> = {
    received: ['pending_classification', 'classified', 'rejected', 'duplicate'],
    pending_classification: ['classified', 'rejected'],
    classified: ['assigned_to_department', 'rejected'],
    assigned_to_department: ['assigned_to_officer', 'rejected'],
    assigned: ['acknowledged', 'rejected'],
    assigned_to_officer: ['acknowledged', 'rejected'],
    acknowledged: ['in_progress', 'rejected', 'on_hold'],
    in_progress: ['pending_verification', 'resolved', 'on_hold'],
    pending_verification: ['resolved', 'in_progress'],
    on_hold: ['in_progress', 'rejected'],
    resolved: ['closed', 'reopened'],
    reopened: ['in_progress'],
    closed: ['reopened'],
    rejected: [],
    duplicate: [],
  };
  
  return workflowMap[normalizedStatus] || [];
}
