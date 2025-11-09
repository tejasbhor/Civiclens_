import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * ConnectionStatus component that displays backend connectivity status
 * Shows when backend is unreachable or browser is offline
 */
export const ConnectionStatus = () => {
  const { isOnline, isBackendReachable, isChecking } = useConnectionStatus();

  // Don't show if everything is fine
  if (isOnline && isBackendReachable && !isChecking) {
    return null;
  }

  const getStatusMessage = () => {
    if (!isOnline) {
      return {
        message: 'No internet connection',
        description: 'Please check your internet connection.',
        variant: 'destructive' as const,
      };
    }
    
    if (!isBackendReachable) {
      return {
        message: 'Server unreachable',
        description: 'Unable to connect to server. Some features may be limited.',
        variant: 'destructive' as const,
      };
    }
    
    return null;
  };

  const status = getStatusMessage();
  if (!status) return null;

  return (
    <Alert
      className={cn(
        'fixed top-20 left-1/2 transform -translate-x-1/2 z-[9998] max-w-md shadow-lg',
        status.variant === 'destructive' && 'border-red-500 bg-red-50 dark:bg-red-950'
      )}
      variant={status.variant}
    >
      <div className="flex items-center gap-3">
        {isChecking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !isOnline ? (
          <WifiOff className="h-4 w-4" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        <div className="flex-1">
          <AlertDescription className="font-medium">
            {status.message}
          </AlertDescription>
          <AlertDescription className="text-xs mt-1">
            {status.description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

