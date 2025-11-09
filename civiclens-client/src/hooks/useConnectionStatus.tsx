import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkBackendHealth } from '@/services/apiClient';

interface ConnectionStatus {
  isOnline: boolean;
  isBackendReachable: boolean;
  isChecking: boolean;
}

/**
 * Hook to monitor connection status (browser online/offline and backend reachability)
 */
export const useConnectionStatus = () => {
  const { isOffline } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkBackendStatus = async () => {
    setIsChecking(true);
    try {
      const isReachable = await checkBackendHealth();
      setIsBackendReachable(isReachable);
      if (isReachable) {
        window.dispatchEvent(new CustomEvent('backend-online'));
      } else {
        window.dispatchEvent(new CustomEvent('backend-offline'));
      }
    } catch (error) {
      setIsBackendReachable(false);
      window.dispatchEvent(new CustomEvent('backend-offline'));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Listen for browser online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Check backend when browser comes online
      checkBackendStatus();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsBackendReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for backend status events from apiClient
    const handleBackendOffline = () => {
      setIsBackendReachable(false);
    };
    
    const handleBackendOnline = () => {
      setIsBackendReachable(true);
    };

    window.addEventListener('backend-offline', handleBackendOffline);
    window.addEventListener('backend-online', handleBackendOnline);

    // Initial backend check
    checkBackendStatus();

    // Periodic backend health check (every 30 seconds)
    const healthCheckInterval = setInterval(() => {
      if (navigator.onLine) {
        checkBackendStatus();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('backend-offline', handleBackendOffline);
      window.removeEventListener('backend-online', handleBackendOnline);
      clearInterval(healthCheckInterval);
    };
  }, []);

  return {
    isOnline,
    isBackendReachable: isBackendReachable && !isOffline,
    isChecking,
    checkBackendStatus,
  } as ConnectionStatus & { checkBackendStatus: () => Promise<void> };
};

