/**
 * Production-ready logging utility
 * Only logs errors in production, debug logs only in development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
    
    // In production, you might want to send errors to an error tracking service
    if (this.isProduction) {
      // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
      // Example: Sentry.captureException(new Error(args.join(' ')));
    }
  }
}

export const logger = new Logger();

