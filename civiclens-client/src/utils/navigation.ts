/**
 * Navigation utilities with path validation for security
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
 * Get navigation path for a notification based on portal type
 */
export function getNotificationNavigationPath(
  notification: {
    related_report_id?: number;
    related_task_id?: number;
    action_url?: string;
  },
  portalType: 'citizen' | 'officer' | 'admin'
): string | null {
  // Define allowed prefixes for each portal
  const allowedPrefixes = {
    citizen: ['/citizen/track', '/citizen/reports', '/citizen/dashboard'],
    officer: ['/officer/task', '/officer/tasks', '/officer/dashboard'],
    admin: ['/dashboard/reports/manage', '/dashboard/tasks', '/dashboard'],
  };

  const prefixes = allowedPrefixes[portalType];

  // Priority: related_report_id > related_task_id > action_url
  if (notification.related_report_id) {
    if (portalType === 'citizen') {
      return validateNavigationPath(`/citizen/track/${notification.related_report_id}`, prefixes);
    } else if (portalType === 'officer') {
      return validateNavigationPath(`/officer/tasks?report=${notification.related_report_id}`, prefixes);
    } else if (portalType === 'admin') {
      return validateNavigationPath(`/dashboard/reports/manage/${notification.related_report_id}`, prefixes);
    }
  }

  if (notification.related_task_id) {
    if (portalType === 'officer') {
      return validateNavigationPath(`/officer/task/${notification.related_task_id}`, prefixes);
    } else if (portalType === 'admin') {
      // Admin doesn't have task detail page, navigate to tasks list
      return validateNavigationPath('/dashboard/tasks', prefixes);
    } else if (portalType === 'citizen') {
      // For citizens, navigate to reports if task is referenced
      return validateNavigationPath('/citizen/reports', prefixes);
    }
  }

  if (notification.action_url) {
    return validateNavigationPath(notification.action_url, prefixes);
  }

  return null;
}


