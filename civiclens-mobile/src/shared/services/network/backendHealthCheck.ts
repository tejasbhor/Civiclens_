/**
 * Backend Health Check Service - Production Ready
 * Checks if backend is reachable and healthy, not just internet connectivity
 */

import { apiClient } from '@shared/services/api/apiClient';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('BackendHealth');

interface HealthCheckResult {
  isBackendReachable: boolean;
  responseTime?: number;
  lastChecked: number;
}

class BackendHealthCheckService {
  private lastResult: HealthCheckResult | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(result: HealthCheckResult) => void> = new Set();
  
  // Cache health check for 10 seconds to avoid excessive requests
  private readonly CACHE_DURATION = 10000;
  
  /**
   * Check if backend is reachable and healthy
   */
  async checkHealth(skipCache: boolean = false): Promise<HealthCheckResult> {
    // Return cached result if fresh
    if (!skipCache && this.lastResult && 
        (Date.now() - this.lastResult.lastChecked) < this.CACHE_DURATION) {
      return this.lastResult;
    }

    const startTime = Date.now();
    
    try {
      // Quick health check endpoint (should be lightweight)
      const response = await apiClient.get<any>('/health', {
        timeout: 5000, // 5 second timeout
        // Don't use retry interceptor for health checks
        headers: { 'X-Skip-Retry': 'true' }
      });
      
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        isBackendReachable: true, // If we got here, backend responded
        responseTime,
        lastChecked: Date.now(),
      };
      
      this.lastResult = result;
      this.notifyListeners(result);
      
      if (result.isBackendReachable) {
        log.debug(`Backend healthy (${responseTime}ms)`);
      } else {
        log.warn('Backend health check returned non-OK status');
      }
      
      return result;
      
    } catch (error: any) {
      const result: HealthCheckResult = {
        isBackendReachable: false,
        lastChecked: Date.now(),
      };
      
      this.lastResult = result;
      this.notifyListeners(result);
      
      // Only log as warn, not error (backend might be intentionally down)
      log.warn('Backend unreachable:', error.code || error.message);
      
      return result;
    }
  }

  /**
   * Quick synchronous check using cached result
   */
  isBackendHealthy(): boolean {
    if (!this.lastResult) {
      return false; // Unknown state - assume unhealthy
    }
    
    // Consider stale if older than cache duration
    const isStale = (Date.now() - this.lastResult.lastChecked) > this.CACHE_DURATION;
    if (isStale) {
      // Trigger async refresh but return last known state
      this.checkHealth().catch(() => {});
      return this.lastResult.isBackendReachable;
    }
    
    return this.lastResult.isBackendReachable;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      return; // Already running
    }
    
    log.info(`Starting periodic health checks (every ${intervalMs}ms)`);
    
    // Initial check
    this.checkHealth().catch(() => {});
    
    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkHealth().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log.info('Stopped periodic health checks');
    }
  }

  /**
   * Add listener for health status changes
   */
  addListener(listener: (result: HealthCheckResult) => void): () => void {
    this.listeners.add(listener);
    
    // Send current status immediately if available
    if (this.lastResult) {
      listener(this.lastResult);
    }
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of health status change
   */
  private notifyListeners(result: HealthCheckResult): void {
    this.listeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        log.error('Error in health check listener:', error);
      }
    });
  }

  /**
   * Get last health check result
   */
  getLastResult(): HealthCheckResult | null {
    return this.lastResult;
  }

  /**
   * Clear cached result and force new check
   */
  async refresh(): Promise<HealthCheckResult> {
    return this.checkHealth(true);
  }
}

// Export singleton instance
export const backendHealthCheck = new BackendHealthCheckService();
