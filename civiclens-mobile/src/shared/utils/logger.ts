/**
 * Professional Logging Utility
 * Provides structured logging with proper log levels for production applications
 * @module shared/utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  prefix: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableDebug: __DEV__,
      enableInfo: __DEV__,
      prefix: '',
      ...config,
    };
  }

  /**
   * Format log message with timestamp and context
   */
  private format(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  }

  /**
   * Debug level logging (development only)
   */
  debug(context: string, message: string, ...args: any[]): void {
    if (this.config.enableDebug) {
      console.log(this.format('debug', context, message), ...args);
    }
  }

  /**
   * Info level logging (development only)
   */
  info(context: string, message: string, ...args: any[]): void {
    if (this.config.enableInfo) {
      console.log(this.format('info', context, message), ...args);
    }
  }

  /**
   * Warning level logging (always enabled)
   */
  warn(context: string, message: string, ...args: any[]): void {
    console.warn(this.format('warn', context, message), ...args);
  }

  /**
   * Error level logging (always enabled)
   */
  error(context: string, message: string, error?: any): void {
    console.error(this.format('error', context, message), error);
  }

  /**
   * Create a scoped logger for a specific context
   */
  scope(context: string): ScopedLogger {
    return new ScopedLogger(this, context);
  }
}

/**
 * Scoped logger for specific modules/components
 */
class ScopedLogger {
  constructor(private logger: Logger, private context: string) {}

  debug(message: string, ...args: any[]): void {
    this.logger.debug(this.context, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(this.context, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(this.context, message, ...args);
  }

  error(message: string, error?: any): void {
    this.logger.error(this.context, message, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const createLogger = (context: string) => logger.scope(context);

// Export types
export type { LogLevel, LoggerConfig, ScopedLogger };
