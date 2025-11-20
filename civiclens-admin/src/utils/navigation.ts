/**
 * Navigation utilities with path validation for security
 * Admin dashboard version
 */

/**
 * Validates and sanitizes navigation paths
 * Prevents open redirect vulnerabilities
 */
export function validateNavigationPath(path: string, allowedPrefixes: string[]): string | null {
  // Remove leading/trailing slashes for comparison
  const normalizedPath = path.trim().replace(/^\/+|\/+$/g, '');
  
  // Check if path starts with any allowed prefix
  const isValid = allowedPrefixes.some(prefix => {
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return normalizedPath === normalizedPrefix || normalizedPath.startsWith(normalizedPrefix + '/');
  });
  
  if (!isValid) {
    console.warn(`Invalid navigation path: ${path}. Allowed prefixes: ${allowedPrefixes.join(', ')}`);
    return null;
  }
  
  // Ensure path starts with /
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Get navigation path for a notification in admin dashboard
 */
export function getNotificationNavigationPath(
  notification: {
    related_report_id?: number;
    related_task_id?: number;
    related_appeal_id?: number;
    related_escalation_id?: number;
    action_url?: string;
  }
): string | null {
  // Define allowed prefixes for admin dashboard
  const allowedPrefixes = [
    '/dashboard/reports/manage',
    '/dashboard/reports',
    '/dashboard/tasks',
    '/dashboard/appeals',
    '/dashboard/escalations',
    '/dashboard',
  ];

  // Priority: related_report_id > related_task_id > related_appeal_id > related_escalation_id > action_url
  if (notification.related_report_id) {
    return validateNavigationPath(`/dashboard/reports/manage/${notification.related_report_id}`, allowedPrefixes);
  }

  if (notification.related_task_id) {
    // Admin doesn't have task detail page, navigate to tasks list
    return validateNavigationPath('/dashboard/tasks', allowedPrefixes);
  }

  if (notification.related_appeal_id) {
    return validateNavigationPath(`/dashboard/appeals/${notification.related_appeal_id}`, allowedPrefixes);
  }

  if (notification.related_escalation_id) {
    return validateNavigationPath(`/dashboard/escalations/${notification.related_escalation_id}`, allowedPrefixes);
  }

  if (notification.action_url) {
    return validateNavigationPath(notification.action_url, allowedPrefixes);
  }

  return null;
}


