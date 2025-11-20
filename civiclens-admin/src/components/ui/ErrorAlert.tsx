/**
 * Error Alert Component
 * Production-grade error display with proper accessibility
 */

import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, Wifi, X } from 'lucide-react';
import { ApiError } from '@/hooks/useReport';

interface ErrorAlertProps {
  error: ApiError | null;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Get icon and color based on error type
 */
function getErrorStyle(type: ApiError['type']) {
  switch (type) {
    case 'validation':
      return {
        icon: AlertCircle,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600',
      };
    case 'permission':
      return {
        icon: XCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
      };
    case 'notfound':
      return {
        icon: AlertCircle,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        iconColor: 'text-gray-600',
      };
    case 'network':
      return {
        icon: Wifi,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600',
      };
    case 'server':
    case 'unknown':
    default:
      return {
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
      };
  }
}

/**
 * Error alert component with proper styling and accessibility
 */
export function ErrorAlert({ error, onDismiss, className = '' }: ErrorAlertProps) {
  if (!error) return null;

  const style = getErrorStyle(error.type);
  const Icon = style.icon;

  return (
    <div
      className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${style.textColor} mb-1`}>
            {getErrorTitle(error.type)}
          </h3>
          <p className={`text-sm ${style.textColor}`}>
            {error.message}
          </p>
          
          {/* Show additional details in development */}
          {process.env.NODE_ENV === 'development' && error.details && (
            <details className="mt-2">
              <summary className={`text-xs ${style.textColor} cursor-pointer`}>
                Technical details
              </summary>
              <pre className={`mt-1 text-xs ${style.textColor} overflow-auto max-h-32`}>
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${style.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            aria-label="Dismiss error"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Get user-friendly error title
 */
function getErrorTitle(type: ApiError['type']): string {
  switch (type) {
    case 'validation':
      return 'Validation Error';
    case 'permission':
      return 'Permission Denied';
    case 'notfound':
      return 'Not Found';
    case 'network':
      return 'Network Error';
    case 'server':
      return 'Server Error';
    case 'unknown':
    default:
      return 'Error';
  }
}

/**
 * Inline error message (smaller, for form fields)
 */
export function InlineError({ message, className = '' }: { message: string; className?: string }) {
  return (
    <p className={`text-sm text-red-600 flex items-center gap-1 ${className}`} role="alert">
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
