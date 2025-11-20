/**
 * API Error Handler Service
 * Handles common API errors gracefully, especially for unimplemented endpoints
 */

import { createLogger } from '@shared/utils/logger';

const log = createLogger('ErrorHandler');

class ApiErrorHandler {
  private ignoredEndpoints = new Set([
    '/users/me/activity',
    '/analytics/dashboard', 
    '/reports/analytics',
    '/users/me/notifications',
    '/reports/nearby',
  ]);

  /**
   * Check if an error should be ignored (e.g., unimplemented endpoints)
   */
  shouldIgnoreError(error: any, endpoint?: string): boolean {
    // Ignore 404/422 errors for known unimplemented endpoints
    if (endpoint && (error?.response?.status === 404 || error?.response?.status === 422)) {
      const cleanEndpoint = endpoint.split('?')[0]; // Remove query params
      if (this.ignoredEndpoints.has(cleanEndpoint)) {
        log.debug(`Ignoring ${error?.response?.status} for unimplemented endpoint: ${cleanEndpoint}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle API error with appropriate logging level
   */
  handleError(error: any, endpoint?: string): void {
    if (this.shouldIgnoreError(error, endpoint)) {
      return; // Silently ignore
    }

    // Log other errors normally
    if (error?.response?.status >= 500) {
      log.error(`Server error (${error.response.status}) for ${endpoint}:`, error);
    } else if (error?.response?.status >= 400) {
      log.warn(`Client error (${error.response.status}) for ${endpoint}:`, error);
    } else {
      log.error(`Network error for ${endpoint}:`, error);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: any): string {
    if (error?.response?.status === 404) {
      return 'The requested resource was not found.';
    } else if (error?.response?.status === 403) {
      return 'You do not have permission to access this resource.';
    } else if (error?.response?.status === 401) {
      return 'Please log in to continue.';
    } else if (error?.response?.status >= 500) {
      return 'Server error. Please try again later.';
    } else if (error?.code === 'NETWORK_ERROR') {
      return 'Network error. Please check your connection.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Add endpoint to ignore list (for development)
   */
  addIgnoredEndpoint(endpoint: string): void {
    this.ignoredEndpoints.add(endpoint);
    log.debug(`Added ${endpoint} to ignored endpoints list`);
  }

  /**
   * Remove endpoint from ignore list
   */
  removeIgnoredEndpoint(endpoint: string): void {
    this.ignoredEndpoints.delete(endpoint);
    log.debug(`Removed ${endpoint} from ignored endpoints list`);
  }
}

export const apiErrorHandler = new ApiErrorHandler();
export default apiErrorHandler;
