// Production-Ready Upload Retry Logic for CivicLens
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
  timeout: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryableErrors: [
    'Network error',
    'timeout',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    '408', // Request Timeout
    '429', // Too Many Requests
    '500', // Internal Server Error
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504'  // Gateway Timeout
  ],
  timeout: 300000 // 5 minutes
};

export class UploadRetryManager {
  private config: RetryConfig;
  private activeUploads: Map<string, AbortController> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute upload with retry logic
   */
  async executeWithRetry<T>(
    uploadId: string,
    uploadFunction: (signal: AbortSignal) => Promise<T>,
    onProgress?: (attempt: number, error?: Error) => void
  ): Promise<T> {
    let lastError: Error;
    
    // Create abort controller for this upload
    const abortController = new AbortController();
    this.activeUploads.set(uploadId, abortController);

    try {
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          // Check if upload was cancelled
          if (abortController.signal.aborted) {
            throw new Error('Upload cancelled');
          }

          // Execute upload with timeout
          const result = await this.withTimeout(
            uploadFunction(abortController.signal),
            this.config.timeout,
            abortController.signal
          );

          // Success - clean up and return
          this.activeUploads.delete(uploadId);
          return result;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Check if error is retryable
          if (!this.isRetryableError(lastError) || attempt === this.config.maxRetries) {
            break;
          }

          // Calculate delay for next attempt
          const delay = this.calculateDelay(attempt);
          
          if (onProgress) {
            onProgress(attempt + 1, lastError);
          }

          // Wait before retry (unless cancelled)
          await this.delay(delay, abortController.signal);
        }
      }

      // All retries exhausted
      this.activeUploads.delete(uploadId);
      throw new Error(`Upload failed after ${this.config.maxRetries + 1} attempts: ${lastError.message}`);

    } catch (error) {
      this.activeUploads.delete(uploadId);
      throw error;
    }
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string): boolean {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active uploads
   */
  cancelAllUploads(): void {
    for (const [uploadId, controller] of this.activeUploads) {
      controller.abort();
    }
    this.activeUploads.clear();
  }

  /**
   * Get list of active upload IDs
   */
  getActiveUploads(): string[] {
    return Array.from(this.activeUploads.keys());
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    return this.config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorName.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.min(delay + jitter, this.config.maxDelay);
  }

  /**
   * Delay with cancellation support
   */
  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      if (signal) {
        const abortHandler = () => {
          clearTimeout(timeout);
          reject(new Error('Cancelled'));
        };
        
        signal.addEventListener('abort', abortHandler, { once: true });
      }
    });
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    signal?: AbortSignal
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      if (signal) {
        const abortHandler = () => {
          clearTimeout(timeout);
          reject(new Error('Operation cancelled'));
        };
        
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Get upload statistics
   */
  getStats(): {
    activeUploads: number;
    totalCancelled: number;
  } {
    return {
      activeUploads: this.activeUploads.size,
      totalCancelled: 0 // Could be tracked if needed
    };
  }
}

// Export singleton instance
export const uploadRetryManager = new UploadRetryManager();

/**
 * Utility function to create upload with retry
 */
export async function uploadWithRetry<T>(
  uploadId: string,
  uploadFunction: (signal: AbortSignal) => Promise<T>,
  config?: Partial<RetryConfig>,
  onProgress?: (attempt: number, error?: Error) => void
): Promise<T> {
  const manager = config ? new UploadRetryManager(config) : uploadRetryManager;
  return manager.executeWithRetry(uploadId, uploadFunction, onProgress);
}

/**
 * Network error detection utilities
 */
export class NetworkErrorDetector {
  /**
   * Classify error type for better user messaging
   */
  static classifyError(error: Error): {
    type: 'network' | 'server' | 'client' | 'timeout' | 'cancelled' | 'unknown';
    userMessage: string;
    retryable: boolean;
  } {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        name.includes('networkerror') || message.includes('econnreset')) {
      return {
        type: 'network',
        userMessage: 'Network connection issue. Please check your internet connection.',
        retryable: true
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'timeout',
        userMessage: 'Upload timed out. This may be due to a slow connection or large file size.',
        retryable: true
      };
    }

    // Cancelled errors
    if (message.includes('cancel') || message.includes('abort')) {
      return {
        type: 'cancelled',
        userMessage: 'Upload was cancelled.',
        retryable: false
      };
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || 
        message.includes('503') || message.includes('504')) {
      return {
        type: 'server',
        userMessage: 'Server error. Please try again in a few moments.',
        retryable: true
      };
    }

    // Client errors (4xx)
    if (message.includes('400') || message.includes('401') || 
        message.includes('403') || message.includes('404')) {
      return {
        type: 'client',
        userMessage: 'Request error. Please check your file and try again.',
        retryable: false
      };
    }

    // Rate limiting
    if (message.includes('429') || message.includes('rate limit')) {
      return {
        type: 'server',
        userMessage: 'Too many requests. Please wait a moment before trying again.',
        retryable: true
      };
    }

    // Unknown error
    return {
      type: 'unknown',
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true
    };
  }

  /**
   * Check if device is online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Estimate connection quality
   */
  static getConnectionInfo(): {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } {
    // @ts-ignore - NetworkInformation is not in all TypeScript definitions
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
      return {};
    }

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  /**
   * Recommend upload strategy based on connection
   */
  static getUploadRecommendation(): {
    chunkSize: number;
    concurrent: number;
    compression: boolean;
  } {
    const connection = this.getConnectionInfo();
    
    // Default recommendations
    let chunkSize = 1024 * 1024; // 1MB
    let concurrent = 2;
    let compression = true;

    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          chunkSize = 256 * 1024; // 256KB
          concurrent = 1;
          compression = true;
          break;
        case '3g':
          chunkSize = 512 * 1024; // 512KB
          concurrent = 1;
          compression = true;
          break;
        case '4g':
          chunkSize = 2 * 1024 * 1024; // 2MB
          concurrent = 3;
          compression = false;
          break;
      }
    }

    // Adjust for save data mode
    if (connection.saveData) {
      chunkSize = Math.min(chunkSize, 512 * 1024);
      concurrent = 1;
      compression = true;
    }

    return { chunkSize, concurrent, compression };
  }
}